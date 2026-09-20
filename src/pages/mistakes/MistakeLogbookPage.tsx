import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Download,
  Edit2,
  Filter,
  Play,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { mistakeService } from '../../services/mistakeService';
import { importExportService } from '../../services/dataExchange/importExportService';
import { subjectService } from '../../services/subjectService';
import { COMMON_MISTAKE_REASONS, MistakeItem } from '../../types/mistake';
import { QuestionItem } from '../../types/question';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { MistakeReasonModal } from '../../components/mistakes/MistakeReasonModal';
import { QuestionPracticePlayer } from '../questions/QuestionPracticePlayer';
import { MistakeDetailModal } from './MistakeDetailModal';

export const MistakeLogbookPage: React.FC = () => {
  const { dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'unreviewed' | 'reviewed' | 'frequent'>('all');
  const [sortBy, setSortBy] = useState<'reviews' | 'date'>('reviews');

  // Review Mode
  const [isReviewing, setIsReviewing] = useState(false);

  // Modals
  const [selectedMistake, setSelectedMistake] = useState<MistakeItem | null>(null);
  const [mistakeToEditReason, setMistakeToEditReason] = useState<MistakeItem | null>(null);
  const [mistakeToDelete, setMistakeToDelete] = useState<MistakeItem | null>(null);

  const loadData = async () => {
    const [misList, subList] = await Promise.all([
      mistakeService.getMistakes(),
      subjectService.getSubjects(),
    ]);
    setMistakes(misList);
    setSubjects(subList);
  };

  useEffect(() => {
    loadData();
  }, [dataVersion]);

  // Apply filters
  const filteredMistakes = mistakes
    .filter(m => {
      if (subjectFilter && m.subjectId !== subjectFilter) return false;
      if (reasonFilter && m.reason !== reasonFilter) return false;
      if (activeStatusFilter === 'unreviewed') return !m.isReviewed;
      if (activeStatusFilter === 'reviewed') return m.isReviewed;
      if (activeStatusFilter === 'frequent') return m.reviewCount >= 2;
      return true;
    })
    .filter(m => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.questionContent.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        m.subjectName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleMarkResolved = async (id: string) => {
    await mistakeService.markAsResolved(id);
    toast.success('Đã đánh dấu khắc phục lỗi');
    triggerDataRefresh();
  };

  const handleSaveReason = async (newReason: string) => {
    if (!mistakeToEditReason) return;
    await mistakeService.updateReason(mistakeToEditReason.id, newReason);
    toast.success('Đã cập nhật lý do sai');
    setMistakeToEditReason(null);
    triggerDataRefresh();
  };

  const handleDeleteConfirm = async () => {
    if (!mistakeToDelete) return;
    await mistakeService.deleteMistake(mistakeToDelete.id);
    toast.success('Đã xóa câu hỏi khỏi sổ lỗi sai');
    setMistakeToDelete(null);
    triggerDataRefresh();
  };

  const handleExportJSON = () => {
    const jsonStr = importExportService.exportMistakesJSON(filteredMistakes);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `so_loi_sai_${Date.now()}.json`;
    a.click();
    toast.success('Đã xuất Sổ lỗi sai thành công');
  };

  // Convert mistakes to QuestionItem format for review mode
  const reviewQuestions: QuestionItem[] = filteredMistakes.map(m => ({
    id: m.questionId || m.id,
    content: m.questionContent,
    options: m.options,
    correctOptionId: m.correctOptionId,
    explanation: m.explanation,
    subjectId: m.subjectId || '',
    difficulty: 'medium',
    type: 'single_choice',
    tags: [m.reason],
    createdAt: m.createdAt,
  }));

  if (isReviewing && reviewQuestions.length > 0) {
    return (
      <QuestionPracticePlayer
        questions={reviewQuestions}
        subjectName="Ôn luyện Sổ Lỗi Sai"
        onExit={() => setIsReviewing(false)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            Sổ Lỗi Sai (Error Book)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tự động ghi nhận câu sai từ đề thi và luyện tập, phân tích lý do và hỗ trợ chế độ ôn tập chuyên sâu
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Xuất JSON
          </Button>

          {filteredMistakes.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsReviewing(true)}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Ôn các lỗi này ({filteredMistakes.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput
            placeholder="Tìm nội dung, lý do, môn..."
            value={searchQuery}
            onChange={setSearchQuery}
          />

          <Select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            options={[
              { value: '', label: 'Tất cả môn học' },
              ...subjects.map(s => ({ value: s.id, label: s.name })),
            ]}
          />

          <Select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            options={[
              { value: '', label: 'Tất cả lý do sai' },
              ...COMMON_MISTAKE_REASONS.map(r => ({ value: r, label: r })),
            ]}
          />

          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            options={[
              { value: 'reviews', label: 'Sai nhiều lần nhất' },
              { value: 'date', label: 'Mới bị sai gần đây' },
            ]}
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1">Trạng thái:</span>
          {[
            { id: 'all', label: `Tất cả (${mistakes.length})` },
            { id: 'unreviewed', label: `Chưa khắc phục (${mistakes.filter(m => !m.isReviewed).length})` },
            { id: 'frequent', label: `Sai ≥ 2 lần (${mistakes.filter(m => m.reviewCount >= 2).length})` },
            { id: 'reviewed', label: `Đã khắc phục (${mistakes.filter(m => m.isReviewed).length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatusFilter(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                activeStatusFilter === tab.id
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Mistakes List */}
      {filteredMistakes.length === 0 ? (
        <EmptyState
          title="Không có lỗi sai nào phù hợp"
          description="Tuyệt vời! Hiện không có câu sai nào trong danh mục đã chọn."
        />
      ) : (
        <div className="space-y-3">
          {filteredMistakes.map((m, idx) => (
            <Card
              key={m.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 transition-all ${
                m.reviewCount >= 2
                  ? 'border-l-rose-500 hover:border-l-rose-600'
                  : 'border-l-amber-500 hover:border-l-amber-600'
              }`}
            >
              <div className="space-y-2 min-w-0 flex-1 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  <Badge variant="neutral" size="sm">
                    {m.subjectName}
                  </Badge>
                  {m.reviewCount >= 2 && (
                    <Badge variant="danger" size="sm">
                      Sai {m.reviewCount} lần
                    </Badge>
                  )}
                  <Badge variant={m.isReviewed ? 'success' : 'warning'} size="sm">
                    {m.isReviewed ? 'Đã khắc phục' : 'Cần ôn lại'}
                  </Badge>
                  <span className="text-[10px] text-slate-400">
                    Lần sai gần nhất: {m.lastReviewedAt || 'Gần đây'}
                  </span>
                </div>

                <h4
                  onClick={() => setSelectedMistake(m)}
                  className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 leading-relaxed"
                >
                  {m.questionContent.replace(/\$/g, '')}
                </h4>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setMistakeToEditReason(m)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-100 transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    <span>Lý do: {m.reason}</span>
                    <Edit2 className="w-2.5 h-2.5 opacity-60" />
                  </button>
                  <span className="text-slate-400">•</span>
                  <span className="text-rose-600 dark:text-rose-400">
                    Đã chọn: {m.options.find(o => o.id === m.selectedOptionId)?.text || m.selectedOptionId}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Đáp án đúng: {m.options.find(o => o.id === m.correctOptionId)?.text || m.correctOptionId}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {!m.isReviewed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkResolved(m.id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  >
                    Đã hiểu
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedMistake(m)}
                >
                  Xem chi tiết
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMistakeToDelete(m)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <MistakeDetailModal
        isOpen={!!selectedMistake}
        onClose={() => setSelectedMistake(null)}
        mistake={selectedMistake}
        onMarkReviewed={handleMarkResolved}
        onSaveReason={async (id, r) => {
          await mistakeService.updateReason(id, r);
          triggerDataRefresh();
        }}
      />

      {/* Edit Reason Modal */}
      <MistakeReasonModal
        isOpen={!!mistakeToEditReason}
        questionContent={mistakeToEditReason?.questionContent}
        initialReason={mistakeToEditReason?.reason}
        onSelectReason={handleSaveReason}
        onClose={() => setMistakeToEditReason(null)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!mistakeToDelete}
        onClose={() => setMistakeToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDestructive
        title="Xóa lỗi khỏi Sổ lỗi"
        message="Bạn có chắc chắn muốn xóa bản ghi lỗi sai này?"
      />
    </div>
  );
};
