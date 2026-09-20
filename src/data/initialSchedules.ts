import { ScheduleEvent } from '../types/schedule';

// Helper tạo ngày theo offset từ hôm nay
export const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const INITIAL_SCHEDULES: ScheduleEvent[] = [
  {
    id: 'sched-1',
    subjectId: 'subj-1',
    subjectName: 'Giải tích 1',
    date: getRelativeDate(0), // Hôm nay
    startTime: '07:30',
    endTime: '09:50',
    location: 'Giảng đường A2 - Phòng 301',
    teacher: 'TS. Nguyễn Văn Hùng',
    notes: 'Kiểm tra 15 phút phần đạo hàm cấp cao, mang theo máy tính Casio.',
    color: '#4f46e5',
    repeat: 'weekly',
    isCompleted: true,
    createdAt: '2026-09-10T08:00:00Z',
  },
  {
    id: 'sched-2',
    subjectId: 'subj-2',
    subjectName: 'Cấu trúc dữ liệu & Giải thuật',
    date: getRelativeDate(0), // Hôm nay
    startTime: '13:00',
    endTime: '15:20',
    location: 'Lab Máy tính 4 - Tòa H1',
    teacher: 'ThS. Trần Thị Mai',
    notes: 'Thực hành nộp bài tập danh sách liên kết kép trên hệ thống chấm tự động.',
    color: '#0284c7',
    repeat: 'weekly',
    isCompleted: false,
    createdAt: '2026-09-10T08:00:00Z',
  },
  {
    id: 'sched-3',
    subjectId: 'subj-3',
    subjectName: 'Vật lý Đại cương 1',
    date: getRelativeDate(1), // Ngày mai
    startTime: '09:00',
    endTime: '11:15',
    location: 'Hội trường B3',
    teacher: 'PGS. TS. Lê Quốc Toàn',
    notes: 'Ôn tập chương Bảo toàn cơ năng và Động lượng.',
    color: '#059669',
    repeat: 'weekly',
    isCompleted: false,
    createdAt: '2026-09-10T08:00:00Z',
  },
  {
    id: 'sched-4',
    subjectId: 'subj-4',
    subjectName: 'Tiếng Anh Học thuật B2',
    date: getRelativeDate(2), // 2 ngày tới
    startTime: '15:30',
    endTime: '17:30',
    location: 'Phòng học C1 - 204',
    teacher: 'Ms. Emily Watson',
    notes: 'Thuyết trình nhóm chủ đề Environmental Sustainability (7 phút).',
    color: '#d97706',
    repeat: 'weekly',
    isCompleted: false,
    createdAt: '2026-09-10T08:00:00Z',
  },
  {
    id: 'sched-5',
    subjectId: 'subj-1',
    subjectName: 'Giải tích 1 (Bài tập)',
    date: getRelativeDate(3),
    startTime: '08:00',
    endTime: '10:00',
    location: 'Phòng A2 - 205',
    teacher: 'ThS. Đỗ Minh Quân',
    notes: 'Chữa bài tập chương 2 tích phân suy rộng.',
    color: '#4f46e5',
    repeat: 'weekly',
    isCompleted: false,
    createdAt: '2026-09-10T08:00:00Z',
  }
];
