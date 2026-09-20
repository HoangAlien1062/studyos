import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { studyOsAIPlugin } from './vite.ai.plugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), studyOsAIPlugin()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
          math: ['katex']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
