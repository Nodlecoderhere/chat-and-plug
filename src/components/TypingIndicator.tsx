import React from 'react';
import { TypingUser } from '../hooks/useGlobalChat';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (!typingUsers || typingUsers.length === 0) return null;

  let text = '';
  if (typingUsers.length === 1) {
    text = `${typingUsers[0].nickname} is typing`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0].nickname} and ${typingUsers[1].nickname} are typing`;
  } else {
    text = `${typingUsers[0].nickname}, ${typingUsers[1].nickname} and ${typingUsers.length - 2} others are typing`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-['Google_Sans_Text'] text-[#a8c7fa] bg-[#131314] animate-fadeIn">
      {/* Google Material animated dots */}
      <div className="flex items-center gap-1 rounded-full bg-[#282a2d] px-2.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#a8c7fa] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-[#a8c7fa] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-[#a8c7fa] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      <span className="truncate max-w-xs italic text-[11px] font-medium text-[#c4c6d0]">
        {text}
      </span>
    </div>
  );
};
