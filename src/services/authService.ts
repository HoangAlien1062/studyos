import { supabase, isSupabaseConfigured, ensureSupabaseOnline } from '../lib/supabase';
import { storage } from './storage';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
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
  requiresEmailVerification?: boolean;
}

const DEMO_USER: UserAccount = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'student@studyos.edu.vn',
  name: 'Nguyễn Văn An',
  role: 'user',
  educationLevel: 'university',
  gradeOrYear: 'Năm 3 - K22',
  school: 'Đại học Bách Khoa TP.HCM',
  major: 'Khoa học Máy tính',
  studentId: '2210456',
  bio: 'Sinh viên năm 2 đam mê AI & Kỹ thuật lập trình. Mục tiêu GPA > 3.6',
};

const USER_STORAGE_KEY = 'studyos_active_user';
const REGISTERED_ACCOUNTS_KEY = 'studyos_registered_accounts';

export const ADMIN_EMAILS = ['phamnguyenhoang10@gmail.com', 'student@studyos.edu.vn'];

export function resolveRole(email: string, dbRole?: string): 'user' | 'admin' {
  if (ADMIN_EMAILS.includes(email.toLowerCase().trim()) || dbRole === 'admin') {
    return 'admin';
  }
  return 'user';
}

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

  /**
   * Register with Email & Password
   */
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
    const cleanEmail = data.email.trim().toLowerCase();
    const educationLevel = data.educationLevel || 'university';
    const gradeOrYear = data.gradeOrYear || (educationLevel === 'high_school' ? 'Lớp 12' : 'Năm 2');
    const defaultSchool = educationLevel === 'high_school' ? 'Trường THPT' : 'Trường Đại học';
    const defaultMajor = educationLevel === 'high_school' ? 'Khối Tự nhiên (Toán, Lý, Hóa)' : 'Khoa học Máy tính';

    if (!isSupabaseConfigured) {
      await ensureSupabaseOnline();
    }

    if (supabase && isSupabaseConfigured) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          data: {
            name: data.name.trim(),
            school: data.school || defaultSchool,
            education_level: educationLevel,
            grade_or_year: gradeOrYear,
            major: data.major || defaultMajor,
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists') ||
          error.message.toLowerCase().includes('user already exists')
        ) {
          throw new Error('Email này đã được đăng ký tài khoản. Mỗi địa chỉ Gmail chỉ được tạo duy nhất một tài khoản. Vui lòng chuyển sang màn hình Đăng nhập.');
        }
        throw new Error(error.message);
      }

      // Check duplicate in Supabase where identities is empty
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        throw new Error('Email này đã được đăng ký tài khoản. Mỗi địa chỉ Gmail chỉ được tạo duy nhất một tài khoản. Vui lòng chuyển sang màn hình Đăng nhập.');
      }

      const userId = authData.user?.id || `user-${Date.now()}`;
      const newUser: UserAccount = {
        id: userId,
        email: cleanEmail,
        name: data.name.trim(),
        role: resolveRole(cleanEmail),
        educationLevel,
        gradeOrYear,
        school: data.school || defaultSchool,
        major: data.major || defaultMajor,
        studentId: data.studentId || '',
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || '',
      };

      // If user session is returned immediately (email confirmation disabled in Supabase)
      if (authData.session) {
        try {
          await supabase.from('users').upsert({
            id: userId,
            email: cleanEmail,
            name: newUser.name,
            role: newUser.role || 'user',
            education_level: educationLevel,
            grade_or_year: gradeOrYear,
            school: newUser.school,
            major: newUser.major,
            student_id: data.studentId || '',
            bio: data.bio || '',
            avatar_url: newUser.avatarUrl || '',
          });
        } catch (e) {
          console.warn('[Supabase] Error saving user profile:', e);
        }

        storage.set(USER_STORAGE_KEY, newUser);
        return {
          token: authData.session.access_token,
          user: newUser,
          requiresEmailVerification: false,
        };
      }

      // If email verification is required (authData.session is null)
      return {
        token: '',
        user: newUser,
        requiresEmailVerification: true,
      };
    }

    throw new Error('Chưa kết nối Supabase Cloud. Vui lòng kiểm tra biến môi trường hoặc kết nối để đăng ký.');
  },

  /**
   * Login with Email & Password
   */
  async login(email: string, password?: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      await ensureSupabaseOnline();
    }

    if (supabase && isSupabaseConfigured) {
      if (!password) throw new Error('Vui lòng nhập mật khẩu đăng nhập.');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('email not confirmed')) {
          throw new Error('Tài khoản chưa được kích hoạt qua email. Vui lòng mở hộp thư Gmail của bạn (kiểm tra cả mục Thư rác/Spam) và nhấn vào liên kết xác nhận để kích hoạt tài khoản.');
        }
        if (msg.includes('invalid login credentials')) {
          throw new Error('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        }
        throw new Error(error.message);
      }

      // Fetch user profile from public.users
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userEmail = data.user.email || cleanEmail;
      const user: UserAccount = {
        id: data.user.id,
        email: userEmail,
        name: profile?.name || data.user.user_metadata?.name || data.user.user_metadata?.full_name || 'Học viên StudyOS',
        role: resolveRole(userEmail, profile?.role),
        educationLevel: profile?.education_level || 'university',
        gradeOrYear: profile?.grade_or_year || 'Năm 2',
        school: profile?.school || 'Đại học Bách Khoa',
        major: profile?.major || 'Khoa học Máy tính',
        studentId: profile?.student_id || '',
        bio: profile?.bio || '',
        avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '',
      };

      storage.set(USER_STORAGE_KEY, user);
      return {
        token: data.session?.access_token || 'supabase-session',
        user,
      };
    }

    throw new Error('Chưa kết nối Supabase Cloud. Vui lòng kiểm tra kết nối để đăng nhập.');
  },

  /**
   * Send Password Reset Email
   */
  async resetPasswordForEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Vui lòng nhập địa chỉ email nhận mã đặt lại.');

    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}`,
      });
      if (error) throw new Error(error.message);
      return;
    }

    throw new Error('Chưa kết nối Supabase Cloud.');
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

  /**
   * Get active bearer token for backend API requests
   */
  async getBearerToken(): Promise<string> {
    if (supabase && isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    }
    const current = this.getCurrentUser();
    return current ? `demo-token-${current.id}` : '';
  },

  /**
   * Fetch latest profile from DB or Supabase Auth
   */
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
          const user: UserAccount = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: resolveRole(profile.email, profile.role),
            educationLevel: profile.education_level || 'university',
            gradeOrYear: profile.grade_or_year || 'Năm 2',
            school: profile.school || '',
            major: profile.major || '',
            studentId: profile.student_id || '',
            bio: profile.bio || '',
            avatarUrl: profile.avatar_url || '',
          };
          storage.set(USER_STORAGE_KEY, user);
          return user;
        }
      }
    }
    return storage.get<UserAccount | null>(USER_STORAGE_KEY, null);
  },

  /**
   * Update profile
   */
  async updateProfile(profile: Partial<UserAccount>): Promise<UserAccount> {
    const current = (await this.getProfile()) || {
      id: `user-${Date.now()}`,
      email: 'student@studyos.edu.vn',
      name: 'Học viên StudyOS',
      role: 'user',
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
        role: updated.role || 'user',
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

  clearAllUserData(): void {
    const keysToPurge = [
      USER_STORAGE_KEY,
      'documents',
      'subjects',
      'chapters',
      'topics',
      'flashcards',
      'decks',
      'questions',
      'mistakes',
      'exams',
      'schedules',
      'notes',
      'conversations',
      'activeConversationId',
      'notifications',
      'analytics_events',
      'analytics_daily',
    ];
    keysToPurge.forEach(k => storage.remove(k));
  },

  logout(): void {
    if (supabase && isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
    this.clearAllUserData();
  },

  isAuthenticated(): boolean {
    return Boolean(storage.get<UserAccount | null>(USER_STORAGE_KEY, null));
  },

  /**
   * Listen to Supabase auth state changes
   */
  initAuthListener(onUserChange: (user: UserAccount | null) => void) {
    if (supabase && isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const sessionEmail = session.user.email || '';
            const user: UserAccount = {
              id: session.user.id,
              email: sessionEmail,
              name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'Học viên StudyOS',
              role: resolveRole(sessionEmail, profile?.role),
              educationLevel: profile?.education_level || 'university',
              gradeOrYear: profile?.grade_or_year || 'Năm 2',
              school: profile?.school || 'Đại học Bách Khoa',
              major: profile?.major || 'Khoa học Máy tính',
              studentId: profile?.student_id || '',
              bio: profile?.bio || '',
              avatarUrl: profile?.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
            };

            storage.set(USER_STORAGE_KEY, user);
            onUserChange(user);
          }
        } else if (event === 'SIGNED_OUT') {
          this.clearAllUserData();
          onUserChange(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
    return () => {};
  },
};
