import { INITIAL_FULL_SETTINGS } from '../data/initialSettings';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppearanceSettings, FullAppSettings, GeneralSettings, PrivacySettings, UserProfile } from '../types/settings';
import { authService } from './authService';
import { storage } from './storage';

const SETTINGS_KEY = 'full_settings';

export const settingsService = {
  async getSettings(): Promise<FullAppSettings> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

          if (!error && data) {
            const profile = await authService.getProfile();
            const full: FullAppSettings = {
              profile: {
                name: profile.name,
                email: profile.email,
                avatarUrl: profile.avatarUrl || '',
                school: profile.school,
                major: profile.major,
                studentId: profile.studentId,
                bio: profile.bio,
              },
              general: data.general || INITIAL_FULL_SETTINGS.general,
              appearance: data.appearance || INITIAL_FULL_SETTINGS.appearance,
              notifications: data.notifications || INITIAL_FULL_SETTINGS.notifications,
              privacy: data.privacy || INITIAL_FULL_SETTINGS.privacy,
              ai: data.ai || INITIAL_FULL_SETTINGS.ai,
            };
            storage.set(SETTINGS_KEY, full);
            return full;
          }
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading user settings:', err);
      }
    }
    return storage.get<FullAppSettings>(SETTINGS_KEY, INITIAL_FULL_SETTINGS);
  },

  async saveSettings(settings: FullAppSettings): Promise<FullAppSettings> {
    storage.set(SETTINGS_KEY, settings);

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase.from('user_settings').upsert({
            user_id: authData.user.id,
            general: settings.general,
            appearance: settings.appearance,
            notifications: settings.notifications,
            privacy: settings.privacy,
            ai: settings.ai,
          });
        }
      } catch (err) {
        console.warn('[Supabase Online] Error saving settings:', err);
      }
    }

    return settings;
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const updated = await authService.updateProfile(profile);
    const current = await this.getSettings();
    current.profile = { ...current.profile, ...updated };
    storage.set(SETTINGS_KEY, current);
    return current.profile;
  },

  async updateGeneral(general: Partial<GeneralSettings>): Promise<GeneralSettings> {
    const current = await this.getSettings();
    current.general = { ...current.general, ...general };
    await this.saveSettings(current);
    return current.general;
  },

  async updateAppearance(appearance: Partial<AppearanceSettings>): Promise<AppearanceSettings> {
    const current = await this.getSettings();
    current.appearance = { ...current.appearance, ...appearance };
    await this.saveSettings(current);
    return current.appearance;
  },

  async updatePrivacy(privacy: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const current = await this.getSettings();
    current.privacy = { ...current.privacy, ...privacy };
    await this.saveSettings(current);
    return current.privacy;
  },

  exportBackupJson(): string {
    return storage.exportAllData();
  },

  importBackupJson(jsonString: string): boolean {
    return storage.importAllData(jsonString);
  },

  /**
   * Wipe all user data completely to start with a pristine clean slate.
   * Clears subjects, documents, notes, flashcards, questions, mistakes, exams, schedules, and AI chats.
   */
  async wipeAllUserData(): Promise<void> {
    const EMPTY_KEYS = [
      'subjects',
      'chapters',
      'topics',
      'documents',
      'notes',
      'flashcard_decks',
      'flashcards',
      'questions',
      'mistakes',
      'exams',
      'exam_attempts',
      'schedules',
      'notifications',
      'ai_conversations',
      'study_sessions'
    ];

    EMPTY_KEYS.forEach(key => {
      storage.set(key, []);
    });

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || '11111111-1111-1111-1111-111111111111';

        await Promise.allSettled([
          supabase.from('chapters').delete().eq('user_id', userId),
          supabase.from('topics').delete().eq('user_id', userId),
          supabase.from('notes').delete().eq('user_id', userId),
          supabase.from('documents').delete().eq('user_id', userId),
          supabase.from('flashcards').delete().eq('user_id', userId),
          supabase.from('flashcard_decks').delete().eq('user_id', userId),
          supabase.from('mistakes').delete().eq('user_id', userId),
          supabase.from('exam_attempts').delete().eq('user_id', userId),
          supabase.from('exams').delete().eq('user_id', userId),
          supabase.from('questions').delete().eq('user_id', userId),
          supabase.from('subjects').delete().eq('user_id', userId),
          supabase.from('schedules').delete().eq('user_id', userId),
          supabase.from('notifications').delete().eq('user_id', userId),
          supabase.from('ai_conversations').delete().eq('user_id', userId),
        ]);
      } catch (err) {
        console.warn('[Supabase Online] Error wiping user data:', err);
      }
    }
  },

  resetAllData(): void {
    storage.clearAll();
  },

  async loadSampleDemoData(): Promise<void> {
    const { INITIAL_SUBJECTS, INITIAL_CHAPTERS, INITIAL_TOPICS } = await import('../data/initialSubjects');
    const { INITIAL_DECKS, INITIAL_FLASHCARDS } = await import('../data/initialFlashcards');
    const { INITIAL_QUESTIONS } = await import('../data/initialQuestions');
    const { INITIAL_EXAMS } = await import('../data/initialExams');
    const { INITIAL_MISTAKES } = await import('../data/initialMistakes');
    const { INITIAL_SCHEDULES } = await import('../data/initialSchedules');
    const { INITIAL_NOTES } = await import('../data/initialNotes');
    const { INITIAL_DOCUMENTS } = await import('../data/initialDocuments');
    const { INITIAL_NOTIFICATIONS } = await import('../data/initialNotifications');
    const { INITIAL_CONVERSATIONS } = await import('../data/initialAISettings');

    storage.set('subjects', INITIAL_SUBJECTS);
    storage.set('chapters', INITIAL_CHAPTERS);
    storage.set('topics', INITIAL_TOPICS);
    storage.set('flashcard_decks', INITIAL_DECKS);
    storage.set('flashcards', INITIAL_FLASHCARDS);
    storage.set('questions', INITIAL_QUESTIONS);
    storage.set('exams', INITIAL_EXAMS);
    storage.set('mistakes', INITIAL_MISTAKES);
    storage.set('schedules', INITIAL_SCHEDULES);
    storage.set('notes', INITIAL_NOTES);
    storage.set('documents', INITIAL_DOCUMENTS);
    storage.set('notifications', INITIAL_NOTIFICATIONS);
    storage.set('ai_conversations', INITIAL_CONVERSATIONS);
  },
};
