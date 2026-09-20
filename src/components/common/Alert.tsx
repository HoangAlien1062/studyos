import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const typeMap = {
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      border: 'border-indigo-200 dark:border-indigo-900/60',
      text: 'text-indigo-900 dark:text-indigo-200',
      icon: <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-900/60',
      text: 'text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-900/60',
      text: 'text-amber-900 dark:text-amber-200',
      icon: <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-200 dark:border-rose-900/60',
      text: 'text-rose-900 dark:text-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
    },
  };

  const style = typeMap[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      {style.icon}
      <div className="flex-1 text-xs">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        {message && <div className="leading-relaxed opacity-90">{message}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
