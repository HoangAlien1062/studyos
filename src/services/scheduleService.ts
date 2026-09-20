import { INITIAL_SCHEDULES, getRelativeDate } from '../data/initialSchedules';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ParsedScheduleItem, ScheduleEvent } from '../types/schedule';
import { storage } from './storage';

const SCHEDULES_KEY = 'schedules';

export const scheduleService = {
  async getSchedules(): Promise<ScheduleEvent[]> {
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .order('date', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: ScheduleEvent[] = data.map(s => ({
            id: s.id,
            subjectId: s.subject_id || '',
            subjectName: s.subject_name,
            date: s.date,
            startTime: s.start_time,
            endTime: s.end_time,
            location: s.location,
            teacher: s.teacher || '',
            notes: s.notes || '',
            color: s.color,
            repeat: s.repeat_type || 'weekly',
            isCompleted: Boolean(s.is_completed),
            createdAt: s.created_at,
          }));
          storage.set(SCHEDULES_KEY, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase Online] Error loading schedules:', err);
      }
    }
    return storage.get<ScheduleEvent[]>(SCHEDULES_KEY, []);
  },

  async getScheduleById(id: string): Promise<ScheduleEvent | undefined> {
    const list = await this.getSchedules();
    return list.find(s => s.id === id);
  },

  async saveSchedule(item: Omit<ScheduleEvent, 'id' | 'createdAt'> & { id?: string }): Promise<ScheduleEvent> {
    const list = await this.getSchedules();
    let savedItem: ScheduleEvent;
    const now = new Date().toISOString();

    if (item.id) {
      const idx = list.findIndex(s => s.id === item.id);
      if (idx !== -1) {
        savedItem = { ...list[idx], ...item };
        list[idx] = savedItem;
      } else {
        savedItem = {
          ...item,
          id: `sched-${Date.now()}`,
          createdAt: now,
        } as ScheduleEvent;
        list.push(savedItem);
      }
    } else {
      savedItem = {
        ...item,
        id: `sched-${Date.now()}`,
        createdAt: now,
      } as ScheduleEvent;
      list.push(savedItem);
    }

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('schedules').upsert({
          id: savedItem.id,
          subject_id: savedItem.subjectId || null,
          subject_name: savedItem.subjectName,
          date: savedItem.date,
          start_time: savedItem.startTime,
          end_time: savedItem.endTime,
          location: savedItem.location,
          teacher: savedItem.teacher,
          notes: savedItem.notes,
          color: savedItem.color,
          repeat_type: savedItem.repeat,
          is_completed: savedItem.isCompleted,
        });
      } catch (err) {
        console.warn('[Supabase Online] Error saving schedule:', err);
      }
    }

    storage.set(SCHEDULES_KEY, list);
    return savedItem;
  },

  async deleteSchedule(id: string): Promise<boolean> {
    const list = await this.getSchedules();
    const filtered = list.filter(s => s.id !== id);
    storage.set(SCHEDULES_KEY, filtered);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('schedules').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error deleting schedule:', err);
      }
    }

    return true;
  },

  async toggleComplete(id: string): Promise<ScheduleEvent | undefined> {
    const list = await this.getSchedules();
    const item = list.find(s => s.id === id);
    if (!item) return undefined;
    item.isCompleted = !item.isCompleted;
    storage.set(SCHEDULES_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('schedules').update({ is_completed: item.isCompleted }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase Online] Error toggling schedule complete:', err);
      }
    }

    return item;
  },

  /**
   * Phân tích văn bản thời khóa biểu TXT với định dạng linh hoạt:
   * Hỗ trợ phân cách bằng gạch đứng '|', dấu phẩy ',', tab hoặc chấm phẩy.
   */
  parseTxtContent(content: string): ParsedScheduleItem[] {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsed: ParsedScheduleItem[] = [];

    lines.forEach(line => {
      if (line.startsWith('#') || line.startsWith('//')) return;

      const parts = line.split(/[|,;\t]+/).map(p => p.trim());
      if (parts.length < 2) {
        parsed.push({
          subjectName: parts[0] || 'Không rõ tên',
          startTime: '08:00',
          endTime: '09:30',
          location: 'Chưa cập nhật',
          teacher: '',
          rawText: line,
          isValid: false,
          errorMessage: 'Dòng không đúng định dạng tối thiểu (cần thứ/ngày và thời gian).',
        });
        return;
      }

      const dayPart = parts[0] || '';
      const timePart = parts[1] || '';
      const subjectName = parts[2] || parts[0];
      const location = parts[3] || 'Phòng học mặc định';
      const teacher = parts[4] || '';

      let startTime = '08:00';
      let endTime = '09:30';
      const timeMatches = timePart.match(/(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/);
      if (timeMatches) {
        startTime = timeMatches[1];
        endTime = timeMatches[2];
      }

      let dayOfWeek = 2;
      const lowerDay = dayPart.toLowerCase();
      if (lowerDay.includes('2') || lowerDay.includes('hai') || lowerDay.includes('mon')) dayOfWeek = 2;
      else if (lowerDay.includes('3') || lowerDay.includes('ba') || lowerDay.includes('tue')) dayOfWeek = 3;
      else if (lowerDay.includes('4') || lowerDay.includes('tư') || lowerDay.includes('tu') || lowerDay.includes('wed')) dayOfWeek = 4;
      else if (lowerDay.includes('5') || lowerDay.includes('năm') || lowerDay.includes('nam') || lowerDay.includes('thu')) dayOfWeek = 5;
      else if (lowerDay.includes('6') || lowerDay.includes('sáu') || lowerDay.includes('sau') || lowerDay.includes('fri')) dayOfWeek = 6;
      else if (lowerDay.includes('7') || lowerDay.includes('bảy') || lowerDay.includes('bay') || lowerDay.includes('sat')) dayOfWeek = 7;
      else if (lowerDay.includes('cn') || lowerDay.includes('nhật') || lowerDay.includes('nhat') || lowerDay.includes('sun')) dayOfWeek = 8;

      const now = new Date();
      const currentDay = now.getDay() === 0 ? 7 : now.getDay();
      const offset = (dayOfWeek === 8 ? 7 : dayOfWeek - 1) - (currentDay === 7 ? 6 : currentDay - 1);
      const targetDate = getRelativeDate(offset);

      parsed.push({
        subjectName: subjectName.replace(/^(Thứ\s*\d|CN)/i, '').trim() || 'Môn học mới',
        dayOfWeek,
        date: targetDate,
        startTime,
        endTime,
        location,
        teacher,
        rawText: line,
        isValid: true,
      });
    });

    return parsed;
  },

  async importParsedItems(items: ParsedScheduleItem[]): Promise<number> {
    const list = await this.getSchedules();
    const validItems = items.filter(it => it.isValid);
    const colors = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777'];
    const now = new Date().toISOString();

    const newRecords = validItems.map((it, idx) => ({
      id: `sched-imported-${Date.now()}-${idx}`,
      subjectId: `subj-custom-${idx}`,
      subjectName: it.subjectName,
      date: it.date || getRelativeDate(0),
      startTime: it.startTime,
      endTime: it.endTime,
      location: it.location,
      teacher: it.teacher,
      notes: `Nhập tự động từ tệp TXT (${it.rawText})`,
      color: colors[idx % colors.length],
      repeat: 'weekly' as const,
      isCompleted: false,
      createdAt: now,
    }));

    newRecords.forEach(r => list.push(r));
    storage.set(SCHEDULES_KEY, list);

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('schedules').insert(
          newRecords.map(r => ({
            id: r.id,
            subject_name: r.subjectName,
            date: r.date,
            start_time: r.startTime,
            end_time: r.endTime,
            location: r.location,
            teacher: r.teacher,
            notes: r.notes,
            color: r.color,
            repeat_type: r.repeat,
            is_completed: false,
          }))
        );
      } catch (err) {
        console.warn('[Supabase Online] Error importing schedules:', err);
      }
    }

    return validItems.length;
  },
};
