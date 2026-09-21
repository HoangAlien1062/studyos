import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Chapter, Subject, Topic } from '../types/subject';
import { storage } from './storage';

const SUBJECTS_KEY = 'subjects';
const CHAPTERS_KEY = 'chapters';
const TOPICS_KEY = 'topics';

export const subjectService = {
  // === SUBJECTS ===
  async getSubjects(): Promise<Subject[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped: Subject[] = data.map(s => ({
            id: s.id,
            name: s.name,
            code: s.code,
            icon: s.icon || 'BookOpen',
            description: s.description || '',
            teacher: s.teacher || '',
            creditCount: s.credit_count || 3,
            color: s.color,
            progress: s.progress || 0,
            createdAt: s.created_at,
          }));
          storage.set(SUBJECTS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Failed to load subjects, using cache:', err);
      }
    }
    return storage.get<Subject[]>(SUBJECTS_KEY, []);
  },

  async getSubjectById(id: string): Promise<Subject | undefined> {
    const list = await this.getSubjects();
    return list.find(s => s.id === id);
  },

  async saveSubject(subject: Omit<Subject, 'id' | 'createdAt'> & { id?: string }): Promise<Subject> {
    const list = await this.getSubjects();
    let saved: Subject;
    const now = new Date().toISOString();

    if (subject.id) {
      const idx = list.findIndex(s => s.id === subject.id);
      if (idx !== -1) {
        saved = { ...list[idx], ...subject };
        list[idx] = saved;
      } else {
        saved = { ...subject, id: `subj-${Date.now()}`, createdAt: now };
        list.push(saved);
      }
    } else {
      saved = { ...subject, id: `subj-${Date.now()}`, createdAt: now };
      list.push(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        await supabase.from('subjects').upsert({
          id: saved.id,
          user_id: userId,
          name: saved.name,
          code: saved.code,
          teacher: saved.teacher,
          credit_count: saved.creditCount,
          color: saved.color,
          progress: saved.progress,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving subject:', err);
      }
    }

    storage.set(SUBJECTS_KEY, list);
    return saved;
  },

  async deleteSubject(id: string): Promise<boolean> {
    const list = await this.getSubjects();
    storage.set(SUBJECTS_KEY, list.filter(s => s.id !== id));

    const chapters = await this.getChapters();
    storage.set(CHAPTERS_KEY, chapters.filter(c => c.subjectId !== id));

    const topics = await this.getTopics();
    storage.set(TOPICS_KEY, topics.filter(t => t.subjectId !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('subjects').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting subject:', err);
      }
    }

    return true;
  },

  // === CHAPTERS ===
  async getChapters(subjectId?: string): Promise<Chapter[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('chapters').select('*').order('order_index', { ascending: true });
        if (subjectId) query = query.eq('subject_id', subjectId);
        const { data, error } = await query;
        if (!error && data) {
          return data.map(c => ({
            id: c.id,
            subjectId: c.subject_id,
            title: c.title,
            description: c.description || '',
            orderIndex: c.order_index || 0,
            createdAt: c.created_at,
          }));
        }
      } catch (err) {
        console.warn('[Supabase Online] Failed to load chapters, using cache:', err);
      }
    }
    const all = storage.get<Chapter[]>(CHAPTERS_KEY, []);
    return subjectId ? all.filter(c => c.subjectId === subjectId) : all;
  },

  async saveChapter(chapter: Omit<Chapter, 'id' | 'createdAt'> & { id?: string }): Promise<Chapter> {
    const all = storage.get<Chapter[]>(CHAPTERS_KEY, []);
    let saved: Chapter;
    const now = new Date().toISOString();

    if (chapter.id) {
      const idx = all.findIndex(c => c.id === chapter.id);
      if (idx !== -1) {
        saved = { ...all[idx], ...chapter };
        all[idx] = saved;
      } else {
        saved = { ...chapter, id: `chap-${Date.now()}`, createdAt: now };
        all.push(saved);
      }
    } else {
      saved = { ...chapter, id: `chap-${Date.now()}`, createdAt: now };
      all.push(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        await supabase.from('chapters').upsert({
          id: saved.id,
          user_id: userId,
          subject_id: saved.subjectId,
          title: saved.title,
          description: saved.description,
          order_index: saved.orderIndex,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving chapter:', err);
      }
    }

    storage.set(CHAPTERS_KEY, all);
    return saved;
  },

  async deleteChapter(id: string): Promise<boolean> {
    const all = storage.get<Chapter[]>(CHAPTERS_KEY, []);
    storage.set(CHAPTERS_KEY, all.filter(c => c.id !== id));

    const topics = await this.getTopics();
    storage.set(TOPICS_KEY, topics.filter(t => t.chapterId !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('chapters').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting chapter:', err);
      }
    }

    return true;
  },

  // === TOPICS ===
  async getTopics(chapterId?: string): Promise<Topic[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        let query = supabase.from('topics').select('*').order('order_index', { ascending: true });
        if (chapterId) query = query.eq('chapter_id', chapterId);
        const { data, error } = await query;
        if (!error && data) {
          return data.map(t => ({
            id: t.id,
            chapterId: t.chapter_id,
            subjectId: t.subject_id,
            title: t.title,
            description: t.description || '',
            orderIndex: t.order_index || 0,
            isCompleted: Boolean(t.is_completed),
            completedAt: t.completed_at,
            createdAt: t.created_at,
          }));
        }
      } catch (err) {
        console.warn('[Supabase Online] Failed to load topics, using cache:', err);
      }
    }
    const all = storage.get<Topic[]>(TOPICS_KEY, []);
    return chapterId ? all.filter(t => t.chapterId === chapterId) : all;
  },

  async saveTopic(topic: Omit<Topic, 'id' | 'createdAt'> & { id?: string }): Promise<Topic> {
    const all = storage.get<Topic[]>(TOPICS_KEY, []);
    let saved: Topic;
    const now = new Date().toISOString();

    if (topic.id) {
      const idx = all.findIndex(t => t.id === topic.id);
      if (idx !== -1) {
        saved = { ...all[idx], ...topic };
        all[idx] = saved;
      } else {
        saved = { ...topic, id: `topic-${Date.now()}`, createdAt: now };
        all.push(saved);
      }
    } else {
      saved = { ...topic, id: `topic-${Date.now()}`, createdAt: now };
      all.push(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        await supabase.from('topics').upsert({
          id: saved.id,
          user_id: userId,
          chapter_id: saved.chapterId,
          subject_id: saved.subjectId,
          title: saved.title,
          description: saved.description,
          order_index: saved.orderIndex,
          is_completed: saved.isCompleted,
          completed_at: saved.completedAt,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving topic:', err);
      }
    }

    storage.set(TOPICS_KEY, all);
    return saved;
  },

  async toggleTopicCompletion(id: string): Promise<Topic | undefined> {
    const all = storage.get<Topic[]>(TOPICS_KEY, []);
    const target = all.find(t => t.id === id);
    if (!target) return undefined;

    target.isCompleted = !target.isCompleted;
    target.completedAt = target.isCompleted ? new Date().toISOString() : undefined;
    storage.set(TOPICS_KEY, all);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('topics').update({
          is_completed: target.isCompleted,
          completed_at: target.completedAt,
        }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error updating topic completion:', err);
      }
    }

    return target;
  },

  async deleteTopic(id: string): Promise<boolean> {
    const all = storage.get<Topic[]>(TOPICS_KEY, []);
    storage.set(TOPICS_KEY, all.filter(t => t.id !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('topics').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting topic:', err);
      }
    }

    return true;
  },
};
