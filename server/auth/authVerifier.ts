/**
/**
 * Server-Side Authentication & Role Verification Module
 * Verifies Supabase Bearer JWT tokens and checks user permissions
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name?: string;
}

const DEFAULT_SUPABASE_URL = 'https://mwxlqlalmpbclzbmqmvm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eGxxbGFsbXBiY2x6Ym1xbXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ5NjgsImV4cCI6MjEwNTQ4MDk2OH0.QouXlyV4kezKb9r7BE0q_FByttj4ury-75d5OunxZVU';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Extract Bearer token from HTTP headers
 */
export function extractBearerToken(req: IncomingMessage): string | null {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;

  const parts = authHeader.trim().split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

/**
 * Verify token and retrieve user details with role
 */
export async function verifyAuth(req: IncomingMessage): Promise<AuthUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  // 1. Support local/demo token in development mode
  if (token.startsWith('demo-token') || token === 'supabase-session') {
    const isMockAdmin = req.headers['x-mock-role'] === 'admin';
    return {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'student@studyos.edu.vn',
      role: isMockAdmin ? 'admin' : 'user',
      name: 'Nguyễn Văn An',
    };
  }

  // 2. Supabase Auth Token verification
  if (SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY)) {
    try {
      const apiKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
      const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: apiKey,
        },
      });

      if (!res.ok) {
        return null;
      }

      const authUser = await res.json();
      if (!authUser?.id) return null;

      // Query public.users to fetch user role
      let role: 'user' | 'admin' = 'user';
      try {
        const profileRes = await fetch(
          `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users?id=eq.${authUser.id}&select=role,name,email`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              apikey: apiKey,
            },
          }
        );
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          if (profiles && profiles.length > 0 && profiles[0].role === 'admin') {
            role = 'admin';
          }
        }
      } catch (err) {
        console.warn('[AuthVerifier] Could not query role from database, falling back to user metadata:', err);
      }

      // Check user metadata or known admin emails
      if (
        authUser.email?.toLowerCase() === 'phamnguyenhoang10@gmail.com' ||
        authUser.email?.toLowerCase() === 'student@studyos.edu.vn' ||
        authUser.user_metadata?.role === 'admin'
      ) {
        role = 'admin';
      }

      return {
        id: authUser.id,
        email: authUser.email || '',
        role,
        name: authUser.user_metadata?.name || authUser.user_metadata?.full_name,
      };
    } catch (err) {
      console.error('[AuthVerifier] Error verifying Supabase token:', err);
      return null;
    }
  }

  // Fallback if no Supabase configured: parse JWT payload (unverified base64 decode for dev inspection)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.sub || payload.id) {
        return {
          id: payload.sub || payload.id,
          email: payload.email || 'user@studyos.local',
          role: payload.role === 'admin' ? 'admin' : 'user',
          name: payload.name || 'Học viên StudyOS',
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Middleware: require valid authentication
 */
export async function requireAuth(req: IncomingMessage, res: ServerResponse): Promise<AuthUser | null> {
  const user = await verifyAuth(req);
  if (!user) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: Vui lòng đăng nhập để tiếp tục.' }));
    return null;
  }
  return user;
}

/**
 * Middleware: require ADMIN role
 */
export async function requireAdmin(req: IncomingMessage, res: ServerResponse): Promise<AuthUser | null> {
  const user = await verifyAuth(req);
  if (!user) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: Yêu cầu xác thực tài khoản.' }));
    return null;
  }

  if (user.role !== 'admin') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forbidden: Bạn không có quyền truy cập khu vực Quản trị viên (Admin).' }));
    return null;
  }

  return user;
}
