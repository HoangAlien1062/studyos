import React from 'react';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'list' | 'text';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 3,
  className = '',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {items.map(i => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="w-16 h-5 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="w-3/4 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-1/2 h-3 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="w-full h-2 rounded bg-slate-100 dark:bg-slate-800 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map(i => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
              <div className="space-y-1.5 w-2/3">
                <div className="w-4/5 h-3.5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-2/5 h-2.5 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
            <div className="w-16 h-6 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}>
        <div className="h-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {items.map(i => (
            <div key={i} className="h-12 px-4 flex items-center gap-4 animate-pulse">
              <div className="w-1/4 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-1/3 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="w-1/6 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="w-1/6 h-3 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/6" />
    </div>
  );
};
