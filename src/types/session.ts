export type StudySessionType = 'flashcard' | 'question_practice' | 'exam' | 'error_review';

export interface StudySessionRecord {
  id: string;
  userId?: string;
  type: StudySessionType;
  title: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  itemsCompleted: number;
  scoreOrAccuracy?: number; // 0-10 or 0-100%
  subjectId?: string;
  topicId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface QuestionAttemptRecord {
  id: string;
  userId?: string;
  questionId: string;
  subjectId: string;
  chapterId?: string;
  topicId?: string;
  selectedAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  timeSpentSeconds: number;
  context: 'practice' | 'exam' | 'error_review';
  examId?: string;
  timestamp: string;
}

export interface WeakTopicMetric {
  topicId: string;
  topicTitle: string;
  subjectId: string;
  subjectName: string;
  totalAttempts: number;
  wrongCount: number;
  repeatMistakesCount: number;
  accuracyRate: number; // 0-100
  lastAttemptAt: string;
  isConfirmedWeak: boolean; // True when totalAttempts >= 3 and (accuracyRate < 60% or repeatMistakesCount >= 2)
}
