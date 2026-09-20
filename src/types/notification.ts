import { NavigationTab } from './common';

export type NotificationType = 'schedule' | 'exam' | 'flashcard' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  linkTab?: NavigationTab;
  linkId?: string;
}

export interface NotificationSettings {
  scheduleReminders: boolean;
  upcomingExams: boolean;
  flashcardsDue: boolean;
  systemUpdates: boolean;
  browserPushEnabled: boolean;
}
