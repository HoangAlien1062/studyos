/**
 * Admin Controller handling /api/admin/* endpoints
 * Strictly guarded by requireAdmin() role check
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireAdmin } from '../auth/authVerifier';
import { storageService } from '../storage/storageService';

const DEFAULT_SUPABASE_URL = 'https://mwxlqlalmpbclzbmqmvm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eGxxbGFsbXBiY2x6Ym1xbXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ5NjgsImV4cCI6MjEwNTQ4MDk2OH0.QouXlyV4kezKb9r7BE0q_FByttj4ury-75d5OunxZVU';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// In-memory audit logs store
const auditLogs: Array<{
  id: string;
  adminEmail: string;
  action: string;
  category: string;
  details: any;
  createdAt: string;
}> = [
  {
    id: 'log-1',
    adminEmail: 'admin@studyos.edu.vn',
    action: 'SYSTEM_BOOT',
    category: 'system',
    details: { message: 'Hệ thống StudyOS Server đã khởi động thành công' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function logAdminAction(adminEmail: string, action: string, category: string, details: any) {
  auditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    adminEmail,
    action,
    category,
    details,
    createdAt: new Date().toISOString(),
  });
  if (auditLogs.length > 200) auditLogs.pop();
}

/**
 * Helper to parse JSON body from IncomingMessage
 */
async function parseJsonBody<T = any>(req: IncomingMessage): Promise<T> {
  if ((req as any).body) {
    if (typeof (req as any).body === 'object') return (req as any).body as T;
    if (typeof (req as any).body === 'string') {
      try {
        return JSON.parse((req as any).body) as T;
      } catch {
        return {} as T;
      }
    }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Dữ liệu JSON không hợp lệ'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Handle incoming admin HTTP requests
 */
export async function handleAdminRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/admin')) {
    return false;
  }

  try {
    // All /api/admin/* endpoints strictly require Admin role
    const admin = await requireAdmin(req, res);
    if (!admin) return true;

    const cleanUrl = url.split('?')[0];
    const method = req.method?.toUpperCase();

  // 1. GET /api/admin/overview
  if (cleanUrl === '/api/admin/overview' && method === 'GET') {
    const quota = await storageService.getQuota();

    // Query stats from Supabase or fallback defaults
    let totalUsers = 1;
    let totalDocuments = 0;
    let totalSubjects = 0;
    let totalExams = 0;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const headers = {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        };

        const [uRes, dRes, sRes, eRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/users?select=id`, { headers, method: 'HEAD' }),
          fetch(`${SUPABASE_URL}/rest/v1/documents?select=id`, { headers, method: 'HEAD' }),
          fetch(`${SUPABASE_URL}/rest/v1/subjects?select=id`, { headers, method: 'HEAD' }),
          fetch(`${SUPABASE_URL}/rest/v1/exams?select=id`, { headers, method: 'HEAD' }),
        ]);

        const getCount = (r: Response) => {
          const range = r.headers.get('content-range');
          if (range && range.includes('/')) {
            const count = parseInt(range.split('/')[1], 10);
            return isNaN(count) ? 0 : count;
          }
          return 0;
        };

        totalUsers = getCount(uRes) || 1;
        totalDocuments = getCount(dRes);
        totalSubjects = getCount(sRes);
        totalExams = getCount(eRes);
      } catch (e) {
        console.warn('[AdminController] Failed to query DB counts:', e);
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        totalUsers,
        totalDocuments,
        totalSubjects,
        totalExams,
        storageQuota: quota,
        activeAdmin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      })
    );
    return true;
  }

  // 2. GET /api/admin/users
  if (cleanUrl === '/api/admin/users' && method === 'GET') {
    let usersList: any[] = [];

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const uRes = await fetch(
          `${SUPABASE_URL}/rest/v1/users?select=id,email,name,role,education_level,grade_or_year,school,major,created_at&order=created_at.desc`,
          {
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: SUPABASE_SERVICE_ROLE_KEY,
            },
          }
        );
        if (uRes.ok) {
          usersList = await uRes.json();
        }
      } catch (err) {
        console.warn('[AdminController] Error fetching users list:', err);
      }
    }

    if (usersList.length === 0) {
      usersList = [
        {
          id: admin.id,
          email: admin.email,
          name: admin.name || 'Quản trị viên StudyOS',
          role: 'admin',
          education_level: 'university',
          grade_or_year: 'Admin',
          school: 'Đại học Bách Khoa',
          major: 'Quản trị hệ thống',
          created_at: new Date().toISOString(),
        },
      ];
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(usersList));
    return true;
  }

  // 3. POST /api/admin/users/role
  if (cleanUrl === '/api/admin/users/role' && method === 'POST') {
    try {
      const body = await parseJsonBody<{ userId: string; newRole: 'user' | 'admin' }>(req);
      if (!body.userId || !['user', 'admin'].includes(body.newRole)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Dữ liệu cập nhật role không hợp lệ' }));
        return true;
      }

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${body.userId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: body.newRole, updated_at: new Date().toISOString() }),
        });
      }

      logAdminAction(admin.email, 'UPDATE_USER_ROLE', 'admin', {
        targetUserId: body.userId,
        newRole: body.newRole,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, userId: body.userId, role: body.newRole }));
      return true;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Lỗi cập nhật role người dùng' }));
      return true;
    }
  }

  // 4. GET /api/admin/storage/quota
  if (cleanUrl === '/api/admin/storage/quota' && method === 'GET') {
    const quota = await storageService.getQuota();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(quota));
    return true;
  }

  // 5. POST /api/admin/storage/test
  if (cleanUrl === '/api/admin/storage/test' && method === 'POST') {
    const result = await storageService.testConnection();
    logAdminAction(admin.email, 'TEST_STORAGE_CONNECTION', 'storage', result);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
    return true;
  }

  // 6. POST /api/admin/backup
  if (cleanUrl === '/api/admin/backup' && method === 'POST') {
    try {
      const backupFilename = `studyos_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const backupPayload = {
        timestamp: new Date().toISOString(),
        initiatedBy: admin.email,
        version: '1.0.0',
        metadata: {
          service: 'StudyOS Education Platform',
          environment: process.env.NODE_ENV || 'production',
        },
      };

      const buffer = Buffer.from(JSON.stringify(backupPayload, null, 2), 'utf8');
      const backupResult = await storageService.createBackup(backupFilename, buffer);

      logAdminAction(admin.email, 'CREATE_SYSTEM_BACKUP', 'backup', {
        filename: backupFilename,
        sizeBytes: backupResult.sizeBytes,
        fileId: backupResult.fileId,
      });

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          message: 'Tạo bản sao lưu hệ thống lên Google Drive thành công!',
          backup: {
            filename: backupFilename,
            sizeBytes: backupResult.sizeBytes,
            fileId: backupResult.fileId,
            createdAt: new Date().toISOString(),
          },
        })
      );
      return true;
    } catch (err: any) {
      console.error('[AdminController] Backup failed:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Tạo bản sao lưu thất bại' }));
      return true;
    }
  }

  // 7. GET /api/admin/logs
  if (cleanUrl === '/api/admin/logs' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(auditLogs));
    return true;
  }

  return false;
  } catch (err: any) {
    console.error('[AdminController Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Lỗi xử lý yêu cầu quản trị' }));
    }
    return true;
  }
}
