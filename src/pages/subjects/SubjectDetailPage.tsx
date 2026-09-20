import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit2,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { documentService } from '../../services/documentService';
import { flashcardService } from '../../services/flashcardService';
import { noteService } from '../../services/noteService';
import { questionService } from '../../services/questionService';
import { subjectService } from '../../services/subjectService';
import { DocumentItem } from '../../types/document';
import { FlashcardDeck } from '../../types/flashcard';
import { NoteItem } from '../../types/note';
import { QuestionItem } from '../../types/question';
import { Chapter, Subject, Topic } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { Tabs } from '../../components/common/Tabs';
import { ChapterModal } from './ChapterModal';
import { SubjectModal } from './SubjectModal';
import { TopicModal } from './TopicModal';

interface SubjectDetailPageProps {
  subjectId: string;
  onBack: () => void;
}

export const SubjectDetailPage: React.FC<SubjectDetailPageProps> = ({ subjectId, onBack }) => {
  const { dataVersion, triggerDataRefresh, navigateTo } = useStudy();
  const toast = useToast();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Topic detail linked items
  const [linkedDocs, setLinkedDocs] = useState<DocumentItem[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<NoteItem[]>([]);
  const [linkedDecks, setLinkedDecks] = useState<FlashcardDeck[]>([]);
  const [linkedQuestions, setLinkedQuestions] = useState<QuestionItem[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState('docs');

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [chapterToEdit, setChapterToEdit] = useState<Chapter | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<Topic | null>(null);
  const [targetChapterIdForNewTopic, setTargetChapterIdForNewTopic] = useState<string>('');

  // Delete dialogs
  const [deleteSubjectConfirm, setDeleteSubjectConfirm] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);

  const loadData = async () => {
    const sub = await subjectService.getSubjectById(subjectId);
    if (!sub) return;
    setSubject(sub);

    const [chapList, topList] = await Promise.all([
      subjectService.getChapters(subjectId),
      subjectService.getTopics(undefined, subjectId),
    ]);

    setChapters(chapList);
    setTopics(topList);

    // Expand all chapters by default
    const expanded: Record<string, boolean> = {};
    chapList.forEach(c => { expanded[c.id] = true; });
    setExpandedChapters(expanded);

    // Default select first topic
    if (!selectedTopic && topList.length > 0) {
      setSelectedTopic(topList[0]);
    } else if (selectedTopic) {
      const refreshedTopic = topList.find(t => t.id === selectedTopic.id);
      if (refreshedTopic) setSelectedTopic(refreshedTopic);
    }
  };

  useEffect(() => {
    loadData();
  }, [subjectId, dataVersion]);

  // Load linked items for the active topic
  useEffect(() => {
    const loadLinked = async () => {
      if (!selectedTopic) return;
      const [allDocs, allNotes, allDecks, allQuestions] = await Promise.all([
        documentService.getAllDocuments(),
        noteService.getAllNotes(),
        flashcardService.getDecks(),
        questionService.getQuestions(),
      ]);

      setLinkedDocs(allDocs.filter(d => selectedTopic.linkedDocIds?.includes(d.id) || d.subjectId === subjectId));
      setLinkedNotes(allNotes.filter(n => selectedTopic.linkedNoteIds?.includes(n.id) || n.topicId === selectedTopic.id));
      setLinkedDecks(allDecks.filter(dk => selectedTopic.linkedFlashcardDeckIds?.includes(dk.id) || dk.topicId === selectedTopic.id));
      setLinkedQuestions(allQuestions.filter(q => selectedTopic.linkedQuestionIds?.includes(q.id) || q.topicId === selectedTopic.id));
    };

    loadLinked();
  }, [selectedTopic, subjectId, dataVersion]);

  const toggleChapterExpand = (chapId: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapId]: !prev[chapId] }));
  };

  const handleToggleTopicComplete = async (topicId: string) => {
    const updated = await subjectService.toggleTopicComplete(topicId);
    if (updated) {
      toast.success(
        updated.isCompleted ? 'Đã hoàn thành chủ đề' : 'Đã bỏ hoàn thành chủ đề',
        updated.title
      );
      triggerDataRefresh();
    }
  };

  if (!subject) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Quay lại danh sách môn
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setChapterToEdit(null);
              setIsChapterModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Thêm chương
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSubjectModalOpen(true)}
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            Sửa môn
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteSubjectConfirm(true)}
            className="text-rose-600 hover:text-rose-700"
          >
            Xóa môn
          </Button>
        </div>
      </div>

      {/* Subject Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
              style={{ backgroundColor: subject.color }}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {subject.name}
                </h2>
                <Badge variant="primary" size="sm">
                  {subject.code}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                {subject.description || 'Chưa có mô tả chi tiết cho môn học này.'}
              </p>
            </div>
          </div>

          <div className="flex items-center sm:flex-col sm:items-end gap-1 self-start sm:self-auto">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {subject.progress}%
            </span>
            <span className="text-[11px] text-slate-400">
              Tiến độ hoàn thành
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${subject.progress}%`, backgroundColor: subject.color }}
          />
        </div>
      </div>

      {/* Main 2-Column: Hierarchy (Left) & Topic Details Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chapters & Topics Tree (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cấu trúc chương trình ({chapters.length} chương • {topics.length} chủ đề)
            </h3>
          </div>

          {chapters.length === 0 ? (
            <EmptyState
              title="Chưa có chương học"
              description="Hãy thêm chương đầu tiên để phân bổ các chủ đề bài học."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsChapterModalOpen(true)}
                >
                  Thêm chương ngay
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {chapters.map(chapter => {
                const chapterTopics = topics.filter(t => t.chapterId === chapter.id);
                const isExpanded = !!expandedChapters[chapter.id];

                return (
                  <div
                    key={chapter.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
                  >
                    {/* Chapter Header */}
                    <div className="p-3.5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <div
                        onClick={() => toggleChapterExpand(chapter.id)}
                        className="flex items-center gap-2 cursor-pointer min-w-0 pr-2 flex-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {chapter.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetChapterIdForNewTopic(chapter.id);
                            setTopicToEdit(null);
                            setIsTopicModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Thêm chủ đề vào chương này"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChapterToEdit(chapter);
                            setIsChapterModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Sửa chương"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setChapterToDelete(chapter)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Xóa chương"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Topics Sub-list */}
                    {isExpanded && (
                      <div className="p-2 space-y-1">
                        {chapterTopics.length === 0 ? (
                          <p className="text-[11px] text-slate-400 py-3 text-center italic">
                            Chưa có chủ đề nào trong chương này
                          </p>
                        ) : (
                          chapterTopics.map(topic => {
                            const isSelected = selectedTopic?.id === topic.id;
                            return (
                              <div
                                key={topic.id}
                                onClick={() => setSelectedTopic(topic)}
                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTopicComplete(topic.id);
                                    }}
                                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 ${
                                      topic.isCompleted
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {topic.isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                  </button>
                                  <span className="text-xs truncate">{topic.title}</span>
                                </div>

                                <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTopicToEdit(topic);
                                      setIsTopicModalOpen(true);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTopicToDelete(topic);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Topic Detailed Workspace (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTopic ? (
            <Card className="h-full flex flex-col">
              {/* Topic Header */}
              <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Chủ đề bài học
                    </span>
                    <Badge variant={selectedTopic.isCompleted ? 'success' : 'neutral'} size="sm">
                      {selectedTopic.isCompleted ? 'Đã hoàn thành' : 'Đang học'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                    {selectedTopic.title}
                  </h3>
                  {selectedTopic.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedTopic.description}
                    </p>
                  )}
                </div>

                <Button
                  variant={selectedTopic.isCompleted ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleTopicComplete(selectedTopic.id)}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  className="flex-shrink-0"
                >
                  {selectedTopic.isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                </Button>
              </div>

              {/* Sub-resource Tabs for Topic */}
              <Tabs
                variant="pills"
                activeTab={activeDetailTab}
                onChange={setActiveDetailTab}
                tabs={[
                  { id: 'docs', label: 'Tài liệu', icon: <FileText className="w-3.5 h-3.5" />, badge: linkedDocs.length },
                  { id: 'notes', label: 'Ghi chú', icon: <BookOpen className="w-3.5 h-3.5" />, badge: linkedNotes.length },
                  { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-3.5 h-3.5" />, badge: linkedDecks.length },
                  { id: 'questions', label: 'Câu hỏi', icon: <HelpCircle className="w-3.5 h-3.5" />, badge: linkedQuestions.length },
                ]}
              />

              {/* Tab Contents */}
              <div className="mt-4 flex-1 overflow-y-auto">
                {/* 1. Linked Documents */}
                {activeDetailTab === 'docs' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Tài liệu liên kết ({linkedDocs.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo('documents')}
                        className="text-xs"
                      >
                        Quản lý thư viện
                      </Button>
                    </div>

                    {linkedDocs.length === 0 ? (
                      <EmptyState
                        title="Chưa có tài liệu liên kết"
                        description="Tải lên slide hoặc giáo trình để đính kèm vào chủ đề này."
                        action={
                          <Button variant="outline" size="sm" onClick={() => navigateTo('documents')}>
                            Đến mục Tài liệu
                          </Button>
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {linkedDocs.map(doc => (
                          <div
                            key={doc.id}
                            onClick={() => navigateTo('documents', doc.id)}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <FileText className="w-4 h-4 text-sky-500 flex-shrink-0" />
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {doc.name}
                              </span>
                            </div>
                            <Badge variant="neutral" size="sm">
                              {doc.type.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Linked Notes */}
                {activeDetailTab === 'notes' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Ghi chú bài học ({linkedNotes.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo('notes')}
                        className="text-xs"
                      >
                        Tạo ghi chú mới
                      </Button>
                    </div>

                    {linkedNotes.length === 0 ? (
                      <EmptyState
                        title="Chưa có ghi chú nào"
                        description="Tạo ghi chú tổng hợp công thức toán hoặc giải thuật cho chủ đề này."
                        action={
                          <Button variant="outline" size="sm" onClick={() => navigateTo('notes')}>
                            Tạo ghi chú
                          </Button>
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {linkedNotes.map(n => (
                          <div
                            key={n.id}
                            onClick={() => navigateTo('notes', n.id)}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                          >
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {n.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                              {n.content.replace(/#|\*|_|`/g, '')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Linked Flashcards */}
                {activeDetailTab === 'flashcards' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Bộ thẻ ôn tập ({linkedDecks.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo('flashcards')}
                        className="text-xs"
                      >
                        Tạo bộ thẻ
                      </Button>
                    </div>

                    {linkedDecks.length === 0 ? (
                      <EmptyState
                        title="Chưa có bộ flashcard"
                        description="Tạo bộ câu hỏi - câu trả lời để ôn tập ngắt quãng Spaced Repetition."
                        action={
                          <Button variant="outline" size="sm" onClick={() => navigateTo('flashcards')}>
                            Đến mục Flashcards
                          </Button>
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {linkedDecks.map(dk => (
                          <div
                            key={dk.id}
                            onClick={() => navigateTo('flashcards', dk.id)}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {dk.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {dk.description}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0">
                              Ôn bài
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Linked Questions */}
                {activeDetailTab === 'questions' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Ngân hàng câu hỏi ({linkedQuestions.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo('questions')}
                        className="text-xs"
                      >
                        Luyện tập
                      </Button>
                    </div>

                    {linkedQuestions.length === 0 ? (
                      <EmptyState
                        title="Chưa có câu hỏi trắc nghiệm"
                        description="Thêm câu hỏi vào ngân hàng câu hỏi để chuẩn bị cho kỳ thi."
                        action={
                          <Button variant="outline" size="sm" onClick={() => navigateTo('questions')}>
                            Thêm câu hỏi
                          </Button>
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {linkedQuestions.map((q, idx) => (
                          <div
                            key={q.id}
                            onClick={() => navigateTo('questions', q.id)}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-400">
                                Câu {idx + 1}
                              </span>
                              <Badge
                                variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'}
                                size="sm"
                              >
                                {q.difficulty.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                              {q.content.replace(/\$/g, '')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-12">
              <EmptyState
                title="Chọn một chủ đề bài học"
                description="Click vào bất kỳ chủ đề nào bên danh sách chương để mở không gian làm việc chi tiết."
              />
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={async (data) => {
          await subjectService.saveSubject(data);
          toast.success('Đã cập nhật môn học');
          triggerDataRefresh();
        }}
        subjectToEdit={subject}
      />

      <ChapterModal
        isOpen={isChapterModalOpen}
        onClose={() => {
          setIsChapterModalOpen(false);
          setChapterToEdit(null);
        }}
        onSave={async (data) => {
          await subjectService.saveChapter(data);
          toast.success(chapterToEdit ? 'Đã sửa chương' : 'Đã thêm chương mới');
          triggerDataRefresh();
        }}
        chapterToEdit={chapterToEdit}
        subjectId={subjectId}
        nextOrder={chapters.length + 1}
      />

      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={() => {
          setIsTopicModalOpen(false);
          setTopicToEdit(null);
        }}
        onSave={async (data) => {
          await subjectService.saveTopic(data);
          toast.success(topicToEdit ? 'Đã sửa chủ đề' : 'Đã thêm chủ đề mới');
          triggerDataRefresh();
        }}
        topicToEdit={topicToEdit}
        subjectId={subjectId}
        chapters={chapters}
        defaultChapterId={targetChapterIdForNewTopic}
      />

      {/* Confirm Deletions */}
      <ConfirmDialog
        isOpen={deleteSubjectConfirm}
        onClose={() => setDeleteSubjectConfirm(false)}
        onConfirm={async () => {
          await subjectService.deleteSubject(subjectId);
          toast.success('Đã xóa môn học');
          triggerDataRefresh();
          onBack();
        }}
        isDestructive
        title="Xóa môn học"
        message={`Bạn có chắc chắn muốn xóa môn học "${subject.name}"? Toàn bộ chương và chủ đề thuộc môn học này cũng sẽ bị xóa.`}
      />

      <ConfirmDialog
        isOpen={!!chapterToDelete}
        onClose={() => setChapterToDelete(null)}
        onConfirm={async () => {
          if (!chapterToDelete) return;
          await subjectService.deleteChapter(chapterToDelete.id);
          toast.success('Đã xóa chương');
          setChapterToDelete(null);
          triggerDataRefresh();
        }}
        isDestructive
        title="Xóa chương học"
        message={`Bạn có chắc chắn muốn xóa chương "${chapterToDelete?.title}"?`}
      />

      <ConfirmDialog
        isOpen={!!topicToDelete}
        onClose={() => setTopicToDelete(null)}
        onConfirm={async () => {
          if (!topicToDelete) return;
          await subjectService.deleteTopic(topicToDelete.id);
          toast.success('Đã xóa chủ đề');
          setTopicToDelete(null);
          triggerDataRefresh();
        }}
        isDestructive
        title="Xóa chủ đề bài học"
        message={`Bạn có chắc chắn muốn xóa chủ đề "${topicToDelete?.title}"?`}
      />
    </div>
  );
};
