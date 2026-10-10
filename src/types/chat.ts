export interface Message {
  id: string;
  nickname: string;
  visitor_id: string;
  content: string;
  created_at: string;
  is_system?: boolean;
  avatar_color?: string;
  reactions?: Record<string, string[]>; // emoji -> array of visitor_ids
}

export interface UserPresence {
  visitor_id: string;
  nickname: string;
  joined_at: string;
  avatar_color: string;
  is_current_user?: boolean;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface ChatConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
  soundEnabled: boolean;
  profanityFilter: boolean;
}
