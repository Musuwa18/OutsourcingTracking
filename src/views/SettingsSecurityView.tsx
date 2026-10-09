import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Users,
  CheckCircle2,
  KeyRound,
  Eye,
  Cloud,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '../types';

interface SettingsSecurityViewProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  onOpenCloudSync: () => void;
}

export const SettingsSecurityView: React.FC<SettingsSecurityViewProps> = ({
  currentRole,
  onRoleChange,
  highContrast,
  onToggleHighContrast,
  onOpenCloudSync,
}) => {
  const [googleConnected, setGoogleConnected] = useState(true);
  const [googleEmail, setGoogleEmail] = useState('musuwa18@gmail.com');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [mfaMethod, setMfaMethod] = useState<'app' | 'sms'>('app');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSecurity = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Keamanan Akun, Autentikasi Google & Manajemen Peran
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pengaturan autentikasi multifaktor (MFA), hak akses sistem, dan kepatuhan data alih daya
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Google Authentication Section */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                Integrasi Autentikasi Google (Single Sign-On)
              </h2>
              <p className="text-[11px] text-slate-500">
                Akses terpadu menggunakan akun Google Workspace korporat
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Akun:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Email Google:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {googleEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Metode Login:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Google OAuth 2.0 PKCE
              </span>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setGoogleConnected(!googleConnected)}
              className="w-full py-2 px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              {googleConnected ? 'Sinkron Ulang Profil Google' : 'Hubungkan Akun Google'}
            </button>
          </div>
        </div>

        {/* Multi-Factor Authentication (MFA) Section */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                Autentikasi Multifaktor (MFA / 2FA)
              </h2>
              <p className="text-[11px] text-slate-500">
                Perlindungan ganda untuk pencegahan pembobolan akun admin
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                Wajibkan Verifikasi Kode 2FA
              </div>
              <div className="text-[11px] text-slate-500">
                Google Authenticator / TOTP Security Key
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
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>MFA Aktif: Setiap login di luar jaringan kantor wajib konfirmasi kode keamanan 6 digit.</span>
            </div>
          )}
        </div>

        {/* Role & Access Permissions Matrix */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Matriks Hak Akses Peran Pengguna (RBAC)</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Konfigurasi izin operasional untuk masing-masing tingkatan akun
              </p>
            </div>

            <div className="text-xs text-slate-500">
              Peran Aktif: <strong className="text-indigo-600 capitalize">{currentRole}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Fitur / Modul</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Tenaga Outsourcing</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Supervisor</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Admin Utama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2.5 px-3 font-medium">Presensi Selfie WebRTC & Geofence</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Akses Penuh</td>
                  <td className="py-2.5 px-3 text-center text-slate-400">Monitoring</td>
                  <td className="py-2.5 px-3 text-center text-slate-400">Monitoring & Audit</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Kirim Laporan Kerja Harian (Watermark GPS)</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Akses Penuh</td>
                  <td className="py-2.5 px-3 text-center text-indigo-600 font-semibold">✓ Review & Approval</td>
                  <td className="py-2.5 px-3 text-center text-slate-400">Arsip</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Evaluasi Kinerja 4 Pilar (11 Kompetensi)</td>
                  <td className="py-2.5 px-3 text-center text-slate-400">Lihat Hasil Sendiri</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Beri Nilai Mingguan</td>
                  <td className="py-2.5 px-3 text-center text-indigo-600 font-semibold">✓ Rekapitulasi Final</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Ekspor Laporan (Excel CSV / PDF) & Google Drive Sync</td>
                  <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Unduh Rekap</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Kelola Seluruh Data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Accessibility & Cloud Integration Quick Links */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                Aksesibilitas & Pengalaman Visual
              </div>
              <div className="text-[11px] text-slate-500">
                Mode Kontras Tinggi WCAG AA aktif untuk kemudahan membaca bagi pengguna berkebutuhan khusus.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleHighContrast}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                highContrast
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {highContrast ? 'Nonaktifkan High Contrast' : 'Aktifkan High Contrast'}
            </button>

            <button
              type="button"
              onClick={onOpenCloudSync}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Buka Google Drive</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
