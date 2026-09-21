import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dedicated Vercel Serverless Function: /api/auth/config
 * Provides public Supabase URL and Anon Key directly to the client
 * to ensure 100% connection reliability across all devices and preview URLs.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://mwxlqlalmpbclzbmqmvm.supabase.co';
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eGxxbGFsbXBiY2x6Ym1xbXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ5NjgsImV4cCI6MjEwNTQ4MDk2OH0.QouXlyV4kezKb9r7BE0q_FByttj4ury-75d5OunxZVU';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(
    JSON.stringify({
      supabaseUrl,
      supabaseAnonKey,
      configured: Boolean(
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl.startsWith('https://') &&
        !supabaseUrl.includes('your-project-ref')
      ),
    })
  );
}
