import React, { useEffect, useState } from 'react';
import {
  Clock,
  Eye,
  FileCheck,
  FileText,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { examService } from '../../services/examService';
import { subjectService } from '../../services/subjectService';
import { ExamConfig, ExamSession } from '../../types/exam';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ExamBuilder } from './ExamBuilder';
import { ExamPlayer } from './ExamPlayer';
import { ExamResultView } from './ExamResultView';

export const ExamsPage: React.FC = () => {
  const { selectedTargetId, setSelectedTargetId, dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [exams, setExams] = useState<ExamSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Navigation mode: 'list' | 'preview' | 'player' | 'result'
  const [currentMode, setCurrentMode] = useState<'list' | 'preview' | 'player' | 'result'>('list');
  const [activeExam, setActiveExam] = useState<ExamSession | null>(null);

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<ExamSession | null>(null);

  const loadData = async () => {
    const [allExams, subList] = await Promise.all([
      examService.getExams(),
      subjectService.getSubjects(),
    ]);
    setExams(allExams);
    setSubjects(subList);

    if (selectedTargetId) {
      const found = allExams.find(e => e.id === selectedTargetId);
      if (found) {
        setActiveExam(found);
        setCurrentMode(found.isSubmitted ? 'result' : 'preview');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion, selectedTargetId]);

  // Handlers
  const handleBuildExam = async (config: ExamConfig) => {
    const created = await examService.buildExam(config);
    toast.success('Đã tạo đề thi thành công', created.title);
    triggerDataRefresh();
    setActiveExam(created);
    setCurrentMode('preview');
  };

  const handleSubmitExam = async (examId: string, answers: Record<string, string>, timeSpentSeconds: number = 0) => {
    const { exam } = await examService.submitExam(examId, answers, timeSpentSeconds);
    toast.success(`Đã nộp bài! Điểm số: ${exam.score}/10`);
    triggerDataRefresh();
    setActiveExam(exam);
    setCurrentMode('result');
  };

  const handleDeleteConfirm = async () => {
    if (!examToDelete) return;
    await examService.deleteExam(examToDelete.id);
    toast.success('Đã xóa đề thi');
    if (activeExam?.id === examToDelete.id) {
      setActiveExam(null);
      setCurrentMode('list');
    }
    setExamToDelete(null);
    triggerDataRefresh();
  };

  // Render Sub-views
  if (currentMode === 'player' && activeExam) {
    return (
      <ExamPlayer
        exam={activeExam}
        onSubmit={handleSubmitExam}
        onExit={() => setCurrentMode('list')}
      />
    );
  }

  if (currentMode === 'result' && activeExam) {
    return (
      <ExamResultView
        exam={activeExam}
        onExit={() => {
          setCurrentMode('list');
          setSelectedTargetId(undefined);
        }}
        onRetake={() => setCurrentMode('player')}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Hệ thống Đề thi & Luyện đề ({exams.length} đề thi)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tạo đề thi tùy chỉnh hoặc làm lại các đề thi đã lưu để rèn luyện kỹ năng
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsBuilderOpen(true)}
          leftIcon={<Sparkles className="w-4 h-4" />}
        >
          Tạo đề mới (Exam Builder)
        </Button>
      </div>

      {/* Exams Grid */}
      {exams.length === 0 ? (
        <EmptyState
          title="Chưa có đề thi nào"
          description="Sử dụng Exam Builder để cấu hình đề thi thử theo môn học và chương bạn mong muốn."
          action={
            <Button variant="primary" size="sm" onClick={() => setIsBuilderOpen(true)}>
              Tạo đề thi ngay
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map(exam => (
            <Card
              key={exam.id}
              className="hoverable flex flex-col justify-between p-5 space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="primary" size="sm">
                    {exam.subjectName}
                  </Badge>
                  <Badge
                    variant={exam.isSubmitted ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {exam.isSubmitted ? `Điểm: ${exam.score}/10` : 'Chưa làm'}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {exam.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {exam.durationMinutes} phút
                  </span>
                  <span>•</span>
                  <span>{exam.questions.length} câu hỏi</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {exam.isSubmitted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveExam(exam);
                      setCurrentMode('result');
                    }}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Xem kết quả
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveExam(exam);
                      setCurrentMode('preview');
                    }}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Bắt đầu thi
                  </Button>
                )}

                <div className="flex items-center gap-1">
                  {exam.isSubmitted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveExam(exam);
                        setCurrentMode('player');
                      }}
                      title="Làm lại đề"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExamToDelete(exam)}
                    className="text-rose-600 hover:text-rose-700"
                    title="Xóa đề"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Exam Preview Modal (Exam Preview trước khi bấm làm bài) */}
      <Modal
        isOpen={currentMode === 'preview' && !!activeExam}
        onClose={() => setCurrentMode('list')}
        title="Xem trước đề thi (Exam Preview)"
        size="lg"
        footer={
          <div className="w-full flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentMode('list')}>
              Quay lại danh sách
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentMode('player')}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Bắt đầu tính giờ làm bài
            </Button>
          </div>
        }
      >
        {activeExam && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {activeExam.title}
                </h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Môn học: {activeExam.subjectName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="primary" size="sm">
                  {activeExam.questions.length} câu hỏi
                </Badge>
                <Badge variant="warning" size="sm">
                  {activeExam.durationMinutes} phút làm bài
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Danh sách các câu hỏi trong đề thi này:
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {activeExam.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                >
                  <span className="font-bold text-slate-400 mr-2">Câu {idx + 1}:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {q.content.replace(/\$/g, '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Builder Modal */}
      <ExamBuilder
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onBuild={handleBuildExam}
        subjects={subjects}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDestructive
        title="Xóa đề thi"
        message={`Bạn có chắc chắn muốn xóa đề thi "${examToDelete?.title}" khỏi lịch sử?`}
      />
    </div>
  );
};
