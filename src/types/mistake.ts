import { QuestionOption } from './question';

export const COMMON_MISTAKE_REASONS = [
  'Không nhớ kiến thức',
  'Hiểu sai đề',
  'Tính toán sai',
  'Nhầm công thức',
  'Cẩu thả',
  'Đọc thiếu dữ kiện',
  'Chưa hiểu bản chất',
  'Khác',
] as const;

export type CommonMistakeReason = (typeof COMMON_MISTAKE_REASONS)[number];

export interface MistakeAttemptLog {
  timestamp: string;
  selectedAnswer: string;
  context?: string;
}

export interface MistakeItem {
  id: string;
  questionId: string;
  questionContent: string;
  options: QuestionOption[];
  selectedOptionId: string;
  correctOptionId: string;
  explanation: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  topicId?: string;
  topicTitle?: string;
  reason: string;
  reviewCount: number;
  lastReviewedAt?: string;
  isReviewed: boolean;
  attemptHistory?: MistakeAttemptLog[];
  createdAt: string;
  updatedAt?: string;
}

export interface MistakeFilterCriteria {
  subjectId?: string;
  topicId?: string;
  reason?: string;
  onlyUnreviewed?: boolean;
  frequentlyMissed?: boolean; // reviewCount >= 2
  searchQuery?: string;
}
