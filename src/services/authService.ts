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

export interface StoredAccount extends UserAccount {
  passwordHash?: string;
  createdAt: string;
  lastLoginAt: string;
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
const REGISTERED_ACCOUNTS_KEY = 'studyos_registered_accounts';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

export const authService = {
  getRegisteredAccounts(): StoredAccount[] {
    return storage.get<StoredAccount[]>(REGISTERED_ACCOUNTS_KEY, []);
  },

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
    avatarUrl?: string;
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
        avatarUrl: data.avatarUrl || '',
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
          avatar_url: newUser.avatarUrl || '',
          password_hash: 'managed_by_supabase_auth',
        });
      } catch (e) {
        console.warn('[Supabase] Error saving user profile:', e);
      }

      this.saveToRegistry(newUser, data.password);
      storage.set(USER_STORAGE_KEY, newUser);
      return {
        token: authData.session?.access_token || 'supabase-session',
        user: newUser,
      };
    }

    // Local mode
    const localUser: UserAccount = {
      id: `user-${Date.now()}`,
      email: data.email.trim(),
      name: data.name.trim(),
      educationLevel,
      gradeOrYear,
      school: data.school?.trim() || defaultSchool,
      major: data.major?.trim() || defaultMajor,
      studentId: data.studentId?.trim() || '',
      bio: data.bio?.trim() || '',
      avatarUrl: data.avatarUrl || '',
    };

    this.saveToRegistry(localUser, data.password);
    storage.set(USER_STORAGE_KEY, localUser);
    return { token: 'demo-token', user: localUser };
  },

  async login(email: string, password?: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();

    if (supabase && isSupabaseConfigured) {
      if (!password) throw new Error('Vui lòng nhập mật khẩu đăng nhập.');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
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
        email: data.user.email || cleanEmail,
        name: profile?.name || data.user.user_metadata?.name || 'Học viên StudyOS',
        educationLevel: profile?.education_level || 'university',
        gradeOrYear: profile?.grade_or_year || 'Năm 2',
        school: profile?.school || 'Đại học Bách Khoa',
        major: profile?.major || 'Khoa học Máy tính',
        studentId: profile?.student_id || '',
        bio: profile?.bio || '',
        avatarUrl: profile?.avatar_url || '',
      };

      this.saveToRegistry(user, password);
      storage.set(USER_STORAGE_KEY, user);
      return {
        token: data.session?.access_token || 'supabase-session',
        user,
      };
    }

    // Local Mode: check registered accounts registry
    const accounts = this.getRegisteredAccounts();
    const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);

    if (existing) {
      if (password && existing.passwordHash) {
        if (simpleHash(password) !== existing.passwordHash) {
          throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
        }
      }
      existing.lastLoginAt = new Date().toISOString();
      storage.set(REGISTERED_ACCOUNTS_KEY, accounts);
      storage.set(USER_STORAGE_KEY, existing);
      return { token: 'demo-token', user: existing };
    }

    // If matches demo user email
    if (cleanEmail === DEMO_USER.email.toLowerCase()) {
      return this.loginAsDemo();
    }

    // If account doesn't exist on this device, automatically create it with default profile
    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      name: email.split('@')[0] || 'Học viên StudyOS',
      educationLevel: 'university',
      gradeOrYear: 'Năm 2',
      school: 'Đại học Bách Khoa',
      major: 'Khoa học Máy tính',
      studentId: '',
      bio: '',
      avatarUrl: '',
    };

    this.saveToRegistry(newUser, password);
    storage.set(USER_STORAGE_KEY, newUser);
    return { token: 'demo-token', user: newUser };
  },

  async loginAsDemo(): Promise<AuthResponse> {
    this.saveToRegistry(DEMO_USER, 'demo123');
    storage.set(USER_STORAGE_KEY, DEMO_USER);
    return { token: 'demo-token', user: DEMO_USER };
  },

  saveToRegistry(user: UserAccount, password?: string): void {
    const accounts = this.getRegisteredAccounts();
    const idx = accounts.findIndex(a => a.id === user.id || a.email.toLowerCase() === user.email.toLowerCase());
    const now = new Date().toISOString();

    const stored: StoredAccount = {
      ...user,
      passwordHash: password ? simpleHash(password) : (idx !== -1 ? accounts[idx].passwordHash : undefined),
      createdAt: idx !== -1 ? accounts[idx].createdAt : now,
      lastLoginAt: now,
    };

    if (idx !== -1) {
      accounts[idx] = stored;
    } else {
      accounts.push(stored);
    }
    storage.set(REGISTERED_ACCOUNTS_KEY, accounts);
  },

  async switchAccount(userId: string): Promise<UserAccount> {
    const accounts = this.getRegisteredAccounts();
    const target = accounts.find(a => a.id === userId);
    if (!target) {
      throw new Error('Không tìm thấy tài khoản để chuyển đổi.');
    }
    target.lastLoginAt = new Date().toISOString();
    storage.set(REGISTERED_ACCOUNTS_KEY, accounts);
    storage.set(USER_STORAGE_KEY, target);
    return target;
  },

  async removeAccount(userId: string): Promise<void> {
    const accounts = this.getRegisteredAccounts().filter(a => a.id !== userId);
    storage.set(REGISTERED_ACCOUNTS_KEY, accounts);
    const active = this.getCurrentUser();
    if (active?.id === userId) {
      this.logout();
    }
  },

  async changePassword(newPassword: string): Promise<void> {
    const active = this.getCurrentUser();
    if (!active) throw new Error('Chưa đăng nhập');

    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    }

    const accounts = this.getRegisteredAccounts();
    const idx = accounts.findIndex(a => a.id === active.id);
    if (idx !== -1) {
      accounts[idx].passwordHash = simpleHash(newPassword);
      storage.set(REGISTERED_ACCOUNTS_KEY, accounts);
    }
  },

  getCurrentUser(): UserAccount | null {
    return storage.get<UserAccount | null>(USER_STORAGE_KEY, null);
  },

  async getProfile(): Promise<UserAccount | null> {
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
            educationLevel: profile.education_level || 'university',
            gradeOrYear: profile.grade_or_year || 'Năm 2',
            school: profile.school || '',
            major: profile.major || '',
            studentId: profile.student_id || '',
            bio: profile.bio || '',
            avatarUrl: profile.avatar_url || '',
          };
        }
      }
    }
    return storage.get<UserAccount | null>(USER_STORAGE_KEY, null);
  },

  async updateProfile(profile: Partial<UserAccount>): Promise<UserAccount> {
    const current = (await this.getProfile()) || {
      id: `user-${Date.now()}`,
      email: 'student@studyos.edu.vn',
      name: 'Học viên StudyOS',
      educationLevel: 'university',
      gradeOrYear: 'Năm 2',
      school: '',
      major: '',
      studentId: '',
      bio: '',
      avatarUrl: '',
    };
    const updated: UserAccount = { ...current, ...profile };

    if (supabase && isSupabaseConfigured) {
      await supabase.from('users').upsert({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        education_level: updated.educationLevel,
        grade_or_year: updated.gradeOrYear,
        school: updated.school,
        major: updated.major,
        student_id: updated.studentId,
        bio: updated.bio,
        avatar_url: updated.avatarUrl,
      });
    }

    this.saveToRegistry(updated);
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
    // Unauthenticated users are not auto-logged in so they see login requirement
  },
};
