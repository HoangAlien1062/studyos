import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://mwxlqlalmpbclzbmqmvm.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eGxxbGFsbXBiY2x6Ym1xbXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ5NjgsImV4cCI6MjEwNTQ4MDk2OH0.QouXlyV4kezKb9r7BE0q_FByttj4ury-75d5OunxZVU';

const CUSTOM_URL_KEY = 'studyos_custom_supabase_url';
const CUSTOM_KEY_KEY = 'studyos_custom_supabase_anon_key';

// Safe accessor that works in both Vite (via define replacement) and Node.js / tsx
function readEnv(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  try {
    if (key === 'VITE_SUPABASE_URL') {
      const val = import.meta.env.VITE_SUPABASE_URL;
      if (val && typeof val === 'string' && val.startsWith('https://')) return val;
    }
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      const val = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (val && typeof val === 'string' && val.length > 20) return val;
    }
  } catch {}

  if (typeof process !== 'undefined' && process.env) {
    if (key === 'VITE_SUPABASE_URL') {
      const val = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      if (val && val.startsWith('https://')) return val;
    }
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      const val = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (val && val.length > 20) return val;
    }
  }

  return key === 'VITE_SUPABASE_URL' ? DEFAULT_SUPABASE_URL : DEFAULT_SUPABASE_ANON_KEY;
}

export function getStoredCustomSupabaseConfig(): { url: string; anonKey: string } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        url: window.localStorage.getItem(CUSTOM_URL_KEY) || '',
        anonKey: window.localStorage.getItem(CUSTOM_KEY_KEY) || '',
      };
    }
  } catch {}
  return { url: '', anonKey: '' };
}

export function getEffectiveSupabaseConfig(): { url: string; anonKey: string; isCustom: boolean } {
  const custom = getStoredCustomSupabaseConfig();
  if (custom.url && custom.anonKey && custom.url.startsWith('https://')) {
    return { url: custom.url, anonKey: custom.anonKey, isCustom: true };
  }
  const envUrl = readEnv('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const envKey = readEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;
  return { url: envUrl, anonKey: envKey, isCustom: false };
}

const initialConfig = getEffectiveSupabaseConfig();

export let isSupabaseConfigured = true;

export let supabase: SupabaseClient | null = null;

export function initSupabase(url?: string, anonKey?: string): boolean {
  const targetUrl = url || getEffectiveSupabaseConfig().url;
  const targetKey = anonKey || getEffectiveSupabaseConfig().anonKey;

  if (targetUrl && targetKey && targetUrl.startsWith('https://') && !targetUrl.includes('your-project-ref')) {
    try {
      supabase = createClient(targetUrl, targetKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      isSupabaseConfigured = true;
      console.log('[Supabase Online] Connected successfully to:', targetUrl);
      return true;
    } catch (err) {
      console.warn('[Supabase Online] Connection failed:', err);
      supabase = null;
      isSupabaseConfigured = false;
      return false;
    }
  } else {
    supabase = null;
    isSupabaseConfigured = false;
    return false;
  }
}

// Initialize on module load
initSupabase();

/**
 * Auto-recovery: If client hasn't loaded config from static Vite build,
 * fetch the public configuration seamlessly from the backend serverless API
 */
export async function ensureSupabaseOnline(): Promise<boolean> {
  if (isSupabaseConfigured && supabase) return true;

  try {
    const res = await fetch('/api/auth/config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        return initSupabase(data.supabaseUrl, data.supabaseAnonKey);
      }
    }
  } catch (err) {
    console.warn('[Supabase] Auto-recovery config check error:', err);
  }
  return isSupabaseConfigured;
}

// Trigger auto-recovery in background
if (!isSupabaseConfigured && typeof window !== 'undefined') {
  ensureSupabaseOnline();
}

export function saveCustomSupabaseConfig(url: string, anonKey: string): boolean {
  let cleanUrl = url.trim();
  let cleanKey = anonKey.trim();

  // Smart detection: If user accidentally swapped URL and Key
  if ((cleanUrl.startsWith('sb_') || cleanUrl.startsWith('ey')) && cleanKey.startsWith('https://')) {
    const temp = cleanUrl;
    cleanUrl = cleanKey;
    cleanKey = temp;
  }

  if (!cleanUrl.startsWith('https://')) {
    console.warn('[Supabase Config] Project URL must start with https://');
    return false;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CUSTOM_URL_KEY, cleanUrl);
      window.localStorage.setItem(CUSTOM_KEY_KEY, cleanKey);
    }
  } catch (err) {
    console.error('Failed to save custom supabase config:', err);
  }
  return initSupabase(cleanUrl, cleanKey);
}

export function clearCustomSupabaseConfig(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CUSTOM_URL_KEY);
      window.localStorage.removeItem(CUSTOM_KEY_KEY);
    }
  } catch (err) {
    console.error('Failed to clear custom supabase config:', err);
  }
  const envUrl = readEnv('VITE_SUPABASE_URL');
  const envKey = readEnv('VITE_SUPABASE_ANON_KEY');
  return initSupabase(envUrl, envKey);
}

/**
 * Upload tệp tin lên Supabase Storage bucket 'studyos-files'
 */
export async function uploadToSupabaseStorage(
  file: File,
  folderPath: string = 'documents'
): Promise<{ url: string; path: string } | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('studyos-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('studyos-files').getPublicUrl(data.path);
    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('[Supabase Storage] Lỗi tải tệp tin lên storage:', err);
    return null;
  }
}
