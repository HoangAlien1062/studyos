import { INITIAL_EXAMS } from '../data/initialExams';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ExamConfig, ExamSession } from '../types/exam';
import { examGenerator } from './algorithms/examGenerator';
import { examGrader, ExamGradingResult } from './algorithms/examGrader';
import { authService } from './authService';
import { mistakeService } from './mistakeService';
import { questionService } from './questionService';
import { sessionService } from './sessionService';
import { storage } from './storage';
import { subjectService } from './subjectService';

const EXAMS_KEY = 'exams';
const DRAFT_PREFIX = 'exam_draft_';

export const examService = {
  async getExams(): Promise<ExamSession[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: examsData, error } = await supabase
          .from('exams')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && examsData) {
          const { data: attemptsData } = await supabase.from('exam_attempts').select('*');
          const mapped: ExamSession[] = examsData.map(e => {
            const attempt = attemptsData?.find(a => a.exam_id === e.id);
            return {
              id: e.id,
              title: e.title,
              subjectId: e.subject_id || '',
              subjectName: e.subject_name,
              durationMinutes: e.duration_minutes,
              questions: [],
              userAnswers: attempt?.user_answers || {},
              flaggedQuestionIds: [],
              isSubmitted: Boolean(attempt?.is_submitted),
              score: attempt?.score,
              accuracyPercentage: attempt?.accuracy_percentage,
              correctCount: attempt?.correct_count,
              wrongCount: attempt?.wrong_count,
              skippedCount: attempt?.skipped_count,
              weakTopics: attempt?.weak_topics || [],
              completedAt: attempt?.completed_at,
              createdAt: e.created_at,
            };
          });
          storage.set(EXAMS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading exams:', err);
      }
    }

    return storage.get<ExamSession[]>(EXAMS_KEY, []);
  },

  async getExamById(id: string): Promise<ExamSession | undefined> {
    const list = await this.getExams();
    return list.find(e => e.id === id);
  },

  /**
   * Sinh đề thi dựa trên thuật toán ExamGenerator
   */
  async buildExam(config: ExamConfig): Promise<ExamSession> {
    // 1. Lấy toàn bộ câu hỏi thật của môn học từ questionService
    const allQuestions = await questionService.getQuestions({
      subjectId: config.subjectId,
    });

    const subject = await subjectService.getSubjectById(config.subjectId);
    const subjectName = subject?.name || 'Môn học';

    // 2. Lấy danh sách câu hỏi đã làm gần đây nếu người dùng bật tùy chọn tránh câu đã làm
    let recentQuestionIds: string[] = [];
    if (config.avoidRecentlyAttempted) {
      const recentAttempts = await sessionService.getAttempts(undefined, config.subjectId);
      recentQuestionIds = recentAttempts.slice(0, 30).map(a => a.questionId);
    }

    // 3. Gọi ExamGenerator (sẽ ném lỗi nếu không đủ số lượng câu hỏi thật, không sinh câu giả)
    const newExam = examGenerator.generate(config, {
      allQuestions,
      recentQuestionIds,
      subjectName,
    });

    const list = await this.getExams();
    list.unshift(newExam);
    storage.set(EXAMS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = await authService.getProfile();
        const userId = authData?.user?.id || user?.id;
        await supabase.from('exams').insert({
          id: newExam.id,
          user_id: userId,
          title: newExam.title,
          subject_id: newExam.subjectId,
          subject_name: newExam.subjectName,
          duration_minutes: newExam.durationMinutes,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error creating exam:', err);
      }
    }

    return newExam;
  },

  /**
   * Chấm điểm và phân tích kết quả bài thi tự động
   */
  async submitExam(
    examId: string,
    answers: Record<string, string>,
    timeSpentSeconds: number = 0
  ): Promise<{ exam: ExamSession; grading: ExamGradingResult }> {
    const list = await this.getExams();
    const exam = list.find(e => e.id === examId);
    if (!exam) throw new Error('Không tìm thấy đề thi.');

    // 1. Lấy danh mục chủ đề để tra cứu tên
    const allTopics = await subjectService.getTopics(undefined, exam.subjectId);
    const topicLookup: Record<string, string> = {};
    for (const t of allTopics) {
      topicLookup[t.id] = t.title;
    }

    // 2. Chấm điểm bài thi qua ExamGrader
    const grading = examGrader.grade(exam, answers, timeSpentSeconds, topicLookup);

    // 3. Cập nhật đối tượng bài thi
    exam.userAnswers = answers;
    exam.isSubmitted = true;
    exam.score = grading.score;
    exam.accuracyPercentage = grading.accuracyPercentage;
    exam.correctCount = grading.correctCount;
    exam.wrongCount = grading.wrongCount;
    exam.skippedCount = grading.skippedCount;
    exam.timeSpentSeconds = grading.timeSpentSeconds;
    exam.topicBreakdown = grading.topicBreakdown;
    exam.difficultyBreakdown = grading.difficultyBreakdown;
    exam.weakTopics = grading.weakTopics;
    exam.strongTopics = grading.strongTopics;
    exam.completedAt = new Date().toISOString();

    // Xóa bản nháp lưu tạm
    this.clearDraftAnswers(examId);
    storage.set(EXAMS_KEY, list);

    // 4. Tự động đồng bộ các câu trả lời sai vào Sổ Lỗi Sai (Error Book)
    for (const wrongItem of grading.wrongQuestions) {
      const topicTitle = wrongItem.question.topicId ? topicLookup[wrongItem.question.topicId] : undefined;
      await mistakeService.recordWrongAnswer(
        wrongItem.question,
        wrongItem.selectedOptionId,
        exam.subjectName,
        'Làm sai trong đề thi',
        topicTitle
      );
    }

    // 5. Lưu kết quả thi vào Supabase exam_attempts
    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = await authService.getProfile();
        const userId = authData?.user?.id || user?.id;
        await supabase.from('exam_attempts').upsert({
          exam_id: exam.id,
          user_id: userId,
          user_answers: answers,
          score: exam.score,
          accuracy_percentage: exam.accuracyPercentage,
          correct_count: exam.correctCount,
          wrong_count: exam.wrongCount,
          skipped_count: exam.skippedCount,
          weak_topics: exam.weakTopics,
          is_submitted: true,
          completed_at: exam.completedAt,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving exam attempt:', err);
      }
    }

    return { exam, grading };
  },

  /**
   * Lưu tạm câu trả lời của bài thi đang làm vào storage để phòng sự cố reload
   */
  saveDraftAnswers(examId: string, answers: Record<string, string>, secondsRemaining?: number): void {
    try {
      localStorage.setItem(
        `${DRAFT_PREFIX}${examId}`,
        JSON.stringify({ answers, secondsRemaining, savedAt: Date.now() })
      );
    } catch {
      // Ignore storage errors
    }
  },

  getDraftAnswers(examId: string): { answers: Record<string, string>; secondsRemaining?: number } | null {
    try {
      const raw = localStorage.getItem(`${DRAFT_PREFIX}${examId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearDraftAnswers(examId: string): void {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${examId}`);
    } catch {
      // Ignore
    }
  },

  async deleteExam(id: string): Promise<boolean> {
    const list = await this.getExams();
    storage.set(EXAMS_KEY, list.filter(e => e.id !== id));
    this.clearDraftAnswers(id);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('exam_attempts').delete().eq('exam_id', id);
        await supabase.from('exams').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting exam:', err);
      }
    }

    return true;
  },
};
