/**
 * Vite Plugin attaching the StudyOS Full-Stack Backend Middleware
 * Enables seamless execution of AI, Google Drive Storage, Admin API, and Health during dev & preview
 */

import { Plugin } from 'vite';
import { handleServerRequest } from './server/index';

export function studyOsAIPlugin(): Plugin {
  return {
    name: 'studyos-backend-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/') || req.url === '/health')) {
          try {
            const handled = await handleServerRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('[Vite Backend Middleware Error]:', err);
            res.statusCode = 500;
            res.end('Internal Server Error');
            return;
          }
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/') || req.url === '/health')) {
          try {
            const handled = await handleServerRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('[Vite Backend Preview Middleware Error]:', err);
            res.statusCode = 500;
            res.end('Internal Server Error');
            return;
          }
        }
        next();
      });
    },
  };
}
