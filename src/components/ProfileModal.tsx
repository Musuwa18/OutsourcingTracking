import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  Clock,
  Fingerprint,
  Smartphone,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { AuthUser, Division, Vendor, OfficeLocation, OUTSOURCING_JOB_ROLES } from '../types';
import {
  apiChangePassword,
  apiUpdateUserProfile,
  apiGetSupervisors,
  apiUpdateUserSupervisor,
  apiBiometricRegisterOptions,
  apiBiometricRegisterVerify,
  apiGetBiometricStatus,
  apiDeleteBiometricCredential,
  BiometricStatusInfo,
  apiFetchDivisions,
  apiFetchOffices,
  apiFetchVendors,
  apiSubmitProfileChangeRequest,
} from '../services/api';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
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
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'biometric'>('info');

  // Info form state
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [selectedDivisionId, setSelectedDivisionId] = useState(currentUser.divisionId || '');
  const [selectedJobRole, setSelectedJobRole] = useState(currentUser.roleTitle || '');
  const [selectedLocationId, setSelectedLocationId] = useState(
    currentUser.assignedLocation?.id || currentUser.customLocation?.id || 'loc-disdik-hst'
  );
  const [selectedVendor, setSelectedVendor] = useState(currentUser.vendorName || '');

  // Supervisor workflow state
  const [supervisors, setSupervisors] = useState<AuthUser[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(currentUser.supervisorId || '');
  const [isChangingSupervisor, setIsChangingSupervisor] = useState(false);
  const [isSubmittingSupervisor, setIsSubmittingSupervisor] = useState(false);

  // Biometric state
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatusInfo | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [isDeletingBio, setIsDeletingBio] = useState<string | null>(null);
  const [bioDeviceName, setBioDeviceName] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      apiGetSupervisors().then((data) => {
        if (isMounted) setSupervisors(data);
      });
      apiFetchDivisions().then((data) => {
        if (isMounted) setDivisions(data);
      }).catch(() => {});
      apiFetchOffices().then((data) => {
        if (isMounted) setLocations(data);
      }).catch(() => {});
      apiFetchVendors().then((data) => {
        if (isMounted) setVendors(data);
      }).catch(() => {});
      apiGetBiometricStatus(currentUser.id).then((data) => {
        if (isMounted) setBiometricStatus(data);
      }).catch(() => {});

      setSelectedSupervisorId(currentUser.supervisorId || '');
      setSelectedDivisionId(currentUser.divisionId || '');
      setSelectedJobRole(currentUser.roleTitle || '');
      setSelectedLocationId(currentUser.assignedLocation?.id || currentUser.customLocation?.id || 'loc-disdik-hst');
      setSelectedVendor(currentUser.vendorName || '');
      setPhone(currentUser.phone || '');
      setIsChangingSupervisor(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser]);

  const changeCount = currentUser.supervisorChangeCount ?? 0;
  const isPending = currentUser.supervisorRequestStatus === 'PENDING';
  const currentSupervisor = supervisors.find((s) => s.id === currentUser.supervisorId);
  const pendingSupervisor = supervisors.find((s) => s.id === currentUser.pendingSupervisorId);
  const selectedSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);

  const activeDivisionId = selectedDivisionId || currentUser.divisionId || '';
  const activeDivision = divisions.find((d) => d.id === activeDivisionId);
  const activeDivisionName = activeDivision ? activeDivision.name : (currentUser.divisionName || 'Bidang Terpilih');

  const isMatchingDivision = (spv: AuthUser) => {
    if (!activeDivisionId) return false;
    if (spv.divisionId === activeDivisionId) return true;
    if (activeDivision && spv.divisionName && spv.divisionName.toLowerCase().trim() === activeDivision.name.toLowerCase().trim()) return true;
    return false;
  };

  const matchingSupervisors = supervisors.filter(isMatchingDivision);
  const otherSupervisors = supervisors.filter((s) => !isMatchingDivision(s));

  const handleDivisionChange = (newDivisionId: string) => {
    setSelectedDivisionId(newDivisionId);
    // Cek korelasi otomatis ke atasan yang sesuai dengan bidang yang baru dipilih
    const matching = supervisors.filter((s) => {
      if (s.divisionId === newDivisionId) return true;
      const divObj = divisions.find((d) => d.id === newDivisionId);
      return Boolean(divObj && s.divisionName && s.divisionName.toLowerCase().trim() === divObj.name.toLowerCase().trim());
    });
    if (matching.length > 0) {
      setSelectedSupervisorId(matching[0].id);
    }
  };

  const handleSupervisorSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSupervisorId) {
      onShowToast('Silakan pilih atasan langsung terlebih dahulu.', 'warning');
      return;
    }
    if (selectedSupervisorId === currentUser.supervisorId) {
      onShowToast('Atasan yang dipilih sama dengan atasan aktif saat ini.', 'info');
      setIsChangingSupervisor(false);
      return;
    }
    setIsSubmittingSupervisor(true);
    try {
      const res = await apiUpdateUserSupervisor(currentUser.id, selectedSupervisorId);
      onUserUpdated(res.user);
      localStorage.setItem('ot_session_user', JSON.stringify(res.user));
      onShowToast(res.message, 'info');
      setIsChangingSupervisor(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengajukan atasan langsung.';
      onShowToast(message, 'warning');
    } finally {
      setIsSubmittingSupervisor(false);
    }
  };
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState('');

  const handleRegisterBiometric = async () => {
    if (!browserSupportsWebAuthn()) {
      onShowToast('Browser atau perangkat ini tidak mendukung sensor biometrik WebAuthn.', 'warning');
      return;
    }

    setIsRegisteringBio(true);
    try {
      const options = await apiBiometricRegisterOptions(currentUser.id);
      onShowToast('Sentuh sensor sidik jari atau verifikasi biometrik pada HP Anda...', 'info');

      const regResp = await startRegistration({ optionsJSON: options });
      const defaultName = bioDeviceName.trim() || (/Android/i.test(navigator.userAgent) ? 'Smartphone Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'Apple iOS' : 'Perangkat Terdaftar');

      const verifyRes = await apiBiometricRegisterVerify(currentUser.id, regResp, defaultName);
      onShowToast(verifyRes.message || 'Sidik Jari / Face ID berhasil didaftarkan!', 'success');
      setBioDeviceName('');

      const updatedStatus = await apiGetBiometricStatus(currentUser.id);
      setBiometricStatus(updatedStatus);

      const updatedUser = { ...currentUser, biometricKey: 'ENROLLED' };
      onUserUpdated(updatedUser);
      localStorage.setItem('ot_session_user', JSON.stringify(updatedUser));
      localStorage.setItem('ot_last_identifier', currentUser.email || currentUser.nip);
    } catch (err: any) {
      console.warn('[WebAuthn] Registration error:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('cancel') || err.message?.includes('abort')) {
        onShowToast('Pendaftaran biometrik dibatalkan.', 'info');
      } else {
        onShowToast(err.message || 'Gagal mendaftarkan biometrik.', 'warning');
      }
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const handleDeleteBiometric = async (credentialId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kunci biometrik perangkat ini?')) return;
    setIsDeletingBio(credentialId);
    try {
      await apiDeleteBiometricCredential(credentialId, currentUser.id);
      onShowToast('Kunci biometrik berhasil dihapus.', 'success');
      const updatedStatus = await apiGetBiometricStatus(currentUser.id);
      setBiometricStatus(updatedStatus);
      if (!updatedStatus.enrolled) {
        const updatedUser = { ...currentUser, biometricKey: null };
        onUserUpdated(updatedUser);
        localStorage.setItem('ot_session_user', JSON.stringify(updatedUser));
      }
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menghapus kunci biometrik.', 'warning');
    } finally {
      setIsDeletingBio(null);
    }
  };

  if (!isOpen) return null;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    try {
      let updatedUser = { ...currentUser };
      let didUpdate = false;

      // 1. Submit Profile Change Request (Division / Assignment / Phone)
      const currentLocId = currentUser.assignedLocation?.id || currentUser.customLocation?.id || 'loc-disdik-hst';
      const phoneChanged = phone.trim() !== (currentUser.phone || '');
      const divChanged = Boolean(selectedDivisionId && selectedDivisionId !== currentUser.divisionId);
      const roleChanged = Boolean(selectedJobRole && selectedJobRole !== currentUser.roleTitle);
      const locChanged = Boolean(selectedLocationId && selectedLocationId !== currentLocId);
      const vendorChanged = Boolean(selectedVendor && selectedVendor !== currentUser.vendorName);

      if (phoneChanged || divChanged || roleChanged || locChanged || vendorChanged) {
        const res = await apiSubmitProfileChangeRequest({
          userId: currentUser.id,
          phone: phone.trim(),
          divisionId: selectedDivisionId,
          jobRole: selectedJobRole,
          locationId: selectedLocationId,
          vendor: selectedVendor,
        });
        updatedUser = { ...updatedUser, ...res.user };
        onShowToast(res.message, res.divisionRequested || res.adminRequested ? 'info' : 'success');
        didUpdate = true;
      }

      // 2. Simpan pengajuan atasan langsung (memerlukan persetujuan atasan bersangkutan atau Superadmin)
      if (
        selectedSupervisorId &&
        selectedSupervisorId !== currentUser.supervisorId &&
        selectedSupervisorId !== currentUser.pendingSupervisorId
      ) {
        const res = await apiUpdateUserSupervisor(currentUser.id, selectedSupervisorId);
        updatedUser = { ...updatedUser, ...res.user };
        onShowToast(res.message, 'info');
        didUpdate = true;
      }

      if (!didUpdate) {
        onShowToast('Tidak ada perubahan data.', 'info');
      } else {
        onUserUpdated(updatedUser);
        localStorage.setItem('ot_session_user', JSON.stringify(updatedUser));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memperbarui informasi profil.';
      onShowToast(message, 'warning');
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
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
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
          <div className="flex gap-1.5 mt-5 p-1 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'info'
                  ? 'bg-white text-indigo-950 font-bold shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Info Akun
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'password'
                  ? 'bg-white text-indigo-950 font-bold shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Kata Sandi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('biometric')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'biometric'
                  ? 'bg-white text-indigo-950 font-bold shadow-xs'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5 shrink-0" />
              <span>Sidik Jari HP</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-slate-800 dark:text-slate-100 text-xs overflow-y-auto flex-1">
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
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* 1. Bidang / Sub Bagian Penugasan */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bidang / Sub Bagian Penugasan
                  </label>
                  <select
                    value={selectedDivisionId}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Pilih Sub Bagian / Divisi --</option>
                    {divisions.map((div) => (
                      <option key={div.id} value={div.id}>
                        {div.name}
                      </option>
                    ))}
                    {!divisions.some((d) => d.id === currentUser.divisionId) && currentUser.divisionId && (
                      <option value={currentUser.divisionId}>
                        {currentUser.divisionName || currentUser.divisionId}
                      </option>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                    * S & K: Perubahan memerlukan persetujuan Atasan Langsung / Supervisor Divisi.
                  </p>
                  {currentUser.divisionRequestStatus === 'PENDING' && (
                    <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>Pengajuan pindah divisi sedang menunggu persetujuan atasan</span>
                    </div>
                  )}
                </div>

                {/* 2. Formasi / Jenis Pekerjaan Baku */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Formasi / Jenis Pekerjaan Baku
                  </label>
                  <select
                    value={selectedJobRole}
                    onChange={(e) => setSelectedJobRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Pilih Jenis Pekerjaan / Formasi --</option>
                    {OUTSOURCING_JOB_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                    {!OUTSOURCING_JOB_ROLES.includes(currentUser.roleTitle as any) && currentUser.roleTitle && (
                      <option value={currentUser.roleTitle}>{currentUser.roleTitle}</option>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                    * S & K: Perubahan memerlukan persetujuan Superadmin.
                  </p>
                  {currentUser.adminRequestStatus === 'PENDING' && currentUser.pendingJobRole && (
                    <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>Pengajuan formasi ({currentUser.pendingJobRole}) sedang menunggu verifikasi Superadmin</span>
                    </div>
                  )}
                </div>

                {/* 3. Lokasi Tempat Bekerja / Titik Tugas */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi Tempat Bekerja / Titik Tugas
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Pilih Lokasi Tempat Bekerja --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                    {currentUser.assignedLocation && !locations.some((l) => l.id === currentUser.assignedLocation?.id) && (
                      <option value={currentUser.assignedLocation.id}>
                        {currentUser.assignedLocation.name}
                      </option>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                    * S & K: Perubahan memerlukan persetujuan Superadmin.
                  </p>
                  {currentUser.adminRequestStatus === 'PENDING' && currentUser.pendingLocationId && (
                    <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>Pengajuan lokasi tugas sedang menunggu verifikasi Superadmin</span>
                    </div>
                  )}
                </div>

                {/* 4. Perusahaan Penyedia Jasa (Vendor) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Perusahaan Penyedia Jasa (Vendor)
                  </label>
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Pilih Mitra Vendor / Kelompok --</option>
                    {vendors.map((v) => (
                      <option key={v.id || v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                    {!vendors.some((v) => v.name === currentUser.vendorName) && currentUser.vendorName && (
                      <option value={currentUser.vendorName}>{currentUser.vendorName}</option>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                    * S & K: Perubahan memerlukan persetujuan Superadmin.
                  </p>
                  {currentUser.adminRequestStatus === 'PENDING' && currentUser.pendingVendor && (
                    <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>Pengajuan vendor ({currentUser.pendingVendor}) sedang menunggu verifikasi Superadmin</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Atasan Langsung (Penilai KPI) Section */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Atasan Langsung (Penilai KPI)
                  </label>
                  {currentSupervisor && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Aktif: {currentSupervisor.name}
                    </span>
                  )}
                </div>

                {/* Status PENDING Alert */}
                {isPending && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Pengajuan Atasan Sedang Menunggu Persetujuan</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Pengajuan pergantian/pemilihan atasan ke{' '}
                      <strong>{pendingSupervisor?.name || 'Pejabat Penilai'}</strong>{' '}
                      ({pendingSupervisor?.roleTitle || pendingSupervisor?.divisionName || 'Atasan Baru'}) sedang menunggu persetujuan atasan yang bersangkutan atau Superadmin.
                    </p>
                    {currentSupervisor && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-amber-500/20">
                        Atasan aktif saat ini: <strong>{currentSupervisor.name}</strong> ({currentSupervisor.roleTitle})
                      </p>
                    )}
                  </div>
                )}

                {/* Dropdown Pemilihan Atasan dengan Korelasi Bidang / Sub Bagian */}
                <div className="space-y-1.5 w-full min-w-0">
                  <div className="w-full min-w-0">
                    <select
                      value={selectedSupervisorId}
                      onChange={(e) => setSelectedSupervisorId(e.target.value)}
                      className="w-full min-w-0 max-w-full px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white truncate cursor-pointer text-xs shadow-xs"
                    >
                      <option value="">-- Pilih Atasan Langsung (Penilai KPI) --</option>
                      {matchingSupervisors.length > 0 && (
                        <optgroup label={`⭐ Sesuai Bidang / Sub Bagian: ${activeDivisionName}`}>
                          {matchingSupervisors.map((spv) => (
                            <option key={spv.id} value={spv.id}>
                              {spv.name} · {spv.roleTitle}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherSupervisors.length > 0 && (
                        <optgroup label="Atasan Bidang / Sub Bagian Lainnya (Lintas Divisi)">
                          {otherSupervisors.map((spv) => (
                            <option key={spv.id} value={spv.id}>
                              {spv.name} · {spv.roleTitle} ({spv.divisionName || 'Pimpinan'})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {/* Indikator Korelasi Bidang */}
                  {selectedSupervisor && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium pt-0.5">
                      {isMatchingDivision(selectedSupervisor) ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          <span>Terkorelasi: Sesuai dengan {activeDivisionName}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                          <span>Lintas Divisi: Calon atasan berasal dari {selectedSupervisor.divisionName || 'Bidang Lain'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Catatan S & K */}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    * S & K: Perubahan / pemilihan atasan memerlukan persetujuan atasan yang bersangkutan atau Superadmin.
                  </p>
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
                  <span>{isSavingInfo ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
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

          {activeTab === 'biometric' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                    Autentikasi Cepat Biometrik (WebAuthn / Passkey)
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Daftarkan sensor sidik jari atau Face ID di smartphone Anda untuk masuk ke aplikasi OutsourceTrack secara instan tanpa perlu mengetik kata sandi lagi.
                  </p>
                </div>
              </div>

              {/* Status Sensor di Perangkat Saat Ini */}
              {!window.PublicKeyCredential ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <p className="text-[11px]">Browser atau perangkat yang Anda gunakan saat ini belum mendukung sensor biometrik WebAuthn.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Form Pendaftaran Perangkat Baru */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Daftarkan Sensor Biometrik Perangkat Ini
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={bioDeviceName}
                        onChange={(e) => setBioDeviceName(e.target.value)}
                        placeholder="Nama Perangkat (contoh: HP Samsung A54 / iPhone 13)"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleRegisterBiometric}
                        disabled={isRegisteringBio}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap active:scale-95"
                      >
                        <Fingerprint className="w-4 h-4" />
                        <span>{isRegisteringBio ? 'Menghubungkan...' : 'Aktifkan Sidik Jari HP Ini'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      *Saat tombol ditekan, HP Anda akan memunculkan dialog sensor sidik jari / Face ID native sistem operasi.
                    </p>
                  </div>

                  {/* Daftar Kunci Biometrik Terdaftar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                        Perangkat Biometrik Terdaftar ({biometricStatus?.count || 0})
                      </span>
                      {biometricStatus?.enrolled && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Biometrik Aktif
                        </span>
                      )}
                    </div>

                    {(!biometricStatus || biometricStatus.credentials.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 text-[11px]">
                        Belum ada sensor sidik jari atau Face ID yang didaftarkan pada akun ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {biometricStatus.credentials.map((cred) => (
                          <div
                            key={cred.credentialId}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Fingerprint className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {cred.deviceName || 'Smartphone Biometrik'}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Terdaftar: {new Date(cred.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {cred.lastUsedAt && ` · Terakhir aktif: ${new Date(cred.lastUsedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteBiometric(cred.credentialId)}
                              disabled={isDeletingBio === cred.credentialId}
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                              title="Hapus Kunci Biometrik"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
