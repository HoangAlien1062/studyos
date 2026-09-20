import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { QuestionAttemptRecord, StudySessionRecord, StudySessionType } from '../types/session';
import { storage } from './storage';

const SESSIONS_KEY = 'study_sessions';
const ATTEMPTS_KEY = 'question_attempts';

export const sessionService = {
  // === STUDY SESSIONS ===
  async getSessions(): Promise<StudySessionRecord[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('study_sessions')
          .select('*')
          .order('started_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: StudySessionRecord[] = data.map(s => ({
            id: s.id,
            userId: s.user_id,
            type: s.type,
            title: s.title,
            startedAt: s.started_at,
            endedAt: s.ended_at,
            durationSeconds: s.duration_seconds || 0,
            itemsCompleted: s.items_completed || 0,
            scoreOrAccuracy: s.score_or_accuracy,
            subjectId: s.subject_id,
            topicId: s.topic_id,
            metadata: s.metadata,
            createdAt: s.created_at,
          }));
          storage.set(SESSIONS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading study sessions:', err);
      }
    }
    return storage.get<StudySessionRecord[]>(SESSIONS_KEY, []);
  },

  async startSession(type: StudySessionType, title: string, subjectId?: string, topicId?: string): Promise<StudySessionRecord> {
    const list = await this.getSessions();
    const newSession: StudySessionRecord = {
      id: `sess-${Date.now()}`,
      type,
      title,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      itemsCompleted: 0,
      subjectId,
      topicId,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newSession);
    storage.set(SESSIONS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('study_sessions').insert({
          id: newSession.id,
          type: newSession.type,
          title: newSession.title,
          started_at: newSession.startedAt,
          duration_seconds: 0,
          items_completed: 0,
          subject_id: subjectId || null,
          topic_id: topicId || null,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error creating study session:', err);
      }
    }

    return newSession;
  },

  async finishSession(
    sessionId: string,
    itemsCompleted: number,
    durationSeconds: number,
    scoreOrAccuracy?: number
  ): Promise<StudySessionRecord | undefined> {
    const list = await this.getSessions();
    const session = list.find(s => s.id === sessionId);
    if (!session) return undefined;

    session.endedAt = new Date().toISOString();
    session.itemsCompleted = itemsCompleted;
    session.durationSeconds = durationSeconds;
    session.scoreOrAccuracy = scoreOrAccuracy;

    storage.set(SESSIONS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('study_sessions').update({
          ended_at: session.endedAt,
          items_completed: itemsCompleted,
          duration_seconds: durationSeconds,
          score_or_accuracy: scoreOrAccuracy,
        }).eq('id', sessionId);
      } catch (err) {
        console.warn('[Supabase Online] Error finishing study session:', err);
      }
    }

    return session;
  },

  // === QUESTION ATTEMPTS ===
  async getAttempts(questionId?: string, subjectId?: string): Promise<QuestionAttemptRecord[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('question_attempts').select('*').order('timestamp', { ascending: false });
        if (questionId) query = query.eq('question_id', questionId);
        if (subjectId) query = query.eq('subject_id', subjectId);
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const mapped: QuestionAttemptRecord[] = data.map(a => ({
            id: a.id,
            userId: a.user_id,
            questionId: a.question_id,
            subjectId: a.subject_id,
            chapterId: a.chapter_id,
            topicId: a.topic_id,
            selectedAnswer: a.selected_answer,
            correctAnswer: a.correct_answer,
            isCorrect: Boolean(a.is_correct),
            timeSpentSeconds: a.time_spent_seconds || 0,
            context: a.context || 'practice',
            examId: a.exam_id,
            timestamp: a.timestamp,
          }));
          storage.set(ATTEMPTS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading question attempts:', err);
      }
    }

    const all = storage.get<QuestionAttemptRecord[]>(ATTEMPTS_KEY, []);
    return all.filter(a => {
      if (questionId && a.questionId !== questionId) return false;
      if (subjectId && a.subjectId !== subjectId) return false;
      return true;
    });
  },

  async recordAttempt(attempt: Omit<QuestionAttemptRecord, 'id' | 'timestamp'>): Promise<QuestionAttemptRecord> {
    const list = storage.get<QuestionAttemptRecord[]>(ATTEMPTS_KEY, []);
    const record: QuestionAttemptRecord = {
      ...attempt,
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };

    list.unshift(record);
    // Keep max 2000 recent attempts in local cache for speed
    if (list.length > 2000) list.pop();
    storage.set(ATTEMPTS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('question_attempts').insert({
          id: record.id,
          question_id: record.questionId,
          subject_id: record.subjectId,
          chapter_id: record.chapterId || null,
          topic_id: record.topicId || null,
          selected_answer: Array.isArray(record.selectedAnswer) ? record.selectedAnswer.join(',') : record.selectedAnswer,
          correct_answer: Array.isArray(record.correctAnswer) ? record.correctAnswer.join(',') : record.correctAnswer,
          is_correct: record.isCorrect,
          time_spent_seconds: record.timeSpentSeconds,
          context: record.context,
          exam_id: record.examId || null,
          timestamp: record.timestamp,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error inserting question attempt:', err);
      }
    }

    return record;
  },
};
