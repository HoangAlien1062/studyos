import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  Flame,
  HelpCircle,
  Layers,
  PieChart,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { analyticsService } from '../../services/analyticsService';
import { subjectService } from '../../services/subjectService';
import { AnalyticsSummary } from '../../types/analytics';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const AnalyticsPage: React.FC = () => {
  const { dataVersion, navigateTo } = useStudy();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const load = async () => {
      const [sum, subs] = await Promise.all([
        analyticsService.getSummary(),
        subjectService.getSubjects(),
      ]);
      setSummary(sum);
      setSubjects(subs);
    };
    load();
  }, [dataVersion]);

  if (!summary) return null;

  // Max value calculation for weekly activity chart scaling
  const maxWeeklyActivity = Math.max(
    ...summary.weeklyActivity.map(w => w.questionsAnswered + w.flashcardsReviewed),
    20
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Độ chính xác chung</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.overallAccuracyRate}%
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Dựa trên {summary.totalQuestionsAnswered} câu hỏi đã làm
          </p>
        </Card>

        <Card className="!p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Điểm thi trung bình</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.averageExamScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Chuỗi ngày học liên tục: <strong className="text-amber-500 font-bold">{summary.streakDays} ngày</strong>
          </p>
        </Card>

        <Card className="!p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Chủ đề hoàn thành</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.completedTopicsCount} <span className="text-sm font-normal text-slate-400">/ {summary.totalTopicsCount}</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {Math.round((summary.completedTopicsCount / Math.max(1, summary.totalTopicsCount)) * 100)}% toàn bộ chương trình
          </p>
        </Card>

        <Card className="!p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Hôm nay</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.dailyStats.questionsToday} <span className="text-sm font-normal text-slate-400">câu</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {summary.dailyStats.flashcardsReviewedToday} thẻ ôn • {summary.dailyStats.accuracyToday}% đúng
          </p>
        </Card>
      </div>

      {/* Main Charts: Weekly Study Activity & Subject Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Activity Bar Chart (7 cols) */}
        <div className="lg:col-span-7">
          <Card
            title="Hoạt động học tập tuần này"
            subtitle="Số lượng câu hỏi trắc nghiệm đã làm và số thẻ flashcard đã ôn"
            className="h-full flex flex-col justify-between"
          >
            <div className="py-6 flex items-end justify-between gap-2 sm:gap-4 h-56 px-2">
              {summary.weeklyActivity.map((point, i) => {
                const total = point.questionsAnswered + point.flashcardsReviewed;
                const heightPercent = Math.min(100, Math.max(8, Math.round((total / maxWeeklyActivity) * 100)));

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {point.questionsAnswered}Q • {point.flashcardsReviewed}F
                    </div>

                    <div className="w-full max-w-[36px] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex flex-col justify-end h-full">
                      <div
                        className="w-full bg-indigo-500/80 rounded-t-xl group-hover:bg-indigo-600 transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {point.date}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Hoạt động học tập</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Subject Progress Breakdown (5 cols) */}
        <div className="lg:col-span-5">
          <Card
            title="Tiến độ theo Môn học"
            subtitle="Tỷ lệ hoàn thành chủ đề và độ chính xác"
            className="h-full flex flex-col justify-between"
          >
            <div className="space-y-4 py-2">
              {summary.subjectPerformances.map(subj => (
                <div key={subj.subjectId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {subj.subjectName}
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {subj.progress}% ({subj.topicsCompleted}/{subj.totalTopics})
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-indigo-600"
                      style={{ width: `${subj.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Đã làm: {subj.questionsAnswered} câu</span>
                    <span>Độ chính xác: {subj.accuracy}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo('subjects')}
                className="text-xs"
              >
                Mở chi tiết môn học
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Two Column Bottom: Flashcard Retention & Weak Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flashcard Memory Retention Breakdown */}
        <Card
          title="Tỷ lệ ghi nhớ Flashcard (Spaced Repetition)"
          subtitle="Phân bố trạng thái của các thẻ ghi nhớ"
        >
          <div className="py-4 space-y-4">
            <div className="flex h-5 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{
                  width: `${Math.round(
                    (summary.totalFlashcardsLearned /
                      Math.max(1, summary.totalFlashcardsLearned + summary.totalFlashcardsDue + (summary.totalFlashcardsNew || 0))) *
                      100
                  )}%`,
                }}
                title="Đã thuộc (Learned)"
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{
                  width: `${Math.round(
                    (summary.totalFlashcardsDue /
                      Math.max(1, summary.totalFlashcardsLearned + summary.totalFlashcardsDue + (summary.totalFlashcardsNew || 0))) *
                      100
                  )}%`,
                }}
                title="Cần ôn tập (Due)"
              />
              <div
                className="bg-indigo-500 h-full transition-all"
                style={{
                  width: `${Math.round(
                    ((summary.totalFlashcardsNew || 0) /
                      Math.max(1, summary.totalFlashcardsLearned + summary.totalFlashcardsDue + (summary.totalFlashcardsNew || 0))) *
                      100
                  )}%`,
                }}
                title="Thẻ mới (New)"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                <span className="font-bold text-base text-emerald-600 dark:text-emerald-400 block">
                  {summary.totalFlashcardsLearned}
                </span>
                <span className="text-slate-500 text-[11px]">Đã thuộc (Learned)</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                <span className="font-bold text-base text-amber-600 dark:text-amber-400 block">
                  {summary.totalFlashcardsDue}
                </span>
                <span className="text-slate-500 text-[11px]">Cần ôn (Due)</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <span className="font-bold text-base text-indigo-600 dark:text-indigo-400 block">
                  {summary.totalFlashcardsNew || 0}
                </span>
                <span className="text-slate-500 text-[11px]">Thẻ mới (New)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Weak Topics Analysis with Threshold Data */}
        <Card
          title={
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
              <span>Chủ đề yếu cần củng cố (Dữ liệu thực tế)</span>
            </div>
          }
          subtitle="Chỉ gắn cờ khi làm ≥ 3 lần và tỷ lệ sai > 40% hoặc lặp lại lỗi"
        >
          <div className="space-y-3 py-2">
            {summary.weakTopics.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa có chủ đề nào bị xác định yếu. Hãy tiếp tục luyện tập và làm bài thi!
              </div>
            ) : (
              summary.weakTopics.map(wt => (
                <div
                  key={wt.topicId}
                  onClick={() => navigateTo('subjects', wt.subjectId)}
                  className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between text-xs cursor-pointer hover:bg-rose-50/60 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      {wt.topicTitle}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {wt.subjectName} • {wt.attempts} lần làm • Độ chính xác: {wt.accuracy}%
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="danger" size="sm">
                      {wt.wrongCount} câu sai
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo('mistakes')}
              className="text-xs text-rose-600 hover:text-rose-700"
            >
              Mở Sổ lỗi sai để ôn tập
            </Button>
          </div>
        </Card>
      </div>

      {/* Mistake Reasons Distribution */}
      {summary.reasonDistribution.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-500" />
              <span>Phân bố lý do làm sai trong Sổ lỗi</span>
            </div>
          }
          subtitle="Giúp nhận diện thói quen để khắc phục điểm yếu"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            {summary.reasonDistribution.map(r => (
              <div
                key={r.reason}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                  {r.reason}
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {r.count}
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {r.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
