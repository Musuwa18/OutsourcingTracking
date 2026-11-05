import React from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePwa } from '../context/PwaContext';

export const PwaInstallBanner: React.FC = () => {
  const { showAutoBanner, promptInstall, dismissBanner, isInstalled, isIos } = usePwa();

  if (!showAutoBanner || isInstalled) {
    return null;
  }

  return (
    <aside
      aria-label="Pemasangan Aplikasi PWA"
      className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-[400px] z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border border-indigo-200 dark:border-indigo-900/60 shadow-2xl p-4 text-slate-800 dark:text-slate-100">
        {/* Dekorasi Aksen Gradient Atas */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />

        {/* Tombol Tutup (X) */}
        <button
          type="button"
          onClick={() => dismissBanner(3)}
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup (sembunyikan 3 hari)"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header: Ikon & Identitas */}
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shrink-0 shadow-md text-white font-black text-sm">
            OT
          </div>

          <div className="leading-tight">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Pasang OutsourceTrack di Perangkat</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Akses cepat tanpa browser, lancar offline, dan presensi kamera lebih responsif.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => dismissBanner(1)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Nanti Saja
          </button>

          {isIos ? (
            <div className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-cyan-400 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
              Tekan tombol <strong>Share</strong> (ikon kotak panah atas) lalu pilih <strong>'Add to Home Screen'</strong>.
            </div>
          ) : (
            <button
              type="button"
              onClick={promptInstall}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Sekarang</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
