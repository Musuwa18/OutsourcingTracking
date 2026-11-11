import React from 'react';
import { X, Download, Share, ArrowRight, Smartphone } from 'lucide-react';
import { usePwa } from '../context/PwaContext';

export const PwaInstallBanner: React.FC = () => {
  const { showAutoBanner, promptInstall, dismissBanner, isInstalled, isIos, isMobileDevice } = usePwa();

  // Hanya tampil jika diminta, belum terpasang, dan dibuka pada smartphone/tablet
  if (!showAutoBanner || isInstalled || !isMobileDevice) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl bg-white dark:bg-[#0f172a] border border-indigo-200 dark:border-indigo-900/80 shadow-2xl p-6 text-slate-800 dark:text-slate-100 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dekorasi Aksen Gradient Atas */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />

        {/* Tombol Tutup Sementara (X) */}
        <button
          type="button"
          onClick={dismissBanner}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup Sementara"
          aria-label="Tutup Sementara"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & App Badge */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative mb-3.5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 text-white font-black text-2xl border-2 border-white/20">
              OT
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-emerald-500 text-white shadow-md border-2 border-white dark:border-slate-900">
              <Download className="w-3.5 h-3.5" />
            </div>
          </div>

          <span className="text-[10px] font-bold px-3 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-400 border border-indigo-200 dark:border-indigo-800/60 uppercase tracking-wider mb-2">
            Rekomendasi Wajib Pemasangan
          </span>

          <h3 id="pwa-install-title" className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
            Pasang OutsourceTrack di HP Anda
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            Demi kelancaran presensi kamera WebRTC, akurasi GPS tanpa batas browser, dan notifikasi kehadiran tepat waktu, silakan pasang aplikasi ini di layar utama HP Anda.
          </p>
        </div>

        {/* Panduan Spesifik OS (Android vs iOS) */}
        <div className="mt-5 text-left">
          {isIos ? (
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2 text-xs">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Share className="w-4 h-4 text-indigo-600 dark:text-cyan-400 shrink-0" />
                <span>Petunjuk Pemasangan di iPhone / iPad:</span>
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                <li>
                  Tekan tombol <strong>Share</strong> (ikon kotak panah ke atas) pada menu navigasi bawah Safari.
                </li>
                <li>
                  Gulir ke bawah dan pilih <strong>'Tambahkan ke Layar Utama' (Add to Home Screen)</strong>.
                </li>
                <li>
                  Tekan <strong>Tambah (Add)</strong> di kanan atas, lalu buka OutsourceTrack dari layar utama HP Anda.
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={promptInstall}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Pasang Aplikasi Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Dismiss Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={dismissBanner}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            Tutup Sementara (Nanti Saja)
          </button>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
            *Pemberitahuan ini akan otomatis muncul kembali saat berpindah halaman hingga aplikasi terpasang di HP.
          </span>
        </div>
      </div>
    </div>
  );
};
