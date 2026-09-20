import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  FileCheck,
  FileText,
  Grid,
  HelpCircle,
  Layers,
  LayoutList,
  Plus,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { documentService } from '../../services/documentService';
import { questionService } from '../../services/questionService';
import { subjectService } from '../../services/subjectService';
import { Subject } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchInput } from '../../components/common/SearchInput';
import { Table } from '../../components/common/Table';
import { SubjectDetailPage } from './SubjectDetailPage';
import { SubjectModal } from './SubjectModal';

interface SubjectEnriched extends Subject {
  chaptersCount: number;
  topicsCount: number;
  documentsCount: number;
  questionsCount: number;
}

export const SubjectListPage: React.FC = () => {
  const { selectedTargetId, setSelectedTargetId, dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [subjects, setSubjects] = useState<SubjectEnriched[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If a subject is selected, render detail view
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(selectedTargetId || null);

  useEffect(() => {
    if (selectedTargetId) {
      setActiveSubjectId(selectedTargetId);
    }
  }, [selectedTargetId]);

  const loadSubjects = async () => {
    const [rawSubjects, allChapters, allTopics, allDocs, allQuestions] = await Promise.all([
      subjectService.getSubjects(),
      subjectService.getChapters(),
      subjectService.getTopics(),
      documentService.getAllDocuments(),
      questionService.getQuestions(),
    ]);

    const enriched: SubjectEnriched[] = rawSubjects.map(s => {
      const chaps = allChapters.filter(c => c.subjectId === s.id);
      const tops = allTopics.filter(t => t.subjectId === s.id);
      const docs = allDocs.filter(d => d.subjectId === s.id);
      const qns = allQuestions.filter(q => q.subjectId === s.id);
      return {
        ...s,
        chaptersCount: chaps.length,
        topicsCount: tops.length,
        documentsCount: docs.length,
        questionsCount: qns.length,
      };
    });

    setSubjects(enriched);
  };

  useEffect(() => {
    loadSubjects();
  }, [dataVersion]);

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubject = async (data: Omit<Subject, 'id' | 'createdAt'>) => {
    const created = await subjectService.saveSubject(data);
    toast.success('Đã tạo môn học thành công', created.name);
    triggerDataRefresh();
  };

  if (activeSubjectId) {
    return (
      <SubjectDetailPage
        subjectId={activeSubjectId}
        onBack={() => {
          setActiveSubjectId(null);
          setSelectedTargetId(undefined);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm kiếm môn học, mã môn..."
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              aria-label="Chế độ xem lưới"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              aria-label="Chế độ xem danh sách"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo môn học
          </Button>
        </div>
      </div>

      {/* Main Subjects Display */}
      {filteredSubjects.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'Không tìm thấy môn học' : 'Chưa có môn học nào'}
          description={
            searchQuery
              ? 'Thử tìm với tên môn hoặc mã học phần khác.'
              : 'Tạo môn học đầu tiên để quản lý chương trình, bài giảng và tài liệu.'
          }
          action={
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              Tạo môn học mới
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map(sub => (
            <div
              key={sub.id}
              onClick={() => setActiveSubjectId(sub.id)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0"
                    style={{ backgroundColor: sub.color }}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    {sub.code}
                  </Badge>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {sub.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {sub.description || 'Chưa có mô tả môn học.'}
                </p>

                {/* Counts badges */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {sub.chaptersCount}
                    </span>
                    <p className="text-[10px] text-slate-400">Chương</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {sub.topicsCount}
                    </span>
                    <p className="text-[10px] text-slate-400">Chủ đề</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {sub.documentsCount}
                    </span>
                    <p className="text-[10px] text-slate-400">Tài liệu</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {sub.questionsCount}
                    </span>
                    <p className="text-[10px] text-slate-400">Câu hỏi</p>
                  </div>
                </div>
              </div>

              {/* Progress bar at footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Tiến độ</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {sub.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${sub.progress}%`, backgroundColor: sub.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <Table<SubjectEnriched>
          data={filteredSubjects}
          keyExtractor={s => s.id}
          onRowClick={s => setActiveSubjectId(s.id)}
          columns={[
            {
              key: 'name',
              title: 'Môn học',
              render: (s) => (
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {s.name}
                    </span>
                    <p className="text-[11px] text-slate-400">{s.code}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'progress',
              title: 'Tiến độ',
              width: '180px',
              render: (s) => (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {s.progress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.progress}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'chaptersCount',
              title: 'Số chương / Chủ đề',
              render: (s) => `${s.chaptersCount} chương • ${s.topicsCount} chủ đề`,
            },
            {
              key: 'documentsCount',
              title: 'Tài liệu / Câu hỏi',
              render: (s) => `${s.documentsCount} tài liệu • ${s.questionsCount} câu hỏi`,
            },
            {
              key: 'action',
              title: '',
              align: 'right',
              render: () => (
                <Button variant="ghost" size="sm" className="text-xs">
                  Mở chi tiết
                </Button>
              ),
            },
          ]}
        />
      )}

      {/* Modal */}
      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateSubject}
      />
    </div>
  );
};
