import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Subject } from '../../types/subject';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, subjectId?: string, tags?: string[]) => Promise<void>;
  subjects: Subject[];
  currentFolderId: string | null;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  subjects,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const tags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await onUpload(selectedFile, subjectId || undefined, tags);
      setSelectedFile(null);
      setTagInput('');
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tải lên tài liệu học tập"
      description="Hỗ trợ các định dạng: PDF, DOCX, PPTX, TXT, Markdown (.md), PNG, JPG"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Drop Area */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors">
          <input
            type="file"
            id="file-upload-dialog"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.png,.jpg,.jpeg"
          />
          <label htmlFor="file-upload-dialog" className="cursor-pointer block">
            <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {selectedFile ? selectedFile.name : 'Chọn tệp từ máy tính của bạn'}
            </span>
            {selectedFile && (
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Kích thước: {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            )}
          </label>
        </div>

        {/* Subject linking */}
        <Select
          label="Liên kết với Môn học (tùy chọn)"
          value={subjectId}
          onChange={e => setSubjectId(e.target.value)}
          options={[
            { value: '', label: '-- Không chọn môn học --' },
            ...subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))
          ]}
        />

        {/* Tags */}
        <Input
          label="Thẻ phân loại (Tags, phân cách bằng dấu phẩy)"
          placeholder="Ví dụ: Đề cương, Slide tuần 1, B2, Công thức"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!selectedFile}
            isLoading={isUploading}
          >
            Bắt đầu tải lên
          </Button>
        </div>
      </form>
    </Modal>
  );
};
