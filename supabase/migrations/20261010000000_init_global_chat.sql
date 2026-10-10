-- ======================================================
-- PLUG & CHAT PRODUCTION DATABASE MIGRATION SCHEMA
-- ======================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar_color TEXT
);

-- 2. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access to all chat messages
CREATE POLICY "Allow public read access to messages"
  ON public.messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy 2: Allow public insert of non-empty messages under 500 characters
CREATE POLICY "Allow public insert to messages"
  ON public.messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(content)) > 0 AND 
    char_length(content) <= 500 AND
    char_length(trim(nickname)) > 0
  );

-- 4. Enable Realtime Replication
-- Publishes inserts on the 'messages' table to all connected subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
