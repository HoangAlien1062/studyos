/**
 * Storage Types & Interfaces for StudyOS
 * Defines data structures for Google Drive, Supabase Storage, and Local Fallbacks
 */

export interface StorageFileMetadata {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  userId: string;
  provider: 'google_drive' | 'supabase' | 'local';
  driveFileId?: string;
  path?: string;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type StorageWarningLevel = 'normal' | 'warning' | 'high' | 'critical';

export interface StorageQuotaInfo {
  provider: 'google_drive' | 'supabase' | 'local';
  connected: boolean;
  usedBytes: number;
  totalBytes: number;
  freeBytes: number;
  usedPercentage: number;
  warningLevel: StorageWarningLevel;
  warningMessage?: string;
  rootFolderId?: string;
  rootFolderName?: string;
}

export interface UploadFileParams {
  name: string;
  buffer: Buffer;
  mimeType: string;
  userId: string;
  folderCategory?: 'documents' | 'backups';
}

export interface StorageAdapter {
  uploadFile(params: UploadFileParams): Promise<StorageFileMetadata>;
  downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }>;
  deleteFile(fileId: string): Promise<boolean>;
  getQuota(): Promise<StorageQuotaInfo>;
  testConnection(): Promise<{ success: boolean; message: string; details?: any }>;
  createBackup(filename: string, dataBuffer: Buffer): Promise<{ success: boolean; fileId: string; sizeBytes: number }>;
}
