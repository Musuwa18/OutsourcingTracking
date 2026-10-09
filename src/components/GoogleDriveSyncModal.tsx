import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, RefreshCw, HardDrive, ShieldCheck, ExternalLink } from 'lucide-react';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<string>('');
  const [lastSyncDate, setLastSyncDate] = useState<string>('08 Okt 2026, 17:05 WIB');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncSuccess, setSyncSuccess] = useState(false);

  if (!isOpen) return null;

  const handleStartSync = () => {
    setSyncing(true);
    setSyncSuccess(false);

    setSyncStep('Mengemas arsip database rekapitulasi presensi...');
    setTimeout(() => {
      setSyncStep('Mengenkripsi log audit dan data evaluasi 4 pilar...');
      setTimeout(() => {
        setSyncStep('Mengunggah ke folder: Google Drive / OutsourceTrack-Backups / 2026...');
        setTimeout(() => {
          setSyncing(false);
          setSyncSuccess(true);
          const nowStr = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' WIB';
          setLastSyncDate(nowStr);
          onSyncComplete?.();
        }, 1000);
      }, 1000);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-surface rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Sinkronisasi Cloud Google Drive
              </h2>
              <p className="text-xs text-slate-500">
                Penyimpanan cadangan terenkripsi dan arsip audit eksternal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Account info card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Akun Cloud Terhubung:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                admin.operations@corporate.id
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Folder Sinkronisasi:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                My Drive/OutsourceTrack-Archive/
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Terakhir Berhasil Sinkron:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {lastSyncDate}
              </span>
            </div>
          </div>

          {/* Sync status / progress */}
          {syncing && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="space-y-0.5">
                <div className="font-semibold">Sinkronisasi Sedang Berjalan...</div>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                  {syncStep}
                </div>
              </div>
            </div>
          )}

          {syncSuccess && !syncing && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Seluruh log presensi, laporan harian, dan evaluasi berhasil disinkronkan ke Google Drive.</span>
            </div>
          )}

          {/* Setting toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Otomatis Sinkron Setiap Jam 18:00
              </div>
              <div className="text-[11px] text-slate-500">
                Menyimpan snapshot otomatis saat pergantian hari kerja
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                autoSyncEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Enkripsi AES-256 Cloud Backup</span>
          </div>
          <button
            onClick={handleStartSync}
            disabled={syncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sinkronisasi...' : 'Sinkronisasi Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
