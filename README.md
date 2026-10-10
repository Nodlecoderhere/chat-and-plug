# ⚡ Plug & Chat — Real-Time Account-Free Global Chat

> **A frictionless, real-time, global conversation platform where anyone opens the website and immediately joins one shared public channel with every connected visitor.**

---

## 🌟 Core Features

- **Zero Friction Onboarding**: No registration, no passwords, no email verification, no invite codes, no server selectors. Open the app and chat immediately.
- **Single Global Channel**: All visitors automatically connect to `#global-chat`.
- **Auto Pseudonymous Identity**: Instant friendly nickname generator (`PixelFox42`, `MoonByte17`, `CyberPanda8`) with quick inline nickname customization persisted in browser storage.
- **Real-Time Broadcast**: Powered by Supabase Realtime & Postgres Changes for sub-second live message delivery across all connected clients.
- **Live Online Presence**: Tracks active visitors using Supabase Presence.
- **Smart Message Scroll & Unread Badge**: Auto-scrolls to the newest message when at bottom; floating "New messages available" pill appears when scrolling upward.
- **Multi-Tab & Offline Mesh Mode**: Runs in local mesh mode out of the box when Supabase keys are not yet configured, allowing instant multi-tab real-time testing.
- **Security & RLS**: Strict Row Level Security policies enforce input length (max 500 characters), prevent HTML XSS injections, and guard database access.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, TypeScript 7
- **Styling**: Tailwind CSS v4, Lucide Icons, Plus Jakarta Sans & JetBrains Mono fonts
- **Backend / Real-Time**: Supabase Postgres, Supabase Realtime, Supabase Presence
- **Hosting Target**: Cloudflare Pages / Vercel / Netlify

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. Open multiple tabs or private browser windows to test real-time messaging!

---

## 🗄️ Supabase Backend Setup Guide

To enable global real-time cloud synchronization across different computers and mobile devices:

### Step 1: Create a Free Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Under **Project Settings > API**, copy your **Project URL** and **anon / public key**.

### Step 2: Apply Database Migration Schema
1. Open the **SQL Editor** in your Supabase Dashboard.
2. Paste and run the following migration script (also available in `supabase/migrations/20261010000000_init_global_chat.sql`):

```sql
-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar_color TEXT
);

-- 2. Index for fast pagination
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Public Read Policy
CREATE POLICY "Allow public read access to messages"
  ON public.messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Public Write Policy (with length validation)
CREATE POLICY "Allow public insert to messages"
  ON public.messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(content)) > 0 AND 
    char_length(content) <= 500
  );

-- 6. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
```

*Alternatively, click the **Settings (⚙️)** gear icon directly inside the live Plug & Chat web app interface to enter your keys without editing files!*

---

## 🌐 Deploying to Cloudflare Pages

1. Push your repository to GitHub / GitLab.
2. Log in to **Cloudflare Dashboard** > **Workers & Pages** > **Create application** > **Pages**.
3. Connect your repository.
4. Configure Build Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
5. Add Environment Variables in Cloudflare Pages settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Click **Save and Deploy**. Your account-free global chat site is now live on Cloudflare Pages!

---

## 🔒 Security & Anti-Spam Policy

1. **No Admin Key Exposure**: Only the public `anon` key is exposed in browser code.
2. **XSS Protection**: Message text is rendered as plain text strings or safely linkified using React DOM escaping.
3. **Database Guardrails**: Row Level Security prevents updating or deleting stored messages.
4. **Rate Limiting**: Client and database policies restrict spamming consecutive messages.
5. **Session Pseudonymity**: Visitors are assigned a unique pseudonymous `visitor_id` per browser session.

---

## 🧪 Verification & Test Scenarios

1. **Multi-Window Sync**: Open two separate browser tabs/windows. Send a message in window 1; verify window 2 receives it instantly.
2. **History Persistence**: Reload the page or open a new browser session; confirm recent 50 messages load automatically.
3. **Nickname Randomization**: Click your nickname badge to edit or randomize; verify a system announcement appears.
4. **Presence Counter**: Observe the online count update as tabs open and close.
