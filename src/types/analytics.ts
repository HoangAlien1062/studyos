export interface StudyActivityPoint {
  date: string; // e.g., 'T2', 'T3', ... or '2026-09-15'
  questionsAnswered: number;
  flashcardsReviewed: number;
  studyMinutes: number;
}

export interface DailyStudyStats {
  questionsToday: number;
  accuracyToday: number; // 0 - 100
  flashcardsReviewedToday: number;
  topicsCompletedToday: number;
}

export interface ReasonDistributionMetric {
  reason: string;
  count: number;
  percentage: number; // 0 - 100
}

export interface SubjectPerformanceMetric {
  subjectId: string;
  subjectName: string;
  progress: number;
  questionsAnswered: number;
  accuracy: number;
  flashcardsLearned: number;
  topicsCompleted: number;
  totalTopics: number;
}

export interface DetailedWeakTopic {
  topicId: string;
  topicTitle: string;
  subjectId: string;
  subjectName: string;
  attempts: number;
  wrongCount: number;
  accuracy: number;
  repeatMistakes: number;
  isConfirmedWeak: boolean;
}

export interface AnalyticsSummary {
  totalQuestionsAnswered: number;
  overallAccuracyRate: number; // 0-100%
  totalFlashcardsLearned: number;
  totalFlashcardsDue: number;
  totalFlashcardsLearning?: number;
  totalFlashcardsNew?: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
  totalDocumentsCount: number;
  totalNotesCount: number;
  averageExamScore: number; // 0-10
  streakDays: number;
  dailyStats: DailyStudyStats;
  reasonDistribution: ReasonDistributionMetric[];
  subjectPerformances: SubjectPerformanceMetric[];
  weakTopics: DetailedWeakTopic[];
  recentActivityTimeline: {
    id: string;
    action: string;
    target: string;
    timestamp: string;
    icon: string;
  }[];
  weeklyActivity: StudyActivityPoint[];
}
