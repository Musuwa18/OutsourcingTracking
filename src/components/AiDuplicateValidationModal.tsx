import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Camera,
  CheckCircle2,
  X,
  Send,
  ShieldAlert,
  ArrowRight,
  FileText,
  Clock,
  Layers,
  Cpu,
} from 'lucide-react';
import { DailyWorkReport } from '../types';

interface AiDuplicateValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl: string;
  currentHash: string;
  currentShortHash: string;
  matchedReport: DailyWorkReport;
  similarityScore: number;
  flagSeverity: 'high' | 'medium';
  reason: string;
  onRetakePhoto: () => void;
  onSubmitWithFlag: (justificationNote: string) => void;
}

export const AiDuplicateValidationModal: React.FC<AiDuplicateValidationModalProps> = ({
  isOpen,
  onClose,
  currentPhotoUrl,
  currentShortHash,
  matchedReport,
  similarityScore,
  flagSeverity,
  reason,
  onRetakePhoto,
  onSubmitWithFlag,
}) => {
  const [justificationNote, setJustificationNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleProceed = () => {
    setIsSubmitting(true);
    onSubmitWithFlag(justificationNote.trim());
    setIsSubmitting(false);
  };

  const isExactIdentical = similarityScore >= 95 || flagSeverity === 'high';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-surface rounded-3xl shadow-2xl border border-rose-400/40 dark:border-rose-900/80 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with High-Tech AI Badge */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 dark:border-rose-950 bg-rose-50/70 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-xs animate-pulse">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-rose-950 dark:text-rose-100">
                  Validasi AI: Peringatan Foto Duplikat Terdeteksi
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                  {similarityScore}% Cocok
                </span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                Pemeriksaan hash citra perseptual (dHash) mendeteksi foto identik atau hampir identik
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Explanation Alert */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{isExactIdentical ? 'Peringatan Integritas Bukti: Foto Identik' : 'Peringatan: Sudut Objek Hampir Identik'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
              {reason}
            </p>
          </div>

          {/* Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Left: Newly Captured Photo */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  Foto Baru (Saat Ini)
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Hash: {currentShortHash}
                </span>
              </div>

              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                <img
                  src={currentPhotoUrl}
                  alt="Foto baru"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[9px] font-mono">
                  BARU DIAMBIL
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Waktu Pengambilan:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">Hari ini (Real-time)</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Hash:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Duplikasi Visual</span>
                </div>
              </div>
            </div>

            {/* Right: Previously Uploaded Photo Match */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Foto Laporan Sebelumnya
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-semibold">
                  Tercatat di DB
                </span>
              </div>

              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-amber-200 dark:border-amber-800 bg-black">
                <img
                  src={matchedReport.documentationPhotoUrl}
                  alt={matchedReport.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-600/90 text-white text-[9px] font-mono">
                  {matchedReport.date}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <div className="truncate font-semibold text-slate-900 dark:text-white" title={matchedReport.title}>
                  "{matchedReport.title}"
                </div>
                <div className="flex justify-between">
                  <span>Tanggal Laporan:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{matchedReport.date}</span>
                </div>
              </div>
            </div>

          </div>

          {/* AI Similarity Visual Meter */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-500" />
                Tingkat Kemiripan Visual (Visual Similarity Index)
              </span>
              <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                {similarityScore}%
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 transition-all duration-500"
                style={{ width: `${similarityScore}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Citra Baru)</span>
              <span>85% (Batas Toleransi Duplikat)</span>
              <span className="text-rose-600 font-bold">100% (Identik Sempurna)</span>
            </div>
          </div>

          {/* Justification Box (Optional if staff proceeds) */}
          <div className="space-y-1.5 text-xs">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Catatan Justifikasi (Wajib diisi jika tetap ingin mengirim laporan ini):
            </label>
            <textarea
              rows={2}
              value={justificationNote}
              onChange={(e) => setJustificationNote(e.target.value)}
              placeholder="Contoh: Pekerjaan lanjutan pada perangkat fisik yang sama dengan sesi sebelumnya, atau kondisi fisik sebelum dan sesudah perbaikan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
            />
            <p className="text-[10px] text-slate-400">
              Laporan akan diberi stempel peringatan <strong>AI Duplicate Flag</strong> di layar Supervisor untuk ditinjau secara ketat.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRetakePhoto}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Camera className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
            <span>Ambil Ulang Foto Asli (Rekomendasi)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting || !justificationNote.trim()}
              onClick={handleProceed}
              className={`w-1/2 sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                justificationNote.trim()
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
              title={!justificationNote.trim() ? 'Isi catatan justifikasi terlebih dahulu' : 'Kirim dengan flag AI'}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Tetap Kirim dengan Flag AI</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
