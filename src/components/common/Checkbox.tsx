import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  className = '',
  id,
  ...props
}) => {
  const checkboxId = id || `check-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div className="flex items-start gap-2.5 cursor-pointer">
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          id={checkboxId}
          className={`h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer ${className}`}
          {...props}
        />
      </div>
      {(label || description) && (
        <label htmlFor={checkboxId} className="flex flex-col cursor-pointer select-none">
          {label && (
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </span>
          )}
        </label>
      )}
    </div>
  );
};
