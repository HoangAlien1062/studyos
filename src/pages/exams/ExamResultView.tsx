import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import katex from 'katex';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import { ExamSession } from '../../types/exam';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

interface ExamResultViewProps {
  exam: ExamSession;
  onExit: () => void;
  onRetake: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  exam,
  onExit,
  onRetake,
}) => {
  useEffect(() => {
    if ((exam.score || 0) >= 7.0) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
      });
    }
  }, [exam.score]);

  const renderMathContent = (rawText: string) => {
    const parts = rawText.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <div key={i} className="my-2" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <div key={i} className="text-rose-500 font-mono">{part}</div>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i} className="text-rose-500 font-mono">{part}</span>;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const scoreColor = (exam.score || 0) >= 8
    ? 'text-emerald-600 dark:text-emerald-400'
    : (exam.score || 0) >= 5
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onExit} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Quay lại danh sách đề thi
        </Button>
        <Button variant="primary" size="sm" onClick={onRetake} leftIcon={<RotateCcw className="w-4 h-4" />}>
          Làm lại bài thi này
        </Button>
      </div>

      {/* Main Score Overview Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
        <div>
          <Badge variant="primary" size="sm" className="mb-2">
            Kết quả bài thi • {exam.completedAt || 'Vừa xong'}
          </Badge>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {exam.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Môn học: {exam.subjectName} • Thời gian: {exam.durationMinutes} phút
          </p>
        </div>

        {/* Big Score Display */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-5xl sm:text-6xl font-black tracking-tight flex items-baseline gap-1">
            <span className={scoreColor}>{exam.score}</span>
            <span className="text-xl font-normal text-slate-400">/ 10</span>
          </div>
          <span className="text-xs font-semibold text-slate-500 mt-2">
            Độ chính xác: {exam.accuracyPercentage}%
          </span>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium block">
              Số câu đúng
            </span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {exam.correctCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <span className="text-xs text-rose-700 dark:text-rose-300 font-medium block">
              Số câu sai
            </span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {exam.wrongCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">
              Bỏ qua
            </span>
            <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
              {exam.skippedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Weak Topics Section */}
      {exam.weakTopics && exam.weakTopics.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
              <span>Phân tích chủ đề cần cải thiện (Chủ đề yếu)</span>
            </div>
          }
          subtitle="Các chủ đề có nhiều câu trả lời sai nhất đã được tự động ghi nhận vào Sổ lỗi sai"
        >
          <div className="space-y-2.5">
            {exam.weakTopics.map(wt => (
              <div
                key={wt.topicId || wt.topicTitle}
                className="p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-rose-900 dark:text-rose-200">
                  {wt.topicTitle}
                </span>
                <Badge variant="danger" size="sm">
                  Sai {wt.wrongCount} câu
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detailed Question by Question Answer Review */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 px-1">
          Chi tiết bài làm từng câu hỏi ({exam.questions.length} câu)
        </h3>

        <div className="space-y-4">
          {exam.questions.map((q, idx) => {
            const userAns = exam.userAnswers[q.id];
            const isCorrect = userAns === q.correctOptionId;
            const isSkipped = !userAns;

            const selectedOpt = q.options.find(o => o.id === userAns);
            const correctOpt = q.options.find(o => o.id === q.correctOptionId);

            return (
              <Card key={q.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400">Câu {idx + 1}</span>
                    <Badge variant="neutral" size="sm">
                      {q.difficulty.toUpperCase()}
                    </Badge>
                  </div>

                  <Badge
                    variant={isCorrect ? 'success' : isSkipped ? 'neutral' : 'danger'}
                    size="sm"
                    icon={isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : isSkipped ? <AlertCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  >
                    {isCorrect ? 'Trả lời đúng' : isSkipped ? 'Đã bỏ qua' : 'Trả lời sai'}
                  </Badge>
                </div>

                <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {renderMathContent(q.content)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                      : 'border-rose-200 bg-rose-50/50 dark:bg-rose-950/30 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                  }`}>
                    <span className="font-bold block mb-1">
                      Đáp án của bạn:
                    </span>
                    <p>{selectedOpt ? renderMathContent(selectedOpt.text) : 'Không trả lời (bỏ qua)'}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold block mb-1">
                      Đáp án đúng chuẩn:
                    </span>
                    <p>{correctOpt ? renderMathContent(correctOpt.text) : '---'}</p>
                  </div>
                </div>

                {q.explanation && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-500 block mb-1">Lời giải thích:</span>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {renderMathContent(q.explanation)}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
