import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { studyOsAIPlugin } from './vite.ai.plugin';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [react(), studyOsAIPlugin()],
    server: {
      port: 5173,
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            icons: ['lucide-react'],
            math: ['katex'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
