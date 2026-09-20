import { QuestionDifficulty, QuestionItem, QuestionType } from './question';

export type ExamMode = 'random' | 'manual';

export interface ExamConfig {
  title: string;
  subjectId: string;
  chapterIds: string[];
  topicIds: string[];
  questionCount: number;
  difficulty?: QuestionDifficulty | 'mixed';
  questionType?: QuestionType | 'mixed';
  durationMinutes: number; // Thời gian làm bài tính bằng phút
  mode?: ExamMode;
  manualQuestionIds?: string[];
  avoidRecentlyAttempted?: boolean;
  tags?: string[];
}

export interface TopicPerformance {
  topicId?: string;
  topicTitle: string;
  total: number;
  correct: number;
  wrongCount: number;
  accuracy: number;
}

export interface DifficultyPerformance {
  difficulty: QuestionDifficulty;
  total: number;
  correct: number;
  accuracy: number;
}

export interface ExamSession {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  questions: QuestionItem[];
  userAnswers: Record<string, string>; // questionId -> selectedOptionId
  flaggedQuestionIds: string[];
  isSubmitted: boolean;
  score?: number; // 0 to 10
  accuracyPercentage?: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  timeSpentSeconds?: number;
  topicBreakdown?: TopicPerformance[];
  difficultyBreakdown?: DifficultyPerformance[];
  weakTopics?: TopicPerformance[];
  strongTopics?: TopicPerformance[];
  completedAt?: string;
  createdAt: string;
}
