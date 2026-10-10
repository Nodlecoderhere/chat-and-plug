import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CUSTOM_URL_KEY = 'plug_chat_supabase_url';
const CUSTOM_KEY_KEY = 'plug_chat_supabase_key';

export function getSupabaseCredentials(): { url: string; key: string; isConfigured: boolean } {
  // Check localStorage first (user-configured via setup modal)
  const customUrl = localStorage.getItem(CUSTOM_URL_KEY);
  const customKey = localStorage.getItem(CUSTOM_KEY_KEY);

  if (customUrl && customKey && !customUrl.includes('YOUR_PROJECT') && customUrl.startsWith('https://')) {
    return { url: customUrl, key: customKey, isConfigured: true };
  }

  // Check env vars
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export function setCustomSupabaseCredentials(url: string, key: string): boolean {
  if (url && key && url.startsWith('https://')) {
    localStorage.setItem(CUSTOM_URL_KEY, url.trim());
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
