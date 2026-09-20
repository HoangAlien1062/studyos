import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Upload,
  X,
} from 'lucide-react';
import { ImportValidationResult } from '../../services/dataExchange/importExportService';
import { Badge } from './Badge';
import { Button } from './Button';

interface DataImportModalProps<T> {
  isOpen: boolean;
  title: string;
  acceptedFormats?: string; // '.json, .csv'
  sampleDescription?: string;
  onValidateFile: (content: string, filename: string) => ImportValidationResult<T>;
  onConfirmImport: (validItems: T[]) => Promise<void>;
  onClose: () => void;
}

export function DataImportModal<T>({
  isOpen,
  title,
  acceptedFormats = '.json, .csv',
  sampleDescription = 'Tệp JSON hoặc CSV có các cột tương ứng theo quy định.',
  onValidateFile,
  onConfirmImport,
  onClose,
}: DataImportModalProps<T>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult<T> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    try {
      const text = await file.text();
      const result = onValidateFile(text, file.name);
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({
        totalRead: 0,
        validCount: 0,
        invalidCount: 1,
        duplicateCount: 0,
        errors: [{ row: 1, reason: `Không thể đọc tệp: ${err.message || 'Lỗi tệp'}` }],
        validItems: [],
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.validItems.length === 0) return;
    setIsProcessing(true);
    try {
      await onConfirmImport(validationResult.validItems);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kiểm tra tính hợp lệ trước khi nạp vào hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* File Upload Area */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <input
              type="file"
              id="data-import-input"
              accept={acceptedFormats}
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="data-import-input" className="cursor-pointer block">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
                {selectedFile?.name.endsWith('.csv') ? (
                  <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                ) : (
                  <FileText className="w-6 h-6 text-indigo-500" />
                )}
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {selectedFile ? selectedFile.name : 'Bấm để chọn tệp hoặc kéo thả vào đây'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hỗ trợ {acceptedFormats} • {sampleDescription}
              </p>
            </label>
          </div>

          {/* Validation Report & Preview */}
          {validationResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {validationResult.totalRead}
                  </div>
                  <div className="text-[11px] text-slate-400">Tổng đọc được</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {validationResult.validCount}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Hợp lệ</div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {validationResult.invalidCount}
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Có lỗi</div>
                </div>
              </div>

              {validationResult.duplicateCount > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Phát hiện <strong>{validationResult.duplicateCount}</strong> mục có thể trùng lặp với dữ liệu đã có.
                  </span>
                </div>
              )}

              {/* Error list if any */}
              {validationResult.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 space-y-1.5 max-h-32 overflow-y-auto">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Chi tiết lỗi ({validationResult.errors.length}):
                  </div>
                  {validationResult.errors.map((err, i) => (
                    <div key={i} className="text-[11px] text-rose-600 dark:text-rose-300 font-mono">
                      • Dòng {err.row}: {err.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            disabled={!validationResult || validationResult.validCount === 0 || isProcessing}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isProcessing ? 'Đang nạp...' : `Xác nhận nạp (${validationResult?.validCount || 0} mục)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
