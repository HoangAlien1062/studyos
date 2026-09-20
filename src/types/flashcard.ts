export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';
export type FlashcardState = 'new' | 'learning' | 'due' | 'learned';
export type FlashcardDifficulty = 'easy' | 'medium' | 'hard';

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  tags?: string[];
  difficulty?: FlashcardDifficulty;
  state: FlashcardState;
  repetitionCount: number;
  intervalDays: number;
  easeFactor?: number; // Default 2.5 in SM-2
  lastReviewedAt?: string;
  nextReviewDate: string; // YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  subjectId?: string;
  topicId?: string;
  color: string;
  createdAt: string;
  updatedAt?: string;
  // Dynamic or computed counts
  totalCount?: number;
  newCount?: number;
  learningCount?: number;
  dueCount?: number;
  learnedCount?: number;
}

export interface FlashcardSessionStats {
  totalReviewed: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  durationSeconds: number;
  accuracy: number; // Percentage of good + easy / total
}
