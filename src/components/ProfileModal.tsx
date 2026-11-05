import React, { useState } from 'react';
import { X, User, Lock, Phone, Building2, Briefcase, ShieldCheck, KeyRound, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';
import { apiChangePassword, apiUpdateUserProfile } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onUserUpdated: (updatedUser: AuthUser) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Info form state
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  if (!isOpen) return null;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    try {
      const updated = await apiUpdateUserProfile(currentUser.id, { phone: phone.trim() });
      onUserUpdated({ ...currentUser, phone: phone.trim() });
      onShowToast('Nomor kontak WhatsApp berhasil diperbarui.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memperbarui informasi profil.', 'warning');
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!oldPassword) {
      setPassError('Kata sandi saat ini wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsChangingPass(true);
    try {
      await apiChangePassword(currentUser.id, oldPassword, newPassword);
      onShowToast('Kata sandi berhasil diubah! Gunakan kata sandi baru untuk login berikutnya.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('info');
      onClose();
    } catch (err: any) {
      setPassError(err.message || 'Gagal mengganti kata sandi. Pastikan kata sandi lama benar.');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg shrink-0 border-2 border-white/20"
              style={{ backgroundColor: currentUser.avatarColor || '#4f46e5' }}
            >
              {currentUser.initials || 'OT'}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-extrabold text-base sm:text-lg leading-tight truncate">
                {currentUser.name}
              </h3>
              <p className="text-xs text-indigo-200 font-mono mt-0.5">
                NIP/ID: {currentUser.nip}
              </p>
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{currentUser.roleTitle || currentUser.role}</span>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 mt-5 p-1 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-white text-indigo-950 font-bold shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Informasi Akun
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white text-indigo-950 font-bold shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Ubah Kata Sandi
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-slate-800 dark:text-slate-100 text-xs">
          {activeTab === 'info' ? (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Email Kedinasan
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.email}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Bidang / Sub Bagian Penugasan
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.divisionName || '-'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Perusahaan Penyedia Jasa (Vendor)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.vendorName || 'Dinas Pendidikan Kab. HST'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {currentUser.workspaceNote && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Catatan Ruang Kerja / Penugasan Khusus
                  </label>
                  <p className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300">
                    {currentUser.workspaceNote}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingInfo}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingInfo ? 'Menyimpan...' : 'Simpan Perubahan Kontak'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {passError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{passError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Saat Ini *
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama Anda"
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru * (Minimal 6 karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru"
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ulangi Kata Sandi Baru *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isChangingPass ? 'Memproses...' : 'Ubah Kata Sandi'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
