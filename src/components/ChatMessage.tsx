import React, { useState } from 'react';
import { Message } from '../types/chat';
import { Copy, Check, AlertCircle, Sparkles, Reply } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  currentNickname?: string;
  currentUserAvatarUrl?: string;
  userAvatarsMap?: Map<string, string>;
  showAvatar?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isCurrentUser,
  currentNickname,
  currentUserAvatarUrl,
  userAvatarsMap,
  showAvatar = true,
  onReact,
  onReply,
  onScrollToMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [reportState, setReportState] = useState(false);
  const [showMobileToolbar, setShowMobileToolbar] = useState(false);

  const isReplyToMe = Boolean(
    message.reply_to &&
    currentNickname &&
    message.reply_to.nickname.trim().toLowerCase() === currentNickname.trim().toLowerCase()
  );

  const effectiveAvatarUrl =
    message.avatar_url ||
    (isCurrentUser ? currentUserAvatarUrl : userAvatarsMap?.get(message.visitor_id));

  // System notification badge
  if (message.is_system) {
    return (
      <div id={`msg-${message.id}`} className="my-3 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-[#282a2d] px-4 py-1.5 text-xs font-medium text-[#a8c7fa]">
          <Sparkles className="h-3.5 w-3.5 text-[#8ab4f8]" />
          <span className="font-['Google_Sans_Text']">{message.content}</span>
        </div>
      </div>
    );
  }

  // Format timestamp (e.g. "14:23")
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert URLs to clickable safe links
  const renderMessageContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#a8c7fa] underline underline-offset-2 hover:text-[#d3e3fd] break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const initial = message.nickname.charAt(0).toUpperCase();

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex w-full items-end gap-2.5 my-1.5 px-2 transition-colors duration-500 rounded-2xl ${
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Sender Avatar */}
      {showAvatar ? (
        effectiveAvatarUrl ? (
          <img
            src={effectiveAvatarUrl}
            alt={message.nickname}
            className="h-8 w-8 shrink-0 rounded-full object-cover shadow-sm border border-[#383a3d]"
          />
        ) : (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm font-['Google_Sans'] ${
              isCurrentUser ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#384766] text-[#d3e3fd]'
            }`}
          >
            {initial}
          </div>
        )
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Bubble Container */}
      <div className={`flex max-w-[82%] sm:max-w-[72%] flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        
        {/* Sender Name Header */}
        {showAvatar && (
          <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px] font-medium text-[#c4c6d0]">
            <span className="font-mono font-bold text-[#e3e2e6]">{message.nickname}</span>
            {isCurrentUser && (
              <span className="rounded bg-[#a8c7fa]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#a8c7fa] uppercase">
                You
              </span>
            )}
            <span className="text-[10px] text-[#8e9099]">{formatTime(message.created_at)}</span>
          </div>
        )}

        {/* Quoted parent message box if this is a reply */}
        {message.reply_to && (
          <div
            onClick={() => onScrollToMessage?.(message.reply_to!.id)}
            className={`mb-1.5 cursor-pointer max-w-full rounded-2xl border-l-4 px-3.5 py-2 text-xs shadow-md transition hover:opacity-95 active:scale-98 ${
              isReplyToMe
                ? 'bg-[#1a382b] border-[#81c995] text-[#c2ebd0] ring-1 ring-[#81c995]/40'
                : isCurrentUser
                ? 'bg-[#00315a]/90 border-[#a8c7fa] text-[#d3e3fd]'
                : 'bg-[#1e1f20] border-[#a8c7fa] text-[#c4c6d0]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold font-mono">
              <div className="flex items-center gap-1.5 text-[#a8c7fa] truncate">
                <Reply className="h-3.5 w-3.5 shrink-0 text-[#a8c7fa]" />
                <span className="truncate">
                  {isReplyToMe ? `Replying to YOU (${message.reply_to.nickname})` : `Replying to ${message.reply_to.nickname}`}
                </span>
              </div>
              {isReplyToMe && (
                <span className="shrink-0 rounded-full bg-[#81c995] text-[#0f5223] px-2 py-0.2 text-[9px] font-extrabold uppercase tracking-wide">
                  YOUR MESSAGE
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-[11px] opacity-85 break-words mt-1">
              {message.reply_to.content}
            </p>
          </div>
        )}

        {/* Google Messages Bubble Shape */}
        <div
          onClick={() => setShowMobileToolbar((prev) => !prev)}
          className={`relative px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm transition-all cursor-pointer ${
            isCurrentUser
              ? 'pixel-bubble-user bg-[#004a77] text-[#c2e7ff] rounded-[22px] rounded-br-[4px]'
              : 'pixel-bubble-other bg-[#282a2d] text-[#e3e2e6] rounded-[22px] rounded-bl-[4px]'
          }`}
        >
          {renderMessageContent(message.content)}

          {!showAvatar && (
            <span className="ml-2 text-[9px] opacity-60 float-right mt-1 font-mono">
              {formatTime(message.created_at)}
            </span>
          )}
        </div>

        {/* Hover or Tap compact reaction & action bar below message */}
        <div
          className={`${
            showMobileToolbar ? 'flex' : 'hidden group-hover:flex'
          } items-center gap-0.5 mt-1 rounded-full bg-[#1e1f20]/95 backdrop-blur-md border border-[#383a3d] px-1.5 py-0.5 shadow-md z-10 transition-all duration-200 animate-fadeIn ${
            isCurrentUser ? 'self-end' : 'self-start'
          }`}
        >
          <button
            onClick={() => {
              onReply?.(message);
              setShowMobileToolbar(false);
            }}
            className="rounded-full px-1.5 py-0.5 text-[#c4c6d0] hover:bg-[#383a3d] hover:text-[#a8c7fa] transition flex items-center gap-1 text-[10px] font-bold"
            title="Reply to message"
          >
            <Reply className="h-3 w-3 text-[#a8c7fa]" />
            <span>Reply</span>
          </button>

          <div className="h-2.5 w-[1px] bg-[#383a3d] my-auto mx-0.5" />

          {['👍', '🔥', '❤️', '😂', '🚀', '💀'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact?.(message.id, emoji);
                setShowMobileToolbar(false);
              }}
              className="rounded-full p-0.5 text-[11px] hover:bg-[#383a3d] transition transform hover:scale-125"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}

          <div className="h-2.5 w-[1px] bg-[#383a3d] my-auto mx-0.5" />

          <button
            onClick={() => {
              handleCopy();
              setShowMobileToolbar(false);
            }}
            className="rounded-full p-0.5 text-[#c4c6d0] hover:bg-[#383a3d] hover:text-[#e3e2e6] transition"
            title="Copy message"
          >
            {copied ? <Check className="h-3 w-3 text-[#81c995]" /> : <Copy className="h-3 w-3" />}
          </button>

          <button
            onClick={() => {
              setReportState(true);
              setTimeout(() => setReportState(false), 2500);
              setShowMobileToolbar(false);
            }}
            className="rounded-full p-0.5 text-[#c4c6d0] hover:bg-[#383a3d] hover:text-[#fdd663] transition"
            title="Flag message"
          >
            <AlertCircle className={`h-3 w-3 ${reportState ? 'text-[#fdd663]' : ''}`} />
          </button>
        </div>

        {/* Emoji Reactions display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className="flex items-center gap-1 rounded-full bg-[#282a2d] border border-[#383a3d] px-2 py-0.5 text-xs text-[#e3e2e6] hover:bg-[#333538]"
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-semibold text-[#a8c7fa]">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
