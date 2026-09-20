import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleAIRequest } from '../server/ai/index';

/**
 * Vercel Serverless Function entry point
 * Dispatches all /api/* requests to the StudyOS AI controller
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const handled = await handleAIRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  } catch (err: any) {
    console.error('[Vercel AI Serverless Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Internal AI Server Error' }));
    }
  }
}
