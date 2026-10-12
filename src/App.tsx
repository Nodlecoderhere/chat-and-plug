import { useState, useCallback } from 'react';
import { useGlobalChat } from './hooks/useGlobalChat';
import { Message, MessageReply } from './types/chat';
import {
  getOrCreateVisitorId,
  getStoredNickname,
  setStoredNickname,
  getStoredAvatarUrl,
  setStoredAvatarUrl
} from './lib/nickname';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { MessageComposer } from './components/MessageComposer';
import { TypingIndicator } from './components/TypingIndicator';
import { OnlineParticipantsModal } from './components/OnlineParticipantsModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [visitorId] = useState<string>(() => getOrCreateVisitorId());
  const [nickname, setNickname] = useState<string>(() => getStoredNickname());
  const [avatarUrl, setAvatarUrl] = useState<string>(() => getStoredAvatarUrl());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('plug_chat_sound') !== 'false';
  });

  // Custom Accent Theme Color (user side only)
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('plug_chat_accent_color') || '#a8c7fa';
  });

  // Custom Chat Background Image & Opacity (user side only)
  const [chatBgImage, setChatBgImage] = useState<string>(() => {
    return localStorage.getItem('plug_chat_bg_image') || '';
  });
  const [chatBgOpacity, setChatBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('plug_chat_bg_opacity');
    return saved ? parseFloat(saved) : 0.5;
  });

  // Replying state
  const [replyingTo, setReplyingTo] = useState<MessageReply | null>(null);

  // Modal visibility states
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
  } = useGlobalChat(visitorId, nickname, avatarUrl, soundEnabled);

  // Sound toggle handler
  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('plug_chat_sound', String(next));
      return next;
    });
  };

  // Reply handlers
  const handleReply = useCallback((msg: Message) => {
    setReplyingTo({
      id: msg.id,
      nickname: msg.nickname,
      content: msg.content,
      avatar_url: msg.avatar_url
    });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#a8c7fa]', 'bg-[#282a2d]');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#a8c7fa]', 'bg-[#282a2d]');
      }, 1500);
    }
  }, []);

  // Change Nickname handler (visible to all)
  const handleSaveNickname = useCallback((newNick: string) => {
    if (newNick && newNick !== nickname) {
      setStoredNickname(newNick);
      setNickname(newNick);
    }
  }, [nickname]);

  // Change Avatar URL handler (visible to all on new messages & presence)
  const handleChangeAvatarUrl = useCallback((url: string) => {
    setStoredAvatarUrl(url);
    setAvatarUrl(url);
  }, []);

  // Change Accent Color handler (user side only)
  const handleChangeAccentColor = useCallback((color: string) => {
    setAccentColor(color);
    localStorage.setItem('plug_chat_accent_color', color);
  }, []);

  // Change Chat Background Image handler (user side only)
  const handleChangeChatBgImage = useCallback((url: string) => {
    setChatBgImage(url);
    localStorage.setItem('plug_chat_bg_image', url);
  }, []);

  // Change Chat Background Opacity handler (user side only)
  const handleChangeChatBgOpacity = useCallback((opacity: number) => {
    setChatBgOpacity(opacity);
    localStorage.setItem('plug_chat_bg_opacity', String(opacity));
  }, []);

  // Map online users' avatars for instant fallback lookup on messages
  const userAvatarsMap = new Map<string, string>();
  if (avatarUrl) {
    userAvatarsMap.set(visitorId, avatarUrl);
  }
  onlineUsers.forEach((u) => {
    if (u.visitor_id && u.avatar_url) {
      userAvatarsMap.set(u.visitor_id, u.avatar_url);
    }
  });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#131314] text-[#e3e2e6] antialiased font-['Google_Sans_Text','Google_Sans',sans-serif]">
      
      {/* Header */}
      <Header
        onlineCount={onlineCount}
        nickname={nickname}
        avatarUrl={avatarUrl}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenParticipantsModal={() => setIsParticipantsModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        accentColor={accentColor}
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
          currentNickname={nickname}
          currentUserAvatarUrl={avatarUrl}
          userAvatarsMap={userAvatarsMap}
          hasMoreOlder={hasMoreOlder}
          isLoadingOlder={isLoadingOlder}
          onLoadOlder={loadOlderMessages}
          onReply={handleReply}
          onScrollToMessage={handleScrollToMessage}
          chatBgImage={chatBgImage}
          chatBgOpacity={chatBgOpacity}
        />

        {/* Real-time typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Message Composer */}
        <MessageComposer
          onSendMessage={sendMessage}
          onTyping={sendTypingSignal}
          disabled={status === 'disconnected'}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </main>

      {/* Interactive Modals */}
      <OnlineParticipantsModal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        users={onlineUsers}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentNickname={nickname}
        onSaveNickname={handleSaveNickname}
        avatarUrl={avatarUrl}
        onChangeAvatarUrl={handleChangeAvatarUrl}
        accentColor={accentColor}
        onChangeAccentColor={handleChangeAccentColor}
        chatBgImage={chatBgImage}
        onChangeChatBgImage={handleChangeChatBgImage}
        chatBgOpacity={chatBgOpacity}
        onChangeChatBgOpacity={handleChangeChatBgOpacity}
      />

    </div>
  );
}
