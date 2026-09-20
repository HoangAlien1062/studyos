import React, { useEffect, useState } from 'react';
import {
  Copy,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { questionService } from '../../services/questionService';
import { importExportService } from '../../services/dataExchange/importExportService';
import { subjectService } from '../../services/subjectService';
import { QuestionDifficulty, QuestionItem, QuestionType } from '../../types/question';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataImportModal } from '../../components/common/DataImportModal';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { QuestionModal } from './QuestionModal';
import { QuestionPracticePlayer } from './QuestionPracticePlayer';

export const QuestionBankPage: React.FC = () => {
  const { selectedTargetId, setSelectedTargetId, dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Mode: list or practice
  const [isPracticing, setIsPracticing] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<QuestionItem | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<QuestionItem | null>(null);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const loadData = async () => {
    const [qList, subList] = await Promise.all([
      questionService.getQuestions(),
      subjectService.getSubjects(),
    ]);
    setQuestions(qList);
    setSubjects(subList);

    if (selectedTargetId) {
      const found = qList.find(q => q.id === selectedTargetId);
      if (found) {
        setQuestionToEdit(found);
        setIsModalOpen(true);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion, selectedTargetId]);

  // Apply filters
  const filteredQuestions = questions.filter(q => {
    if (subjectFilter && q.subjectId !== subjectFilter) return false;
    if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
    if (typeFilter && q.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        q.content.toLowerCase().includes(query) ||
        q.explanation.toLowerCase().includes(query) ||
        q.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleSaveQuestion = async (data: Omit<QuestionItem, 'id' | 'createdAt'> & { id?: string }) => {
    try {
      await questionService.saveQuestion(data);
      toast.success(questionToEdit ? 'Đã sửa câu hỏi' : 'Đã thêm câu hỏi mới vào ngân hàng');
      setIsModalOpen(false);
      triggerDataRefresh();
    } catch (err: any) {
      toast.error('Lỗi dữ liệu câu hỏi', err.message || 'Dữ liệu không hợp lệ');
    }
  };

  const handleDuplicate = async (q: QuestionItem) => {
    const dup = await questionService.duplicateQuestion(q.id);
    if (dup) {
      toast.success('Đã nhân bản câu hỏi', dup.content);
      triggerDataRefresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    await questionService.deleteQuestion(questionToDelete.id);
    toast.success('Đã xóa câu hỏi khỏi ngân hàng');
    setQuestionToDelete(null);
    triggerDataRefresh();
  };

  // Export handlers
  const handleExportJSON = () => {
    const jsonStr = importExportService.exportQuestionsJSON(filteredQuestions);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_export_${Date.now()}.json`;
    a.click();
    toast.success('Đã xuất tệp JSON thành công');
  };

  const handleExportCSV = () => {
    const csvStr = importExportService.exportQuestionsCSV(filteredQuestions);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_export_${Date.now()}.csv`;
    a.click();
    toast.success('Đã xuất tệp CSV thành công');
  };

  if (isPracticing) {
    const activeSubj = subjects.find(s => s.id === subjectFilter);
    return (
      <QuestionPracticePlayer
        questions={filteredQuestions}
        subjectName={activeSubj?.name || 'Luyện tập câu hỏi'}
        onExit={() => setIsPracticing(false)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            Ngân Hàng Câu Hỏi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống quản lý câu hỏi trắc nghiệm, bài tập tự luận và ma trận độ khó
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
          >
            Xuất CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Nhập câu hỏi
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuestionToEdit(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo câu hỏi mới
          </Button>

          {filteredQuestions.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPracticing(true)}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Luyện ngay ({filteredQuestions.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput
            placeholder="Tìm nội dung, tags, lời giải..."
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
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            options={[
              { value: '', label: 'Tất cả độ khó' },
              { value: 'easy', label: 'Dễ (Easy)' },
              { value: 'medium', label: 'Trung bình (Medium)' },
              { value: 'hard', label: 'Khó (Hard)' },
            ]}
          />

          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'Tất cả dạng câu' },
              { value: 'single_choice', label: 'Trắc nghiệm 1 đáp án' },
              { value: 'multiple_choice', label: 'Trắc nghiệm nhiều đáp án' },
              { value: 'true_false', label: 'Đúng / Sai' },
              { value: 'short_answer', label: 'Câu trả lời ngắn' },
            ]}
          />
        </div>

        {(subjectFilter || difficultyFilter || typeFilter || searchQuery) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Tìm thấy <strong>{filteredQuestions.length}</strong> câu hỏi phù hợp</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSubjectFilter('');
                setDifficultyFilter('');
                setTypeFilter('');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </Card>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <EmptyState
          title="Không tìm thấy câu hỏi"
          description="Hãy tạo câu hỏi mới hoặc điều chỉnh bộ lọc để xem các câu hỏi khác."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setQuestionToEdit(null);
                setIsModalOpen(true);
              }}
            >
              Thêm câu hỏi ngay
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => {
            const subj = subjects.find(s => s.id === q.subjectId);
            return (
              <Card
                key={q.id}
                className="hoverable flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
              >
                <div className="space-y-2 min-w-0 flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    {subj && (
                      <Badge variant="primary" size="sm">
                        {subj.name}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        q.difficulty === 'easy'
                          ? 'success'
                          : q.difficulty === 'medium'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {q.difficulty.toUpperCase()}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {q.type === 'multiple_choice'
                        ? 'Nhiều đáp án'
                        : q.type === 'true_false'
                        ? 'Đúng/Sai'
                        : q.type === 'short_answer'
                        ? 'Tự luận ngắn'
                        : '1 đáp án'}
                    </Badge>
                    {q.source && (
                      <span className="text-[10px] text-slate-400 truncate max-w-xs">
                        Nguồn: {q.source}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
                    {q.content.replace(/\$/g, '')}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{q.options.length} lựa chọn</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Đáp án đúng: {q.options.find(o => o.id === q.correctOptionId)?.text || q.correctOptionId || 'Đã cài đặt'}
                    </span>
                    {q.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span>#{q.tags.join(' #')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(q)}
                    title="Nhân bản câu hỏi này"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuestionToEdit(q);
                      setIsModalOpen(true);
                    }}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuestionToDelete(q)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <QuestionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setQuestionToEdit(null);
          setSelectedTargetId(undefined);
        }}
        onSave={handleSaveQuestion}
        questionToEdit={questionToEdit}
        subjects={subjects}
      />

      {/* Data Import Modal */}
      <DataImportModal<QuestionItem>
        isOpen={isImportModalOpen}
        title="Nhập câu hỏi từ tệp JSON"
        acceptedFormats=".json"
        sampleDescription="Tệp JSON chứa mảng câu hỏi (content, options, correctOptionId, difficulty...)"
        onValidateFile={(content) => {
          const defaultSubj = subjectFilter || subjects[0]?.id || 'default';
          return importExportService.validateQuestionsJSON(content, defaultSubj);
        }}
        onConfirmImport={async validQuestions => {
          const count = await questionService.importQuestions(validQuestions);
          toast.success(`Đã nạp thành công ${count} câu hỏi vào ngân hàng!`);
          triggerDataRefresh();
        }}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDestructive
        title="Xóa câu hỏi"
        message="Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng câu hỏi?"
      />
    </div>
  );
};
