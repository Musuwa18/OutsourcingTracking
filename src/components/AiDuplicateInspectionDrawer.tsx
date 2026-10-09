import React from 'react';
import {
  X,
  AlertTriangle,
  Sparkles,
  Camera,
  Layers,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { DailyWorkReport, StaffProfile } from '../types';

interface AiDuplicateInspectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyWorkReport | null;
  matchedReport: DailyWorkReport | null;
  staff: StaffProfile | undefined;
  onRequestRevision: (reportId: string, note: string) => void;
}

export const AiDuplicateInspectionDrawer: React.FC<AiDuplicateInspectionDrawerProps> = ({
  isOpen,
  onClose,
  report,
  matchedReport,
  staff,
  onRequestRevision,
}) => {
  if (!isOpen || !report) return null;

  const flag = report.aiDuplicateFlag;
  const isDuplicate = !!flag?.isDuplicate;
  const score = flag?.similarityScore || 0;

  const handleQuickRevision = () => {
    onRequestRevision(
      report.id,
      `Ditolak oleh AI Integrity: Terdeteksi foto duplikat (${score}% kesamaan) dengan laporan "${flag?.matchedReportTitle || 'sebelumnya'}". Harap ambil foto dokumentasi asli di lokasi.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-surface rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${
              isDuplicate ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Audit Integritas Citra AI (Perceptual Hash)
                {isDuplicate ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 font-bold">
                    Terindikasi Duplikat ({score}%)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-bold">
                    Foto Otentik (Unik)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Pemeriksaan kesamaan visual dan pola sidik jari citra terhadap repositori laporan kerja
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Metadata Staf */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                style={{ backgroundColor: staff?.avatarColor || '#4f46e5' }}
              >
                {staff?.initials || 'ST'}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {staff?.name || 'Staf Outsourcing'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {staff?.roleTitle} · {staff?.nip}
                </div>
              </div>
            </div>

            <div className="text-right text-[11px]">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                {report.title}
              </div>
              <div className="text-slate-400 font-mono">
                {report.date} · {report.startTime} - {report.endTime} WIB
              </div>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Foto Yang Sedang Dinilai */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  Foto Laporan Ini
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-medium">
                  {report.imageHash?.substring(0, 14) || '#hash-active'}
                </span>
              </div>

              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                <img
                  src={report.documentationPhotoUrl}
                  alt={report.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-[10px] text-slate-400 font-mono">
                Status: {report.status} · Jam {report.createdAt.split(' ')[1] || report.startTime} WIB
              </p>
            </div>

            {/* Foto Pembanding yang Cocok */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Foto Pembanding (Terdahulu)
                </span>
                <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  {flag?.matchedReportDate || 'Tercatat'}
                </span>
              </div>

              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-amber-200 dark:border-amber-800 bg-black">
                {matchedReport ? (
                  <img
                    src={matchedReport.documentationPhotoUrl}
                    alt={matchedReport.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs p-4 text-center">
                    Foto arsip pembanding tersimpan di hash index
                  </div>
                )}
              </div>

              <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium truncate" title={flag?.matchedReportTitle}>
                Judul: "{flag?.matchedReportTitle || 'Laporan Terdahulu'}"
              </p>
            </div>
          </div>

          {/* AI Metrics Meter */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Skor Kesamaan Hash Perseptual (dHash & Color Gradients)
              </span>
              <span className={`font-mono font-bold text-sm ${
                isDuplicate ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {score}%
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 ${
                  isDuplicate
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              {flag?.reason || 'Foto diverifikasi unik dan tidak memiliki kecocokan mencurigakan dengan arsip laporan sebelumnya.'}
            </p>
          </div>

          {/* Staff Justification Note if Available */}
          {flag?.justificationNote && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Catatan Justifikasi dari Staf:
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 italic">
                "{flag.justificationNote}"
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Tutup
          </button>

          {isDuplicate && (
            <button
              type="button"
              onClick={handleQuickRevision}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Minta Revisi: Foto Duplikat Ditolak</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
