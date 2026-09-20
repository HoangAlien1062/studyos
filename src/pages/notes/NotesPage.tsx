import React, { useEffect, useState } from 'react';
import katex from 'katex';
import {
  BookOpen,
  Calendar,
  Edit3,
  FileText,
  Pin,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { useToast } from '../../context/ToastContext';
import { documentService } from '../../services/documentService';
import { noteService } from '../../services/noteService';
import { subjectService } from '../../services/subjectService';
import { DocumentItem } from '../../types/document';
import { NoteItem } from '../../types/note';
import { Subject, Topic } from '../../types/subject';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterBar } from '../../components/common/FilterBar';
import { SearchInput } from '../../components/common/SearchInput';
import { NoteEditorModal } from './NoteEditorModal';

export const NotesPage: React.FC = () => {
  const { selectedTargetId, setSelectedTargetId, dataVersion, triggerDataRefresh } = useStudy();
  const toast = useToast();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<NoteItem | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);

  const loadData = async () => {
    const [allNotes, subList, topList, docList] = await Promise.all([
      noteService.getAllNotes(),
      subjectService.getSubjects(),
      subjectService.getTopics(),
      documentService.getAllDocuments(),
    ]);

    setNotes(allNotes);
    setSubjects(subList);
    setTopics(topList);
    setDocuments(docList);

    if (selectedTargetId) {
      const found = allNotes.find(n => n.id === selectedTargetId);
      if (found) setSelectedNote(found);
    } else if (!selectedNote && allNotes.length > 0) {
      setSelectedNote(allNotes[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataVersion, selectedTargetId]);

  // Filters
  const filteredNotes = notes
    .filter(n => {
      if (activeFilter === 'pinned') return n.isPinned;
      if (activeFilter === 'favorite') return n.isFavorite;
      return true;
    })
    .filter(n => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  // Action Handlers
  const handleSaveNote = async (data: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const saved = await noteService.saveNote(data);
    toast.success('Đã lưu ghi chú', saved.title);
    setSelectedNote(saved);
    triggerDataRefresh();
  };

  const handleTogglePin = async (id: string) => {
    const res = await noteService.togglePin(id);
    if (res) {
      toast.success(res.isPinned ? 'Đã ghim ghi chú' : 'Đã bỏ ghim ghi chú');
      triggerDataRefresh();
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const res = await noteService.toggleFavorite(id);
    if (res) {
      toast.success(res.isFavorite ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích');
      triggerDataRefresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    await noteService.deleteNote(noteToDelete.id);
    toast.success('Đã xóa ghi chú');
    if (selectedNote?.id === noteToDelete.id) {
      setSelectedNote(null);
    }
    setNoteToDelete(null);
    triggerDataRefresh();
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo tiêu đề, nội dung hoặc tag..."
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setNoteToEdit(null);
            setIsEditorOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Tạo ghi chú mới
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        options={[
          { id: 'all', label: 'Tất cả ghi chú', count: notes.length },
          { id: 'pinned', label: 'Đã ghim', count: notes.filter(n => n.isPinned).length },
          { id: 'favorite', label: 'Yêu thích', count: notes.filter(n => n.isFavorite).length },
        ]}
        activeId={activeFilter}
        onSelect={setActiveFilter}
      />

      {/* Split Layout: List (Left) & Reader / Active View (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Column: Note List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredNotes.length === 0 ? (
            <EmptyState
              title={searchQuery ? 'Không tìm thấy ghi chú' : 'Chưa có ghi chú nào'}
              description="Tạo ghi chú mới để lưu lại các bài giảng, công thức và ví dụ."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setNoteToEdit(null);
                    setIsEditorOpen(true);
                  }}
                >
                  Tạo ghi chú đầu tiên
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredNotes.map(n => {
                const isSelected = selectedNote?.id === n.id;
                const subj = subjects.find(s => s.id === n.subjectId);

                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNote(n)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        {n.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 fill-current" />
                        )}
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {n.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(n.id)}
                          className="p-1 text-slate-300 hover:text-amber-400"
                        >
                          <Star className={`w-3.5 h-3.5 ${n.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(n.id)}
                          className="p-1 text-slate-300 hover:text-indigo-600"
                        >
                          <Pin className={`w-3.5 h-3.5 ${n.isPinned ? 'text-indigo-600 fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {n.content.replace(/#|\*|_|`|\$/g, '')}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        {subj && (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {subj.name}
                          </span>
                        )}
                        {n.tags.length > 0 && <span>• #{n.tags[0]}</span>}
                      </div>
                      <span>{new Date(n.updatedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Note Reader / Preview (7 cols) */}
        <div className="lg:col-span-7">
          {selectedNote ? (
            <Card className="h-full flex flex-col">
              {/* Header */}
              <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      Cập nhật: {new Date(selectedNote.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                    {selectedNote.isPinned && (
                      <Badge variant="primary" size="sm">
                        Đã ghim
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedNote.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNoteToEdit(selectedNote);
                      setIsEditorOpen(true);
                    }}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Chỉnh sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNoteToDelete(selectedNote)}
                    className="text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tags & Linked Metadata Bar */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                {selectedNote.tags.map(tag => (
                  <Badge key={tag} variant="neutral" size="sm">
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Note Content Viewer with KaTeX Math rendering */}
              <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {renderMathContent(selectedNote.content)}
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-12">
              <EmptyState
                title="Chọn một ghi chú để đọc"
                description="Bấm vào danh sách ghi chú bên trái để xem nội dung chi tiết hoặc tạo ghi chú mới."
              />
            </Card>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <NoteEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setNoteToEdit(null);
        }}
        onSave={handleSaveNote}
        noteToEdit={noteToEdit}
        subjects={subjects}
        topics={topics}
        documents={documents}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDestructive
        title="Xóa ghi chú"
        message={`Bạn có chắc chắn muốn xóa ghi chú "${noteToDelete?.title}" không?`}
      />
    </div>
  );
};
