import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, ConnectionStatus } from '../types/chat';
import { getSupabaseClient, getSupabaseCredentials } from '../lib/supabase';
import { playMessageSound } from '../lib/sound';
import { getRandomAvatarColor } from '../lib/nickname';

const CHANNEL_NAME = 'global-chat-events';
const LOCAL_STORAGE_MESSAGES_KEY = 'plug_chat_local_messages';

export interface TypingUser {
  visitor_id: string;
  nickname: string;
}

// Initial welcome message for fallback mode
const INITIAL_DEMO_MESSAGES: Message[] = [
  {
    id: 'demo-3',
    nickname: 'PlugBot',
    visitor_id: 'v_system',
    content: '⚡ Welcome to Plug & Chat! Everyone on this website shares this chat. Connect your own Supabase project in Settings for global cloud sync.',
    created_at: new Date().toISOString(),
    is_system: true
  }
];

export function useGlobalChat(
  visitorId: string,
  currentNickname: string,
  soundEnabled: boolean = true
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isSupabaseMode, setIsSupabaseMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);

  // Typing indicators state
  const [typingMap, setTypingMap] = useState<Map<string, { nickname: string; timestamp: number }>>(new Map());

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  // Helper to load local fallback messages
  const loadLocalFallbackMessages = useCallback(() => {
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
  }, []);

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

  // Periodic cleanup of stale typing indicators (>3 seconds old)
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

  // Initialize or fetch messages
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
            console.warn('Supabase fetch notice:', fetchErr);

            // Handle table missing in schema cache (PGRST205) gracefully
            if (fetchErr.code === 'PGRST205' || fetchErr.message.includes('messages')) {
              setError("Supabase table 'public.messages' is missing. Please run the SQL migration script in Settings.");
              loadLocalFallbackMessages();
              setStatus('connected');
              return;
            } else {
              setError(`Database error: ${fetchErr.message}`);
              setStatus('error');
              loadLocalFallbackMessages();
              return;
            }
          }

          if (data) {
            const loaded = data.reverse() as Message[];
            setMessages(loaded);
            setHasMoreOlder(data.length >= 50);
          }
          setStatus('connected');
          setError(null);
        } catch (err: unknown) {
          console.error('Fetch error:', err);
          setStatus('connected');
          loadLocalFallbackMessages();
          setError(err instanceof Error ? err.message : 'Failed to load cloud messages');
        }
      };

      fetchInitialMessages();

      // Subscribe to Realtime Postgres INSERT changes and typing broadcast events
      const channel = client
        .channel(CHANNEL_NAME)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              if (soundEnabled && newMsg.visitor_id !== visitorId) {
                playMessageSound();
              }
              return [...prev, newMsg];
            });

            // Clear typing status on message receive
            updateTypingStatus(newMsg.visitor_id, newMsg.nickname, false);
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload) {
            const { visitor_id, nickname, is_typing } = payload.payload;
            updateTypingStatus(visitor_id, nickname, Boolean(is_typing));
          }
        })
        .subscribe((subStatus) => {
          if (subStatus === 'SUBSCRIBED') {
            setStatus('connected');
          } else if (subStatus === 'CLOSED' || subStatus === 'CHANNEL_ERROR') {
            setStatus('reconnecting');
          }
        });

      supabaseChannelRef.current = channel;

      return () => {
        client.removeChannel(channel);
      };
    } else {
      // Local Mesh Fallback Mode
      setIsSupabaseMode(false);
      setStatus('connected');
      loadLocalFallbackMessages();

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('plug_chat_mesh');
        broadcastChannelRef.current = bc;

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
              const { visitor_id, nickname, is_typing } = event.data;
              updateTypingStatus(visitor_id, nickname, Boolean(is_typing));
            }
          }
        };
      }
    }
  }, [visitorId, soundEnabled, updateTypingStatus, loadLocalFallbackMessages]);

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

  // Handle nickname change notification
  const notifyNicknameChange = useCallback((oldNick: string, newNick: string) => {
    const sysMsg: Message = {
      id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      nickname: 'System',
      visitor_id: 'v_system',
      content: `✏️ ${oldNick} is now known as ${newNick}`,
      created_at: new Date().toISOString(),
      is_system: true
    };

    setMessages((prev) => [...prev, sysMsg]);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'NEW_MESSAGE', message: sysMsg });
    }
  }, []);

  // Send message method
  const sendMessage = useCallback(
    async (content: string): Promise<{ success: boolean; error?: string }> => {
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

      const newMsg: Message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        nickname: currentNickname,
        visitor_id: visitorId,
        content: trimmed,
        created_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId)
      };

      if (creds.isConfigured && client && !error?.includes('missing')) {
        try {
          const { error: insertErr } = await client.from('messages').insert([
            {
              id: newMsg.id,
              nickname: newMsg.nickname,
              visitor_id: newMsg.visitor_id,
              content: newMsg.content,
              avatar_color: newMsg.avatar_color
            }
          ]);

          if (insertErr) {
            console.error('Supabase insert error:', insertErr);
            // Fall back to local broadcast if table is missing
            setMessages((prev) => [...prev, newMsg]);
            return { success: true };
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          return { success: true };
        } catch (err: unknown) {
          console.error('Failed to send message:', err);
          setMessages((prev) => [...prev, newMsg]);
          return { success: true };
        }
      } else {
        // Fallback / local mesh mode
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
    [currentNickname, visitorId, sendTypingSignal, error]
  );

  // Load older messages for pagination
  const loadOlderMessages = useCallback(async () => {
    const client = getSupabaseClient();
    const creds = getSupabaseCredentials();

    if (!creds.isConfigured || !client || messages.length === 0) return;

    setIsLoadingOlder(true);
    try {
      const oldestTimestamp = messages[0].created_at;

      const { data, error: fetchErr } = await client
        .from('messages')
        .select('*')
        .lt('created_at', oldestTimestamp)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!fetchErr && data && data.length > 0) {
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
    notifyNicknameChange,
    sendTypingSignal,
    typingUsers
  };
}
