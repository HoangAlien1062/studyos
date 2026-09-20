import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-ref')
);

export let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    console.log('[Supabase Online] Connected successfully to:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase Online] Connection failed:', err);
    supabase = null;
  }
} else {
  console.info(
    '[StudyOS] Đang chạy với dữ liệu mẫu offline. Để kết nối Supabase Online (https://supabase.com), hãy điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env.'
  );
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
