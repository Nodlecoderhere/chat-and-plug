import React, { useRef, useEffect, useState, UIEvent } from 'react';
import { Message } from '../types/chat';
import { ChatMessage } from './ChatMessage';
import { ArrowDown, MessageSquare, Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentVisitorId: string;
  currentNickname?: string;
  hasMoreOlder?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  chatBgImage?: string;
  chatBgOpacity?: number;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentVisitorId,
  currentNickname,
  hasMoreOlder,
  isLoadingOlder,
  onLoadOlder,
  onReact,
  onReply,
  onScrollToMessage,
  chatBgImage,
  chatBgOpacity = 0.5,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const isAtBottomRef = useRef<boolean>(true);
  const prevMessagesLength = useRef<number>(messages.length);

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setShowScrollBottomBtn(false);
      setUnreadCount(0);
      isAtBottomRef.current = true;
    }
  };

  // Detect scroll position
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    const isNearBottom = distanceToBottom < 100;
    isAtBottomRef.current = isNearBottom;

    if (isNearBottom) {
      setShowScrollBottomBtn(false);
      setUnreadCount(0);
    } else {
      setShowScrollBottomBtn(true);
    }
  };

  // Auto-scroll on new message
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const isNewSelfMessage = messages[messages.length - 1]?.visitor_id === currentVisitorId;

      if (isAtBottomRef.current || isNewSelfMessage) {
        scrollToBottom(true);
      } else {
        setUnreadCount((prev) => prev + 1);
        setShowScrollBottomBtn(true);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentVisitorId]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  // Format date headers
  const getDateLabel = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      }
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#131314]">
      
      {/* Custom User Wallpaper & Overlay Dimming */}
      {chatBgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
            style={{ backgroundImage: `url(${chatBgImage})` }}
          />
          <div
            className="absolute inset-0 bg-[#131314] transition-opacity duration-300"
            style={{ opacity: chatBgOpacity }}
          />
        </>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-10 h-full w-full overflow-y-auto px-3 py-4 sm:px-6 space-y-1 scroll-smooth"
      >
        {/* Load older history button */}
        {hasMoreOlder && (
          <div className="flex justify-center pb-3">
            <button
              onClick={onLoadOlder}
              disabled={isLoadingOlder}
              className="flex items-center gap-2 rounded-full bg-[#282a2d]/90 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-[#a8c7fa] transition hover:bg-[#333538] disabled:opacity-50"
            >
              {isLoadingOlder ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a8c7fa]" />
                  <span>Loading history...</span>
                </>
              ) : (
                <span>Load Earlier Messages</span>
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center px-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#282a2d]/90 text-[#a8c7fa] shadow-md mb-4 backdrop-blur-md">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-[#e3e2e6] font-['Google_Sans']">
              Global Conversation Ready
            </h3>
            <p className="mt-1 max-w-sm text-sm text-[#c4c6d0]">
              Be the first to say hello! Everyone connected in chat will see your message instantly.
            </p>
          </div>
        )}

        {/* Render message stream with date headers */}
        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const currentDateLabel = getDateLabel(msg.created_at);
          const prevDateLabel = prevMsg ? getDateLabel(prevMsg.created_at) : null;
          const showDateHeader = currentDateLabel !== prevDateLabel;

          const isSameSender =
            prevMsg &&
            !showDateHeader &&
            !msg.is_system &&
            !prevMsg.is_system &&
            prevMsg.visitor_id === msg.visitor_id &&
            new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 1000 * 60 * 3;

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && (
                <div className="my-4 flex items-center justify-center px-4">
                  <span className="rounded-full bg-[#1e1f20]/90 backdrop-blur-md border border-[#282a2d] px-3.5 py-1 text-[11px] font-bold text-[#a8c7fa] uppercase tracking-wider font-mono">
                    {currentDateLabel}
                  </span>
                </div>
              )}

              <ChatMessage
                message={msg}
                isCurrentUser={msg.visitor_id === currentVisitorId}
                currentNickname={currentNickname}
                showAvatar={!isSameSender}
                onReact={onReact}
                onReply={onReply}
                onScrollToMessage={onScrollToMessage}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Floating Material FAB Scroll-To-Bottom pill */}
      {showScrollBottomBtn && (
        <div className="absolute bottom-4 right-6 z-20">
          <button
            onClick={() => scrollToBottom(true)}
            className="flex items-center gap-2 rounded-full bg-[#a8c7fa] px-4 py-2.5 text-xs font-bold text-[#00315a] shadow-xl transition hover:scale-105 active:scale-95 animate-bounce font-['Google_Sans']"
          >
            <ArrowDown className="h-4 w-4 text-[#00315a]" />
            <span>
              {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : 'Latest messages'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
