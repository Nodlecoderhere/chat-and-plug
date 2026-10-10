import React, { useState } from 'react';
import { UserPresence } from '../types/chat';
import { Users, Search, X, Shield, Circle } from 'lucide-react';

interface OnlineParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserPresence[];
}

export const OnlineParticipantsModal: React.FC<OnlineParticipantsModalProps> = ({
  isOpen,
  onClose,
  users,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = users.filter((u) =>
    u.nickname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-[32px] bg-[#1e1f20] border border-[#282a2d] p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282a2d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f5223] text-[#c2ebd0]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e3e2e6] font-['Google_Sans']">
                Online Visitors
              </h3>
              <p className="text-xs text-[#c4c6d0]">
                {users.length} active participant{users.length !== 1 ? 's' : ''} online
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#c4c6d0] hover:bg-[#282a2d] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-[#8e9099]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search online nicknames..."
            className="w-full rounded-full bg-[#282a2d] pl-10 pr-4 py-2.5 text-xs text-[#e3e2e6] placeholder-[#8e9099] focus:outline-none focus:ring-2 focus:ring-[#a8c7fa]"
          />
        </div>

        {/* User List */}
        <div className="mt-4 max-h-64 overflow-y-auto space-y-2 pr-1">
          {filtered.map((u) => (
            <div
              key={u.visitor_id}
              className="flex items-center justify-between rounded-2xl bg-[#282a2d] p-3 transition hover:bg-[#333538]"
            >
              <div className="flex items-center gap-3">
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.nickname}
                    className="h-9 w-9 shrink-0 rounded-full object-cover border border-[#a8c7fa]"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#004a77] text-xs font-bold text-[#c2e7ff] font-['Google_Sans'] shrink-0">
                    {u.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-[#e3e2e6]">
                      {u.nickname}
                    </span>
                    {u.is_current_user && (
                      <span className="rounded-full bg-[#a8c7fa]/20 px-2 py-0.2 text-[9px] font-bold text-[#a8c7fa]">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8e9099]">
                    Visitor ID: {u.visitor_id.substring(0, 12)}...
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#81c995] font-medium">
                <Circle className="h-2 w-2 fill-[#81c995] text-[#81c995]" />
                <span className="text-[11px]">Active</span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-[#8e9099]">
              No matching online participants found.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#282a2d] pt-4 text-xs text-[#8e9099]">
          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-[#a8c7fa]" />
            <span>Anonymous Presence</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-full bg-[#a8c7fa] px-5 py-2 font-bold text-[#00315a] hover:bg-[#c2e7ff] font-['Google_Sans']"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
