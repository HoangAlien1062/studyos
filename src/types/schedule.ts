export type ScheduleRepeatType = 'none' | 'daily' | 'weekly';

export interface ScheduleEvent {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  teacher: string;
  notes?: string;
  color: string;
  repeat: ScheduleRepeatType;
  isCompleted: boolean;
  createdAt: string;
}

export interface ParsedScheduleItem {
  subjectName: string;
  dayOfWeek?: number; // 2=Thứ hai, 8=CN
  date?: string;
  startTime: string;
  endTime: string;
  location: string;
  teacher: string;
  rawText: string;
  isValid: boolean;
  errorMessage?: string;
}
