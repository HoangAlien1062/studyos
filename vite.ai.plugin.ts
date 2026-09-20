/**
 * Vite Plugin attaching the StudyOS AI Backend Middleware
 * Enables seamless full-stack AI execution during 'npm.cmd run dev' and 'npm.cmd run preview'
 */

import { Plugin } from 'vite';
import { handleAIRequest } from './server/ai/index';

export function studyOsAIPlugin(): Plugin {
  return {
    name: 'studyos-ai-backend-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/ai') || req.url.startsWith('/api/health') || req.url === '/health')) {
          try {
            const handled = await handleAIRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('[Vite AI Middleware Error]:', err);
            res.statusCode = 500;
            res.end('Internal AI Server Error');
            return;
          }
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/ai') || req.url.startsWith('/api/health') || req.url === '/health')) {
          try {
            const handled = await handleAIRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('[Vite AI Preview Middleware Error]:', err);
            res.statusCode = 500;
            res.end('Internal AI Server Error');
            return;
          }
        }
        next();
      });
    },
  };
}
