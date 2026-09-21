import React from 'react';
import { Download, FileText, Image as ImageIcon, Star } from 'lucide-react';
import { DocumentItem } from '../../types/document';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onToggleFavorite?: (id: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  onToggleFavorite,
}) => {
  if (!document) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Không xác định';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderPreviewContent = () => {
    switch (document.type) {
      case 'png':
      case 'jpg':
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-sm">
              <ImageIcon className="w-12 h-12 text-indigo-500" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              [Mô phỏng hình ảnh: {document.name}]
            </p>
            {document.content && (
              <p className="text-xs text-slate-400 mt-2 text-center max-w-md italic">
                "{document.content}"
              </p>
            )}
          </div>
        );

      case 'md':
      case 'txt':
        return (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {document.content || 'Nội dung tệp trống.'}
          </div>
        );

      case 'pdf':
      case 'docx':
      case 'pptx':
      default:
        return (
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {document.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Định dạng: {document.type.toUpperCase()} • Kích thước: {formatFileSize(document.size)}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                  Tải xuống tệp gốc
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 pr-4 truncate">
          <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <span className="truncate">{document.name}</span>
        </div>
      }
      description={`Cập nhật: ${new Date(document.updatedAt).toLocaleDateString('vi-VN')} • Kích thước: ${formatFileSize(document.size)}`}
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {onToggleFavorite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleFavorite(document.id)}
                leftIcon={
                  <Star
                    className={`w-3.5 h-3.5 ${
                      document.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                }
              >
                {document.isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
              </Button>
            )}
            <div className="flex items-center gap-1">
              {document.tags.map(tag => (
                <Badge key={tag} variant="neutral" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={onClose}>
            Đóng xem trước
          </Button>
        </div>
      }
    >
      {renderPreviewContent()}
    </Modal>
  );
};
