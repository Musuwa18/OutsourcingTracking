import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export interface IndonesianDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  min?: string; // 'YYYY-MM-DD'
  max?: string; // 'YYYY-MM-DD'
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  accentColor?: 'teal' | 'indigo' | 'emerald';
  align?: 'left' | 'right' | 'auto';
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const INDONESIAN_DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const INDONESIAN_DAYS_FULL = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

/**
 * Format YYYY-MM-DD to Indonesian DD/MM/YYYY
 */
export const formatToIndonesianDate = (isoStr: string): string => {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Parse Indonesian DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
 */
export const parseIndonesianDate = (str: string): string | null => {
  if (!str) return null;
  const cleaned = str.trim().replace(/\./g, '/').replace(/-/g, '/');
  const parts = cleaned.split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  if (y < 1900 || y > 2100) return null;
  const daysInM = new Date(y, m, 0).getDate();
  if (d > daysInM) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/**
 * Format YYYY-MM-DD to human Indonesian date: e.g. "Minggu, 8 November 2026"
 */
export const formatToHumanIndonesian = (isoStr: string): string => {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = INDONESIAN_DAYS_FULL[dateObj.getDay()] || '';
  const monthName = INDONESIAN_MONTHS[m - 1] || '';
  return `${dayName}, ${d} ${monthName} ${y}`;
};

export const IndonesianDatePicker: React.FC<IndonesianDatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  placeholder = 'HH/BB/TTTT',
  className = '',
  id,
  name,
  accentColor = 'teal',
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(() => formatToIndonesianDate(value));
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Parsing current value for calendar view
  const initialDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync internal display text when external value changes
  useEffect(() => {
    setInputText(formatToIndonesianDate(value));
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Calculate coordinates for portal popover
  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = 340;

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight) {
      if (rect.top > popoverHeight + 10) {
        top = rect.top - popoverHeight - 6;
      } else {
        top = Math.max(12, window.innerHeight - popoverHeight - 12);
      }
    }
    if (top < 12) {
      top = 12;
    }

    let left = rect.left;
    if (align === 'right' || (align === 'auto' && rect.left + popoverWidth > window.innerWidth - 16)) {
      left = rect.right - popoverWidth;
    }
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left });
  }, [align]);

  const toggleOpen = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      updateCoords();
      setIsOpen(true);
    }
  };
  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateCoords]);

  // Handle typing inside text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    const parsedIso = parseIndonesianDate(text);
    if (parsedIso) {
      if (min && parsedIso < min) return;
      if (max && parsedIso > max) return;
      onChange(parsedIso);
      const [y, m] = parsedIso.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  };

  const handleInputBlur = () => {
    // Revert to formatted date if text is invalid
    const parsedIso = parseIndonesianDate(inputText);
    if (!parsedIso) {
      setInputText(formatToIndonesianDate(value));
    }
  };

  // Calendar navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Day selection
  const selectDate = (day: number) => {
    const isoStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (min && isoStr < min) return;
    if (max && isoStr > max) return;

    onChange(isoStr);
    setInputText(formatToIndonesianDate(isoStr));
    setIsOpen(false);
  };

  // Jump to Today
  const selectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (min && isoToday < min) return;
    if (max && isoToday > max) return;

    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onChange(isoToday);
    setInputText(formatToIndonesianDate(isoToday));
    setIsOpen(false);
  };

  // Clear date
  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!required) {
      onChange('');
      setInputText('');
      setIsOpen(false);
    }
  };

  // Days grid generation
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday (Min)
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays: number[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays: number[] = [];
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    currentMonthDays.push(d);
  }

  const totalCellsSoFar = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysCount = totalCellsSoFar % 7 === 0 ? 0 : 7 - (totalCellsSoFar % 7);
  const nextMonthDays: number[] = [];
  for (let d = 1; d <= nextMonthDaysCount; d++) {
    nextMonthDays.push(d);
  }

  // Accent styling classes
  const accentSelectedClass =
    accentColor === 'indigo'
      ? 'bg-indigo-600 text-white font-bold'
      : accentColor === 'emerald'
        ? 'bg-emerald-600 text-white font-bold'
        : 'bg-teal-600 text-white font-bold';

  const accentRingClass =
    accentColor === 'indigo'
      ? 'ring-1 ring-indigo-500'
      : accentColor === 'emerald'
        ? 'ring-1 ring-emerald-500'
        : 'ring-1 ring-teal-500';

  const accentTextClass =
    accentColor === 'indigo'
      ? 'text-indigo-600 dark:text-indigo-400'
      : accentColor === 'emerald'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-teal-600 dark:text-teal-400';

  // Today string for comparison
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const renderPopover = () => {
    if (!isOpen) return null;

    return createPortal(
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 999999,
        }}
        className="w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-3 select-none animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white"
        role="dialog"
        aria-modal="true"
      >
        {/* Header: Bulan & Tahun Indonesia */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 font-bold text-xs tracking-wide">
            {/* Month select */}
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="bg-transparent font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 focus:outline-hidden"
            >
              {INDONESIAN_MONTHS.map((m, idx) => (
                <option key={m} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {m}
                </option>
              ))}
            </select>

            {/* Year select */}
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="bg-transparent font-bold cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 focus:outline-hidden font-mono"
            >
              {Array.from({ length: 15 }, (_, i) => viewYear - 7 + i).map((yr) => (
                <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Header Hari Indonesia (Min, Sen, Sel, Rab, Kam, Jum, Sab) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {INDONESIAN_DAYS_SHORT.map((dayName, idx) => {
            const isSunday = idx === 0;
            return (
              <div
                key={dayName}
                className={`text-[10px] font-semibold py-1 ${
                  isSunday ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}
                title={INDONESIAN_DAYS_FULL[idx]}
              >
                {dayName}
              </div>
            );
          })}
        </div>

        {/* Tanggal Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {/* Dimmed previous month days */}
          {prevMonthDays.map((d) => (
            <div
              key={`prev-${d}`}
              className="h-7 flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-600 font-mono select-none"
            >
              {d}
            </div>
          ))}

          {/* Current month days */}
          {currentMonthDays.map((d) => {
            const dayIso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = value === dayIso;
            const isToday = todayIso === dayIso;
            const dayOfWeek = new Date(viewYear, viewMonth, d).getDay();
            const isSunday = dayOfWeek === 0;

            const isDisabled = Boolean((min && dayIso < min) || (max && dayIso > max));

            return (
              <button
                key={`cur-${d}`}
                type="button"
                disabled={isDisabled}
                onClick={() => selectDate(d)}
                className={`h-7 w-full rounded-lg font-mono text-[11px] flex items-center justify-center transition-all ${
                  isDisabled
                    ? 'opacity-25 cursor-not-allowed text-slate-400 line-through'
                    : isSelected
                      ? `${accentSelectedClass} shadow-xs scale-105`
                      : isToday
                        ? `${accentRingClass} ${accentTextClass} font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer`
                        : isSunday
                          ? 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium cursor-pointer'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {d}
              </button>
            );
          })}

          {/* Dimmed next month days */}
          {nextMonthDays.map((d) => (
            <div
              key={`next-${d}`}
              className="h-7 flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-600 font-mono select-none"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Footer: Hari Ini & Reset/Hapus */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <div>
            {!required && value ? (
              <button
                type="button"
                onClick={clearDate}
                className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Hapus
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 truncate max-w-[130px] block">
                {value ? formatToHumanIndonesian(value) : 'Pilih tanggal'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={selectToday}
            className={`font-semibold ${accentTextClass} hover:underline cursor-pointer`}
          >
            Hari Ini
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for native form validation support */}
      <input
        type="text"
        name={name}
        id={id}
        required={required}
        value={value}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Styled Indonesian Date Display & Input */}
      <div
        onClick={toggleOpen}
        className={`group relative flex items-center justify-between cursor-pointer transition-all ${className}`}
      >
        <input
          type="text"
          readOnly
          value={inputText}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent focus:outline-hidden text-slate-900 dark:text-white placeholder:text-slate-400 font-mono text-xs cursor-pointer select-none"
        />

        <div className="shrink-0 ml-1.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          <Calendar className="w-3.5 h-3.5" />
        </div>
      </div>

      {renderPopover()}
    </div>
  );
};
