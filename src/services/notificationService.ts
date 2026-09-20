import { INITIAL_NOTIFICATIONS } from '../data/initialNotifications';
import { INITIAL_FULL_SETTINGS } from '../data/initialSettings';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppNotification, NotificationSettings } from '../types/notification';
import { storage } from './storage';

const NOTIFS_KEY = 'notifications';
const NOTIF_SETTINGS_KEY = 'notification_settings';

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: AppNotification[] = data.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            linkTab: n.target_tab,
            linkId: n.target_id,
            isRead: Boolean(n.is_read),
            timestamp: n.created_at,
          }));
          storage.set(NOTIFS_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading notifications:', err);
      }
    }
    return storage.get<AppNotification[]>(NOTIFS_KEY, INITIAL_NOTIFICATIONS);
  },

  async markAsRead(id: string): Promise<boolean> {
    const list = await this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.isRead = true;
      storage.set(NOTIFS_KEY, list);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error marking notification read:', err);
      }
    }

    return true;
  },

  async markAllAsRead(): Promise<boolean> {
    const list = await this.getNotifications();
    list.forEach(n => {
      n.isRead = true;
    });
    storage.set(NOTIFS_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('notifications').update({ is_read: true }).neq('id', '0');
      } catch (err) {
        console.warn('[Supabase Online] Error marking all read:', err);
      }
    }

    return true;
  },

  async deleteNotification(id: string): Promise<boolean> {
    const list = await this.getNotifications();
    storage.set(NOTIFS_KEY, list.filter(n => n.id !== id));

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('notifications').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting notification:', err);
      }
    }

    return true;
  },

  async getUnreadCount(): Promise<number> {
    const list = await this.getNotifications();
    return list.filter(n => !n.isRead).length;
  },

  async getSettings(): Promise<NotificationSettings> {
    return storage.get<NotificationSettings>(NOTIF_SETTINGS_KEY, INITIAL_FULL_SETTINGS.notifications);
  },

  async saveSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    storage.set(NOTIF_SETTINGS_KEY, settings);
    return settings;
  },
};
