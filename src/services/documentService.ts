import { supabase, isSupabaseConfigured, uploadToSupabaseStorage } from '../lib/supabase';
import { DocumentFileType, DocumentItem } from '../types/document';
import { authService } from './authService';
import { storage } from './storage';

const DOCUMENTS_KEY = 'documents';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export const documentService = {
  async getAllDocuments(): Promise<DocumentItem[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped: DocumentItem[] = data.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type as DocumentFileType,
            parentFolderId: d.parent_folder_id,
            size: Number(d.size_bytes || 0),
            subjectId: d.subject_id || undefined,
            tags: d.tags || [],
            isFavorite: Boolean(d.is_favorite),
            content: d.content_preview || undefined,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
          storage.set(DOCUMENTS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error fetching documents:', err);
      }
    }
    return storage.get<DocumentItem[]>(DOCUMENTS_KEY, []);
  },

  async getDocumentsByFolder(folderId: string | null): Promise<DocumentItem[]> {
    const list = await this.getAllDocuments();
    return list.filter(d => d.parentFolderId === folderId);
  },

  async getDocumentById(id: string): Promise<DocumentItem | undefined> {
    const list = await this.getAllDocuments();
    return list.find(d => d.id === id);
  },

  async saveDocument(doc: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<DocumentItem> {
    const list = await this.getAllDocuments();
    const now = new Date().toISOString();
    let saved: DocumentItem;

    if (doc.id) {
      const idx = list.findIndex(d => d.id === doc.id);
      if (idx !== -1) {
        saved = { ...list[idx], ...doc, updatedAt: now };
        list[idx] = saved;
      } else {
        saved = { ...doc, id: `doc-${Date.now()}`, createdAt: now, updatedAt: now };
        list.push(saved);
      }
    } else {
      saved = { ...doc, id: `doc-${Date.now()}`, createdAt: now, updatedAt: now };
      list.push(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        await supabase.from('documents').upsert({
          id: saved.id,
          user_id: userId,
          name: saved.name,
          type: saved.type,
          parent_folder_id: saved.parentFolderId || null,
          subject_id: saved.subjectId || null,
          size_bytes: saved.size || 0,
          is_favorite: saved.isFavorite || false,
          content_preview: saved.content || null,
          tags: saved.tags || [],
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving document:', err);
      }
    }

    storage.set(DOCUMENTS_KEY, list);
    return saved;
  },

  async createFolder(name: string, parentFolderId: string | null = null): Promise<DocumentItem> {
    return this.saveDocument({
      name,
      type: 'folder',
      parentFolderId,
      tags: ['Thư mục'],
      isFavorite: false,
    });
  },

  async deleteDocument(id: string): Promise<boolean> {
    let list = await this.getAllDocuments();
    const target = list.find(d => d.id === id);
    if (target && target.type === 'folder') {
      list = list.filter(d => d.id !== id && d.parentFolderId !== id);
    } else {
      list = list.filter(d => d.id !== id);
    }
    storage.set(DOCUMENTS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('documents').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting document:', err);
      }
    }

    return true;
  },

  async toggleFavorite(id: string): Promise<DocumentItem | undefined> {
    const list = await this.getAllDocuments();
    const target = list.find(d => d.id === id);
    if (!target) return undefined;
    target.isFavorite = !target.isFavorite;
    target.updatedAt = new Date().toISOString();
    storage.set(DOCUMENTS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('documents').update({ is_favorite: target.isFavorite }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error toggling favorite:', err);
      }
    }

    return target;
  },

  async renameDocument(id: string, newName: string): Promise<DocumentItem | undefined> {
    const list = await this.getAllDocuments();
    const target = list.find(d => d.id === id);
    if (!target) return undefined;
    target.name = newName;
    target.updatedAt = new Date().toISOString();
    storage.set(DOCUMENTS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('documents').update({ name: newName }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error renaming document:', err);
      }
    }

    return target;
  },

  async moveDocument(id: string, targetFolderId: string | null): Promise<DocumentItem | undefined> {
    const list = await this.getAllDocuments();
    const target = list.find(d => d.id === id);
    if (!target) return undefined;
    target.parentFolderId = targetFolderId;
    target.updatedAt = new Date().toISOString();
    storage.set(DOCUMENTS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('documents').update({ parent_folder_id: targetFolderId }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error moving document:', err);
      }
    }

    return target;
  },

  async uploadFile(
    file: File,
    parentFolderId: string | null = null,
    subjectId?: string,
    tags: string[] = []
  ): Promise<DocumentItem> {
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    let type: DocumentFileType = 'txt';
    if (ext === 'pdf') type = 'pdf';
    else if (ext === 'docx' || ext === 'doc') type = 'docx';
    else if (ext === 'pptx' || ext === 'ppt') type = 'pptx';
    else if (ext === 'md') type = 'md';
    else if (ext === 'png') type = 'png';
    else if (ext === 'jpg' || ext === 'jpeg') type = 'jpg';

    let content = `Tệp tin: ${fileName} (${(file.size / 1024).toFixed(1)} KB)`;
    if (['txt', 'md', 'json', 'csv'].includes(ext)) {
      try {
        content = await file.text();
      } catch {
        // Fallback
      }
    }

    // 1. Try uploading to backend /api/storage/upload (Google Drive / Storage Server)
    try {
      const token = await authService.getBearerToken();
      if (token) {
        const base64Data = await fileToBase64(file);
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: fileName,
            mimeType: file.type || 'application/octet-stream',
            contentBase64: base64Data,
            subjectId,
            parentFolderId,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.file) {
            content = `Đã lưu trữ an toàn trên Google Drive hệ thống (ID: ${json.file.driveFileId || json.file.id})\n\n` + content;
          }
        }
      }
    } catch (e) {
      console.warn('[Storage] Backend upload attempt bypassed:', e);
    }

    // 2. Fallback to Supabase Storage if configured
    if (supabase && isSupabaseConfigured) {
      try {
        const storageResult = await uploadToSupabaseStorage(file, 'user-docs');
        if (storageResult) {
          content = `Đã lưu trên Supabase Storage Online: ${storageResult.url}\n\n` + content;
        }
      } catch (e) {
        console.warn('[Supabase Storage] Fallback upload error:', e);
      }
    }

    return this.saveDocument({
      name: fileName,
      type,
      parentFolderId,
      size: file.size,
      subjectId,
      tags: tags.length > 0 ? tags : [ext.toUpperCase()],
      isFavorite: false,
      content,
    });
  },
};
