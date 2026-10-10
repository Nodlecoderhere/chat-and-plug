import { useState, useEffect, useRef } from 'react';
import { UserPresence } from '../types/chat';
import { getSupabaseClient, getSupabaseCredentials } from '../lib/supabase';
import { getRandomAvatarColor } from '../lib/nickname';

// Dedicated presence channel topic to avoid collision with message broadcasting
const PRESENCE_CHANNEL_NAME = 'global-chat-presence';

export function usePresence(
  visitorId: string,
  nickname: string
) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const presenceChannelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null>(null);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    const client = getSupabaseClient();

    if (creds.isConfigured && client) {
      // Supabase Presence on dedicated channel
      const channel = client.channel(PRESENCE_CHANNEL_NAME, {
        config: {
          presence: {
            key: visitorId
          }
        }
      });

      presenceChannelRef.current = channel;

      const myState: UserPresence = {
        visitor_id: visitorId,
        nickname,
        joined_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId)
      };

      // Chain ALL .on() handlers BEFORE calling .subscribe()
      channel
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
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('User joined presence:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left presence:', leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track(myState);
          }
        });

      return () => {
        channel.untrack();
        client.removeChannel(channel);
      };
    } else {
      // Local Mesh Fallback mode
      const localSelf: UserPresence = {
        visitor_id: visitorId,
        nickname,
        joined_at: new Date().toISOString(),
        avatar_color: getRandomAvatarColor(visitorId),
        is_current_user: true
      };

      setOnlineUsers([localSelf]);
      setOnlineCount(1);

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('plug_chat_presence_mesh');
        const activeMap = new Map<string, UserPresence>();
        activeMap.set(visitorId, localSelf);

        const sendPing = () => {
          bc.postMessage({
            type: 'PING',
            user: { ...localSelf, nickname }
          });
        };

        sendPing();
        const pingInterval = setInterval(sendPing, 3000);

        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'PING') {
            const remoteUser = event.data.user as UserPresence;
            activeMap.set(remoteUser.visitor_id, remoteUser);

            const userArray = Array.from(activeMap.values()).map((u) => ({
              ...u,
              is_current_user: u.visitor_id === visitorId
            }));

            setOnlineUsers(userArray);
            setOnlineCount(userArray.length);
          }
        };

        return () => {
          clearInterval(pingInterval);
          bc.close();
        };
      }
    }
  }, [visitorId, nickname]);

  return {
    onlineUsers,
    onlineCount
  };
}
