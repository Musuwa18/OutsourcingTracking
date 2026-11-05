import React, { useEffect } from 'react';
import { Clock, ShieldAlert, RefreshCw, LogOut } from 'lucide-react';

export interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
}) => {
  // Dukungan tombol keyboard Enter untuk memperpanjang sesi secara cepat
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onExtend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onExtend]);

  if (!isOpen) return null;

  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-desc"
    >
      <div
        className="bg-white dark:bg-[#0f172a] border border-amber-300 dark:border-amber-500/40 rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Aksen Garis Gradien Atas Peringatan */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-pulse" />

        {/* Header Dialog */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Protokol Keamanan Kedinasan
            </span>
            <h3
              id="session-timeout-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5"
            >
              Peringatan Sesi Tidak Aktif
            </h3>
          </div>
        </div>

        {/* Kotak Hitung Mundur Waktu */}
        <div className="my-5 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Sesi akan ditutup otomatis dalam:
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono text-4xl sm:text-5xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              00:{formattedSeconds}
            </span>
            <span className="text-xs font-bold text-amber-700/80 dark:text-amber-400/80 uppercase">
              detik
            </span>
          </div>

          <p
            id="session-timeout-desc"
            className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed max-w-xs"
          >
            Tidak ada aktivitas selama 14 menit. Demi menjaga keamanan akun dan data penugasan tenaga alih daya Disdik HST, akun Anda akan otomatis dikeluarkan.
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Keluar Sekarang</span>
          </button>

          <button
            type="button"
            onClick={onExtend}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Lanjutkan Sesi (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
