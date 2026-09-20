import { Chapter, Subject, Topic } from '../types/subject';

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'subj-1',
    code: 'MAT101',
    name: 'Giải tích 1',
    icon: 'Calculator',
    color: '#4f46e5', // indigo-600
    description: 'Giới hạn, đạo hàm, vi phân và tích phân hàm một biến số thực.',
    progress: 72,
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'subj-2',
    code: 'CS201',
    name: 'Cấu trúc dữ liệu & Giải thuật',
    icon: 'Binary',
    color: '#0284c7', // sky-600
    description: 'Danh sách liên kết, ngăn xếp, hàng đợi, cây nhị phân và thuật toán đồ thị.',
    progress: 58,
    createdAt: '2026-09-01T08:30:00Z',
  },
  {
    id: 'subj-3',
    code: 'PHY101',
    name: 'Vật lý Đại cương 1',
    icon: 'Atom',
    color: '#059669', // emerald-600
    description: 'Cơ học chất điểm, hệ chất điểm, vật rắn và nhiệt động lực học.',
    progress: 45,
    createdAt: '2026-09-02T09:00:00Z',
  },
  {
    id: 'subj-4',
    code: 'ENG202',
    name: 'Tiếng Anh Học thuật B2',
    icon: 'Languages',
    color: '#d97706', // amber-600
    description: 'Academic Writing, Reading comprehension và thuyết trình khoa học.',
    progress: 84,
    createdAt: '2026-09-02T09:30:00Z',
  }
];

export const INITIAL_CHAPTERS: Chapter[] = [
  // MAT101
  { id: 'chap-1-1', subjectId: 'subj-1', order: 1, title: 'Chương 1: Giới hạn và Hàm số liên tục', description: 'Định nghĩa Cauchy, giới hạn vô cực, các quy tắc L’Hôpital.' },
  { id: 'chap-1-2', subjectId: 'subj-1', order: 2, title: 'Chương 2: Đạo hàm và Vi phân', description: 'Ý nghĩa hình học, đạo hàm cấp cao, định lý Rolle, Lagrange, Cauchy.' },
  { id: 'chap-1-3', subjectId: 'subj-1', order: 3, title: 'Chương 3: Tích phân bất định và xác định', description: 'Nguyên hàm, tích phân từng phần, đổi biến số và ứng dụng hình học.' },

  // CS201
  { id: 'chap-2-1', subjectId: 'subj-2', order: 1, title: 'Chương 1: Phân tích độ phức tạp thuật toán', description: 'Ký hiệu Big-O, Big-Omega, phân tích thời gian và không gian.' },
  { id: 'chap-2-2', subjectId: 'subj-2', order: 2, title: 'Chương 2: Cấu trúc dữ liệu tuyến tính', description: 'Mảng động, Danh sách liên kết đơn/kép, Stack và Queue.' },
  { id: 'chap-2-3', subjectId: 'subj-2', order: 3, title: 'Chương 3: Cây và Cây tìm kiếm nhị phân', description: 'Cây nhị phân, duyệt cây (Inorder, Preorder, Postorder), Cây AVL.' },

  // PHY101
  { id: 'chap-3-1', subjectId: 'subj-1', order: 1, title: 'Chương 1: Động học và Động lực học chất điểm', description: 'Véc-tơ vận tốc, gia tốc, 3 định luật Newton và định luật bảo toàn động lượng.' },
  { id: 'chap-3-2', subjectId: 'subj-3', order: 2, title: 'Chương 2: Công và Năng lượng', description: 'Định lý động năng, thế năng trong trọng trường và bảo toàn cơ năng.' },

  // ENG202
  { id: 'chap-4-1', subjectId: 'subj-4', order: 1, title: 'Unit 1: Academic Vocabulary & Paraphrasing', description: 'Học từ vựng học thuật AWL và kỹ năng diễn đạt lại câu.' },
  { id: 'chap-4-2', subjectId: 'subj-4', order: 2, title: 'Unit 2: Essay Structure & Synthesis', description: 'Bố cục bài luận học thuật và tổng hợp tài liệu trích dẫn APA.' }
];

export const INITIAL_TOPICS: Topic[] = [
  // Under chap-1-1
  {
    id: 'topic-1-1-1',
    chapterId: 'chap-1-1',
    subjectId: 'subj-1',
    order: 1,
    title: 'Giới hạn dãy số và giới hạn hàm số',
    description: 'Tiêu chuẩn kẹp, số e và giới hạn đáng nhớ.',
    isCompleted: true,
    linkedDocIds: ['doc-1'],
    linkedNoteIds: ['note-1'],
    linkedFlashcardDeckIds: ['deck-1'],
    linkedQuestionIds: ['q-1', 'q-2']
  },
  {
    id: 'topic-1-1-2',
    chapterId: 'chap-1-1',
    subjectId: 'subj-1',
    order: 2,
    title: 'Tính liên tục và điểm gián đoạn của hàm số',
    description: 'Phân loại gián đoạn loại 1, loại 2, định lý Weierstrass.',
    isCompleted: true,
    linkedDocIds: ['doc-1'],
    linkedNoteIds: [],
    linkedFlashcardDeckIds: ['deck-1'],
    linkedQuestionIds: ['q-3']
  },
  // Under chap-1-2
  {
    id: 'topic-1-2-1',
    chapterId: 'chap-1-2',
    subjectId: 'subj-1',
    order: 1,
    title: 'Các định lý về giá trị trung bình (Rolle, Lagrange, Cauchy)',
    description: 'Ứng dụng chứng minh bất đẳng thức và nghiệm phương trình.',
    isCompleted: false,
    linkedDocIds: [],
    linkedNoteIds: ['note-3'],
    linkedFlashcardDeckIds: ['deck-1'],
    linkedQuestionIds: ['q-4']
  },
  // Under chap-2-2
  {
    id: 'topic-2-2-1',
    chapterId: 'chap-2-2',
    subjectId: 'subj-2',
    order: 1,
    title: 'Danh sách liên kết (Singly & Doubly Linked List)',
    description: 'Cài đặt thêm, xóa node, đảo ngược danh sách.',
    isCompleted: true,
    linkedDocIds: ['doc-2'],
    linkedNoteIds: ['note-2'],
    linkedFlashcardDeckIds: ['deck-2'],
    linkedQuestionIds: ['q-5']
  },
  {
    id: 'topic-2-2-2',
    chapterId: 'chap-2-2',
    subjectId: 'subj-2',
    order: 2,
    title: 'Ngăn xếp (Stack) và Hàng đợi (Queue)',
    description: 'Ứng dụng tính giá trị biểu thức hậu tố và duyệt BFS.',
    isCompleted: false,
    linkedDocIds: ['doc-2'],
    linkedNoteIds: [],
    linkedFlashcardDeckIds: ['deck-2'],
    linkedQuestionIds: ['q-6']
  }
];
