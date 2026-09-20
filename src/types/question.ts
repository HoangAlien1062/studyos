export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'fill_in_the_blank'
  | 'matching';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionItem {
  id: string;
  content: string;
  image?: string;
  options: QuestionOption[];
  correctOptionId: string; // Used for single_choice & true_false
  correctOptionIds?: string[]; // Used for multiple_choice
  correctAnswerText?: string; // Used for short_answer / fill_in_the_blank
  explanation: string;
  subjectId: string;
  chapterId?: string;
  topicId?: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  tags: string[];
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  scoreRatio: number; // 0 to 1
  feedback?: string;
  expectedAnswers: string[];
  userAnswers: string[];
}

export interface QuestionFilterCriteria {
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: QuestionDifficulty | 'all';
  type?: QuestionType | 'all';
  searchQuery?: string;
  tag?: string;
  source?: string;
}
