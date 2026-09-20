import React, { useState } from 'react';
import { User } from 'lucide-react';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  preferIcon?: boolean;
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  size = 'sm',
  className = '',
  preferIcon = false,
}) => {
  const [imgError, setImgError] = useState(false);

  // Size mapping
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28 text-3xl',
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
    '2xl': 'w-12 h-12',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.sm;
  const currentIconSize = iconSizes[size] || iconSizes.sm;

  const initials = getInitials(name);
  const hasValidImage = Boolean(avatarUrl && avatarUrl.trim() && avatarUrl !== 'icon:user' && !imgError);

  if (hasValidImage) {
    return (
      <div
        className={`relative inline-flex flex-shrink-0 rounded-full overflow-hidden shadow-xs ring-1 ring-black/5 dark:ring-white/10 ${currentSizeClass} ${className}`}
      >
        <img
          src={avatarUrl!}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    );
  }

  // If user explicitly chose icon:user, or preferIcon is set, or no initials available
  if (avatarUrl === 'icon:user' || preferIcon || !initials) {
    return (
      <div
        className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 shadow-xs ${currentSizeClass} ${className}`}
        title={name || 'Người dùng'}
      >
        <User className={currentIconSize} />
      </div>
    );
  }

  // Automatically computed initials from user name (e.g. NA, HL)
  return (
    <div
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold tracking-tight shadow-xs ${currentSizeClass} ${className}`}
      title={name || 'Học viên'}
    >
      {initials}
    </div>
  );
};
