import React from 'react';
import { StudentGender } from '../../types';

interface StudentAvatarProps {
  name: string;
  seed?: string;
  gender?: StudentGender;
  bgColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
  status?: 'active' | 'offline';
}

const AVATAR_PALETTES = [
  { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200', accent: '#4f46e5' },
  { bg: 'bg-sky-100 text-sky-700 border-sky-200', accent: '#0284c7' },
  { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', accent: '#059669' },
  { bg: 'bg-amber-100 text-amber-700 border-amber-200', accent: '#d97706' },
  { bg: 'bg-rose-100 text-rose-700 border-rose-200', accent: '#e11d48' },
  { bg: 'bg-violet-100 text-violet-700 border-violet-200', accent: '#7c3aed' },
  { bg: 'bg-teal-100 text-teal-700 border-teal-200', accent: '#0d9488' },
];

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name,
  seed = 'student',
  gender = 'female',
  bgColor,
  size = 'md',
  className = '',
  showBadge = false,
  status = 'active',
}) => {
  // Generate deterministic index based on name/seed
  const charCodeSum = (name + seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const paletteIndex = charCodeSum % AVATAR_PALETTES.length;
  const currentPalette = AVATAR_PALETTES[paletteIndex];

  // Initials
  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl font-bold',
    '2xl': 'w-28 h-28 text-3xl font-extrabold',
  };

  const badgeSizes = {
    xs: 'w-1.5 h-1.5 bottom-0 right-0',
    sm: 'w-2 h-2 bottom-0 right-0',
    md: 'w-2.5 h-2.5 bottom-0.5 right-0.5',
    lg: 'w-3.5 h-3.5 bottom-0.5 right-0.5 ring-2 ring-white',
    xl: 'w-4 h-4 bottom-1 right-1 ring-2 ring-white',
    '2xl': 'w-5 h-5 bottom-1.5 right-1.5 ring-3 ring-white',
  };

  // Render stylized SVG character avatar for sizes md, lg, xl, 2xl
  const isLarge = size === 'lg' || size === 'xl' || size === '2xl';

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`rounded-full flex items-center justify-center font-bold select-none border transition-transform duration-200 overflow-hidden shadow-xs ${
          bgColor ? bgColor : currentPalette.bg
        } ${sizeClasses[size]}`}
      >
        {isLarge ? (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full object-cover"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background disc */}
            <circle cx="50" cy="50" r="48" fill="currentColor" fillOpacity="0.12" />

            {/* Hair Back */}
            {gender === 'female' ? (
              <path
                d="M 24 45 C 24 20, 76 20, 76 45 C 76 65, 78 80, 80 85 C 75 85, 72 75, 70 70 C 60 70, 40 70, 30 70 C 28 75, 25 85, 20 85 C 22 80, 24 65, 24 45 Z"
                fill="#334155"
              />
            ) : null}

            {/* Shoulders & Shirt */}
            <path
              d="M 20 95 C 20 74, 34 70, 50 70 C 66 70, 80 74, 80 95 Z"
              fill={currentPalette.accent}
            />
            {/* Collar */}
            <polygon points="50,78 42,70 58,70" fill="#ffffff" opacity="0.9" />

            {/* Neck */}
            <rect x="44" y="58" width="12" height="15" rx="3" fill="#fcd34d" />

            {/* Head / Face */}
            <ellipse cx="50" cy="46" rx="20" ry="22" fill="#fde68a" />

            {/* Eyes */}
            <circle cx="43" cy="45" r="2.5" fill="#1e293b" />
            <circle cx="57" cy="45" r="2.5" fill="#1e293b" />
            <circle cx="44" cy="44" r="0.8" fill="#ffffff" />
            <circle cx="58" cy="44" r="0.8" fill="#ffffff" />

            {/* Cheeks */}
            <circle cx="40" cy="50" r="3" fill="#f87171" opacity="0.4" />
            <circle cx="60" cy="50" r="3" fill="#f87171" opacity="0.4" />

            {/* Smile */}
            <path
              d="M 45 53 Q 50 58 55 53"
              stroke="#b45309"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Hair Front */}
            {gender === 'female' ? (
              <path
                d="M 28 40 C 30 26, 44 22, 50 24 C 60 22, 70 26, 72 40 C 66 32, 58 32, 50 35 C 42 32, 34 32, 28 40 Z"
                fill="#1e293b"
              />
            ) : (
              <path
                d="M 28 42 C 30 22, 50 20, 72 26 C 72 32, 66 34, 60 32 C 50 34, 40 32, 32 38 Z"
                fill="#1e293b"
              />
            )}

            {/* Eyeglasses or student accessory based on charCodeSum */}
            {charCodeSum % 2 === 0 && (
              <g stroke="#334155" strokeWidth="1.8" fill="none">
                <circle cx="43" cy="45" r="6" />
                <circle cx="57" cy="45" r="6" />
                <line x1="49" y1="45" x2="51" y2="45" />
              </g>
            )}
          </svg>
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showBadge && (
        <span
          className={`absolute rounded-full border-2 border-white ${
            status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
          } ${badgeSizes[size]}`}
          title={status === 'active' ? 'Student Active' : 'Offline'}
        />
      )}
    </div>
  );
};
