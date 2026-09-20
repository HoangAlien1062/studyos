import { FullAppSettings } from '../types/settings';
import { INITIAL_AI_SETTINGS } from './initialAISettings';

export const INITIAL_FULL_SETTINGS: FullAppSettings = {
  profile: {
    name: 'Nguyễn Hoàng Long',
    email: 'hoanglong.studyos@univ.edu.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    school: 'Trường Đại học Bách Khoa - ĐHQG',
    major: 'Khoa học Máy tính & Trí tuệ Nhân tạo',
    studentId: '20234589',
    bio: 'Sinh viên năm 2 đam mê giải thuật, toán học ứng dụng và kỹ thuật phần mềm hiện đại.',
  },
  general: {
    language: 'vi',
    timeFormat: '24h',
    dateFormat: 'DD/MM/YYYY',
    compactMode: false,
    soundEnabled: true,
  },
  appearance: {
    theme: 'system',
    accentColor: '#4f46e5',
    fontSize: 'md',
  },
  notifications: {
    scheduleReminders: true,
    upcomingExams: true,
    flashcardsDue: true,
    systemUpdates: false,
    browserPushEnabled: false,
  },
  ai: INITIAL_AI_SETTINGS,
  privacy: {
    allowLocalCaching: true,
    analyticsCollection: true,
  }
};
