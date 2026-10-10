import React, { useState } from 'react';
import { setCustomSupabaseCredentials, clearCustomSupabaseCredentials, getSupabaseCredentials } from '../lib/supabase';
import { Database, Check, Copy, Key, Globe, Shield, AlertCircle, Trash2, ExternalLink, X } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

const SQL_MIGRATION_CODE = `-- ==========================================
-- PLUG & CHAT PRODUCTION DATABASE SCHEMA
-- Execute in Supabase SQL Editor
-- ==========================================

-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar_color TEXT
);

-- 2. Add Index on Timestamp for Fast History Retrieval
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Anyone (anon) can read messages
CREATE POLICY "Allow public read access to messages"
  ON public.messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. RLS Policy: Anyone (anon) can insert new messages with non-empty text
CREATE POLICY "Allow public insert to messages"
  ON public.messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(content)) > 0 AND 
    char_length(content) <= 500
  );

-- 6. Enable Realtime Replication for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
`;

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onCredentialsUpdated,
}) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url || '');
  const [key, setKey] = useState(currentCreds.key || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_CODE);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!url.startsWith('https://')) {
      setErrorNotice('Supabase URL must start with https://');
      return;
    }
    if (!key) {
      setErrorNotice('Publishable/Anon key cannot be empty');
      return;
    }

    const success = setCustomSupabaseCredentials(url, key);
    if (success) {
      setSuccessNotice('Supabase credentials saved! Connecting to live cloud database...');
      setTimeout(() => {
        onCredentialsUpdated();
        onClose();
      }, 1200);
    } else {
      setErrorNotice('Invalid credentials format.');
    }
  };

  const handleResetToDemo = () => {
    clearCustomSupabaseCredentials();
    setUrl('');
    setKey('');
    setSuccessNotice('Reset to Local Mesh Demo Mode.');
    setTimeout(() => {
      onCredentialsUpdated();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-[#1e1f20] border border-[#282a2d] p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282a2d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f5223] text-[#c2ebd0]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#e3e2e6] font-['Google_Sans']">
                Cloud Backend Configuration
              </h3>
              <p className="text-xs text-[#c4c6d0]">
                Google Pixel Supabase Realtime Setup
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

        {/* Current status banner */}
        <div className={`mt-4 rounded-2xl p-4 border ${
          currentCreds.isConfigured
            ? 'border-[#81c995]/30 bg-[#0f5223]/30 text-[#c2ebd0]'
            : 'border-[#fdd663]/30 bg-[#4a3800]/30 text-[#ffe088]'
        }`}>
          <div className="flex items-start gap-3">
            {currentCreds.isConfigured ? (
              <Globe className="h-5 w-5 text-[#81c995] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-[#fdd663] shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-bold font-['Google_Sans']">
                {currentCreds.isConfigured
                  ? 'Connected to Live Supabase Backend'
                  : 'Currently Running in Local Mesh Demo Mode'}
              </h4>
              <p className="mt-1 text-xs leading-relaxed opacity-90 font-['Google_Sans_Text']">
                {currentCreds.isConfigured
                  ? 'Your app is actively syncing messages and presence globally across all devices using Supabase Postgres & Realtime.'
                  : 'You can test multi-tab real-time chat immediately! To sync globally across the internet on Cloudflare Pages, enter your free Supabase project keys below.'}
              </p>
            </div>
          </div>
        </div>

        {successNotice && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#0f5223] p-3 text-xs text-[#c2ebd0]">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {errorNotice && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#3c1414] p-3 text-xs text-[#f2b8b5]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSaveCredentials} className="mt-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#a8c7fa] flex items-center gap-2 font-['Google_Sans']">
            <Key className="h-3.5 w-3.5" />
            <span>Supabase API Credentials</span>
          </h4>

          <div>
            <label className="block text-xs font-semibold text-[#e3e2e6] mb-1 font-['Google_Sans']">
              Project URL (<code className="text-[#a8c7fa]">VITE_SUPABASE_URL</code>)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full rounded-2xl bg-[#282a2d] px-4 py-2.5 text-xs font-mono text-[#a8c7fa] placeholder-[#8e9099] focus:outline-none focus:ring-2 focus:ring-[#a8c7fa]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#e3e2e6] mb-1 font-['Google_Sans']">
              Publishable / Anon Key (<code className="text-[#a8c7fa]">VITE_SUPABASE_PUBLISHABLE_KEY</code>)
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full rounded-2xl bg-[#282a2d] px-4 py-2.5 text-xs font-mono text-[#a8c7fa] placeholder-[#8e9099] focus:outline-none focus:ring-2 focus:ring-[#a8c7fa]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {currentCreds.isConfigured ? (
              <button
                type="button"
                onClick={handleResetToDemo}
                className="flex items-center gap-1.5 rounded-full bg-[#3c1414] px-4 py-2 text-xs font-semibold text-[#f2b8b5] hover:bg-[#4d1818] transition"
              >
                <Trash2 className="h-3.5 w-3.5 text-[#f2b8b5]" />
                <span>Disconnect Keys</span>
              </button>
            ) : <div />}

            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-[#a8c7fa] px-6 py-2.5 text-xs font-bold text-[#00315a] hover:bg-[#c2e7ff] transition font-['Google_Sans'] shadow-md"
            >
              <Check className="h-4 w-4" />
              <span>Save &amp; Connect</span>
            </button>
          </div>
        </form>

        {/* Database Migration Code Section */}
        <div className="mt-6 border-t border-[#282a2d] pt-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#a8c7fa] flex items-center gap-2 font-['Google_Sans']">
              <Shield className="h-3.5 w-3.5" />
              <span>Supabase SQL Migration Script</span>
            </h4>

            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 rounded-full bg-[#282a2d] px-3.5 py-1.5 text-xs font-semibold text-[#a8c7fa] hover:bg-[#333538] transition"
            >
              {copiedSql ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#81c995]" />
                  <span>Copied SQL!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#a8c7fa]" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>

          <pre className="max-h-44 overflow-y-auto rounded-2xl bg-[#131314] p-3.5 font-mono text-[11px] text-[#e3e2e6] leading-relaxed border border-[#282a2d]">
            {SQL_MIGRATION_CODE}
          </pre>

          <p className="mt-2 text-[11px] text-[#8e9099] flex items-center justify-between">
            <span>Run this script in your Supabase SQL Editor.</span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#a8c7fa] hover:underline"
            >
              <span>Open Supabase</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

      </div>
    </div>
  );
};
