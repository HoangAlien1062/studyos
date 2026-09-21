/**
 * StudyOS Master Backend Dispatcher
 * Unifies AI Engine, Storage Service (Google Drive), Admin RBAC, and Health Check
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleAIRequest } from './ai/index';
import { handleStorageRequest } from './storage/storageController';
import { handleAdminRequest } from './admin/adminController';

export async function handleServerRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';

  // Handle CORS preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, X-Client-Info, x-mock-role');
    res.end();
    return true;
  }

  // Set default CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, X-Client-Info, x-mock-role');

  // Health check endpoint
  if (url === '/api/health' || url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'StudyOS Backend Engine',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      })
    );
    return true;
  }

  // Public Client Supabase Config endpoint (to ensure multi-device & Vercel zero-fail connection)
  const pathname = url.split('?')[0];
  if (pathname === '/api/auth/config' || pathname.endsWith('/auth/config') || url.includes('/api/auth/config')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(
      JSON.stringify({
        supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mwxlqlalmpbclzbmqmvm.supabase.co',
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eGxxbGFsbXBiY2x6Ym1xbXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ5NjgsImV4cCI6MjEwNTQ4MDk2OH0.QouXlyV4kezKb9r7BE0q_FByttj4ury-75d5OunxZVU',
      })
    );
    return true;
  }

  // 1. Dispatch Storage API (/api/storage/*)
  if (url.startsWith('/api/storage')) {
    const handled = await handleStorageRequest(req, res);
    if (handled) return true;
  }

  // 2. Dispatch Admin API (/api/admin/*)
  if (url.startsWith('/api/admin')) {
    const handled = await handleAdminRequest(req, res);
    if (handled) return true;
  }

  // 3. Dispatch AI Engine API (/api/ai/*)
  if (url.startsWith('/api/ai')) {
    const handled = await handleAIRequest(req, res);
    if (handled) return true;
  }

  return false;
}
