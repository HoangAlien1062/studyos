import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { QuestionDifficulty, QuestionItem, QuestionOption, QuestionType } from '../../types/question';
import { Subject } from '../../types/subject';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Omit<QuestionItem, 'id' | 'createdAt'> & { id?: string }) => void;
  questionToEdit?: QuestionItem | null;
  subjects: Subject[];
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  questionToEdit,
  subjects,
}) => {
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium');
  const [type, setType] = useState<QuestionType>('single_choice');
  const [source, setSource] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: 'opt-a', text: '' },
    { id: 'opt-b', text: '' },
    { id: 'opt-c', text: '' },
    { id: 'opt-d', text: '' },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState('opt-a');
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (questionToEdit) {
      setContent(questionToEdit.content);
      setSubjectId(questionToEdit.subjectId);
      setDifficulty(questionToEdit.difficulty);
      setType(questionToEdit.type);
      setSource(questionToEdit.source || '');
      setTagsInput(questionToEdit.tags.join(', '));
      setOptions(questionToEdit.options);
      setCorrectOptionId(questionToEdit.correctOptionId);
      setExplanation(questionToEdit.explanation);
    } else {
      setContent('');
      setSubjectId(subjects[0]?.id || '');
      setDifficulty('medium');
      setType('single_choice');
      setSource('');
      setTagsInput('Lý thuyết');
      setOptions([
        { id: 'opt-a', text: '' },
        { id: 'opt-b', text: '' },
        { id: 'opt-c', text: '' },
        { id: 'opt-d', text: '' },
      ]);
      setCorrectOptionId('opt-a');
      setExplanation('');
    }
  }, [questionToEdit, subjects, isOpen]);

  const handleOptionChange = (id: string, text: string) => {
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleAddOption = () => {
    const newId = `opt-${String.fromCharCode(97 + options.length)}`;
    setOptions(prev => [...prev, { id: newId, text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter(opt => opt.id !== id));
    if (correctOptionId === id) {
      setCorrectOptionId(options[0]?.id || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    onSave({
      id: questionToEdit?.id,
      content: content.trim(),
      subjectId: subjectId || subjects[0]?.id || 'subj-custom',
      difficulty,
      type,
      source: source.trim() || undefined,
      tags,
      options,
      correctOptionId,
      explanation: explanation.trim(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={questionToEdit ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question content */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Nội dung câu hỏi
          </label>
          <textarea
            rows={3}
            placeholder="Nhập đề bài câu hỏi... (Hỗ trợ công thức LaTeX $...$)"
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            required
          />
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Môn học"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            options={subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
          />

          <Select
            label="Độ khó"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as QuestionDifficulty)}
            options={[
              { value: 'easy', label: 'Dễ (Nhận biết)' },
              { value: 'medium', label: 'Trung bình (Thông hiểu)' },
              { value: 'hard', label: 'Khó (Vận dụng cao)' },
            ]}
          />

          <Select
            label="Loại câu hỏi"
            value={type}
            onChange={e => setType(e.target.value as QuestionType)}
            options={[
              { value: 'single_choice', label: 'Trắc nghiệm đơn (1 đáp án)' },
              { value: 'multiple_choice', label: 'Nhiều lựa chọn' },
              { value: 'true_false', label: 'Đúng / Sai' },
            ]}
          />
        </div>

        {/* Options list */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Các lựa chọn đáp án (Chọn radio để đặt đáp án đúng)
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddOption}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Thêm đáp án
            </Button>
          </div>

          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-option"
                  checked={correctOptionId === opt.id}
                  onChange={() => setCorrectOptionId(opt.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  title="Đặt làm đáp án đúng"
                />
                <span className="font-bold text-xs text-slate-400 w-5 text-center">
                  {String.fromCharCode(65 + idx)}
                </span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={e => handleOptionChange(opt.id, e.target.value)}
                  placeholder={`Nội dung đáp án ${String.fromCharCode(65 + idx)}...`}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(opt.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Giải thích chi tiết đáp án
          </label>
          <textarea
            rows={3}
            placeholder="Các bước giải chi tiết hoặc căn cứ định lý..."
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Source & Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nguồn đề thi / Giáo trình (tùy chọn)"
            placeholder="Ví dụ: Đề thi KTHP 2024 ĐHQG"
            value={source}
            onChange={e => setSource(e.target.value)}
          />
          <Input
            label="Thẻ phân loại (Tags)"
            placeholder="Ví dụ: Giới hạn, L'Hôpital"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {questionToEdit ? 'Lưu thay đổi' : 'Tạo câu hỏi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
