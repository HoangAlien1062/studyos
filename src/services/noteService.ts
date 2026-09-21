import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ensureUUID, isValidUUID } from '../lib/uuid';
import { NoteItem } from '../types/note';
import { authService } from './authService';
import { storage } from './storage';

const NOTES_KEY = 'notes';

export const noteService = {
  async getAllNotes(): Promise<NoteItem[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const current = authService.getCurrentUser();
        const rawUserId = authData?.user?.id || current?.id;
        let query = supabase.from('notes').select('*');
        if (rawUserId && isValidUUID(rawUserId)) {
          query = query.eq('user_id', rawUserId);
        }
        const { data, error } = await query.order('updated_at', { ascending: false });

        if (!error && data) {
          const mapped: NoteItem[] = data.map(n => ({
            id: n.id,
            title: n.title,
            content: n.content_markdown,
            subjectId: n.subject_id || undefined,
            tags: n.tags || [],
            isPinned: Boolean(n.is_pinned),
            isFavorite: Boolean(n.is_favorite),
            createdAt: n.created_at,
            updatedAt: n.updated_at,
          }));
          storage.set(NOTES_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading notes:', err);
      }
    }
    return storage.get<NoteItem[]>(NOTES_KEY, []);
  },

  async getNoteById(id: string): Promise<NoteItem | undefined> {
    const list = await this.getAllNotes();
    return list.find(n => n.id === id);
  },

  async saveNote(note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<NoteItem> {
    const list = await this.getAllNotes();
    const now = new Date().toISOString();
    const noteId = ensureUUID(note.id);
    let saved: NoteItem;

    const idx = list.findIndex(n => n.id === note.id || n.id === noteId);
    if (idx !== -1) {
      saved = { ...list[idx], ...note, id: noteId, updatedAt: now };
      list[idx] = saved;
    } else {
      saved = { ...note, id: noteId, createdAt: now, updatedAt: now };
      list.unshift(saved);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const current = authService.getCurrentUser();
        const rawUserId = authData?.user?.id || current?.id;
        const userId = (rawUserId && isValidUUID(rawUserId)) ? rawUserId : null;
        const subjectId = (saved.subjectId && isValidUUID(saved.subjectId)) ? saved.subjectId : null;

        await supabase.from('notes').upsert({
          id: saved.id,
          user_id: userId,
          title: saved.title,
          content_markdown: saved.content,
          subject_id: subjectId,
          is_pinned: saved.isPinned,
          is_favorite: saved.isFavorite,
          tags: saved.tags,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving note:', err);
      }
    }

    storage.set(NOTES_KEY, list);
    return saved;
  },

  async deleteNote(id: string): Promise<boolean> {
    const list = await this.getAllNotes();
    storage.set(NOTES_KEY, list.filter(n => n.id !== id));

    if (supabase && isSupabaseConfigured && isValidUUID(id)) {
      try {
        await supabase.from('notes').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting note:', err);
      }
    }

    return true;
  },

  async togglePin(id: string): Promise<NoteItem | undefined> {
    const list = await this.getAllNotes();
    const target = list.find(n => n.id === id);
    if (!target) return undefined;
    target.isPinned = !target.isPinned;
    target.updatedAt = new Date().toISOString();
    storage.set(NOTES_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('notes').update({ is_pinned: target.isPinned }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error updating pin status:', err);
      }
    }

    return target;
  },

  async toggleFavorite(id: string): Promise<NoteItem | undefined> {
    const list = await this.getAllNotes();
    const target = list.find(n => n.id === id);
    if (!target) return undefined;
    target.isFavorite = !target.isFavorite;
    target.updatedAt = new Date().toISOString();
    storage.set(NOTES_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('notes').update({ is_favorite: target.isFavorite }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error updating favorite status:', err);
      }
    }

    return target;
  },
};
