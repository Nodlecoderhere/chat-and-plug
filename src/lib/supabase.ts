import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CUSTOM_URL_KEY = 'plug_chat_supabase_url';
const CUSTOM_KEY_KEY = 'plug_chat_supabase_key';

const DEFAULT_SUPABASE_URL = 'https://hdjcbbeisjkjjohlukur.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_rLm1FrnCMu3NR57CE50xJA_zpHfff3d';

function cleanSupabaseUrl(rawUrl: string): string {
  let cleaned = (rawUrl || '').trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function getSupabaseCredentials(): { url: string; key: string; isConfigured: boolean } {
  // Check localStorage first
  const customUrl = cleanSupabaseUrl(localStorage.getItem(CUSTOM_URL_KEY) || '');
  const customKey = (localStorage.getItem(CUSTOM_KEY_KEY) || '').trim();

  if (customUrl && customKey && !customUrl.includes('YOUR_PROJECT') && customUrl.startsWith('https://')) {
    return { url: customUrl, key: customKey, isConfigured: true };
  }

  // Check env vars or default fallback
  const envUrl = cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const envKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY).trim();

  const isConfigured = Boolean(
    envUrl &&
    envKey &&
    !envUrl.includes('YOUR_PROJECT') &&
    !envUrl.includes('placeholder') &&
    envUrl.startsWith('https://')
  );

  return {
    url: envUrl,
    key: envKey,
    isConfigured
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentInstanceUrl = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return null;
  }

  if (!supabaseInstance || currentInstanceUrl !== url) {
    try {
      supabaseInstance = createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      currentInstanceUrl = url;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export function setCustomSupabaseCredentials(url: string, key: string): boolean {
  const cleanedUrl = cleanSupabaseUrl(url);
  if (cleanedUrl && key && cleanedUrl.startsWith('https://')) {
    localStorage.setItem(CUSTOM_URL_KEY, cleanedUrl);
    localStorage.setItem(CUSTOM_KEY_KEY, key.trim());
    supabaseInstance = null; // reset
    return true;
  }
  return false;
}

export function clearCustomSupabaseCredentials(): void {
  localStorage.removeItem(CUSTOM_URL_KEY);
  localStorage.removeItem(CUSTOM_KEY_KEY);
  supabaseInstance = null;
}
