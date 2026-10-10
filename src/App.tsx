import { useState } from 'react';
import { useGlobalChat } from './hooks/useGlobalChat';
import {
  getOrCreateVisitorId,
  getStoredNickname
} from './lib/nickname';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { MessageComposer } from './components/MessageComposer';
import { TypingIndicator } from './components/TypingIndicator';
import { OnlineParticipantsModal } from './components/OnlineParticipantsModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { ShieldCheck, MessageSquare } from 'lucide-react';

export default function App() {
  const [visitorId] = useState<string>(() => getOrCreateVisitorId());
  const [nickname] = useState<string>(() => getStoredNickname());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('plug_chat_sound') !== 'false';
  });

  // Modal visibility states
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Custom hook for global real-time chat, typing, and presence
  const {
    messages,
    status,
    error,
    sendMessage,
    loadOlderMessages,
    hasMoreOlder,
    isLoadingOlder,
    sendTypingSignal,
    typingUsers,
    onlineUsers,
    onlineCount
  } = useGlobalChat(visitorId, nickname, soundEnabled);

  // Sound toggle handler
  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('plug_chat_sound', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#131314] text-[#e3e2e6] antialiased font-['Google_Sans_Text','Google_Sans',sans-serif]">
      
      {/* Header */}
      <Header
        status={status}
        onlineCount={onlineCount}
        nickname={nickname}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenParticipantsModal={() => setIsParticipantsModalOpen(true)}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
      />

      {/* Backend connection error notice */}
      {error && (
        <div className="bg-[#3c1414] border-b border-[#f2b8b5]/30 px-4 py-2 text-center text-xs text-[#f2b8b5]">
          ⚠️ {error} — <button onClick={() => window.location.reload()} className="underline font-bold">Reload page</button>
        </div>
      )}

      {/* Main Chat Conversation Feed */}
      <main className="flex-1 flex flex-col min-h-0 w-full max-w-5xl mx-auto border-x border-[#282a2d] relative bg-[#131314]">
        <MessageList
          messages={messages}
          currentVisitorId={visitorId}
          hasMoreOlder={hasMoreOlder}
          isLoadingOlder={isLoadingOlder}
          onLoadOlder={loadOlderMessages}
        />

        {/* Real-time typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Message Composer */}
        <MessageComposer
          onSendMessage={sendMessage}
          onTyping={sendTypingSignal}
          disabled={status === 'disconnected'}
        />
      </main>

      {/* Footer Banner */}
      <footer className="bg-[#1e1f20] border-t border-[#282a2d] px-4 py-2 text-center text-[11px] text-[#8e9099]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-[#a8c7fa]" />
            <span className="font-['Google_Sans']">Plug &amp; Chat</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block flex items-center gap-1 text-[#c4c6d0]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#81c995] inline" /> Account-Free &bull; Anonymous
            </span>
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="text-[#a8c7fa] hover:underline font-mono"
            >
              Setup &amp; SQL
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <OnlineParticipantsModal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        users={onlineUsers}
      />

      <SupabaseSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onCredentialsUpdated={() => window.location.reload()}
      />

    </div>
  );
}
