import { ThemeMode } from './common';
import { NotificationSettings } from './notification';
import { AISettingsState } from './ai';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  educationLevel?: 'high_school' | 'university'; // 'high_school': Học sinh THPT | 'university': Sinh viên Đại học
  gradeOrYear?: string; // e.g. "Lớp 12A1" hoặc "Năm 3"
  school: string;
  major: string; // Khối thi (THPT) hoặc Chuyên ngành (ĐH)
  studentId: string; // Mã học sinh hoặc MSSV
  bio: string;
}

export interface GeneralSettings {
  language: 'vi' | 'en';
  timeFormat: '24h' | '12h';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  compactMode: boolean;
  soundEnabled: boolean;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  accentColor: string; // Indigo, Blue, Emerald, Violet, Amber
  fontSize: 'sm' | 'md' | 'lg';
}

export interface PrivacySettings {
  allowLocalCaching: boolean;
  analyticsCollection: boolean;
}

export interface FullAppSettings {
  profile: UserProfile;
  general: GeneralSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  ai: AISettingsState;
  privacy: PrivacySettings;
}
