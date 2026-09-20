import { Flashcard, FlashcardDeck } from '../types/flashcard';
import { getRelativeDate } from './initialSchedules';

export const INITIAL_DECKS: FlashcardDeck[] = [
  {
    id: 'deck-1',
    title: 'Giải tích 1: Công thức Đạo hàm & Tích phân',
    description: 'Bao gồm đạo hàm hàm hợp, lượng giác ngược và tích phân suy rộng.',
    subjectId: 'subj-1',
    topicId: 'topic-1-1-1',
    color: '#4f46e5',
    createdAt: '2026-09-04T10:00:00Z',
  },
  {
    id: 'deck-2',
    title: 'DSA: Độ phức tạp & Cấu trúc Dữ liệu',
    description: 'Ôn tập độ phức tạp thời gian Big-O của các thuật toán và thao tác cơ bản.',
    subjectId: 'subj-2',
    topicId: 'topic-2-2-1',
    color: '#0284c7',
    createdAt: '2026-09-07T14:00:00Z',
  },
  {
    id: 'deck-3',
    title: 'Academic English: Từ vựng IELTS / TOEFL',
    description: 'Từ vựng học thuật nhóm Academic Word List (AWL).',
    subjectId: 'subj-4',
    color: '#d97706',
    createdAt: '2026-09-09T16:00:00Z',
  }
];

export const INITIAL_FLASHCARDS: Flashcard[] = [
  // Deck 1
  {
    id: 'card-1',
    deckId: 'deck-1',
    front: 'Đạo hàm của hàm số lượng giác ngược: $(\\arcsin x)\'$ bằng bao nhiêu?',
    back: '$$\\frac{1}{\\sqrt{1 - x^2}} \\quad (\\text{với } |x| < 1)$$',
    hint: 'Nhớ điều kiện xác định của mẫu số dưới dấu căn bậc hai.',
    state: 'due',
    repetitionCount: 3,
    intervalDays: 1,
    lastReviewedAt: getRelativeDate(-2),
    nextReviewDate: getRelativeDate(0),
  },
  {
    id: 'card-2',
    deckId: 'deck-1',
    front: 'Công thức tích phân từng phần đối với hàm một biến số thực?',
    back: '$$\\int u \\, dv = u \\cdot v - \\int v \\, du$$',
    hint: 'Quy tắc chọn ưu tiên u: Nhất log, nhì đa, tam lượng, tứ mũ.',
    state: 'learned',
    repetitionCount: 6,
    intervalDays: 7,
    lastReviewedAt: getRelativeDate(-1),
    nextReviewDate: getRelativeDate(6),
  },
  {
    id: 'card-3',
    deckId: 'deck-1',
    front: 'Khai triển Maclaurin của hàm số $e^x$ cấp $n$?',
    back: '$$e^x = 1 + \\frac{x}{1!} + \\frac{x^2}{2!} + \\dots + \\frac{x^n}{n!} + o(x^n)$$',
    state: 'new',
    repetitionCount: 0,
    intervalDays: 0,
    nextReviewDate: getRelativeDate(0),
  },

  // Deck 2
  {
    id: 'card-4',
    deckId: 'deck-2',
    front: 'Độ phức tạp thời gian trung bình và tệ nhất của Quick Sort?',
    back: 'Trung bình: $O(N \\log N)$\nTệ nhất: $O(N^2)$ (khi pivot luôn là phần tử nhỏ nhất hoặc lớn nhất)',
    hint: 'Nghĩ về cây đệ quy chia đôi mảng.',
    state: 'due',
    repetitionCount: 2,
    intervalDays: 2,
    lastReviewedAt: getRelativeDate(-3),
    nextReviewDate: getRelativeDate(0),
  },
  {
    id: 'card-5',
    deckId: 'deck-2',
    front: 'Thao tác pop() trên Stack được cài đặt bằng Singly Linked List có độ phức tạp là gì?',
    back: '$O(1)$ nếu xóa node tại con trỏ Head (đỉnh ngăn xếp).',
    state: 'learned',
    repetitionCount: 5,
    intervalDays: 5,
    lastReviewedAt: getRelativeDate(-1),
    nextReviewDate: getRelativeDate(4),
  },

  // Deck 3
  {
    id: 'card-6',
    deckId: 'deck-3',
    front: 'Từ học thuật: "ubiquitous" có nghĩa là gì? Cho 1 từ đồng nghĩa.',
    back: 'Nghĩa: Có mặt ở khắp nơi, phổ biến rộng rãi.\nĐồng nghĩa: omnipresent, pervasive.',
    state: 'due',
    repetitionCount: 1,
    intervalDays: 1,
    lastReviewedAt: getRelativeDate(-1),
    nextReviewDate: getRelativeDate(0),
  }
];
