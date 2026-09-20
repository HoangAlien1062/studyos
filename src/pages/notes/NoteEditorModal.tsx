import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import {
  Bold,
  CheckSquare,
  Code,
  Eye,
  FileText,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  Save,
  Sigma,
  Table as TableIcon,
} from 'lucide-react';
import { AutosaveStatus, NoteItem } from '../../types/note';
import { Subject, Topic } from '../../types/subject';
import { DocumentItem } from '../../types/document';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  noteToEdit?: NoteItem | null;
  subjects: Subject[];
  topics: Topic[];
  documents: DocumentItem[];
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  noteToEdit,
  subjects,
  topics,
  documents,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [linkedDocId, setLinkedDocId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setContent(noteToEdit.content);
      setTagInput(noteToEdit.tags.join(', '));
      setSubjectId(noteToEdit.subjectId || '');
      setTopicId(noteToEdit.topicId || '');
      setLinkedDocId(noteToEdit.linkedDocumentId || '');
      setIsPinned(noteToEdit.isPinned);
      setIsFavorite(noteToEdit.isFavorite);
    } else {
      setTitle('');
      setContent('# Ghi chú bài giảng mới\n\n- Ghi lại các công thức và ví dụ tại đây...\n\n$$E = mc^2$$');
      setTagInput('Học tập, Lý thuyết');
      setSubjectId(subjects[0]?.id || '');
      setTopicId('');
      setLinkedDocId('');
      setIsPinned(false);
      setIsFavorite(false);
    }
    setAutosaveStatus('saved');
  }, [noteToEdit, subjects, isOpen]);

  // Simulate autosave debouncing when user types
  const handleContentChange = (val: string) => {
    setContent(val);
    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
      setAutosaveStatus('saved');
    }, 800);
    return () => clearTimeout(timer);
  };

  // Helper to insert markdown tags at cursor position
  const insertText = (before: string, after: string = '', defaultPlaceholder: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || defaultPlaceholder;
    const replacement = before + selected + after;

    const newContent = el.value.substring(0, start) + replacement + el.value.substring(end);
    setContent(newContent);
    setAutosaveStatus('saving');
    setTimeout(() => setAutosaveStatus('saved'), 600);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  // KaTeX rendering helper for preview
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    onSave({
      id: noteToEdit?.id,
      title: title.trim(),
      content,
      tags,
      subjectId: subjectId || undefined,
      topicId: topicId || undefined,
      linkedDocumentId: linkedDocId || undefined,
      isPinned,
      isFavorite,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="truncate">
              {noteToEdit ? 'Chỉnh sửa ghi chú' : 'Tạo ghi chú mới'}
            </span>
          </div>

          {/* Autosave status indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {autosaveStatus === 'saving' && (
              <Badge variant="warning" size="sm">
                Đang lưu...
              </Badge>
            )}
            {autosaveStatus === 'saved' && (
              <Badge variant="success" size="sm">
                Đã lưu
              </Badge>
            )}
            {autosaveStatus === 'error' && (
              <Badge variant="danger" size="sm">
                Lỗi lưu
              </Badge>
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Title input */}
        <Input
          placeholder="Tiêu đề ghi chú..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="text-base font-bold"
        />

        {/* Metadata Selectors: Subject, Topic, Linked Doc */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Môn học"
            value={subjectId}
            onChange={e => {
              setSubjectId(e.target.value);
              setTopicId('');
            }}
            options={[
              { value: '', label: '-- Chọn môn học --' },
              ...subjects.map(s => ({ value: s.id, label: s.name }))
            ]}
          />

          <Select
            label="Chủ đề bài học"
            value={topicId}
            onChange={e => setTopicId(e.target.value)}
            options={[
              { value: '', label: '-- Chọn chủ đề --' },
              ...topics
                .filter(t => !subjectId || t.subjectId === subjectId)
                .map(t => ({ value: t.id, label: t.title }))
            ]}
          />

          <Select
            label="Tài liệu liên quan"
            value={linkedDocId}
            onChange={e => setLinkedDocId(e.target.value)}
            options={[
              { value: '', label: '-- Chọn tài liệu --' },
              ...documents
                .filter(d => d.type !== 'folder')
                .map(d => ({ value: d.id, label: d.name }))
            ]}
          />
        </div>

        {/* Tags input */}
        <Input
          label="Thẻ phân loại (Tags)"
          placeholder="Ví dụ: Công thức, Đạo hàm, Bài tập mẫu"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
        />

        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => insertText('# ', '', 'Tiêu đề lớn')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertText('## ', '', 'Tiêu đề phụ')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={() => insertText('**', '**', 'in đậm')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="In đậm"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertText('*', '*', 'in nghiêng')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="In nghiêng"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertText('- ', '', 'Mục danh sách')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Danh sách gạch đầu dòng"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertText('- [ ] ', '', 'Việc cần làm')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Checklist"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={() => insertText('\n| Tiêu đề 1 | Tiêu đề 2 |\n| :--- | :--- |\n| Giá trị 1 | Giá trị 2 |\n')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Chèn bảng"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertText('\n```cpp\n', '\n```\n', '// Mã nguồn tại đây')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Khối code"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertText('$$\n\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)\n$$')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1"
              title="Công thức Toán LaTeX"
            >
              <Sigma className="w-4 h-4" />
              <span className="text-[10px]">LaTeX</span>
            </button>
            <button
              type="button"
              onClick={() => insertText('[', '](https://example.com)', 'Tiêu đề liên kết')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Chèn liên kết"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertText('![', '](https://images.unsplash.com/photo-1516321318423-f06f85e504b3)', 'Mô tả hình ảnh')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              title="Chèn hình ảnh"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {isPreviewMode ? 'Chế độ soạn thảo' : 'Xem trước (KaTeX)'}
          </Button>
        </div>

        {/* Text Area or Markdown / KaTeX Preview */}
        {isPreviewMode ? (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 min-h-[300px] max-h-[420px] overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap">
            {renderMathContent(content)}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={12}
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="Nội dung ghi chú... (Hỗ trợ Markdown & công thức LaTeX $$...$$)"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-4 font-mono text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span className="text-slate-600 dark:text-slate-400">Ghim lên đầu</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={e => setIsFavorite(e.target.checked)}
                className="rounded border-slate-300 text-amber-500"
              />
              <span className="text-slate-600 dark:text-slate-400">Yêu thích</span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" leftIcon={<Save className="w-3.5 h-3.5" />}>
              {noteToEdit ? 'Lưu thay đổi' : 'Lưu ghi chú'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
