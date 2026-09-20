import { INITIAL_MISTAKES } from '../data/initialMistakes';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MistakeFilterCriteria, MistakeItem } from '../types/mistake';
import { QuestionItem } from '../types/question';
import { authService } from './authService';
import { storage } from './storage';

const MISTAKES_KEY = 'mistakes';

export const mistakeService = {
  async getMistakes(filters?: MistakeFilterCriteria): Promise<MistakeItem[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('mistakes').select('*').order('created_at', { ascending: false });
        if (filters?.subjectId) query = query.eq('subject_id', filters.subjectId);
        if (filters?.topicId) query = query.eq('topic_id', filters.topicId);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          let mapped: MistakeItem[] = data.map(m => ({
            id: m.id,
            questionId: m.question_id || undefined,
            questionContent: m.question_content,
            options: m.options || [],
            selectedOptionId: m.selected_option_id,
            correctOptionId: m.correct_option_id,
            explanation: m.explanation || '',
            subjectId: m.subject_id || undefined,
            subjectName: m.subject_name,
            chapterId: m.chapter_id || undefined,
            topicId: m.topic_id || undefined,
            topicTitle: m.topic_title || undefined,
            reason: m.reason || 'Chưa xác định lý do',
            reviewCount: m.review_count || 1,
            lastReviewedAt: m.last_reviewed_at || undefined,
            isReviewed: Boolean(m.is_reviewed),
            attemptHistory: m.attempt_history || [],
            createdAt: m.created_at,
            updatedAt: m.updated_at,
          }));

          if (filters?.reason) {
            mapped = mapped.filter(m => m.reason === filters.reason);
          }
          if (filters?.onlyUnreviewed) {
            mapped = mapped.filter(m => !m.isReviewed);
          }
          if (filters?.frequentlyMissed) {
            mapped = mapped.filter(m => m.reviewCount >= 2);
          }
          if (filters?.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            mapped = mapped.filter(m =>
              m.questionContent.toLowerCase().includes(q) ||
              m.reason.toLowerCase().includes(q) ||
              m.explanation.toLowerCase().includes(q)
            );
          }

          storage.set(MISTAKES_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading mistakes:', err);
      }
    }

    let list = storage.get<MistakeItem[]>(MISTAKES_KEY, INITIAL_MISTAKES);
    if (!filters) return list;

    if (filters.subjectId) list = list.filter(m => m.subjectId === filters.subjectId);
    if (filters.topicId) list = list.filter(m => m.topicId === filters.topicId);
    if (filters.reason) list = list.filter(m => m.reason === filters.reason);
    if (filters.onlyUnreviewed) list = list.filter(m => !m.isReviewed);
    if (filters.frequentlyMissed) list = list.filter(m => m.reviewCount >= 2);
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(m =>
        m.questionContent.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        m.explanation.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getMistakeById(id: string): Promise<MistakeItem | undefined> {
    const list = await this.getMistakes();
    return list.find(m => m.id === id);
  },

  /**
   * Tự động ghi nhận câu trả lời sai vào Sổ Lỗi Sai với cơ chế Khử trùng lặp (Deduplication)
   */
  async recordWrongAnswer(
    question: QuestionItem,
    selectedOptionId: string,
    subjectName: string,
    reason: string = 'Không nhớ kiến thức',
    topicTitle?: string
  ): Promise<MistakeItem> {
    const list = await this.getMistakes();
    const now = new Date().toISOString();
    const todayStr = now.slice(0, 10);

    // 1. Kiểm tra câu hỏi này đã từng sai trong Sổ lỗi chưa
    const existing = list.find(m => m.questionId === question.id);

    if (existing) {
      // Cập nhật bản ghi hiện có (Deduplication)
      existing.selectedOptionId = selectedOptionId;
      existing.reviewCount += 1;
      existing.lastReviewedAt = todayStr;
      existing.isReviewed = false;
      existing.reason = reason; // Cập nhật lý do mới nhất
      if (topicTitle) existing.topicTitle = topicTitle;

      if (!existing.attemptHistory) existing.attemptHistory = [];
      existing.attemptHistory.unshift({
        timestamp: now,
        selectedAnswer: selectedOptionId,
        context: 'Làm sai lại',
      });

      storage.set(MISTAKES_KEY, list);

      if (supabase && isSupabaseConfigured) {
        try {
          await supabase.from('mistakes').update({
            selected_option_id: selectedOptionId,
            review_count: existing.reviewCount,
            last_reviewed_at: existing.lastReviewedAt,
            is_reviewed: false,
            reason: existing.reason,
            attempt_history: existing.attemptHistory,
          }).eq('id', existing.id);
        } catch (err) {
          console.warn('[Supabase Online] Error updating mistake:', err);
        }
      }

      return existing;
    }

    // 2. Tạo bản ghi mới nếu câu này chưa từng sai
    const newMistake: MistakeItem = {
      id: `mis-${Date.now()}`,
      questionId: question.id,
      questionContent: question.content,
      options: question.options,
      selectedOptionId,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      subjectId: question.subjectId,
      subjectName,
      chapterId: question.chapterId,
      topicId: question.topicId,
      topicTitle: topicTitle || undefined,
      reason,
      reviewCount: 1,
      lastReviewedAt: todayStr,
      isReviewed: false,
      attemptHistory: [
        {
          timestamp: now,
          selectedAnswer: selectedOptionId,
          context: 'Lần đầu làm sai',
        },
      ],
      createdAt: now,
    };

    list.unshift(newMistake);
    storage.set(MISTAKES_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        const user = await authService.getProfile();
        await supabase.from('mistakes').insert({
          id: newMistake.id,
          user_id: user.id,
          question_id: newMistake.questionId,
          question_content: newMistake.questionContent,
          options: newMistake.options,
          selected_option_id: newMistake.selectedOptionId,
          correct_option_id: newMistake.correctOptionId,
          explanation: newMistake.explanation,
          subject_id: newMistake.subjectId || null,
          subject_name: newMistake.subjectName,
          chapter_id: newMistake.chapterId || null,
          topic_id: newMistake.topicId || null,
          topic_title: newMistake.topicTitle || null,
          reason: newMistake.reason,
          review_count: newMistake.reviewCount,
          last_reviewed_at: newMistake.lastReviewedAt,
          is_reviewed: newMistake.isReviewed,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error inserting mistake:', err);
      }
    }

    return newMistake;
  },

  /**
   * Đánh dấu đã ôn tập / đã khắc phục lỗi sai
   */
  async markAsResolved(id: string): Promise<MistakeItem | undefined> {
    const list = await this.getMistakes();
    const item = list.find(m => m.id === id);
    if (!item) return undefined;

    item.isReviewed = true;
    item.lastReviewedAt = new Date().toISOString().slice(0, 10);
    storage.set(MISTAKES_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('mistakes').update({
          is_reviewed: true,
          last_reviewed_at: item.lastReviewedAt,
        }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error updating mistake resolve:', err);
      }
    }

    return item;
  },

  async updateReason(id: string, reason: string): Promise<MistakeItem | undefined> {
    const list = await this.getMistakes();
    const item = list.find(m => m.id === id);
    if (!item) return undefined;

    item.reason = reason;
    storage.set(MISTAKES_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('mistakes').update({ reason }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error updating mistake reason:', err);
      }
    }

    return item;
  },

  async deleteMistake(id: string): Promise<boolean> {
    const list = await this.getMistakes();
    storage.set(MISTAKES_KEY, list.filter(m => m.id !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('mistakes').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting mistake:', err);
      }
    }

    return true;
  },
};
