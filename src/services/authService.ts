import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storage } from './storage';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  educationLevel?: 'high_school' | 'university';
  gradeOrYear?: string;
  school: string;
  major: string;
  studentId: string;
  bio: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: UserAccount;
}

const DEMO_USER: UserAccount = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'student@studyos.edu.vn',
  name: 'Nguyễn Văn An',
  educationLevel: 'university',
  gradeOrYear: 'Năm 3 - K22',
  school: 'Đại học Bách Khoa TP.HCM',
  major: 'Khoa học Máy tính',
  studentId: '2210456',
  bio: 'Sinh viên năm 2 đam mê AI & Kỹ thuật lập trình. Mục tiêu GPA > 3.6',
};

const USER_STORAGE_KEY = 'studyos_active_user';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    name: string;
    educationLevel?: 'high_school' | 'university';
    gradeOrYear?: string;
    school?: string;
    major?: string;
    studentId?: string;
    bio?: string;
  }): Promise<AuthResponse> {
    const educationLevel = data.educationLevel || 'university';
    const gradeOrYear = data.gradeOrYear || (educationLevel === 'high_school' ? 'Lớp 12' : 'Năm 2');
    const defaultSchool = educationLevel === 'high_school' ? 'Trường THPT' : 'Trường Đại học';
    const defaultMajor = educationLevel === 'high_school' ? 'Khối Tự nhiên (Toán, Lý, Hóa)' : 'Khoa học Máy tính';

    if (supabase && isSupabaseConfigured) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            school: data.school || defaultSchool,
            education_level: educationLevel,
            grade_or_year: gradeOrYear,
          },
        },
      });

      if (error) throw new Error(error.message);

      const userId = authData.user?.id || `user-${Date.now()}`;
      const newUser: UserAccount = {
        id: userId,
        email: data.email,
        name: data.name,
        educationLevel,
        gradeOrYear,
        school: data.school || defaultSchool,
        major: data.major || defaultMajor,
        studentId: data.studentId || '',
        bio: data.bio || '',
      };

      // Save to Supabase users table
      try {
        await supabase.from('users').upsert({
          id: userId,
          email: data.email,
          name: data.name,
          education_level: educationLevel,
          grade_or_year: gradeOrYear,
          school: newUser.school,
          major: newUser.major,
          student_id: data.studentId || '',
          bio: data.bio || '',
          password_hash: 'managed_by_supabase_auth',
        });
      } catch (e) {
        console.warn('[Supabase] Error saving user profile:', e);
      }

      storage.set(USER_STORAGE_KEY, newUser);
      return {
        token: authData.session?.access_token || 'supabase-session',
        user: newUser,
      };
    }

    // Local mode
    const localUser: UserAccount = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      educationLevel,
      gradeOrYear,
      school: data.school || defaultSchool,
      major: data.major || defaultMajor,
      studentId: data.studentId || '',
      bio: data.bio || '',
    };
    storage.set(USER_STORAGE_KEY, localUser);
    return { token: 'demo-token', user: localUser };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const user: UserAccount = {
        id: data.user.id,
        email: data.user.email || email,
        name: profile?.name || data.user.user_metadata?.name || 'Học viên StudyOS',
        educationLevel: profile?.education_level || 'university',
        gradeOrYear: profile?.grade_or_year || 'Năm 2',
        school: profile?.school || 'Đại học Bách Khoa',
        major: profile?.major || 'Khoa học Máy tính',
        studentId: profile?.student_id || '',
        bio: profile?.bio || '',
      };

      storage.set(USER_STORAGE_KEY, user);
      return {
        token: data.session?.access_token || 'supabase-session',
        user,
      };
    }

    const current = (await this.getProfile()) || DEMO_USER;
    const localUser: UserAccount = {
      ...current,
      email,
      name: current.name && current.name !== 'Nguyễn Văn An' ? current.name : (email.split('@')[0] || 'Học viên StudyOS'),
    };
    storage.set(USER_STORAGE_KEY, localUser);
    return { token: 'demo-token', user: localUser };
  },

  async getProfile(): Promise<UserAccount> {
    if (supabase && isSupabaseConfigured) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profile) {
          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            school: profile.school || '',
            major: profile.major || '',
            studentId: profile.student_id || '',
            bio: profile.bio || '',
          };
        }
      }
    }
    return storage.get<UserAccount>(USER_STORAGE_KEY, DEMO_USER);
  },

  async updateProfile(profile: Partial<UserAccount>): Promise<UserAccount> {
    const current = await this.getProfile();
    const updated = { ...current, ...profile };

    if (supabase && isSupabaseConfigured) {
      await supabase.from('users').upsert({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        school: updated.school,
        major: updated.major,
        student_id: updated.studentId,
        bio: updated.bio,
      });
    }

    storage.set(USER_STORAGE_KEY, updated);
    return updated;
  },

  logout(): void {
    if (supabase && isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
    storage.remove(USER_STORAGE_KEY);
  },

  isAuthenticated(): boolean {
    return Boolean(storage.get<UserAccount | null>(USER_STORAGE_KEY, null));
  },

  async ensureDefaultAuth(): Promise<void> {
    if (!storage.get<UserAccount | null>(USER_STORAGE_KEY, null)) {
      storage.set(USER_STORAGE_KEY, DEMO_USER);
    }
  },
};
