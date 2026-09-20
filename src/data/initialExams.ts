import { ExamSession } from '../types/exam';
import { INITIAL_QUESTIONS } from './initialQuestions';
import { getRelativeDate } from './initialSchedules';

export const INITIAL_EXAMS: ExamSession[] = [
  {
    id: 'exam-1',
    title: 'Thi thử Giữa kỳ: Giải tích 1 & Vi phân',
    subjectId: 'subj-1',
    subjectName: 'Giải tích 1',
    durationMinutes: 45,
    questions: [INITIAL_QUESTIONS[0], INITIAL_QUESTIONS[1], INITIAL_QUESTIONS[2]],
    userAnswers: {
      'q-1': 'opt-1-a', // Đúng
      'q-2': 'opt-2-b', // Đúng
      'q-3': 'opt-3-b', // Sai (chọn b, đúng là c)
    },
    flaggedQuestionIds: ['q-3'],
    isSubmitted: true,
    score: 6.7,
    accuracyPercentage: 66.7,
    correctCount: 2,
    wrongCount: 1,
    skippedCount: 0,
    weakTopics: [
      { topicId: 'topic-1-1-2', topicTitle: 'Tính liên tục và điểm gián đoạn của hàm số', total: 1, correct: 0, wrongCount: 1, accuracy: 0 }
    ],
    completedAt: getRelativeDate(-3) + ' 16:45:00',
    createdAt: '2026-09-12T10:00:00Z',
  },
  {
    id: 'exam-2',
    title: 'Kiểm tra nhanh: Cấu trúc Dữ liệu Tuyến tính',
    subjectId: 'subj-2',
    subjectName: 'Cấu trúc dữ liệu & Giải thuật',
    durationMinutes: 30,
    questions: [INITIAL_QUESTIONS[3], INITIAL_QUESTIONS[4]],
    userAnswers: {
      'q-4': 'opt-4-c', // Đúng
      'q-5': 'opt-5-a', // Đúng
    },
    flaggedQuestionIds: [],
    isSubmitted: true,
    score: 10.0,
    accuracyPercentage: 100,
    correctCount: 2,
    wrongCount: 0,
    skippedCount: 0,
    weakTopics: [],
    completedAt: getRelativeDate(-1) + ' 20:30:00',
    createdAt: '2026-09-15T15:00:00Z',
  }
];
