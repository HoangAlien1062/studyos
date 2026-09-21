/**
 * Storage Service Abstraction Layer
 * Seamlessly selects Google Drive Storage (when Admin configured) or Local Fallback Adapter
 */

import { GoogleDriveAdapter } from './googleDriveAdapter';
import type {
  StorageAdapter,
  StorageFileMetadata,
  StorageQuotaInfo,
  UploadFileParams,
} from './storageTypes';

class LocalFallbackAdapter implements StorageAdapter {
  private inMemoryFiles: Map<string, { buffer: Buffer; mimeType: string; fileName: string; userId: string; createdAt: string }> = new Map();

  async uploadFile(params: UploadFileParams): Promise<StorageFileMetadata> {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    this.inMemoryFiles.set(fileId, {
      buffer: params.buffer,
      mimeType: params.mimeType,
      fileName: params.name,
      userId: params.userId,
      createdAt: now,
    });

    return {
      id: fileId,
      name: params.name,
      sizeBytes: params.buffer.length,
      mimeType: params.mimeType,
      userId: params.userId,
      provider: 'local',
      path: `local://storage/${params.userId}/${params.name}`,
      createdAt: now,
      updatedAt: now,
    };
  }

  async downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const file = this.inMemoryFiles.get(fileId);
    if (!file) {
      throw new Error(`File with id ${fileId} not found in local storage`);
    }
    return {
      buffer: file.buffer,
      mimeType: file.mimeType,
      fileName: file.fileName,
    };
  }

  async deleteFile(fileId: string): Promise<boolean> {
    return this.inMemoryFiles.delete(fileId);
  }

  async getQuota(): Promise<StorageQuotaInfo> {
    let usedBytes = 0;
    for (const file of this.inMemoryFiles.values()) {
      usedBytes += file.buffer.length;
    }
    const totalBytes = 5 * 1024 * 1024 * 1024; // 5 GB default local quota
    const usedPercentage = Math.round((usedBytes / totalBytes) * 1000) / 10;

    return {
      provider: 'local',
      connected: true,
      usedBytes,
      totalBytes,
      freeBytes: totalBytes - usedBytes,
      usedPercentage,
      warningLevel: usedPercentage >= 95 ? 'critical' : usedPercentage >= 90 ? 'high' : usedPercentage >= 80 ? 'warning' : 'normal',
      warningMessage: 'Hệ thống đang hoạt động ở chế độ Local Storage Fallback. Quản trị viên vui lòng cấu hình biến môi trường Google Drive để lưu trữ đám mây.',
      rootFolderName: 'MyStudyWeb (Local)',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    return {
      success: true,
      message: 'Bộ lưu trữ Local Fallback đang hoạt động bình thường.',
      details: {
        fileCount: this.inMemoryFiles.size,
        mode: 'Local/Development',
      },
    };
  }

  async createBackup(filename: string, dataBuffer: Buffer): Promise<{ success: boolean; fileId: string; sizeBytes: number }> {
    const res = await this.uploadFile({
      name: filename,
      buffer: dataBuffer,
      mimeType: 'application/json',
      userId: 'system_admin',
      folderCategory: 'backups',
    });
    return {
      success: true,
      fileId: res.id,
      sizeBytes: res.sizeBytes,
    };
  }
}

export class StorageService implements StorageAdapter {
  private driveAdapter: GoogleDriveAdapter;
  private localAdapter: LocalFallbackAdapter;

  constructor() {
    this.driveAdapter = new GoogleDriveAdapter();
    this.localAdapter = new LocalFallbackAdapter();
  }

  public getActiveAdapter(): StorageAdapter {
    if (this.driveAdapter.isConfigured()) {
      return this.driveAdapter;
    }
    return this.localAdapter;
  }

  public isDriveConfigured(): boolean {
    return this.driveAdapter.isConfigured();
  }

  async uploadFile(params: UploadFileParams): Promise<StorageFileMetadata> {
    return this.getActiveAdapter().uploadFile(params);
  }

  async downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    return this.getActiveAdapter().downloadFile(fileId);
  }

  async deleteFile(fileId: string): Promise<boolean> {
    return this.getActiveAdapter().deleteFile(fileId);
  }

  async getQuota(): Promise<StorageQuotaInfo> {
    return this.getActiveAdapter().getQuota();
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    return this.getActiveAdapter().testConnection();
  }

  async createBackup(filename: string, dataBuffer: Buffer): Promise<{ success: boolean; fileId: string; sizeBytes: number }> {
    return this.getActiveAdapter().createBackup(filename, dataBuffer);
  }
}

export const storageService = new StorageService();
