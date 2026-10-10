import React from 'react';
import { ConnectionStatus } from '../types/chat';
import { 
  MessageSquare, 
  Users, 
  Volume2, 
  VolumeX, 
  Settings, 
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  status: ConnectionStatus;
  onlineCount: number;
  nickname: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenParticipantsModal: () => void;
  onOpenSetupModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onlineCount,
  nickname,
  soundEnabled,
  onToggleSound,
  onOpenParticipantsModal,
  onOpenSetupModal,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#1e1f20]/95 backdrop-blur-md border-b border-[#282a2d] px-4 py-3 sm:px-6 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        
        {/* Left: Brand logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#004a77] text-[#c2e7ff] shadow-sm">
            <MessageSquare className="h-5 w-5 fill-current" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                status === 'connected' ? 'bg-[#81c995]' : 'bg-[#fdd663]'
              }`}></span>
              <span className={`relative inline-flex h-3 w-3 rounded-full ${
                status === 'connected' ? 'bg-[#34a853]' : 'bg-[#fbbc04]'
              }`}></span>
            </span>
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#e3e2e6] sm:text-xl font-['Google_Sans'] flex items-center gap-1.5">
              <span>Plug &amp; Chat</span>
              <span className="inline-block h-2 w-2 rounded-full bg-[#8ab4f8]" />
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
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#81c995] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34a853]"></span>
            </span>
            <Users className="h-3.5 w-3.5 text-[#a8c7fa] transition group-hover:scale-110" />
            <span className="font-semibold text-[#81c995] font-mono">{onlineCount}</span>
            <span className="hidden xs:inline text-[#c4c6d0]">online</span>
          </button>
        </div>

        {/* Right: Nickname Pill & Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Display-only Nickname Badge */}
          <div
            className="flex items-center gap-1.5 rounded-full bg-[#004a77] px-3.5 py-1.5 text-xs font-medium text-[#c2e7ff]"
            title="Your assigned username"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#a8c7fa]" />
            <span className="max-w-[110px] truncate sm:max-w-[150px] font-mono font-bold">
              {nickname}
            </span>
          </div>

          {/* Sound toggle button */}
          <button
            onClick={onToggleSound}
            className="rounded-full bg-[#282a2d] p-2 text-[#c4c6d0] transition hover:bg-[#333538] hover:text-[#e3e2e6] active:scale-95"
            title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-[#a8c7fa]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#8e9099]" />
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSetupModal}
            className="rounded-full bg-[#282a2d] p-2 text-[#c4c6d0] transition hover:bg-[#333538] hover:text-[#e3e2e6] active:scale-95"
            title="Supabase Settings & Migration SQL"
          >
            <Settings className="h-4 w-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
