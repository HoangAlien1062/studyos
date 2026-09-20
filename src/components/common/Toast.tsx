import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastMessage } from '../../types/common';

export interface ToastProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 flex-shrink-0" />,
  };

  const borderMap = {
    success: 'border-emerald-200 dark:border-emerald-900/60',
    error: 'border-rose-200 dark:border-rose-900/60',
    warning: 'border-amber-200 dark:border-amber-900/60',
    info: 'border-indigo-200 dark:border-indigo-900/60',
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border ${borderMap[toast.type]} animate-in slide-in-from-bottom-5 duration-200`}
    >
      {iconMap[toast.type]}
      <div className="flex-1 text-xs">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="mt-0.5 text-slate-500 dark:text-slate-400">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
