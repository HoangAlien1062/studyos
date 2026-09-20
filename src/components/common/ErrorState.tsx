import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Không thể tải dữ liệu',
  message = 'Đã có lỗi xảy ra trong quá trình xử lý hoặc kết nối. Vui lòng thử lại.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 ${className}`}>
      <div className="mb-3 p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
        {title}
      </h4>
      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 max-w-sm">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="border-rose-300 text-rose-700 hover:bg-rose-100/50 dark:border-rose-800 dark:text-rose-300"
          >
            Thử lại
          </Button>
        </div>
      )}
    </div>
  );
};
