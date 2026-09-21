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
  if (url === '/api/auth/config') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
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
