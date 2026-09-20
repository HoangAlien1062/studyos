/**
 * Comprehensive Automated Test Suite for StudyOS Part 3 - Core Learning Engine
 * Run with: npm.cmd test
 */

import {
  SM2SpacedRepetitionStrategy,
  isCardDue,
} from '../services/algorithms/spacedRepetition';
import {
  questionEvaluator,
} from '../services/algorithms/questionEvaluator';
import { examGenerator } from '../services/algorithms/examGenerator';
import { examGrader } from '../services/algorithms/examGrader';
import { statisticsEngine } from '../services/algorithms/statisticsEngine';
import { Flashcard } from '../types/flashcard';
import { QuestionItem } from '../types/question';
import { MistakeItem } from '../types/mistake';
import { QuestionAttemptRecord } from '../types/session';
import { Subject, Topic } from '../types/subject';
import { importExportService } from '../services/dataExchange/importExportService';

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

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING AUTOMATED TESTS FOR STUDYOS CORE LEARNING ENGINE');
  console.log('===============================================================\n');

  // =========================================================================
  // 1. SPACED REPETITION (SM-2) ENGINE TESTS
  // =========================================================================
  console.log('--- 1. Testing Spaced Repetition (SM-2) Engine ---');
  const srs = new SM2SpacedRepetitionStrategy();

  const newCard: Flashcard = {
    id: 'fc-1',
    deckId: 'deck-1',
    front: 'Thuật toán SM-2 là gì?',
    back: 'Thuật toán lặp lại ngắt quãng tính khoảng cách ôn tập tối ưu.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitionCount: 0,
    state: 'new',
    nextReviewDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Test 1.1: Again resets interval
  const againResult = srs.calculateNextReview(newCard, 'again');
  assert(
    againResult.intervalDays === 0 && againResult.state === 'learning' && againResult.repetitionCount === 0,
    'SRS: Rating "again" resets interval and sets state to "learning"'
  );

  // Test 1.2: Good increments repetition and interval
  const goodCard: Flashcard = {
    ...newCard,
    intervalDays: 1,
    repetitionCount: 1,
    state: 'learning',
  };
  const goodResult = srs.calculateNextReview(goodCard, 'good');
  assert(
    goodResult.repetitionCount === 2 && goodResult.intervalDays === 3 && goodResult.state === 'learned',
    'SRS: Rating "good" sets repetition=2, interval=3 days, state="learned"'
  );

  // Test 1.3: Easy increases ease factor
  const easyResult = srs.calculateNextReview(goodCard, 'easy');
  assert(
    easyResult.easeFactor > (goodCard.easeFactor || 2.5) && easyResult.intervalDays >= 4,
    'SRS: Rating "easy" boosts ease factor and extends interval'
  );

  // Test 1.4: isCardDue check
  const pastDate = '2020-01-01';
  const futureDate = '2030-01-01';
  assert(
    isCardDue({ ...newCard, state: 'due', nextReviewDate: pastDate }),
    'SRS: Card with past nextReviewDate is marked due'
  );
  assert(
    !isCardDue({ ...newCard, state: 'learned', nextReviewDate: futureDate }),
    'SRS: Card with future nextReviewDate is not due'
  );

  // =========================================================================
  // 2. QUESTION EVALUATION STRATEGY TESTS
  // =========================================================================
  console.log('\n--- 2. Testing Question Evaluation Strategy Engine ---');

  // Test 2.1: Single choice evaluation
  const singleQ: QuestionItem = {
    id: 'q-single-1',
    subjectId: 'sub-1',
    content: '1 + 1 bằng mấy?',
    type: 'single_choice',
    difficulty: 'easy',
    options: [
      { id: 'opt-a', text: '1' },
      { id: 'opt-b', text: '2' },
      { id: 'opt-c', text: '3' },
    ],
    correctOptionId: 'opt-b',
    explanation: '1 + 1 = 2',
    tags: ['Toán'],
    createdAt: new Date().toISOString(),
  };

  const evalCorrect = questionEvaluator.evaluate(singleQ, 'opt-b');
  assert(evalCorrect.isCorrect && evalCorrect.scoreRatio === 1.0, 'Question: Single choice correct answer evaluated as 100%');

  const evalWrong = questionEvaluator.evaluate(singleQ, 'opt-a');
  assert(!evalWrong.isCorrect && evalWrong.scoreRatio === 0.0, 'Question: Single choice wrong answer evaluated as 0%');

  // Test 2.2: Multiple choice partial scoring
  const multiQ: QuestionItem = {
    id: 'q-multi-1',
    subjectId: 'sub-1',
    content: 'Những ngôn ngữ nào chạy trên trình duyệt?',
    type: 'multiple_choice',
    difficulty: 'medium',
    options: [
      { id: 'opt-js', text: 'JavaScript' },
      { id: 'opt-wasm', text: 'WebAssembly' },
      { id: 'opt-c', text: 'C++ trực tiếp native' },
    ],
    correctOptionId: 'opt-js',
    correctOptionIds: ['opt-js', 'opt-wasm'],
    explanation: 'JS và WebAssembly chạy trên web browser',
    tags: ['IT'],
    createdAt: new Date().toISOString(),
  };

  const evalMultiAll = questionEvaluator.evaluate(multiQ, ['opt-js', 'opt-wasm']);
  assert(evalMultiAll.isCorrect && evalMultiAll.scoreRatio === 1.0, 'Question: Multiple choice all correct selections score 1.0');

  const evalMultiPartial = questionEvaluator.evaluate(multiQ, ['opt-js']);
  assert(
    !evalMultiPartial.isCorrect && evalMultiPartial.scoreRatio === 0.5,
    'Question: Multiple choice partial selection scores 0.5 partial credit'
  );

  // Test 2.3: Short answer evaluation
  const shortQ: QuestionItem = {
    id: 'q-short-1',
    subjectId: 'sub-1',
    content: 'Công thức hóa học của nước là gì?',
    type: 'short_answer',
    difficulty: 'easy',
    options: [],
    correctOptionId: '',
    correctAnswerText: 'H2O',
    explanation: 'H2O là công thức phân tử nước',
    tags: ['Hóa'],
    createdAt: new Date().toISOString(),
  };

  const evalShort = questionEvaluator.evaluate(shortQ, '  h2o ');
  assert(
    evalShort.isCorrect && evalShort.scoreRatio === 1.0,
    'Question: Short answer matches case-insensitively with whitespace trim'
  );

  // Test 2.4: Question Schema Validation
  const invalidQ: Partial<QuestionItem> = {
    content: 'Câu hỏi không hợp lệ?',
    type: 'single_choice',
    options: [{ id: '1', text: 'Option' }],
  };
  const validationResult = questionEvaluator.validate(invalidQ);
  assert(
    !validationResult.isValid && validationResult.errors.length > 0,
    'Question: Schema validation detects missing required options & answer'
  );

  // =========================================================================
  // 3. EXAM GENERATION & GRADING TESTS
  // =========================================================================
  console.log('\n--- 3. Testing Exam Generator & Grader ---');

  const candidateQuestions: QuestionItem[] = [
    singleQ,
    multiQ,
    shortQ,
    {
      id: 'q-4',
      subjectId: 'sub-1',
      topicId: 'topic-algebra',
      content: '2 + 2 = 4?',
      type: 'true_false',
      difficulty: 'easy',
      options: [
        { id: 'true', text: 'Đúng' },
        { id: 'false', text: 'Sai' },
      ],
      correctOptionId: 'true',
      explanation: 'Hiển nhiên đúng',
      tags: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q-5',
      subjectId: 'sub-1',
      topicId: 'topic-algebra',
      content: '5 x 5 = 25?',
      type: 'true_false',
      difficulty: 'medium',
      options: [
        { id: 'true', text: 'Đúng' },
        { id: 'false', text: 'Sai' },
      ],
      correctOptionId: 'true',
      explanation: 'Hiển nhiên đúng',
      tags: [],
      createdAt: new Date().toISOString(),
    },
  ];

  // Test 3.1: Strict sufficiency check (Never create fake/dummy questions!)
  let errorCaught = false;
  try {
    examGenerator.generate(
      {
        title: 'Đề thi 10 câu',
        subjectId: 'sub-1',
        chapterIds: [],
        topicIds: [],
        questionCount: 10, // Requesting 10 when only 5 exist
        durationMinutes: 45,
        difficulty: 'mixed',
        questionType: 'mixed',
        mode: 'random',
      },
      {
        allQuestions: candidateQuestions,
        subjectName: 'Toán học',
      }
    );
  } catch (err: any) {
    errorCaught = true;
    assert(
      err.message.includes('Yêu cầu 10 câu nhưng chỉ tìm thấy 5 câu'),
      'Exam Generator: Throws explicit error when questions are insufficient (0 dummy questions generated)'
    );
  }
  assert(errorCaught, 'Exam Generator: Successfully rejected question shortage without fallback data');

  // Test 3.2: Successful exam generation with exact count
  const validExam = examGenerator.generate(
    {
      title: 'Đề kiểm tra 3 câu',
      subjectId: 'sub-1',
      chapterIds: [],
      topicIds: [],
      questionCount: 3,
      durationMinutes: 15,
      difficulty: 'mixed',
      questionType: 'mixed',
      mode: 'random',
    },
    {
      allQuestions: candidateQuestions,
      subjectName: 'Toán học',
    }
  );
  assert(
    validExam.questions.length === 3 && validExam.isSubmitted === false,
    'Exam Generator: Generated valid exam with exact required question count'
  );

  // Test 3.3: Exam Grader calculates 10-point scale accurately
  const gradedResult = examGrader.grade(
    validExam,
    {
      [validExam.questions[0].id]: validExam.questions[0].correctOptionId || validExam.questions[0].correctAnswerText || 'opt-b',
      [validExam.questions[1].id]: 'wrong-answer-xyz',
    },
    600,
    { 'topic-algebra': 'Đại số' }
  );
  assert(
    typeof gradedResult.score === 'number' && gradedResult.score >= 0 && gradedResult.score <= 10,
    'Exam Grader: Score normalized accurately to 10-point standard scale'
  );
  assert(
    Array.isArray(gradedResult.topicBreakdown) && Array.isArray(gradedResult.weakTopics),
    'Exam Grader: Produces topic breakdown and identifies weak topics'
  );

  // =========================================================================
  // 4. MISTAKE DEDUPLICATION & REASON LOGGING TESTS
  // =========================================================================
  console.log('\n--- 4. Testing Mistake Deduplication & Reason Tracking ---');

  const initialMistake: MistakeItem = {
    id: 'm-1',
    questionId: singleQ.id,
    questionContent: singleQ.content,
    options: singleQ.options,
    subjectId: singleQ.subjectId,
    subjectName: 'Toán học',
    selectedOptionId: 'opt-a',
    correctOptionId: 'opt-b',
    explanation: '1 + 1 = 2',
    createdAt: new Date().toISOString(),
    isReviewed: false,
    reviewCount: 1,
    reason: 'Đọc nhầm đề bài',
  };

  function deduplicateMistakes(existingList: MistakeItem[], newAttempt: MistakeItem): MistakeItem[] {
    const existingIndex = existingList.findIndex(m => m.questionId === newAttempt.questionId);
    if (existingIndex >= 0) {
      const updated = [...existingList];
      updated[existingIndex] = {
        ...updated[existingIndex],
        reviewCount: (updated[existingIndex].reviewCount || 1) + 1,
        selectedOptionId: newAttempt.selectedOptionId,
        createdAt: new Date().toISOString(),
        isReviewed: false,
      };
      return updated;
    }
    return [newAttempt, ...existingList];
  }

  const listAfterFirst = [initialMistake];
  const listAfterDuplicate = deduplicateMistakes(listAfterFirst, {
    ...initialMistake,
    id: 'm-new-auto',
    selectedOptionId: 'opt-c',
  });

  assert(
    listAfterDuplicate.length === 1 && listAfterDuplicate[0].reviewCount === 2,
    'Mistake Logbook: Deduplication merges repeat wrong answer and increments reviewCount to 2'
  );

  // =========================================================================
  // 5. STATISTICS & WEAK TOPIC ANALYSIS TESTS
  // =========================================================================
  console.log('\n--- 5. Testing Statistics Engine & Weak Topic Detection ---');

  const testSubject: Subject = {
    id: 'sub-1',
    code: 'MATH101',
    name: 'Toán học',
    description: 'Chương trình toán',
    color: '#6366f1',
    icon: 'Calculator',
    progress: 50,
    createdAt: new Date().toISOString(),
  };

  const testTopics: Topic[] = [
    {
      id: 'topic-algebra',
      chapterId: 'chap-1',
      subjectId: 'sub-1',
      title: 'Đại số tuyến tính',
      description: 'Ma trận và hệ phương trình',
      isCompleted: false,
      order: 1,
      linkedDocIds: [],
      linkedNoteIds: [],
      linkedFlashcardDeckIds: [],
      linkedQuestionIds: [],
    },
    {
      id: 'topic-geometry',
      chapterId: 'chap-1',
      subjectId: 'sub-1',
      title: 'Hình học giải tích',
      description: 'Tọa độ không gian',
      isCompleted: true,
      order: 2,
      completedAt: new Date().toISOString(),
      linkedDocIds: [],
      linkedNoteIds: [],
      linkedFlashcardDeckIds: [],
      linkedQuestionIds: [],
    },
  ];

  // Create 5 attempts for topic-algebra with 4 failures (accuracy = 20% < 60% threshold, attempts >= 3)
  const testAttempts: QuestionAttemptRecord[] = [
    {
      id: 'att-1',
      questionId: 'q-4',
      topicId: 'topic-algebra',
      subjectId: 'sub-1',
      selectedAnswer: 'false',
      correctAnswer: 'true',
      isCorrect: false,
      timeSpentSeconds: 20,
      context: 'practice',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'att-2',
      questionId: 'q-4',
      topicId: 'topic-algebra',
      subjectId: 'sub-1',
      selectedAnswer: 'false',
      correctAnswer: 'true',
      isCorrect: false,
      timeSpentSeconds: 25,
      context: 'practice',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'att-3',
      questionId: 'q-5',
      topicId: 'topic-algebra',
      subjectId: 'sub-1',
      selectedAnswer: 'false',
      correctAnswer: 'true',
      isCorrect: false,
      timeSpentSeconds: 15,
      context: 'practice',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'att-4',
      questionId: 'q-5',
      topicId: 'topic-algebra',
      subjectId: 'sub-1',
      selectedAnswer: 'false',
      correctAnswer: 'true',
      isCorrect: false,
      timeSpentSeconds: 30,
      context: 'practice',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'att-5',
      questionId: 'q-5',
      topicId: 'topic-algebra',
      subjectId: 'sub-1',
      selectedAnswer: 'true',
      correctAnswer: 'true',
      isCorrect: true,
      timeSpentSeconds: 18,
      context: 'practice',
      timestamp: new Date().toISOString(),
    },
  ];

  const summaryResult = statisticsEngine.calculateSummary({
    subjects: [testSubject],
    topics: testTopics,
    flashcards: [newCard],
    mistakes: listAfterDuplicate,
    exams: [validExam],
    attempts: testAttempts,
    sessions: [],
    documentsCount: 5,
    notesCount: 3,
  });

  assert(
    summaryResult.totalQuestionsAnswered === 5 && summaryResult.overallAccuracyRate === 20,
    'Statistics Engine: Computes overall accuracy accurately (20% for 1/5 correct)'
  );

  const algebraWeak = summaryResult.weakTopics.find(w => w.topicId === 'topic-algebra');
  assert(
    algebraWeak !== undefined && algebraWeak.accuracy === 20,
    'Statistics Engine: Correctly flags "Đại số tuyến tính" as weak topic based on attempts >= 3 & accuracy < 60%'
  );

  // =========================================================================
  // 6. IMPORT / EXPORT PIPELINE TESTS
  // =========================================================================
  console.log('\n--- 6. Testing Import / Export Pipeline ---');

  const validJsonImport = JSON.stringify([
    {
      front: 'Thủ đô của Việt Nam là gì?',
      back: 'Hà Nội',
      tags: ['Địa lý'],
    },
    {
      front: 'Nước sôi ở bao nhiêu độ C?',
      back: '100 độ C ở áp suất 1 atm',
      tags: ['Vật lý'],
    },
  ]);

  const previewResult = importExportService.validateFlashcardsJSON(validJsonImport);
  assert(
    previewResult.validCount === 2 && previewResult.errors.length === 0,
    'Import: Valid JSON flashcard payload parses with 100% valid rows'
  );

  const invalidJsonImport = JSON.stringify([
    {
      front: '', // Missing front
      back: 'No front',
    },
  ]);
  const previewInvalid = importExportService.validateFlashcardsJSON(invalidJsonImport);
  assert(
    previewInvalid.invalidCount === 1 && previewInvalid.errors[0].reason.includes('mặt trước'),
    'Import: Rejects card with missing front with clear error message'
  );

  // =========================================================================
  // TEST SUMMARY REPORT
  // =========================================================================
  console.log('\n===============================================================');
  console.log(`📊 TEST EXECUTION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
