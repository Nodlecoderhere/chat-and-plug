import { useGlobalChat } from './useGlobalChat';

export function usePresence(visitorId: string, nickname: string) {
  const { onlineUsers, onlineCount } = useGlobalChat(visitorId, nickname);
  return { onlineUsers, onlineCount };
}
