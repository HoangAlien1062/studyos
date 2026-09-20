export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface NoteItem {
  id: string;
  title: string;
  content: string; // Markdown / LaTeX / checklist content
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  linkedDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}
