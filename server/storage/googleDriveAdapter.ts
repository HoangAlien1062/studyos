/**
 * Google Drive Storage Adapter (REST API v3)
 * Full implementation using native Node.js fetch and node:crypto
 *
 * Folder Structure:
 * MyStudyWeb/
 *   ├── users/
 *   │   └── user_<auth_uid>/
 *   │       └── documents/
 *   └── backups/
 */

import crypto from 'node:crypto';
import type {
  StorageAdapter,
  StorageFileMetadata,
  StorageQuotaInfo,
  StorageWarningLevel,
  UploadFileParams,
} from './storageTypes';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class GoogleDriveAdapter implements StorageAdapter {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private rootFolderId: string;
  private serviceAccountEmail: string;
  private serviceAccountPrivateKey: string;

  private tokenCache: CachedToken | null = null;
  private folderCache: Map<string, string> = new Map();

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    this.serviceAccountPrivateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  }

  public isConfigured(): boolean {
    const hasOAuth = Boolean(this.clientId && this.clientSecret && this.refreshToken);
    const hasServiceAccount = Boolean(this.serviceAccountEmail && this.serviceAccountPrivateKey);
    return hasOAuth || hasServiceAccount;
  }

  /**
   * Obtain a valid OAuth2 Access Token for Google Drive API
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.accessToken;
    }

    // 1. Service Account JWT flow
    if (this.serviceAccountEmail && this.serviceAccountPrivateKey) {
      const token = await this.getAccessTokenFromServiceAccount();
      return token;
    }

    // 2. OAuth2 Refresh Token flow
    if (this.clientId && this.clientSecret && this.refreshToken) {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google OAuth token refresh failed: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      const expiresInMs = (data.expires_in || 3600) * 1000;
      this.tokenCache = {
        accessToken: data.access_token,
        expiresAt: now + expiresInMs,
      };
      return data.access_token;
    }

    throw new Error('Google Drive credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_DRIVE_REFRESH_TOKEN or Service Account credentials.');
  }

  /**
   * Service Account RS256 JWT Flow
   */
  private async getAccessTokenFromServiceAccount(): Promise<string> {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: this.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(this.serviceAccountPrivateKey, 'base64url');
    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Service Account token request failed: ${res.status} - ${err}`);
    }

    const data = await res.json();
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return data.access_token;
  }

  /**
   * Find or create a folder by name and parent ID
   */
  public async ensureFolder(name: string, parentId?: string): Promise<string> {
    const cacheKey = `${parentId || 'root'}:${name}`;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    const token = await this.getAccessToken();
    let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        this.folderCache.set(cacheKey, folderId);
        return folderId;
      }
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create Google Drive folder "${name}": ${err}`);
    }

    const createData = await createRes.json();
    this.folderCache.set(cacheKey, createData.id);
    return createData.id;
  }

  /**
   * Ensure Root Folder "MyStudyWeb"
   */
  public async ensureRootFolder(): Promise<string> {
    if (this.rootFolderId) {
      return this.rootFolderId;
    }
    const rootId = await this.ensureFolder('MyStudyWeb');
    this.rootFolderId = rootId;
    return rootId;
  }

  /**
   * Ensure user document folder: MyStudyWeb/users/user_<userId>/documents/
   */
  public async ensureUserDocumentFolder(userId: string): Promise<string> {
    const rootId = await this.ensureRootFolder();
    const usersFolderId = await this.ensureFolder('users', rootId);
    const userFolderId = await this.ensureFolder(`user_${userId}`, usersFolderId);
    const docsFolderId = await this.ensureFolder('documents', userFolderId);
    return docsFolderId;
  }

  /**
   * Ensure backups folder: MyStudyWeb/backups/
   */
  public async ensureBackupsFolder(): Promise<string> {
    const rootId = await this.ensureRootFolder();
    const backupsFolderId = await this.ensureFolder('backups', rootId);
    return backupsFolderId;
  }

  /**
   * Upload file into Google Drive with multipart payload
   */
  public async uploadFile(params: UploadFileParams): Promise<StorageFileMetadata> {
    const token = await this.getAccessToken();

    // Determine target folder
    let targetFolderId: string;
    if (params.folderCategory === 'backups') {
      targetFolderId = await this.ensureBackupsFolder();
    } else {
      targetFolderId = await this.ensureUserDocumentFolder(params.userId);
    }

    const metadata = {
      name: params.name,
      parents: [targetFolderId],
      properties: {
        userId: params.userId,
        uploadedAt: new Date().toISOString(),
      },
    };

    const boundary = '-------StudyOSDriveBoundary' + crypto.randomBytes(8).toString('hex');
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataHeader = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const mediaHeader = delimiter +
      `Content-Type: ${params.mimeType || 'application/octet-stream'}\r\n\r\n`;

    const payloadBuffer = Buffer.concat([
      Buffer.from(metadataHeader, 'utf8'),
      Buffer.from(mediaHeader, 'utf8'),
      params.buffer,
      Buffer.from(closeDelimiter, 'utf8'),
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType,createdTime,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(payloadBuffer.length),
        },
        body: payloadBuffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Google Drive file upload failed: ${uploadRes.status} - ${err}`);
    }

    const file = await uploadRes.json();
    const now = new Date().toISOString();

    return {
      id: file.id,
      name: file.name || params.name,
      sizeBytes: Number(file.size || params.buffer.length),
      mimeType: file.mimeType || params.mimeType,
      userId: params.userId,
      provider: 'google_drive',
      driveFileId: file.id,
      downloadUrl: file.webContentLink,
      createdAt: file.createdTime || now,
      updatedAt: now,
    };
  }

  /**
   * Download file content from Google Drive
   */
  public async downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const token = await this.getAccessToken();

    // 1. Get file metadata
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) {
      throw new Error(`Failed to fetch file metadata: ${metaRes.statusText}`);
    }
    const meta = await metaRes.json();

    // 2. Fetch file content
    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!contentRes.ok) {
      throw new Error(`Failed to download file content: ${contentRes.statusText}`);
    }

    const arrayBuf = await contentRes.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      mimeType: meta.mimeType || 'application/octet-stream',
      fileName: meta.name || 'download',
    };
  }

  /**
   * Delete file from Google Drive
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok || res.status === 404;
    } catch (err) {
      console.warn('[GoogleDriveAdapter] Delete error:', err);
      return false;
    }
  }

  /**
   * Retrieve storage quota with 80%, 90%, 95% warning thresholds
   */
  public async getQuota(): Promise<StorageQuotaInfo> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to query Drive quota: ${res.statusText}`);
      }

      const data = await res.json();
      const quota = data.storageQuota || {};
      const limit = Number(quota.limit || 0); // 0 means unlimited in Google Workspace
      const usage = Number(quota.usage || quota.usageInDrive || 0);

      let usedPercentage = 0;
      let freeBytes = 0;

      if (limit > 0) {
        usedPercentage = Math.min(100, Math.round((usage / limit) * 1000) / 10);
        freeBytes = Math.max(0, limit - usage);
      } else {
        // Unlimited / Google Workspace
        usedPercentage = 0;
        freeBytes = Number.MAX_SAFE_INTEGER;
      }

      // Warning levels: 80% (Warning), 90% (High), 95% (Critical)
      let warningLevel: StorageWarningLevel = 'normal';
      let warningMessage: string | undefined = undefined;

      if (limit > 0) {
        if (usedPercentage >= 95) {
          warningLevel = 'critical';
          warningMessage = `Nguy cấp: Dung lượng Google Drive hệ thống đã đạt ${usedPercentage}% (gần cạn kiệt). Vui lòng dọn dẹp hoặc nâng cấp gói lưu trữ ngay lập tức!`;
        } else if (usedPercentage >= 90) {
          warningLevel = 'high';
          warningMessage = `Cảnh báo nghiêm trọng: Dung lượng Google Drive hệ thống đã sử dụng ${usedPercentage}%. Cần kiểm tra và giải phóng dung lượng.`;
        } else if (usedPercentage >= 80) {
          warningLevel = 'warning';
          warningMessage = `Lưu ý: Dung lượng Google Drive hệ thống đã vượt ngưỡng ${usedPercentage}%.`;
        }
      }

      return {
        provider: 'google_drive',
        connected: true,
        usedBytes: usage,
        totalBytes: limit,
        freeBytes,
        usedPercentage,
        warningLevel,
        warningMessage,
        rootFolderId: this.rootFolderId || 'MyStudyWeb',
        rootFolderName: 'MyStudyWeb',
      };
    } catch (err: any) {
      return {
        provider: 'google_drive',
        connected: false,
        usedBytes: 0,
        totalBytes: 0,
        freeBytes: 0,
        usedPercentage: 0,
        warningLevel: 'normal',
        warningMessage: `Chưa thể kết nối Google Drive: ${err?.message || 'Lỗi kết nối'}`,
      };
    }
  }

  /**
   * Test connection to Google Drive API
   */
  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        return {
          success: false,
          message: `Kết nối Google Drive thất bại: mã lỗi ${res.status}`,
          details: err,
        };
      }

      const data = await res.json();
      const rootId = await this.ensureRootFolder();

      return {
        success: true,
        message: 'Kết nối Google Drive thành công! Thư mục gốc MyStudyWeb đã sẵn sàng.',
        details: {
          userEmail: data.user?.emailAddress,
          displayName: data.user?.displayName,
          rootFolderId: rootId,
          totalGB: (Number(data.storageQuota?.limit || 0) / (1024 * 1024 * 1024)).toFixed(2),
          usedGB: (Number(data.storageQuota?.usage || 0) / (1024 * 1024 * 1024)).toFixed(2),
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Lỗi kết nối Google Drive: ${err?.message || 'Không xác định'}`,
      };
    }
  }

  /**
   * Create system database backup to MyStudyWeb/backups/
   */
  public async createBackup(filename: string, dataBuffer: Buffer): Promise<{ success: boolean; fileId: string; sizeBytes: number }> {
    const result = await this.uploadFile({
      name: filename,
      buffer: dataBuffer,
      mimeType: 'application/json',
      userId: 'system_admin',
      folderCategory: 'backups',
    });

    return {
      success: true,
      fileId: result.id,
      sizeBytes: result.sizeBytes,
    };
  }
}
