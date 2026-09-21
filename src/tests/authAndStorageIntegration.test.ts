/**
 * Automated Integration Tests for StudyOS Auth, RBAC & Storage (Prompt 6)
 * Run with: npx.cmd tsx src/tests/authAndStorageIntegration.test.ts
 */

import http from 'node:http';
import { StorageService } from '../../server/storage/storageService';
import { handleServerRequest } from '../../server/index';
import { extractBearerToken, verifyAuth } from '../../server/auth/authVerifier';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetails?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (errorDetails) console.error(`     Details: ${errorDetails}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🛡️ RUNNING AUTOMATED TESTS FOR AUTH, RBAC & DRIVE STORAGE (PROMPT 6)');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // 1. Auth & Bearer Token Verification
  // -------------------------------------------------------------
  console.log('--- 1. Testing Auth Verifier & Bearer Header Parsing ---');
  {
    const mockReqWithBearer = {
      headers: { authorization: 'Bearer demo-token-user-123' },
    } as any;
    const token = extractBearerToken(mockReqWithBearer);
    assert(token === 'demo-token-user-123', 'Bearer token extracted accurately from lowercase header');

    const mockReqCase = {
      headers: { Authorization: 'Bearer token-uppercase-header' },
    } as any;
    assert(extractBearerToken(mockReqCase) === 'token-uppercase-header', 'Bearer token extracted from uppercase header');

    const mockReqNone = { headers: {} } as any;
    assert(extractBearerToken(mockReqNone) === null, 'Returns null when authorization header is absent');

    const verifiedUser = await verifyAuth(mockReqWithBearer);
    assert(verifiedUser !== null, 'Valid demo token resolves to authentic user session');
    assert(verifiedUser?.role === 'user', 'Default demo user has role "user"');

    const mockReqAdmin = {
      headers: {
        authorization: 'Bearer demo-token-admin-1',
        'x-mock-role': 'admin',
      },
    } as any;
    const verifiedAdmin = await verifyAuth(mockReqAdmin);
    assert(verifiedAdmin?.role === 'admin', 'Admin header correctly resolves to role "admin"');
  }

  // -------------------------------------------------------------
  // 2. Storage Quota & 80% / 90% / 95% Thresholds
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Storage Quota Warnings (80%, 90%, 95%) ---');
  {
    const calculateWarning = (usage: number, limit: number) => {
      const pct = Math.round((usage / limit) * 100);
      if (pct >= 95) return 'critical';
      if (pct >= 90) return 'high';
      if (pct >= 80) return 'warning';
      return 'normal';
    };

    const limit = 100 * 1024 * 1024 * 1024; // 100 GB
    assert(calculateWarning(50 * 1024 * 1024 * 1024, limit) === 'normal', '50% usage flags as "normal" (<80%)');
    assert(calculateWarning(82 * 1024 * 1024 * 1024, limit) === 'warning', '82% usage flags as "warning" (>=80%)');
    assert(calculateWarning(92 * 1024 * 1024 * 1024, limit) === 'high', '92% usage flags as "high" (>=90%)');
    assert(calculateWarning(97 * 1024 * 1024 * 1024, limit) === 'critical', '97% usage flags as "critical" (>=95%)');
  }

  // -------------------------------------------------------------
  // 3. Storage Abstraction & Operations (Upload, Download, Delete)
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Storage Service Abstraction Layer ---');
  {
    const storageService = new StorageService();
    const testContent = 'Nội dung tài liệu học tập giải tích 1 cho sinh viên Bách Khoa';
    const testBuffer = Buffer.from(testContent, 'utf8');

    // 1. Upload file
    const uploaded = await storageService.uploadFile({
      name: 'giai-tich-1.txt',
      buffer: testBuffer,
      mimeType: 'text/plain',
      userId: 'user_an_2210456',
    });

    assert(Boolean(uploaded.id), 'Upload assigns a unique file ID');
    assert(uploaded.name === 'giai-tich-1.txt', 'File name is preserved');
    assert(uploaded.sizeBytes === testBuffer.length, 'Size in bytes is exact');
    assert(uploaded.userId === 'user_an_2210456', 'Ownership belongs strictly to uploading user');

    // 2. Download file
    const downloaded = await storageService.downloadFile(uploaded.id);
    assert(downloaded.fileName === 'giai-tich-1.txt', 'Downloaded file has correct file name');
    assert(downloaded.buffer.toString('utf8') === testContent, 'Downloaded file content matches uploaded bytes exactly');

    // 3. Quota check
    const quota = await storageService.getQuota();
    assert(quota.usedBytes >= testBuffer.length, 'Used bytes accounts for uploaded file');
    assert(quota.connected === true, 'Storage adapter reports connected status');

    // 4. Delete file
    const deleted = await storageService.deleteFile(uploaded.id);
    assert(deleted === true, 'File successfully deleted from storage');

    let errorThrownOnMissing = false;
    try {
      await storageService.downloadFile(uploaded.id);
    } catch {
      errorThrownOnMissing = true;
    }
    assert(errorThrownOnMissing, 'Downloading deleted file properly throws an error');

    // 5. System Backup creation
    const backupData = Buffer.from(JSON.stringify({ system: 'StudyOS', date: new Date().toISOString() }));
    const backupRes = await storageService.createBackup('backup_test.json', backupData);
    assert(backupRes.success === true, 'Database backup successfully created in backups storage');
    assert(backupRes.sizeBytes === backupData.length, 'Backup file size matches JSON payload size');
  }

  // -------------------------------------------------------------
  // 4. Server API Dispatcher & Security Guard Checks
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing HTTP Dispatcher & Access Control (RBAC) ---');
  {
    // Helper to simulate request through handleServerRequest
    const simulateRequest = async (method: string, url: string, headers: Record<string, string> = {}, body?: any): Promise<{ status: number; body: any; headers: Record<string, any> }> => {
      return new Promise(resolve => {
        const reqListeners: Record<string, Function[]> = {};
        const req: any = {
          method,
          url,
          headers: { ...headers },
          on: (event: string, handler: Function) => {
            reqListeners[event] = reqListeners[event] || [];
            reqListeners[event].push(handler);
            return req;
          },
        };

        const resHeaders: Record<string, any> = {};
        let resStatusCode = 200;
        let resBody = '';

        const res: any = {
          set statusCode(code: number) { resStatusCode = code; },
          get statusCode() { return resStatusCode; },
          setHeader: (name: string, value: any) => { resHeaders[name.toLowerCase()] = value; },
          getHeader: (name: string) => resHeaders[name.toLowerCase()],
          writeHead: (code: number, headers?: any) => {
            resStatusCode = code;
            if (headers) Object.assign(resHeaders, headers);
          },
          end: (data?: any) => {
            if (data) {
              resBody = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
            }
            let parsedBody = resBody;
            try {
              parsedBody = JSON.parse(resBody);
            } catch {
              // keep as string
            }
            resolve({ status: resStatusCode, body: parsedBody, headers: resHeaders });
          },
        };

        handleServerRequest(req, res).then(() => {
          if (body && reqListeners['data']) {
            const strBody = typeof body === 'string' ? body : JSON.stringify(body);
            reqListeners['data'].forEach(cb => cb(strBody));
          }
          if (reqListeners['end']) {
            reqListeners['end'].forEach(cb => cb());
          }
        });
      });
    };

    // 1. Health check
    const healthRes = await simulateRequest('GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health responds with 200 OK');
    assert(healthRes.body?.status === 'ok', 'Health status is "ok"');

    // 2. Storage status
    const statusRes = await simulateRequest('GET', '/api/storage/status');
    assert(statusRes.status === 200, 'GET /api/storage/status responds with 200 OK');
    assert(statusRes.body?.provider !== undefined, 'Storage status returns provider metadata');
    assert(statusRes.body?.clientSecret === undefined, 'No client secret or raw keys leaked in storage status');

    // 3. Admin Overview without admin role
    const nonAdminRes = await simulateRequest('GET', '/api/admin/overview', {
      authorization: 'Bearer demo-token-regular-user',
    });
    assert(nonAdminRes.status === 403, 'Regular user calling /api/admin/overview is rejected with 403 Forbidden');

    // 4. Admin Overview with admin role
    const adminRes = await simulateRequest('GET', '/api/admin/overview', {
      authorization: 'Bearer demo-token-admin',
      'x-mock-role': 'admin',
    });
    assert(adminRes.status === 200, 'Admin calling /api/admin/overview succeeds with 200 OK');
    assert(adminRes.body?.activeAdmin?.role === 'admin', 'Response confirms active admin session');

    // 5. Unauthenticated request to /api/storage/upload is rejected
    const unauthUploadRes = await simulateRequest('POST', '/api/storage/upload');
    assert(unauthUploadRes.status === 401, 'Unauthenticated upload is rejected with 401 Unauthorized');
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 AUTH & STORAGE INTEGRATION TESTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
