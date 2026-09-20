import { DifficultyPerformance, ExamSession, TopicPerformance } from '../../types/exam';
import { QuestionDifficulty, QuestionItem } from '../../types/question';
import { questionEvaluator } from './questionEvaluator';

export interface ExamGradingResult {
  score: number; // 0.0 to 10.0
  accuracyPercentage: number; // 0 to 100%
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  topicBreakdown: TopicPerformance[];
  difficultyBreakdown: DifficultyPerformance[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  wrongQuestions: {
    question: QuestionItem;
    selectedOptionId: string;
    correctOptionId: string;
  }[];
}

export class ExamGrader {
  grade(
    exam: ExamSession,
    userAnswers: Record<string, string>,
    timeSpentSeconds: number = 0,
    topicNameLookup: Record<string, string> = {}
  ): ExamGradingResult {
    const totalQuestions = exam.questions.length;
    if (totalQuestions === 0) {
      return {
        score: 0,
        accuracyPercentage: 0,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 0,
        totalQuestions: 0,
        timeSpentSeconds,
        topicBreakdown: [],
        difficultyBreakdown: [],
        weakTopics: [],
        strongTopics: [],
        wrongQuestions: [],
      };
    }

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let earnedPoints = 0;

    const topicStatsMap: Record<string, { title: string; total: number; correct: number; wrong: number }> = {};
    const diffStatsMap: Record<QuestionDifficulty, { total: number; correct: number }> = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 },
    };

    const wrongQuestions: {
      question: QuestionItem;
      selectedOptionId: string;
      correctOptionId: string;
    }[] = [];

    for (const q of exam.questions) {
      const userAnswer = userAnswers[q.id];
      const topicKey = q.topicId || 'general';
      const topicTitle = q.topicId ? (topicNameLookup[q.topicId] || 'Chủ đề chung') : 'Chủ đề chung';

      if (!topicStatsMap[topicKey]) {
        topicStatsMap[topicKey] = { title: topicTitle, total: 0, correct: 0, wrong: 0 };
      }
      topicStatsMap[topicKey].total += 1;

      const diff = q.difficulty || 'medium';
      if (diffStatsMap[diff]) {
        diffStatsMap[diff].total += 1;
      }

      if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
        // Skipped
        skippedCount += 1;
        topicStatsMap[topicKey].wrong += 1;
        wrongQuestions.push({
          question: q,
          selectedOptionId: '(Bỏ trống)',
          correctOptionId: q.correctOptionId,
        });
        continue;
      }

      const evaluation = questionEvaluator.evaluate(q, userAnswer);
      if (evaluation.isCorrect) {
        correctCount += 1;
        earnedPoints += 1.0;
        topicStatsMap[topicKey].correct += 1;
        if (diffStatsMap[diff]) {
          diffStatsMap[diff].correct += 1;
        }
      } else {
        wrongCount += 1;
        earnedPoints += evaluation.scoreRatio; // Partial credit if applicable
        topicStatsMap[topicKey].wrong += 1;
        wrongQuestions.push({
          question: q,
          selectedOptionId: Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer,
          correctOptionId: q.correctOptionId,
        });
      }
    }

    // Scale to 10 points
    const rawScore = (earnedPoints / totalQuestions) * 10;
    const score = Math.round(rawScore * 10) / 10;
    const accuracyPercentage = Math.round((correctCount / totalQuestions) * 100);

    // Topic breakdown
    const topicBreakdown: TopicPerformance[] = Object.entries(topicStatsMap).map(([id, stat]) => {
      const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      return {
        topicId: id === 'general' ? undefined : id,
        topicTitle: stat.title,
        total: stat.total,
        correct: stat.correct,
        wrongCount: stat.wrong,
        accuracy,
      };
    });

    // Difficulty breakdown
    const difficultyBreakdown: DifficultyPerformance[] = (['easy', 'medium', 'hard'] as QuestionDifficulty[]).map(
      diff => {
        const stat = diffStatsMap[diff];
        const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        return {
          difficulty: diff,
          total: stat.total,
          correct: stat.correct,
          accuracy,
        };
      }
    );

    // Identify weak & strong topics purely from performance data
    const weakTopics = topicBreakdown.filter(t => t.accuracy < 60 || t.wrongCount >= 2);
    const strongTopics = topicBreakdown.filter(t => t.accuracy >= 80 && t.total >= 1);

    return {
      score,
      accuracyPercentage,
      correctCount,
      wrongCount,
      skippedCount,
      totalQuestions,
      timeSpentSeconds,
      topicBreakdown,
      difficultyBreakdown,
      weakTopics,
      strongTopics,
      wrongQuestions,
    };
  }
}

export const examGrader = new ExamGrader();
