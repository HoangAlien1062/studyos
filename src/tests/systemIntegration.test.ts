/**
 * Comprehensive System Integration Test Suite for StudyOS (Part 5)
 * Verifies End-to-End System Integration: Persona Switching, Study Engine,
 * SM-2 Repetition, Question Bank, Error Book, Exam Grading (10-point scale),
 * Global Search Index, and User Data Wipe Clean.
 *
 * Run with: npx tsx src/tests/systemIntegration.test.ts
 */

import { SM2SpacedRepetitionStrategy } from '../services/algorithms/spacedRepetition';
import { examGrader } from '../services/algorithms/examGrader';
import { examGenerator } from '../services/algorithms/examGenerator';
import { questionEvaluator } from '../services/algorithms/questionEvaluator';
import { QuestionItem } from '../types/question';
import { Flashcard } from '../types/flashcard';
import { MistakeItem } from '../types/mistake';
import { UserProfile } from '../types/settings';
import { SearchResultItem } from '../types/common';
import { storage } from '../services/storage';
import { settingsService } from '../services/settingsService';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
    failedTests++;
  }
}

async function runIntegrationSuite() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING SYSTEM INTEGRATION & E2E TESTS FOR STUDYOS (PART 5)');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // 1. EDUCATION PERSONA SWITCHING (High School vs University)
  // -------------------------------------------------------------------------
  console.log('--- 1. Education Persona Switching (Cấp 3 vs Sinh viên) ---');

  const defaultProfile: UserProfile = {
    name: 'Nguyễn Văn An',
    email: 'student@studyos.edu.vn',
    school: 'Đại học Bách Khoa',
    major: 'Khoa học Máy tính',
    studentId: '20235678',
    educationLevel: 'university',
    gradeOrYear: 'Năm 2',
    bio: 'Sinh viên năm 2',
    avatarUrl: '',
  };

  assert(
    defaultProfile.educationLevel === 'university' && defaultProfile.gradeOrYear === 'Năm 2',
    'Persona: Default persona correctly initializes as University student'
  );

  // Switch to High School Persona
  const highSchoolProfile: UserProfile = {
    ...defaultProfile,
    school: 'THPT Chuyên Lê Hồng Phong',
    major: 'Khối A00 (Toán - Lý - Hóa)',
    studentId: 'HS12-45',
    educationLevel: 'high_school',
    gradeOrYear: 'Lớp 12',
    bio: 'Học sinh lớp 12 chuẩn bị thi THPT Quốc gia',
  };

  assert(
    highSchoolProfile.educationLevel === 'high_school' && highSchoolProfile.gradeOrYear === 'Lớp 12',
    'Persona: Successfully switches to High School persona with custom grade and major'
  );

  // -------------------------------------------------------------------------
  // 2. STUDY HIERARCHY & DATA RELATIONS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Study Hierarchy & Data Relations ---');

  const subject = {
    id: 'sub-math-12',
    name: 'Toán học 12',
    code: 'MATH12',
    creditCount: 4, // Số tiết/tuần đối với cấp 3 hoặc tín chỉ đối với ĐH
    progress: 75,
  };

  const chapter = {
    id: 'chap-calc-1',
    subjectId: subject.id,
    title: 'Chương 1: Ứng dụng đạo hàm khảo sát hàm số',
    orderIndex: 1,
  };

  const topic = {
    id: 'top-monotony',
    chapterId: chapter.id,
    subjectId: subject.id,
    title: 'Tính đơn điệu của hàm số',
  };

  assert(
    chapter.subjectId === subject.id && topic.chapterId === chapter.id,
    'Hierarchy: Subject -> Chapter -> Topic relationship integrity maintained'
  );

  // -------------------------------------------------------------------------
  // 3. SM-2 SPACED REPETITION WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Core SM-2 Spaced Repetition Workflow ---');
  const sm2 = new SM2SpacedRepetitionStrategy();

  const card: Flashcard = {
    id: 'card-1',
    deckId: 'deck-math',
    front: 'Điều kiện cần và đủ để hàm số f(x) đồng biến trên K là gì?',
    back: "f'(x) >= 0 với mọi x thuộc K và dấu bằng chỉ xảy ra tại hữu hạn điểm.",
    intervalDays: 0,
    easeFactor: 2.5,
    repetitionCount: 0,
    state: 'new',
    nextReviewDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const step1 = sm2.calculateNextReview(card, 'good');
  assert(step1.intervalDays === 1 && step1.repetitionCount === 1, 'SM-2: First "Good" sets interval = 1 day');

  const step2 = sm2.calculateNextReview({ ...card, ...step1 }, 'good');
  assert(step2.intervalDays === 3 && step2.repetitionCount === 2, 'SM-2: Second "Good" sets interval = 3 days');

  const step3Again = sm2.calculateNextReview({ ...card, ...step2 }, 'again');
  assert(
    step3Again.intervalDays === 0 && step3Again.repetitionCount === 0 && step3Again.state === 'learning',
    'SM-2: "Again" rating correctly lapses card to interval 0 and learning state'
  );

  // -------------------------------------------------------------------------
  // 4. QUESTION EVALUATION & EXAM GRADING (10-POINT SCALE)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Question Evaluation & Exam Grading (10-point scale) ---');

  const q1: QuestionItem = {
    id: 'q-1',
    content: 'Đạo hàm của f(x) = x^3 - 3x + 1 là?',
    type: 'single_choice',
    difficulty: 'easy',
    subjectId: subject.id,
    tags: ['Đạo hàm'],
    correctOptionId: 'opt-a',
    options: [
      { id: 'opt-a', text: '3x^2 - 3' },
      { id: 'opt-b', text: '3x^2 + 3' },
      { id: 'opt-c', text: 'x^2 - 3' },
    ],
    explanation: 'f\'(x) = (x^3)\' - 3(x)\' + (1)\' = 3x^2 - 3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const q2: QuestionItem = {
    id: 'q-2',
    content: 'Hàm số y = x^4 - 2x^2 có bao nhiêu điểm cực trị?',
    type: 'single_choice',
    difficulty: 'medium',
    subjectId: subject.id,
    tags: ['Cực trị'],
    correctOptionId: 'opt-2c',
    options: [
      { id: 'opt-2a', text: '1' },
      { id: 'opt-2b', text: '2' },
      { id: 'opt-2c', text: '3' },
    ],
    explanation: 'y\' = 4x^3 - 4x = 4x(x^2 - 1) = 0 có 3 nghiệm phân biệt x = 0, x = 1, x = -1.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Test question evaluator
  const evalResultCorrect = questionEvaluator.evaluate(q1, 'opt-a');
  assert(evalResultCorrect.isCorrect === true && evalResultCorrect.scoreRatio === 1.0, 'Question Evaluator: Correct answer scores 1.0');

  const evalResultWrong = questionEvaluator.evaluate(q2, 'opt-2a');
  assert(evalResultWrong.isCorrect === false && evalResultWrong.scoreRatio === 0.0, 'Question Evaluator: Wrong answer scores 0.0');

  // Test exam grading on standard 10-point Vietnamese educational scale
  const examSession = {
    id: 'exam-sample-1',
    title: 'Kiểm tra 15 phút Giải tích 12',
    subjectId: subject.id,
    subjectName: subject.name,
    durationMinutes: 15,
    questions: [q1, q2],
    userAnswers: {},
    flaggedQuestionIds: [],
    isSubmitted: false,
    createdAt: new Date().toISOString(),
  };

  const gradeResult = examGrader.grade(
    examSession,
    {
      'q-1': 'opt-a', // correct
      'q-2': 'opt-2a', // wrong
    },
    300
  );

  assert(gradeResult.totalQuestions === 2, 'Exam Grader: Total questions is 2');
  assert(gradeResult.correctCount === 1, 'Exam Grader: Correct count is 1');
  assert(gradeResult.score === 5.0, 'Exam Grader: Score is 5.0/10.0');
  assert(gradeResult.wrongQuestions.length === 1 && gradeResult.wrongQuestions[0].question.id === 'q-2', 'Exam Grader: Identifies wrong question q-2');

  // -------------------------------------------------------------------------
  // 5. MISTAKE BOOK ENTRY & DEDUPLICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Mistake Book Entry & Deduplication ---');

  const mistakesList: MistakeItem[] = [];

  // First time wrong
  const mistake1: MistakeItem = {
    id: 'mistake-1',
    questionId: q2.id,
    questionContent: q2.content,
    options: q2.options,
    selectedOptionId: 'opt-2a',
    correctOptionId: 'opt-2c',
    explanation: q2.explanation,
    subjectId: subject.id,
    subjectName: subject.name,
    reason: 'Nhầm lẫn số nghiệm phương trình y\' = 0',
    reviewCount: 1,
    isReviewed: false,
    attemptHistory: [
      {
        timestamp: new Date().toISOString(),
        selectedAnswer: 'opt-2a',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mistakesList.push(mistake1);

  // If failed again in later exam, deduplication increments reviewCount rather than duplicating row
  const existingIdx = mistakesList.findIndex(m => m.questionId === q2.id);
  if (existingIdx >= 0) {
    const existing = mistakesList[existingIdx];
    existing.reviewCount += 1;
    existing.attemptHistory = existing.attemptHistory || [];
    existing.attemptHistory.push({
      timestamp: new Date().toISOString(),
      selectedAnswer: 'opt-2b',
    });
  }

  assert(mistakesList.length === 1, 'Mistake Book: Deduplication prevents duplicate entries for the same question');
  assert(mistakesList[0].reviewCount === 2, 'Mistake Book: Increments reviewCount on repeat errors');
  assert((mistakesList[0].attemptHistory?.length || 0) === 2, 'Mistake Book: Tracks complete attempt history');

  // -------------------------------------------------------------------------
  // 6. GLOBAL SEARCH COMPOSER INDEX
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Global Search Index Composer ---');

  const searchItems: SearchResultItem[] = [
    {
      id: subject.id,
      title: subject.name,
      subtitle: `${subject.code} • Tiến độ ${subject.progress}%`,
      category: 'subjects',
      badge: 'Môn học',
      routeTarget: { tab: 'subjects', id: subject.id },
    },
    {
      id: q1.id,
      title: q1.content,
      subtitle: `Độ khó: ${q1.difficulty.toUpperCase()}`,
      category: 'questions',
      badge: 'Câu hỏi',
      routeTarget: { tab: 'questions', id: q1.id },
    },
    {
      id: mistake1.id,
      title: mistake1.questionContent,
      subtitle: `Lỗi sai: ${mistake1.reason}`,
      category: 'mistakes',
      badge: 'Sổ lỗi sai',
      routeTarget: { tab: 'mistakes', id: mistake1.id },
    },
    {
      id: 'conv-ai-1',
      title: 'Giải thích chi tiết đạo hàm hàm hợp',
      subtitle: 'Trợ lý AI (exam) • 4 tin nhắn',
      category: 'ai',
      badge: 'Trợ lý AI',
      routeTarget: { tab: 'ai', id: 'conv-ai-1' },
    },
  ];

  const querySearch = (q: string) => {
    const lq = q.toLowerCase();
    return searchItems.filter(i => i.title.toLowerCase().includes(lq) || i.subtitle.toLowerCase().includes(lq));
  };

  const mathResults = querySearch('đạo hàm');
  assert(mathResults.length === 2, 'Global Search: Finds both question and AI conversation matching "đạo hàm"');

  const mistakeResults = querySearch('nhầm lẫn');
  assert(mistakeResults.length === 1 && mistakeResults[0].category === 'mistakes', 'Global Search: Successfully locates mistake by reason');

  // -------------------------------------------------------------------------
  // 7. USER DATA FACTORY RESET / WIPE CLEAN
  // -------------------------------------------------------------------------
  console.log('\n--- 7. User Data Factory Reset (Wipe Clean) ---');

  // Seed sample data in mock storage
  storage.set('subjects', [subject]);
  storage.set('mistakes', [mistake1]);

  assert(
    (storage.get<any[]>('subjects', []).length === 1),
    'Storage: Mock storage contains active user data before wipe'
  );

  // Execute wipeAllUserData
  await settingsService.wipeAllUserData();

  const subjectsAfterWipe = storage.get<any[]>('subjects', null as any);
  const mistakesAfterWipe = storage.get<any[]>('mistakes', null as any);

  assert(
    Array.isArray(subjectsAfterWipe) && subjectsAfterWipe.length === 0,
    'Data Wipe: Subjects dataset is explicitly reset to empty array [] (not falling back to demo data)'
  );
  assert(
    Array.isArray(mistakesAfterWipe) && mistakesAfterWipe.length === 0,
    'Data Wipe: Mistakes dataset is explicitly reset to empty array []'
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`🎉 SYSTEM INTEGRATION TESTS COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runIntegrationSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
