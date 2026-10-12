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

  // Refs to maintain current prop values without tearing down subscriptions
  const currentNicknameRef = useRef(currentNickname);
  const avatarUrlRef = useRef(avatarUrl);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    currentNicknameRef.current = currentNickname;
    avatarUrlRef.current = avatarUrl;
    soundEnabledRef.current = soundEnabled;
  }, [currentNickname, avatarUrl, soundEnabled]);

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

  // Update presence tracking dynamically whenever nickname or avatarUrl changes
  useEffect(() => {
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current
        .track({
          visitor_id: visitorId,
          nickname: currentNickname,
          joined_at: new Date().toISOString(),
          avatar_color: getRandomAvatarColor(visitorId),
          avatar_url: avatarUrl
        })
        .catch((err) => console.warn('Presence track update warning:', err));
    }
  }, [visitorId, currentNickname, avatarUrl]);

  // Single unified Realtime Channel Initialization
  useEffect(() => {
    const creds = getSupabaseCredentials();
    const client = getSupabaseClient();

    if (creds.isConfigured && client) {
      setIsSupabaseMode(true);
      setStatus('connecting');

      // Helper to parse reply_to
      const parseReplyTo = (replyToRaw: unknown): MessageReply | undefined => {
        if (!replyToRaw) return undefined;
        if (typeof replyToRaw === 'string') {
          try {
            return JSON.parse(replyToRaw);
          } catch {
            return undefined;
          }
        }
        if (typeof replyToRaw === 'object') {
          return replyToRaw as MessageReply;
        }
        return undefined;
      };

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
              .map((item) => ({
                ...item,
                avatar_url: item.avatar_url || undefined,
                reply_to: parseReplyTo(item.reply_to)
              }))
              .reverse() as Message[];

            setMessages((prev) => {
              if (prev.length === 0) return loaded;
              const prevMap = new Map(prev.map((m) => [m.id, m]));
              const mergedLoaded = loaded.map((item) => {
                const existing = prevMap.get(item.id);
                if (existing) {
                  return {
                    ...item,
                    avatar_url: item.avatar_url || existing.avatar_url,
                    reply_to: item.reply_to || existing.reply_to
                  };
                }
                return item;
              });

              // Retain any live incoming messages that weren't in history batch
              const loadedIds = new Set(mergedLoaded.map((m) => m.id));
              const extraLive = prev.filter((m) => !loadedIds.has(m.id));
              return [...mergedLoaded, ...extraLive];
            });
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

      // Ensure clean channel setup
      const existingChannels = client.getChannels();
      const existing = existingChannels.find((ch) => ch.topic === `realtime:${CHANNEL_NAME}`);
      if (existing) {
        client.removeChannel(existing);
      }

      const channel = client.channel(CHANNEL_NAME, {
        config: {
          presence: {
            key: visitorId
          }
        }
      });

      const initialPresence: UserPresence = {
        visitor_id: visitorId,
        nickname: currentNicknameRef.current,
        joined_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId),
        avatar_url: avatarUrlRef.current
      };

      channel
        // 1. Postgres INSERT changes for new messages
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const rawMsg = payload.new as Record<string, unknown>;
            const parsedReply = parseReplyTo(rawMsg.reply_to);
            const newMsg: Message = {
              ...(rawMsg as unknown as Message),
              avatar_url: (rawMsg.avatar_url as string) || undefined,
              reply_to: parsedReply
            };

            setMessages((prev) => {
              const existingIdx = prev.findIndex((m) => m.id === newMsg.id);
              if (existingIdx !== -1) {
                const existing = prev[existingIdx];
                const merged: Message = {
                  ...existing,
                  ...newMsg,
                  avatar_url: newMsg.avatar_url || existing.avatar_url,
                  reply_to: newMsg.reply_to || existing.reply_to
                };
                const updated = [...prev];
                updated[existingIdx] = merged;
                return updated;
              }

              if (soundEnabledRef.current && newMsg.visitor_id !== visitorId) {
                playMessageSound();
              }
              return [...prev, newMsg];
            });

            updateTypingStatus(newMsg.visitor_id, newMsg.nickname, false);
          }
        )
        // 2. Broadcast events for instant real-time message delivery
        .on('broadcast', { event: 'new_message' }, (payload) => {
          if (payload.payload) {
            const newMsg = payload.payload as Message;
            setMessages((prev) => {
              const existingIdx = prev.findIndex((m) => m.id === newMsg.id);
              if (existingIdx !== -1) {
                const existing = prev[existingIdx];
                const merged: Message = {
                  ...existing,
                  ...newMsg,
                  avatar_url: newMsg.avatar_url || existing.avatar_url,
                  reply_to: newMsg.reply_to || existing.reply_to
                };
                const updated = [...prev];
                updated[existingIdx] = merged;
                return updated;
              }

              if (soundEnabledRef.current && newMsg.visitor_id !== visitorId) {
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
        // 4. Presence sync for online users tracking
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
        .subscribe(async (subStatus) => {
          if (subStatus === 'SUBSCRIBED') {
            setStatus('connected');
            setError(null);
            try {
              await channel.track(initialPresence);
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

      const localSelf: UserPresence = {
        visitor_id: visitorId,
        nickname: currentNicknameRef.current,
        joined_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId),
        avatar_url: avatarUrlRef.current,
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
            user: { ...localSelf, nickname: currentNicknameRef.current, avatar_url: avatarUrlRef.current }
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
                if (soundEnabledRef.current && newMsg.visitor_id !== visitorId) {
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
  }, [visitorId, updateTypingStatus]);

  // Method to send typing signal
  const sendTypingSignal = useCallback((isTyping: boolean) => {
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          visitor_id: visitorId,
          nickname: currentNicknameRef.current,
          is_typing: isTyping
        }
      });
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'TYPING',
        visitor_id: visitorId,
        nickname: currentNicknameRef.current,
        is_typing: isTyping
      });
    }
  }, [visitorId]);

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

      sendTypingSignal(false);

      const client = getSupabaseClient();
      const creds = getSupabaseCredentials();

      const activeNickname = currentNicknameRef.current;
      const activeAvatarUrl = avatarUrlRef.current;

      const cleanReplyTo: MessageReply | undefined = replyTo
        ? {
            id: replyTo.id,
            nickname: replyTo.nickname,
            content: replyTo.content,
            avatar_url: replyTo.avatar_url
          }
        : undefined;

      const newMsg: Message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        nickname: activeNickname,
        visitor_id: visitorId,
        content: trimmed,
        created_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId),
        avatar_url: activeAvatarUrl || undefined,
        reply_to: cleanReplyTo
      };

      // 1. Immediately update local state
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // 2. Immediately broadcast over Realtime channel for instant sub-50ms delivery
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: newMsg
        });
      }

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
      }

      // 3. Persist to Supabase Postgres database if configured
      if (creds.isConfigured && client) {
        try {
          const insertData: Record<string, unknown> = {
            id: newMsg.id,
            nickname: newMsg.nickname,
            visitor_id: newMsg.visitor_id,
            content: newMsg.content,
            avatar_color: newMsg.avatar_color
          };

          if (activeAvatarUrl) {
            insertData.avatar_url = activeAvatarUrl;
          }
          if (cleanReplyTo) {
            insertData.reply_to = cleanReplyTo;
          }

          let { error: insertErr } = await client.from('messages').insert([insertData]);

          if (insertErr && cleanReplyTo) {
            // Try stringifying reply_to in case column is TEXT
            insertData.reply_to = JSON.stringify(cleanReplyTo);
            const retryReply = await client.from('messages').insert([insertData]);
            if (!retryReply.error) {
              insertErr = null;
            }
          }

          if (insertErr) {
            // Fallback insert with essential columns if schema lacks optional columns or payload fails
            const fallbackData = {
              id: newMsg.id,
              nickname: newMsg.nickname,
              visitor_id: newMsg.visitor_id,
              content: newMsg.content,
              avatar_color: newMsg.avatar_color
            };
            const retryFallback = await client.from('messages').insert([fallbackData]);
            insertErr = retryFallback.error;
          }

          if (insertErr) {
            console.error('Supabase DB insert warning:', insertErr);
          }

          return { success: true };
        } catch (err: unknown) {
          console.error('Failed to persist message to DB:', err);
          return { success: true }; // Message delivered via broadcast
        }
      } else {
        localStorage.setItem(
          LOCAL_STORAGE_MESSAGES_KEY,
          JSON.stringify(messages.concat(newMsg).slice(-100))
        );
        return { success: true };
      }
    },
    [visitorId, sendTypingSignal, messages]
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
        const older = data.reverse().map((item) => {
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
            avatar_url: item.avatar_url || undefined,
            reply_to: replyToObj
          } as Message;
        });

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
