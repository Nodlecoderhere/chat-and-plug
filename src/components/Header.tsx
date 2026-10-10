import React from 'react';
import { 
  MessageSquare, 
  Users, 
  Volume2, 
  VolumeX, 
  Settings, 
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  onlineCount: number;
  nickname: string;
  avatarUrl?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenParticipantsModal: () => void;
  onOpenSettingsModal: () => void;
  accentColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onlineCount,
  nickname,
  avatarUrl,
  soundEnabled,
  onToggleSound,
  onOpenParticipantsModal,
  onOpenSettingsModal,
  accentColor = '#a8c7fa',
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#1e1f20]/95 backdrop-blur-md border-b border-[#282a2d] px-4 py-3 sm:px-6 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        
        {/* Left: Brand logo & Title */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#00315a] shadow-sm font-bold transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            <MessageSquare className="h-5 w-5 fill-current" />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#e3e2e6] sm:text-xl font-['Google_Sans'] flex items-center gap-1.5">
              <span>Plug &amp; Chat</span>
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
            </h1>
          </div>
        </div>

        {/* Center: Online Visitor Counter */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenParticipantsModal}
            className="group flex items-center gap-2 rounded-full bg-[#282a2d] px-3.5 py-1.5 text-xs font-medium text-[#e3e2e6] transition hover:bg-[#333538] active:scale-95"
            title="View Online Visitors"
          >
            <Users className="h-3.5 w-3.5 transition group-hover:scale-110" style={{ color: accentColor }} />
            <span className="font-semibold text-[#81c995] font-mono">{onlineCount}</span>
            <span className="hidden xs:inline text-[#c4c6d0]">online</span>
          </button>
        </div>

        {/* Right: Nickname Pill & Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Nickname Badge / Settings Trigger */}
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition hover:scale-105 active:scale-95"
            style={{ backgroundColor: '#282a2d', color: '#e3e2e6' }}
            title="Click to customize nickname & settings"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={nickname}
                className="h-5 w-5 rounded-full object-cover border border-[#a8c7fa]"
              />
            ) : (
              <Sparkles className="h-3.5 w-3.5" style={{ color: accentColor }} />
            )}
            <span className="max-w-[110px] truncate sm:max-w-[150px] font-mono font-bold">
              {nickname}
            </span>
          </button>

          {/* Sound toggle button */}
          <button
            onClick={onToggleSound}
            className="rounded-full bg-[#282a2d] p-2 text-[#c4c6d0] transition hover:bg-[#333538] hover:text-[#e3e2e6] active:scale-95"
            title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" style={{ color: accentColor }} />
            ) : (
              <VolumeX className="h-4 w-4 text-[#8e9099]" />
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettingsModal}
            className="rounded-full bg-[#282a2d] p-2 text-[#c4c6d0] transition hover:bg-[#333538] hover:text-[#e3e2e6] active:scale-95"
            title="Preferences & Settings"
          >
            <Settings className="h-4 w-4" style={{ color: accentColor }} />
          </button>

        </div>

      </div>
    </header>
  );
};
