import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileCheck,
  ListFilter,
  Search,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { questionService } from '../../services/questionService';
import { subjectService } from '../../services/subjectService';
import { ExamConfig, ExamMode } from '../../types/exam';
import { QuestionDifficulty, QuestionItem, QuestionType } from '../../types/question';
import { Chapter, Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface ExamBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onBuild: (config: ExamConfig) => Promise<void>;
  subjects: Subject[];
}

export const ExamBuilder: React.FC<ExamBuilderProps> = ({
  isOpen,
  onClose,
  onBuild,
  subjects,
}) => {
  const [mode, setMode] = useState<ExamMode>('random');
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | 'mixed'>('mixed');
  const [questionType, setQuestionType] = useState<QuestionType | 'mixed'>('mixed');
  const [avoidRecent, setAvoidRecent] = useState(false);

  // Manual Selection mode
  const [subjectQuestions, setSubjectQuestions] = useState<QuestionItem[]>([]);
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([]);
  const [manualSearch, setManualSearch] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects]);

  useEffect(() => {
    const loadSubjectData = async () => {
      if (!subjectId) return;
      const [chaps, qList] = await Promise.all([
        subjectService.getChapters(subjectId),
        questionService.getQuestions({ subjectId }),
      ]);
      setChapters(chaps);
      setSubjectQuestions(qList);
      setSelectedChapterIds([]);
      setManualSelectedIds([]);
      setErrorMessage(null);
    };
    loadSubjectData();
  }, [subjectId]);

  const handleToggleChapter = (id: string) => {
    setSelectedChapterIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectAllChapters = () => {
    if (selectedChapterIds.length === chapters.length) {
      setSelectedChapterIds([]);
    } else {
      setSelectedChapterIds(chapters.map(c => c.id));
    }
  };

  const handleToggleManualQuestion = (qId: string) => {
    setManualSelectedIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return;

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const activeSub = subjects.find(s => s.id === subjectId);
      await onBuild({
        mode,
        title: title.trim() || `Đề thi: ${activeSub?.name || 'Môn học'}`,
        subjectId,
        chapterIds: selectedChapterIds,
        topicIds: [],
        questionCount: mode === 'manual' ? manualSelectedIds.length : Number(questionCount),
        durationMinutes: Number(durationMinutes),
        difficulty,
        questionType,
        avoidRecentlyAttempted: avoidRecent,
        manualQuestionIds: mode === 'manual' ? manualSelectedIds : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo đề thi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredManualQuestions = subjectQuestions.filter(q => {
    if (!manualSearch.trim()) return true;
    const term = manualSearch.toLowerCase();
    return q.content.toLowerCase().includes(term) || q.tags.some(t => t.toLowerCase().includes(term));
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span>Exam Builder - Tạo đề thi tùy chỉnh</span>
        </div>
      }
      description="Tạo đề thi ngẫu nhiên theo ma trận hoặc tự chọn câu hỏi thủ công từ ngân hàng"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setMode('random')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'random'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Ngẫu nhiên theo Tiêu chí</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'manual'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Tự chọn Câu hỏi thủ công</span>
          </button>
        </div>

        {/* Error notification banner if insufficient questions */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Không thể tạo đề thi:</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <Input
          label="Tên đề thi"
          placeholder="Ví dụ: Thi thử Giữa kỳ - Giải tích 1"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Môn học thi"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            options={subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
          />

          <div className="grid grid-cols-2 gap-2">
            {mode === 'random' ? (
              <Input
                type="number"
                label="Số lượng câu"
                min={2}
                max={100}
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                required
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Đã chọn thủ công
                </label>
                <div className="h-10 flex items-center px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {manualSelectedIds.length} câu
                </div>
              </div>
            )}

            <Input
              type="number"
              label="Thời gian (phút)"
              min={5}
              max={180}
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* RANDOM MODE SETTINGS */}
        {mode === 'random' ? (
          <>
            {/* Chapters Multi-select */}
            {chapters.length > 0 && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Phạm vi chương thi ({selectedChapterIds.length}/{chapters.length} chương)
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllChapters}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    {selectedChapterIds.length === chapters.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả chương'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {chapters.map(c => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChapterIds.includes(c.id)}
                        onChange={() => handleToggleChapter(c.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-800 dark:text-slate-200 truncate">
                        {c.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty and Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Cơ cấu độ khó"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
                options={[
                  { value: 'mixed', label: 'Trộn đều các mức độ (Khuyên dùng)' },
                  { value: 'easy', label: 'Chỉ các câu Dễ (Nhận biết)' },
                  { value: 'medium', label: 'Chỉ các câu Trung bình' },
                  { value: 'hard', label: 'Chỉ các câu Khó (Vận dụng)' },
                ]}
              />

              <Select
                label="Loại câu hỏi"
                value={questionType}
                onChange={e => setQuestionType(e.target.value as any)}
                options={[
                  { value: 'mixed', label: 'Tất cả loại câu hỏi' },
                  { value: 'single_choice', label: 'Trắc nghiệm 1 đáp án' },
                  { value: 'multiple_choice', label: 'Trắc nghiệm nhiều đáp án' },
                ]}
              />
            </div>

            {/* Avoid recently attempted checkbox */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={avoidRecent}
                onChange={e => setAvoidRecent(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Ưu tiên chọn câu hỏi mới (Tránh các câu đã làm trong 30 lần gần đây)</span>
            </label>
          </>
        ) : (
          /* MANUAL MODE QUESTION PICKER */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Chọn danh sách câu hỏi ({manualSelectedIds.length}/{subjectQuestions.length} câu đã chọn):
              </span>
              <button
                type="button"
                onClick={() => {
                  if (manualSelectedIds.length === subjectQuestions.length) setManualSelectedIds([]);
                  else setManualSelectedIds(subjectQuestions.map(q => q.id));
                }}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                {manualSelectedIds.length === subjectQuestions.length ? 'Bỏ chọn hết' : 'Chọn toàn bộ'}
              </button>
            </div>

            <Input
              placeholder="Tìm theo nội dung câu hỏi..."
              value={manualSearch}
              onChange={e => setManualSearch(e.target.value)}
              className="text-xs"
            />

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredManualQuestions.map(q => {
                const isSelected = manualSelectedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => handleToggleManualQuestion(q.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{q.content.replace(/\$/g, '')}</span>
                    </div>

                    <Badge variant="neutral" size="sm">
                      {q.difficulty}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isGenerating}
            disabled={mode === 'manual' && manualSelectedIds.length === 0}
            leftIcon={<FileCheck className="w-4 h-4" />}
          >
            Tạo đề & Chuẩn bị thi
          </Button>
        </div>
      </form>
    </Modal>
  );
};
