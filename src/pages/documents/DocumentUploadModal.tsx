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

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit to prevent browser OOM

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  subjects,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setFileError(`Tệp tin quá lớn (${sizeMB} MB). Hệ thống giới hạn tối đa 15 MB / tệp để đảm bảo trình duyệt không bị sập bộ nhớ (Out of Memory).`);
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || selectedFile.size > MAX_FILE_SIZE_BYTES) return;

    setIsUploading(true);
    try {
      const tags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await onUpload(selectedFile, subjectId || undefined, tags);
      setSelectedFile(null);
      setTagInput('');
      setFileError(null);
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
      description="Giới hạn tối đa: 15 MB / tệp • Hỗ trợ: PDF, DOCX, PPTX, TXT, Markdown, PNG, JPG"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {fileError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            ⚠️ {fileError}
          </div>
        )}

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
              {selectedFile ? selectedFile.name : 'Chọn tệp từ máy tính của bạn (Tối đa 15 MB)'}
            </span>
            {selectedFile && (
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Kích thước: {(selectedFile.size / 1024).toFixed(1)} KB (Hợp lệ)
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
