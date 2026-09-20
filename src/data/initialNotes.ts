import { NoteItem } from '../types/note';

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    title: 'Tổng hợp các dạng giới hạn đáng nhớ & Quy tắc L’Hôpital',
    content: `# Giới hạn Đáng Nhớ trong Giải Tích 1

## 1. Giới hạn cơ bản:
- Giới hạn lượng giác:
$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$
- Giới hạn liên quan đến số $e$:
$$\\lim_{x \\to 0} (1 + x)^{\\frac{1}{x}} = e$$

## 2. Quy tắc L'Hôpital
Áp dụng cho dạng vô định $\\frac{0}{0}$ hoặc $\\frac{\\infty}{\\infty}$:
$$\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f'(x)}{g'(x)}$$

> **Lưu ý quan trọng**: Phải kiểm tra điều kiện hàm khả vi trong lân cận điểm $a$ và mẫu số đạo hàm $g'(x) \\neq 0$.

- [x] Làm bài tập 1 đến 5 trang 42
- [ ] Chứng minh giới hạn hàm mũ bằng khai triển Taylor`,
    tags: ['Giải tích', 'Toán học', 'Giới hạn', 'L’Hôpital'],
    isPinned: true,
    isFavorite: true,
    subjectId: 'subj-1',
    chapterId: 'chap-1-1',
    topicId: 'topic-1-1-1',
    linkedDocumentId: 'doc-1',
    createdAt: '2026-09-06T14:00:00Z',
    updatedAt: '2026-09-18T10:20:00Z',
  },
  {
    id: 'note-2',
    title: 'Cài đặt Doubly Linked List bằng C++ và phân tích độ phức tạp',
    content: `# Danh sách liên kết đôi (Doubly Linked List)

## 1. Định nghĩa Node trong C++
\`\`\`cpp
struct Node {
    int data;
    Node* next;
    Node* prev;
    Node(int val) : data(val), next(nullptr), prev(nullptr) {}
};
\`\`\`

## 2. So sánh độ phức tạp thao tác:
| Thao tác | Doubly Linked List | Dynamic Array (std::vector) |
| :--- | :--- | :--- |
| Chèn đầu danh sách | $O(1)$ | $O(N)$ |
| Chèn cuối danh sách | $O(1)$ *(nếu có tail)* | $O(1)$ *(amortized)* |
| Xóa tại con trỏ hiện tại | $O(1)$ | $O(N)$ |
| Truy cập ngẫu nhiên | $O(N)$ | $O(1)$ |

- [x] Hoàn thành hàm reverseDoublyLinkedList()
- [ ] Xử lý edge case khi list rỗng`,
    tags: ['DSA', 'C++', 'Linked List', 'Algorithms'],
    isPinned: true,
    isFavorite: false,
    subjectId: 'subj-2',
    chapterId: 'chap-2-2',
    topicId: 'topic-2-2-1',
    linkedDocumentId: 'doc-2',
    createdAt: '2026-09-08T19:30:00Z',
    updatedAt: '2026-09-17T15:40:00Z',
  },
  {
    id: 'note-3',
    title: 'Định lý giá trị trung bình (Rolle, Lagrange, Cauchy)',
    content: `# Các định lý về giá trị trung bình

### 1. Định lý Rolle
Nếu hàm số $f(x)$ liên tục trên $[a, b]$, khả vi trên $(a, b)$ và $f(a) = f(b)$ thì:
$$\\exists c \\in (a, b) : f'(c) = 0$$

### 2. Định lý Lagrange (Công thức số gia hữu hạn)
$$\\exists c \\in (a, b) : \\frac{f(b) - f(a)}{b - a} = f'(c)$$

Ý nghĩa hình học: Tiếp tuyến tại điểm $(c, f(c))$ song song với cát tuyến nối $(a, f(a))$ và $(b, f(b))$.`,
    tags: ['Giải tích', 'Định lý'],
    isPinned: false,
    isFavorite: true,
    subjectId: 'subj-1',
    chapterId: 'chap-1-2',
    topicId: 'topic-1-2-1',
    createdAt: '2026-09-11T09:15:00Z',
    updatedAt: '2026-09-15T08:00:00Z',
  }
];
