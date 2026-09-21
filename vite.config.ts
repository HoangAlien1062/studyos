import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { studyOsAIPlugin } from './vite.ai.plugin';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    'https://mwxlqlalmpbclzbmqmvm.supabase.co';
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eGxxbGFsbXBiY2x6Ym1xbXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ5NjgsImV4cCI6MjEwNTQ4MDk2OH0.QouXlyV4kezKb9r7BE0q_FByttj4ury-75d5OunxZVU';

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
