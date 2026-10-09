import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number; // 1 - 5
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showDescriptor?: boolean;
}

const DESCRIPTORS: Record<number, string> = {
  1: 'Sangat Kurang',
  2: 'Kurang / Perlu Peningkatan',
  3: 'Cukup / Standar',
  4: 'Baik / Memenuhi Harapan',
  5: 'Sangat Baik / Unggul',
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  label,
  showDescriptor = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const activeValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <span className="font-mono text-slate-500 tabular-nums">
            {activeValue > 0 ? `${activeValue}/5` : '-'}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label || 'Rating'}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = activeValue >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => !readOnly && setHoverValue(star)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              aria-label={`${star} Bintang - ${DESCRIPTORS[star]}`}
              aria-checked={value === star}
              role={readOnly ? undefined : 'radio'}
              className={`p-1 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                readOnly
                  ? 'cursor-default'
                  : 'cursor-pointer hover:scale-110 active:scale-95'
              }`}
            >
              <Star
                className={`${starSizes[size]} transition-colors duration-150 ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_1px_2px_rgba(251,191,36,0.3)]'
                    : 'text-slate-300 dark:text-slate-700 hover:text-slate-400'
                }`}
              />
            </button>
          );
        })}

        {showDescriptor && activeValue > 0 && (
          <span className="ml-2 text-xs font-medium text-slate-600 dark:text-slate-400 transition-opacity">
            {DESCRIPTORS[activeValue]}
          </span>
        )}
      </div>
    </div>
  );
};
