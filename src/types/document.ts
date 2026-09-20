export type DocumentFileType = 'folder' | 'pdf' | 'docx' | 'pptx' | 'txt' | 'md' | 'png' | 'jpg';

export interface DocumentItem {
  id: string;
  name: string;
  type: DocumentFileType;
  parentFolderId: string | null;
  size?: number; // bytes
  subjectId?: string;
  tags: string[];
  isFavorite: boolean;
  content?: string;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}
