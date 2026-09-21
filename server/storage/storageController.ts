/**
 * Storage Controller handling HTTP requests for /api/storage/*
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireAuth } from '../auth/authVerifier';
import { storageService } from './storageService';

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
    req.on('data', chunk => {
      raw += chunk;
      // 50MB limit check
      if (raw.length > 50 * 1024 * 1024) {
        reject(new Error('Tệp vượt quá giới hạn 50MB'));
      }
    });
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
 * Handle incoming storage HTTP requests
 */
export async function handleStorageRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/storage')) {
    return false;
  }

  const cleanUrl = url.split('?')[0];
  const method = req.method?.toUpperCase();

  // 1. GET /api/storage/status
  if (cleanUrl === '/api/storage/status' && method === 'GET') {
    const quota = await storageService.getQuota();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(quota));
    return true;
  }

  // 2. POST /api/storage/upload
  if (cleanUrl === '/api/storage/upload' && method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return true;

    try {
      const body = await parseJsonBody<{
        name: string;
        mimeType?: string;
        type?: string;
        contentBase64: string;
        subjectId?: string;
        parentFolderId?: string;
      }>(req);

      if (!body.name || !body.contentBase64) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Thiếu tên tệp hoặc nội dung base64' }));
        return true;
      }

      // Convert base64 data to Buffer
      let base64Data = body.contentBase64;
      if (base64Data.includes(';base64,')) {
        base64Data = base64Data.split(';base64,')[1];
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeType = body.mimeType || body.type || 'application/octet-stream';

      const fileMeta = await storageService.uploadFile({
        name: body.name,
        buffer,
        mimeType,
        userId: user.id,
      });

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, file: fileMeta }));
      return true;
    } catch (err: any) {
      console.error('[StorageController] Upload failed:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Lỗi tải tệp lên' }));
      return true;
    }
  }

  // 3. GET /api/storage/file/:id
  const fileMatch = cleanUrl.match(/^\/api\/storage\/file\/([a-zA-Z0-9_-]+)$/);
  if (fileMatch && method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return true;

    const fileId = fileMatch[1];
    try {
      const fileData = await storageService.downloadFile(fileId);
      res.statusCode = 200;
      res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.fileName)}"`);
      res.end(fileData.buffer);
      return true;
    } catch (err: any) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Không tìm thấy tệp' }));
      return true;
    }
  }

  // 4. DELETE /api/storage/file/:id
  if (fileMatch && method === 'DELETE') {
    const user = await requireAuth(req, res);
    if (!user) return true;

    const fileId = fileMatch[1];
    try {
      const success = await storageService.deleteFile(fileId);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success }));
      return true;
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Lỗi khi xóa tệp' }));
      return true;
    }
  }

  return false;
}
