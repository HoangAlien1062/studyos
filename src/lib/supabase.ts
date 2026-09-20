import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CUSTOM_URL_KEY = 'studyos_custom_supabase_url';
const CUSTOM_KEY_KEY = 'studyos_custom_supabase_anon_key';

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

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
  const envUrl = getEnvVar('VITE_SUPABASE_URL');
  const envKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
  return { url: envUrl, anonKey: envKey, isCustom: false };
}

const initialConfig = getEffectiveSupabaseConfig();

export let isSupabaseConfigured = Boolean(
  initialConfig.url &&
  initialConfig.anonKey &&
  initialConfig.url.startsWith('https://') &&
  !initialConfig.url.includes('your-project-ref')
);

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

export function saveCustomSupabaseConfig(url: string, anonKey: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CUSTOM_URL_KEY, url.trim());
      window.localStorage.setItem(CUSTOM_KEY_KEY, anonKey.trim());
    }
  } catch (err) {
    console.error('Failed to save custom supabase config:', err);
  }
  return initSupabase(url.trim(), anonKey.trim());
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
  const envUrl = getEnvVar('VITE_SUPABASE_URL');
  const envKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
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
