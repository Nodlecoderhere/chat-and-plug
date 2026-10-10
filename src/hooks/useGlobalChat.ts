import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, ConnectionStatus, UserPresence, MessageReply } from '../types/chat';
import { getSupabaseClient, getSupabaseCredentials } from '../lib/supabase';
import { playMessageSound } from '../lib/sound';
import { getRandomAvatarColor } from '../lib/nickname';

const CHANNEL_NAME = 'global-chat';
const LOCAL_STORAGE_MESSAGES_KEY = 'plug_chat_local_messages';

export interface TypingUser {
  visitor_id: string;
  nickname: string;
}

// Initial demo messages (empty by default as per user request)
const INITIAL_DEMO_MESSAGES: Message[] = [];

export function useGlobalChat(
  visitorId: string,
  currentNickname: string,
  avatarUrl: string = '',
  soundEnabled: boolean = true
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isSupabaseMode, setIsSupabaseMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);

  // Online Presence state
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Typing indicators state
  const [typingMap, setTypingMap] = useState<Map<string, { nickname: string; timestamp: number }>>(new Map());

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  // Helper to update typing map
  const updateTypingStatus = useCallback((vId: string, nick: string, isTyping: boolean) => {
    if (vId === visitorId) return; // Ignore self

    setTypingMap((prev) => {
      const next = new Map(prev);
      if (isTyping) {
        next.set(vId, { nickname: nick, timestamp: Date.now() });
      } else {
        next.delete(vId);
      }
      return next;
    });
  }, [visitorId]);

  // Periodic cleanup of stale typing indicators (>3.2 seconds old)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingMap((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [vId, data] of next.entries()) {
          if (now - data.timestamp > 3200) {
            next.delete(vId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Single unified Realtime Channel Initialization
  useEffect(() => {
    const creds = getSupabaseCredentials();
    const client = getSupabaseClient();

    if (creds.isConfigured && client) {
      setIsSupabaseMode(true);
      setStatus('connecting');

      // Fetch initial recent 50 messages from Supabase Postgres
      const fetchInitialMessages = async () => {
        try {
          const { data, error: fetchErr } = await client
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

          if (fetchErr) {
            console.error('Error fetching Supabase messages:', fetchErr);
            setError(`Database error: ${fetchErr.message}`);
            setStatus('error');
            return;
          }

          if (data) {
            const loaded = data
              .map((item) => {
                let replyToObj = item.reply_to;
                if (typeof replyToObj === 'string') {
                  try {
                    replyToObj = JSON.parse(replyToObj);
                  } catch {
                    replyToObj = undefined;
                  }
                }
                return {
                  ...item,
                  reply_to: replyToObj
                } as Message;
              })
              .reverse();
            setMessages(loaded);
            setHasMoreOlder(data.length >= 50);
          }
          setStatus('connected');
          setError(null);
        } catch (err: unknown) {
          console.error('Fetch error:', err);
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      };

      fetchInitialMessages();

      // Ensure clean channel setup: remove any pre-existing channel before creating new subscription
      const existingChannels = client.getChannels();
      const existing = existingChannels.find((ch) => ch.topic === `realtime:${CHANNEL_NAME}`);
      if (existing) {
        client.removeChannel(existing);
      }

      // Create SINGLE unified channel for messages, broadcast typing, and presence
      const channel = client.channel(CHANNEL_NAME, {
        config: {
          presence: {
            key: visitorId
          }
        }
      });

      const myPresenceState: UserPresence = {
        visitor_id: visitorId,
        nickname: currentNickname,
        joined_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId),
        avatar_url: avatarUrl
      };

      // Register ALL event handlers BEFORE calling .subscribe()
      channel
        // 1. Postgres INSERT changes for new messages
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const rawMsg = payload.new as Record<string, unknown>;
            let replyToObj = rawMsg.reply_to as MessageReply | undefined;
            if (typeof replyToObj === 'string') {
              try {
                replyToObj = JSON.parse(replyToObj);
              } catch {
                replyToObj = undefined;
              }
            }
            const newMsg: Message = {
              ...(rawMsg as unknown as Message),
              reply_to: replyToObj
            };

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              if (soundEnabled && newMsg.visitor_id !== visitorId) {
                playMessageSound();
              }
              return [...prev, newMsg];
            });

            updateTypingStatus(newMsg.visitor_id, newMsg.nickname, false);
          }
        )
        // 2. Broadcast events for real-time instant message delivery (including replies)
        .on('broadcast', { event: 'new_message' }, (payload) => {
          if (payload.payload) {
            const newMsg = payload.payload as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              if (soundEnabled && newMsg.visitor_id !== visitorId) {
                playMessageSound();
              }
              return [...prev, newMsg];
            });
            updateTypingStatus(newMsg.visitor_id, newMsg.nickname, false);
          }
        })
        // 3. Broadcast events for typing indicators
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload) {
            const { visitor_id, nickname: nick, is_typing } = payload.payload;
            updateTypingStatus(visitor_id, nick, Boolean(is_typing));
          }
        })
        // 3. Presence sync for online users tracking
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<UserPresence>();
          const userList: UserPresence[] = [];

          Object.keys(state).forEach((key) => {
            const presences = state[key];
            if (presences && presences.length > 0) {
              const latest = presences[presences.length - 1];
              userList.push({
                ...latest,
                is_current_user: latest.visitor_id === visitorId
              });
            }
          });

          setOnlineUsers(userList);
          setOnlineCount(userList.length || 1);
        })
        // Finally, call subscribe ONCE
        .subscribe(async (subStatus) => {
          if (subStatus === 'SUBSCRIBED') {
            setStatus('connected');
            setError(null);
            try {
              await channel.track(myPresenceState);
            } catch (trackErr) {
              console.warn('Presence track warning:', trackErr);
            }
          } else if (subStatus === 'CLOSED' || subStatus === 'CHANNEL_ERROR') {
            setStatus('reconnecting');
          }
        });

      supabaseChannelRef.current = channel;

      return () => {
        channel.untrack();
        client.removeChannel(channel);
      };
    } else {
      // Local Mesh Fallback Mode
      setIsSupabaseMode(false);
      setStatus('connected');

      const saved = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMessages(parsed);
        } catch {
          setMessages(INITIAL_DEMO_MESSAGES);
        }
      } else {
        setMessages(INITIAL_DEMO_MESSAGES);
        localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_MESSAGES));
      }

      // Self presence for fallback mode
      const localSelf: UserPresence = {
        visitor_id: visitorId,
        nickname: currentNickname,
        joined_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId),
        avatar_url: avatarUrl,
        is_current_user: true
      };
      setOnlineUsers([localSelf]);
      setOnlineCount(1);

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('plug_chat_mesh');
        broadcastChannelRef.current = bc;

        const activePresenceMap = new Map<string, UserPresence>();
        activePresenceMap.set(visitorId, localSelf);

        const sendPresencePing = () => {
          bc.postMessage({
            type: 'PRESENCE_PING',
            user: { ...localSelf, nickname: currentNickname, avatar_url: avatarUrl }
          });
        };

        sendPresencePing();
        const pingInterval = setInterval(sendPresencePing, 3000);

        bc.onmessage = (event) => {
          if (event.data) {
            if (event.data.type === 'NEW_MESSAGE') {
              const newMsg = event.data.message as Message;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                if (soundEnabled && newMsg.visitor_id !== visitorId) {
                  playMessageSound();
                }
                const updated = [...prev, newMsg];
                localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(updated.slice(-100)));
                return updated;
              });
              updateTypingStatus(newMsg.visitor_id, newMsg.nickname, false);
            } else if (event.data.type === 'TYPING') {
              const { visitor_id, nickname: nick, is_typing } = event.data;
              updateTypingStatus(visitor_id, nick, Boolean(is_typing));
            } else if (event.data.type === 'PRESENCE_PING') {
              const remoteUser = event.data.user as UserPresence;
              activePresenceMap.set(remoteUser.visitor_id, remoteUser);

              const userArray = Array.from(activePresenceMap.values()).map((u) => ({
                ...u,
                is_current_user: u.visitor_id === visitorId
              }));

              setOnlineUsers(userArray);
              setOnlineCount(userArray.length);
            }
          }
        };

        return () => {
          clearInterval(pingInterval);
          bc.close();
        };
      }
    }
  }, [visitorId, currentNickname, avatarUrl, soundEnabled, updateTypingStatus]);

  // Method to send typing signal
  const sendTypingSignal = useCallback((isTyping: boolean) => {
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          visitor_id: visitorId,
          nickname: currentNickname,
          is_typing: isTyping
        }
      });
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'TYPING',
        visitor_id: visitorId,
        nickname: currentNickname,
        is_typing: isTyping
      });
    }
  }, [visitorId, currentNickname]);

  // Send message method
  const sendMessage = useCallback(
    async (content: string, replyTo?: MessageReply): Promise<{ success: boolean; error?: string }> => {
      const trimmed = content.trim();
      if (!trimmed) {
        return { success: false, error: 'Message cannot be empty.' };
      }

      if (trimmed.length > 500) {
        return { success: false, error: 'Message exceeds 500 characters limit.' };
      }

      const now = Date.now();
      if (now - lastSentTimeRef.current < 800) {
        return { success: false, error: 'Sending too fast. Please wait a moment.' };
      }
      lastSentTimeRef.current = now;

      // Stop typing signal on submit
      sendTypingSignal(false);

      const client = getSupabaseClient();
      const creds = getSupabaseCredentials();

      const cleanReplyTo: MessageReply | undefined = replyTo
        ? {
            id: replyTo.id,
            nickname: replyTo.nickname,
            content: replyTo.content
          }
        : undefined;

      const newMsg: Message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        nickname: currentNickname,
        visitor_id: visitorId,
        content: trimmed,
        created_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId),
        avatar_url: avatarUrl || undefined,
        reply_to: cleanReplyTo
      };

      if (creds.isConfigured && client) {
        try {
          const insertData: Record<string, unknown> = {
            id: newMsg.id,
            nickname: newMsg.nickname,
            visitor_id: newMsg.visitor_id,
            content: newMsg.content,
            avatar_color: newMsg.avatar_color
          };
          if (avatarUrl) {
            insertData.avatar_url = avatarUrl;
          }
          if (cleanReplyTo) {
            insertData.reply_to = cleanReplyTo;
          }

          let { error: insertErr } = await client.from('messages').insert([insertData]);

          if (insertErr && (insertErr.message?.includes('column') || insertErr.code === 'PGRST204')) {
            // Fallback insert without optional columns if column doesn't exist
            const fallbackData = {
              id: newMsg.id,
              nickname: newMsg.nickname,
              visitor_id: newMsg.visitor_id,
              content: newMsg.content,
              avatar_color: newMsg.avatar_color
            };
            const retry = await client.from('messages').insert([fallbackData]);
            insertErr = retry.error;
          }

          if (insertErr) {
            console.error('Supabase insert error:', insertErr);
            return { success: false, error: insertErr.message };
          }

          if (supabaseChannelRef.current) {
            supabaseChannelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: newMsg
            });
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          return { success: true };
        } catch (err: unknown) {
          console.error('Failed to send message:', err);
          return { success: false, error: err instanceof Error ? err.message : 'Network error' };
        }
      } else {
        setMessages((prev) => {
          const updated = [...prev, newMsg];
          localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(updated.slice(-100)));
          return updated;
        });

        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
        }

        return { success: true };
      }
    },
    [currentNickname, visitorId, avatarUrl, sendTypingSignal]
  );

  // Load older messages for pagination
  const loadOlderMessages = useCallback(async () => {
    const client = getSupabaseClient();
    const creds = getSupabaseCredentials();

    if (!creds.isConfigured || !client || messages.length === 0) return;

    setIsLoadingOlder(true);
    try {
      const oldestTimestamp = messages[0].created_at;

      const { data, error } = await client
        .from('messages')
        .select('*')
        .lt('created_at', oldestTimestamp)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data && data.length > 0) {
        const older = data.reverse() as Message[];
        setMessages((prev) => [...older, ...prev]);
        setHasMoreOlder(data.length >= 30);
      } else {
        setHasMoreOlder(false);
      }
    } catch (e) {
      console.error('Failed to load older messages:', e);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [messages]);

  // Derived active typing users list
  const typingUsers: TypingUser[] = Array.from(typingMap.entries()).map(([vId, val]) => ({
    visitor_id: vId,
    nickname: val.nickname
  }));

  return {
    messages,
    status,
    isSupabaseMode,
    error,
    sendMessage,
    loadOlderMessages,
    hasMoreOlder,
    isLoadingOlder,
    sendTypingSignal,
    typingUsers,
    onlineUsers,
    onlineCount
  };
}
