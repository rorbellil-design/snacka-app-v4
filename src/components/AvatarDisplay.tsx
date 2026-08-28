import React from 'react';

interface AvatarDisplayProps {
  avatar: string;
  name: string;
  className?: string;
  sizeClass?: string;
  textSizeClass?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  avatar,
  name,
  className = '',
  sizeClass = 'w-12 h-12',
  textSizeClass = 'text-2xl',
}) => {
  const isImageUrl =
    avatar &&
    (avatar.startsWith('data:image/') ||
      avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('blob:'));

  if (isImageUrl) {
    return (
      <div
        className={`${sizeClass} rounded-2xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 shadow-xs ${className}`}
      >
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-2xl flex items-center justify-center shrink-0 ${textSizeClass} select-none ${className}`}
    >
      {avatar || '👤'}
    </div>
  );
};
