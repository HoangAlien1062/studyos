import { AppNotification } from '../types/notification';
import { getRelativeDate } from './initialSchedules';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'schedule',
    title: 'Tiết học sắp bắt đầu',
    message: 'Bạn có tiết Giải tích 1 lúc 07:30 tại Giảng đường A2 - Phòng 301.',
    timestamp: 'Hôm nay, 07:15',
    isRead: false,
    linkTab: 'schedule',
    linkId: 'sched-1'
  },
  {
    id: 'notif-2',
    type: 'flashcard',
    title: 'Thẻ flashcard đến hạn ôn tập',
    message: 'Bộ thẻ "Giải tích 1: Công thức Đạo hàm & Tích phân" có 4 thẻ cần ôn tập hôm nay.',
    timestamp: 'Hôm nay, 08:00',
    isRead: false,
    linkTab: 'flashcards',
    linkId: 'deck-1'
  },
  {
    id: 'notif-3',
    type: 'exam',
    title: 'Đề thi sắp tới',
    message: 'Đề thi "Thi thử Giữa kỳ: Giải tích 1" đã sẵn sàng để bạn ôn luyện kiểm tra.',
    timestamp: 'Hôm qua, 18:30',
    isRead: true,
    linkTab: 'exams',
    linkId: 'exam-1'
  },
  {
    id: 'notif-4',
    type: 'system',
    title: 'Chào mừng bạn đến với StudyOS',
    message: 'Không gian làm việc học tập cá nhân của bạn đã được thiết lập sẵn sàng.',
    timestamp: getRelativeDate(-4),
    isRead: true,
    linkTab: 'dashboard'
  }
];
