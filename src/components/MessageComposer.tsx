import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Smile, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface MessageComposerProps {
  onSendMessage: (content: string) => Promise<{ success: boolean; error?: string }>;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

const EMOJI_PRESETS = ['👍', '🔥', '❤️', '😂', '🚀', '⚡', '🎉', '💯', '👀', '✨', '👋', '💡', '🤖', '💬', '🌌', '🙌'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (errorMsg) setErrorMsg(null);

    // Auto-resize textarea height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    // Trigger typing indicator
    if (onTyping) {
      if (val.trim().length > 0) {
        onTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2500);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        onTyping(false);
      }
    }
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isSubmitting || disabled) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onTyping) onTyping(false);

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await onSendMessage(text);

    if (result.success) {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } else {
      setErrorMsg(result.error || 'Failed to send message.');
    }

    setIsSubmitting(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
    if (onTyping) onTyping(true);
  };

  const charCount = input.length;
  const isOverLimit = charCount > 500;

  return (
    <div className="relative w-full bg-[#1e1f20] border-t border-[#282a2d] p-3 sm:px-6 sm:py-4">
      
      {/* Rate limit / Error notice */}
      {errorMsg && (
        <div className="mb-2 flex items-center justify-between rounded-2xl bg-[#3c1414] border border-[#f2b8b5]/30 px-4 py-2 text-xs text-[#f2b8b5]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-[#f2b8b5] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[#f2b8b5] hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Material Emoji Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-40 flex max-w-xs flex-wrap gap-1.5 rounded-3xl bg-[#282a2d] border border-[#383a3d] p-3.5 shadow-2xl animate-scaleUp">
          {EMOJI_PRESETS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="rounded-full p-2 text-lg hover:bg-[#383a3d] transition hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Google Pixel Composer Bar */}
      <div className="relative flex items-end gap-2.5 rounded-[28px] bg-[#282a2d] p-2 shadow-sm focus-within:ring-2 focus-within:ring-[#a8c7fa]">
        
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="rounded-full p-2 text-[#c4c6d0] hover:bg-[#383a3d] hover:text-[#a8c7fa] transition"
          title="Insert Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Message everyone..."
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm text-[#e3e2e6] placeholder-[#8e9099] focus:outline-none disabled:opacity-50 font-['Google_Sans_Text']"
        />

        {/* Character Counter */}
        <div className="mb-2.5 hidden sm:block text-[11px] font-mono text-[#8e9099]">
          <span className={isOverLimit ? 'text-[#f2b8b5] font-bold' : ''}>
            {charCount}
          </span>
          /500
        </div>

        {/* Google Pixel Circular FAB Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input.trim() || isOverLimit || isSubmitting || disabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#a8c7fa] text-[#00315a] shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          title="Send Message (Enter)"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5 text-[#00315a]" />
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-[#8e9099] px-2 font-['Google_Sans_Text']">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#a8c7fa]" />
          <span>Press <b>Enter</b> to send, <b>Shift+Enter</b> for new line</span>
        </span>
        <span className="hidden xs:inline text-[10px]">
          Google Pixel Material You UI
        </span>
      </div>
    </div>
  );
};
