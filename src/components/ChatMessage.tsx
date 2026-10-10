import React, { useState } from 'react';
import { Message } from '../types/chat';
import { Copy, Check, AlertCircle, Sparkles } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isCurrentUser,
  showAvatar = true,
  onReact,
}) => {
  const [copied, setCopied] = useState(false);
  const [reportState, setReportState] = useState(false);

  // System notification badge
  if (message.is_system) {
    return (
      <div className="my-3 flex justify-center px-4">
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
      className={`group relative flex w-full items-end gap-2.5 my-1.5 px-2 ${
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Sender Avatar */}
      {showAvatar ? (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm font-['Google_Sans'] ${
            isCurrentUser ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#384766] text-[#d3e3fd]'
          }`}
        >
          {initial}
        </div>
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

        {/* Google Messages Bubble Shape */}
        <div
          className={`relative px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm transition-all ${
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

      {/* Hover action toolbar */}
      <div className={`absolute top-0 hidden group-hover:flex items-center gap-1 rounded-full bg-[#282a2d] border border-[#383a3d] px-2 py-1 shadow-lg z-10 ${
        isCurrentUser ? 'right-12' : 'left-12'
      }`}>
        {['👍', '🔥', '❤️', '😂', '🚀','💀','🤷‍♂️','💦'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact?.(message.id, emoji)}
            className="rounded-full p-1 text-xs hover:bg-[#383a3d] transition transform hover:scale-125"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}

        <div className="h-3 w-[1px] bg-[#383a3d] my-auto mx-0.5" />

        <button
          onClick={handleCopy}
          className="rounded-full p-1 text-[#c4c6d0] hover:bg-[#383a3d] hover:text-[#e3e2e6] transition"
          title="Copy message"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#81c995]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={() => {
            setReportState(true);
            setTimeout(() => setReportState(false), 2500);
          }}
          className="rounded-full p-1 text-[#c4c6d0] hover:bg-[#383a3d] hover:text-[#fdd663] transition"
          title="Flag message"
        >
          <AlertCircle className={`h-3.5 w-3.5 ${reportState ? 'text-[#fdd663]' : ''}`} />
        </button>
      </div>
    </div>
  );
};
