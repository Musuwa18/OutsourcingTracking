import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, Smartphone, CheckCircle2, Lock } from 'lucide-react';

interface SecurityMfaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityMfaModal: React.FC<SecurityMfaModalProps> = ({ isOpen, onClose }) => {
  const [mfaCode, setMfaCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(true);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length === 6) {
      setVerified(true);
      setTimeout(() => {
        setVerified(false);
        setMfaCode('');
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-surface rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Autentikasi Google & MFA Pro
              </h2>
              <p className="text-[11px] text-slate-500">
                Keamanan berlapis akun terintegrasi
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
          {/* Google Auth Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Google Workspace SSO:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Email Akun:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                musuwa18@gmail.com
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Sesi:</span>
              <span className="font-mono text-emerald-600">Active (OAuth 2.0 PKCE)</span>
            </div>
          </div>

          {/* MFA Authenticator Simulation */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  Autentikasi Multifaktor (2FA)
                </div>
                <div className="text-[11px] text-slate-500">
                  Wajib memasukkan 6-digit TOTP saat akses administratif
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  mfaEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    mfaEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {mfaEnabled && (
              <form onSubmit={handleVerify} className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <label className="block text-[11px] font-medium text-indigo-950 dark:text-indigo-200">
                  Uji Verifikasi Kode Google Authenticator:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Contoh: 849201"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    Verifikasi
                  </button>
                </div>
                {verified && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Kode TOTP Valid! Sesi admin diperbarui.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
