import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleServerRequest } from './index';

/**
 * Vercel Serverless Function entry point source
 * Bundled by esbuild into api/index.js
 * Dispatches all /api/* requests (AI, Google Drive Storage, Admin, Health)
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const handled = await handleServerRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  } catch (err: any) {
    console.error('[Vercel Serverless Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
    }
  }
}
