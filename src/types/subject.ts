export interface Subject {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  progress: number; // 0 to 100
  createdAt: string;
  teacher?: string;
  creditCount?: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  order: number;
  title: string;
  description: string;
}

export interface Topic {
  id: string;
  chapterId: string;
  subjectId: string;
  order: number;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  linkedDocIds: string[];
  linkedNoteIds: string[];
  linkedFlashcardDeckIds: string[];
  linkedQuestionIds: string[];
}
