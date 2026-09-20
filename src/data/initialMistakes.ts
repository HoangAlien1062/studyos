import { MistakeItem } from '../types/mistake';
import { getRelativeDate } from './initialSchedules';

export const INITIAL_MISTAKES: MistakeItem[] = [
  {
    id: 'mis-1',
    questionId: 'q-4',
    questionContent: 'Trong cấu trúc dữ liệu Singly Linked List chỉ lưu con trỏ Head, thao tác nào sau đây có độ phức tạp thời gian $O(N)$ trong trường hợp xấu nhất?',
    options: [
      { id: 'opt-4-a', text: 'Thêm phần tử vào đầu danh sách' },
      { id: 'opt-4-b', text: 'Xóa phần tử ở đầu danh sách' },
      { id: 'opt-4-c', text: 'Xóa phần tử cuối cùng của danh sách' },
      { id: 'opt-4-d', text: 'Kiểm tra danh sách rỗng (isEmpty)' }
    ],
    selectedOptionId: 'opt-4-b',
    correctOptionId: 'opt-4-c',
    explanation: 'Để xóa phần tử cuối trong danh sách liên kết đơn, ta bắt buộc phải duyệt từ Head tới phần tử kế cuối để cập nhật con trỏ next thành nullptr, do đó mất $O(N)$. Thao tác xóa đầu chỉ tốn O(1).',
    subjectId: 'subj-2',
    subjectName: 'Cấu trúc dữ liệu & Giải thuật',
    chapterId: 'chap-2-2',
    reason: 'Đọc nhầm giữa xóa đầu và xóa cuối danh sách',
    reviewCount: 2,
    lastReviewedAt: getRelativeDate(-1),
    isReviewed: false,
    createdAt: '2026-09-12T14:20:00Z',
  },
  {
    id: 'mis-2',
    questionId: 'q-6',
    questionContent: 'Một vật trượt không ma sát từ đỉnh mặt phẳng nghiêng cao $h$ xuống chân mặt phẳng. Vận tốc tại chân dốc phụ thuộc vào góc nghiêng $\\alpha$ như thế nào?',
    options: [
      { id: 'opt-6-a', text: 'Tỉ lệ thuận với sin(alpha)' },
      { id: 'opt-6-b', text: 'Tỉ lệ nghịch với cos(alpha)' },
      { id: 'opt-6-c', text: 'Không phụ thuộc vào góc nghiêng alpha' },
      { id: 'opt-6-d', text: 'Phụ thuộc vào chiều dài dốc l' }
    ],
    selectedOptionId: 'opt-6-a',
    correctOptionId: 'opt-6-c',
    explanation: 'Theo định luật bảo toàn cơ năng (bỏ qua ma sát): mgh = 1/2 m v^2 => v = sqrt(2gh). Vận tốc chỉ phụ thuộc độ cao h, không phụ thuộc góc nghiêng.',
    subjectId: 'subj-3',
    subjectName: 'Vật lý Đại cương 1',
    chapterId: 'chap-3-2',
    reason: 'Nhầm lẫn giữa vận tốc chạm đất và thời gian trượt (thời gian trượt có phụ thuộc sin(alpha))',
    reviewCount: 3,
    lastReviewedAt: getRelativeDate(-2),
    isReviewed: true,
    createdAt: '2026-09-14T10:15:00Z',
  }
];
