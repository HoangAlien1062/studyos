import { INITIAL_QUESTIONS } from '../data/initialQuestions';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EvaluationResult, QuestionDifficulty, QuestionItem, QuestionType } from '../types/question';
import { questionEvaluator } from './algorithms/questionEvaluator';
import { authService } from './authService';
import { sessionService } from './sessionService';
import { storage } from './storage';

const QUESTIONS_KEY = 'questions';

export const questionService = {
  async getQuestions(filters?: {
    subjectId?: string;
    chapterId?: string;
    topicId?: string;
    difficulty?: QuestionDifficulty;
    type?: QuestionType;
  }): Promise<QuestionItem[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }

    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('questions').select('*').order('created_at', { ascending: false });
        if (filters?.subjectId) query = query.eq('subject_id', filters.subjectId);
        if (filters?.chapterId) query = query.eq('chapter_id', filters.chapterId);
        if (filters?.topicId) query = query.eq('topic_id', filters.topicId);
        if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty);
        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.source) query = query.eq('source', filters.source);

        const { data, error } = await query;
        if (!error && data) {
          let list: QuestionItem[] = data.map(q => ({
            id: q.id,
            content: q.content,
            image: q.image_url || undefined,
            options: q.options || [],
            correctOptionId: q.correct_option_id,
            correctOptionIds: q.correct_option_ids || [q.correct_option_id],
            correctAnswerText: q.correct_answer_text,
            explanation: q.explanation || '',
            subjectId: q.subject_id || '',
            chapterId: q.chapter_id || undefined,
            topicId: q.topic_id || undefined,
            difficulty: q.difficulty || 'medium',
            type: q.type || 'single_choice',
            source: q.source || '',
            tags: q.tags || [],
            createdAt: q.created_at,
            updatedAt: q.updated_at,
          }));

          if (filters?.tag) {
            list = list.filter(q => q.tags.includes(filters.tag!));
          }
          if (filters?.search) {
            const s = filters.search.toLowerCase();
            list = list.filter(
              item =>
                item.content.toLowerCase().includes(s) ||
                item.explanation.toLowerCase().includes(s) ||
                item.options.some(opt => opt.text.toLowerCase().includes(s))
            );
          }
          return list;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading questions:', err);
      }
    }

    let list = storage.get<QuestionItem[]>(QUESTIONS_KEY, []);
    if (!filters) return list;

    if (filters.subjectId) list = list.filter(q => q.subjectId === filters.subjectId);
    if (filters.chapterId) list = list.filter(q => q.chapterId === filters.chapterId);
    if (filters.topicId) list = list.filter(q => q.topicId === filters.topicId);
    if (filters.difficulty) list = list.filter(q => q.difficulty === filters.difficulty);
    if (filters.type) list = list.filter(q => q.type === filters.type);
    if (filters.source) list = list.filter(q => q.source === filters.source);
    if (filters.tag) list = list.filter(q => q.tags.includes(filters.tag!));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        item =>
          item.content.toLowerCase().includes(q) ||
          item.explanation.toLowerCase().includes(q) ||
          item.options.some(opt => opt.text.toLowerCase().includes(q))
      );
    }
    return list;
  },

  async getQuestionById(id: string): Promise<QuestionItem | undefined> {
    const list = await this.getQuestions();
    return list.find(q => q.id === id);
  },

  async saveQuestion(question: Omit<QuestionItem, 'id' | 'createdAt'> & { id?: string }): Promise<QuestionItem> {
    // 1. Validate using questionEvaluator
    const validation = questionEvaluator.validate(question);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    const list = await this.getQuestions();
    let saved: QuestionItem;
    const now = new Date().toISOString();

    if (question.id) {
      const idx = list.findIndex(q => q.id === question.id);
      if (idx !== -1) {
        saved = { ...list[idx], ...question, updatedAt: now };
        list[idx] = saved;
      } else {
        saved = { ...question, id: `q-${Date.now()}`, createdAt: now, updatedAt: now };
        list.push(saved);
      }
    } else {
      saved = { ...question, id: `q-${Date.now()}`, createdAt: now, updatedAt: now };
      list.push(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = await authService.getProfile();
        const userId = authData?.user?.id || user?.id;
        await supabase.from('questions').upsert({
          id: saved.id,
          user_id: userId,
          content: saved.content,
          options: saved.options,
          correct_option_id: saved.correctOptionId,
          explanation: saved.explanation,
          subject_id: saved.subjectId || null,
          chapter_id: saved.chapterId || null,
          topic_id: saved.topicId || null,
          difficulty: saved.difficulty,
          type: saved.type,
          source: saved.source,
          tags: saved.tags,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving question:', err);
      }
    }

    storage.set(QUESTIONS_KEY, list);
    return saved;
  },

  async duplicateQuestion(id: string): Promise<QuestionItem | undefined> {
    const original = await this.getQuestionById(id);
    if (!original) return undefined;

    const duplicated = await this.saveQuestion({
      ...original,
      id: undefined,
      content: `${original.content} (Bản sao)`,
    });
    return duplicated;
  },

  async deleteQuestion(id: string): Promise<boolean> {
    const list = await this.getQuestions();
    storage.set(QUESTIONS_KEY, list.filter(q => q.id !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('questions').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting question:', err);
      }
    }

    return true;
  },

  /**
   * Evaluate answer and persist question attempt to database
   */
  async submitAnswer(
    question: QuestionItem,
    userAnswer: string | string[],
    timeSpentSeconds: number = 0,
    context: 'practice' | 'exam' | 'error_review' = 'practice',
    examId?: string
  ): Promise<EvaluationResult> {
    // 1. Evaluate using strategy
    const result = questionEvaluator.evaluate(question, userAnswer);

    // 2. Persist attempt record
    await sessionService.recordAttempt({
      questionId: question.id,
      subjectId: question.subjectId,
      chapterId: question.chapterId,
      topicId: question.topicId,
      selectedAnswer: userAnswer,
      correctAnswer: question.correctOptionId,
      isCorrect: result.isCorrect,
      timeSpentSeconds,
      context,
      examId,
    });

    return result;
  },

  async importQuestions(questions: QuestionItem[]): Promise<number> {
    let count = 0;
    for (const q of questions) {
      await this.saveQuestion(q);
      count++;
    }
    return count;
  },
};
