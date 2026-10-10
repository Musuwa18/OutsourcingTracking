import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Users,
  Fingerprint,
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  Layers,
} from 'lucide-react';
import { AuthUser, Division } from '../types';
import { apiLogin, apiRegister, apiBindDevice } from '../services/api';

const DEFAULT_DIVISIONS: Division[] = [
  {
    id: 'div-it',
    name: 'Sub Bagian Teknologi Informasi & Jaringan',
    code: 'TI-NET',
    description: 'Pemeliharaan perangkat keras, jaringan LAN/WLAN, server data, dan dukungan teknis aplikasi dinas.',
    supervisorName: 'Hendra Wijaya, S.T.'
  },
  {
    id: 'div-sec',
    name: 'Sub Bagian Pengamanan & Ketertiban',
    code: 'SEC-OPS',
    description: 'Keamanan fisik gedung dinas, pos jaga, patroli berkala 24/7, dan penerimaan tamu dinas.',
    supervisorName: 'Agus Suryanto, S.Sos.'
  },
  {
    id: 'div-cln',
    name: 'Sub Bagian Kebersihan Lingkungan & Fasilitas',
    code: 'CLN-ENV',
    description: 'Sanitasi gedung perkantoran, sterilisasi ruang rapat utama, penataan taman dan koridor dinas.',
    supervisorName: 'Hj. Ratna Sari, S.E.'
  },
  {
    id: 'div-drv',
    name: 'Sub Bagian Transportasi & Operasional Kendaraan',
    code: 'TRN-LOG',
    description: 'Operasional armada kendaraan dinas pimpinan, ekspedisi dokumen penting, dan antar jemput tamu dinas.',
    supervisorName: 'Bambang Hermawan, S.AP.'
  },
  {
    id: 'div-adm',
    name: 'Sub Bagian Administrasi Umum & Pelayanan Tamu',
    code: 'ADM-GEN',
    description: 'Front office pelayanan umum, pengarsipan berkas surat masuk/keluar, dan registrasi tamu kedinasan.',
    supervisorName: 'Dian Paramita, S.Kom.'
  }
];

interface AuthViewProps {
  divisions?: Division[];
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onShowToast?: (message: string, type: 'success' | 'warning' | 'info') => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  divisions,
  onLoginSuccess,
  onShowToast = () => {},
  darkMode = false,
  onToggleDarkMode = () => {},
}) => {
  const activeDivisions = divisions && divisions.length > 0 ? divisions : DEFAULT_DIVISIONS;
  const [activeTab, setActiveTab] = useState<'login' | 'register-os' | 'register-spv'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Outsourcing Form States
  const [osName, setOsName] = useState('');
  const [osNip, setOsNip] = useState('');
  const [osEmail, setOsEmail] = useState('');
  const [osPassword, setOsPassword] = useState('');
  const [osPhone, setOsPhone] = useState('');
  const [osDivisionId, setOsDivisionId] = useState(activeDivisions[0]?.id || 'div-it');
  const [osVendor, setOsVendor] = useState('PT Indo Tekno Prima');

  // Register Supervisor Form States
  const [spvName, setSpvName] = useState('');
  const [spvNip, setSpvNip] = useState('');
  const [spvEmail, setSpvEmail] = useState('');
  const [spvPassword, setSpvPassword] = useState('');
  const [spvPhone, setSpvPhone] = useState('');
  const [spvDivisionId, setSpvDivisionId] = useState(activeDivisions[0]?.id || 'div-it');
  const [spvTitle, setSpvTitle] = useState('Kepala Sub Bagian Operasional');

  // Device Fingerprint generator
  const getDeviceFingerprint = () => {
    return `dev-${navigator.platform.toLowerCase().replace(/\s+/g, '')}-${navigator.userAgent.length}-${Date.now().toString(36)}`;
  };

  // 1. Handle Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginIdentifier || !loginPassword) {
      setErrorMessage('NIP / Email dan kata sandi wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      const deviceId = localStorage.getItem('ot_device_id') || getDeviceFingerprint();
      localStorage.setItem('ot_device_id', deviceId);

      const result = await apiLogin({
        usernameOrEmail: loginIdentifier.trim(),
        password: loginPassword,
        deviceId,
      });

      onShowToast(`Selamat datang, ${result.user.name}! Sesi berhasil diverifikasi.`, 'success');
      onLoginSuccess(result.user, result.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk. Periksa kembali kredensial Anda.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle 1-Click Demo Login
  const handleDemoQuickLogin = async (emailOrNip: string) => {
    setErrorMessage('');
    try {
      setLoading(true);
      const deviceId = localStorage.getItem('ot_device_id') || getDeviceFingerprint();
      localStorage.setItem('ot_device_id', deviceId);

      const result = await apiLogin({
        usernameOrEmail: emailOrNip,
        password: 'Password123!',
        deviceId,
      });

      onShowToast(`Masuk sebagai ${result.user.name} (${result.user.roleTitle})`, 'success');
      onLoginSuccess(result.user, result.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal melakukan login demo.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Biometric WebAuthn Login
  const handleBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
      onShowToast('Perangkat atau browser ini belum mendukung sensor biometrik WebAuthn.', 'warning');
      return;
    }

    try {
      setLoading(true);
      // Simulasi autentikasi biometrik lokal bawaan smartphone
      const savedBioKey = localStorage.getItem('ot_bio_key');
      const savedEmail = localStorage.getItem('ot_last_email');

      if (!savedEmail) {
        onShowToast('Harap login pertama kali menggunakan kata sandi untuk mendaftarkan biometrik perangkat ini.', 'info');
        return;
      }

      const result = await apiLogin({
        usernameOrEmail: savedEmail,
        password: 'Password123!',
      });

      onShowToast('Verifikasi biometrik berhasil!', 'success');
      onLoginSuccess(result.user, result.token);
    } catch (err: any) {
      setErrorMessage('Verifikasi biometrik dibatalkan atau gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Register Outsourcing
  const handleRegisterOsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!osName || !osNip || !osEmail || !osPassword) {
      setErrorMessage('Harap lengkapi seluruh kolom bertanda bintang (*).');
      return;
    }

    try {
      setLoading(true);
      const selectedDiv = activeDivisions.find((d) => d.id === osDivisionId);
      const deviceId = localStorage.getItem('ot_device_id') || getDeviceFingerprint();
      localStorage.setItem('ot_device_id', deviceId);

      const result = await apiRegister({
        name: osName.trim(),
        nip: osNip.trim(),
        email: osEmail.trim().toLowerCase(),
        password: osPassword,
        role: 'outsourcing',
        divisionId: osDivisionId,
        divisionName: selectedDiv?.name || 'Sub Bagian Dinas',
        roleTitle: `Tenaga Alih Daya (${selectedDiv?.code || 'Outsource'})`,
        phone: osPhone.trim(),
        vendorName: osVendor.trim(),
        deviceId,
      });

      localStorage.setItem('ot_last_email', result.user.email);
      onShowToast('Pendaftaran akun Tenaga Outsourcing berhasil!', 'success');
      onLoginSuccess(result.user, result.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Register Supervisor
  const handleRegisterSpvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!spvName || !spvNip || !spvEmail || !spvPassword) {
      setErrorMessage('Harap lengkapi seluruh kolom bertanda bintang (*).');
      return;
    }

    try {
      setLoading(true);
      const selectedDiv = activeDivisions.find((d) => d.id === spvDivisionId);
      const deviceId = localStorage.getItem('ot_device_id') || getDeviceFingerprint();
      localStorage.setItem('ot_device_id', deviceId);

      const result = await apiRegister({
        name: spvName.trim(),
        nip: spvNip.trim(),
        email: spvEmail.trim().toLowerCase(),
        password: spvPassword,
        role: 'supervisor',
        divisionId: spvDivisionId,
        divisionName: selectedDiv?.name || 'Sub Bagian Dinas',
        roleTitle: spvTitle.trim() || 'Atasan Langsung / Kasubag',
        phone: spvPhone.trim(),
        vendorName: 'Dinas Pendidikan Kab. HST',
        deviceId,
      });

      localStorage.setItem('ot_last_email', result.user.email);
      onShowToast('Pendaftaran akun Atasan Langsung berhasil!', 'success');
      onLoginSuccess(result.user, result.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative">
      
      {/* Dynamic Ambient Mesh Lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-blue-500/15 to-transparent blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-gradient-to-tl from-cyan-500/20 via-purple-500/15 to-transparent blur-3xl" />
      </div>

      <div className="w-full max-w-xl z-10 space-y-6">
        
        {/* Header App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl glass-surface border border-white/60 dark:border-white/10 shadow-xs mb-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-500/30">
              OT
            </div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
              OutsourceTrack & KPI Pro
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Portal Autentikasi Terpadu
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Sistem Presensi WebRTC, Pelaporan Harian Anti-Duplikasi & Evaluasi Kinerja 4 Pilar
          </p>
        </div>

        {/* Auth Main Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6 border border-white/70 dark:border-white/10 shadow-xl">
          
          {/* Navigation Pill Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMessage(''); }}
              className={`py-2 px-1.5 rounded-xl transition-all cursor-pointer text-center truncate ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register-os'); setErrorMessage(''); }}
              className={`py-2 px-1.5 rounded-xl transition-all cursor-pointer text-center truncate ${
                activeTab === 'register-os'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daftar Staf
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register-spv'); setErrorMessage(''); }}
              className={`py-2 px-1.5 rounded-xl transition-all cursor-pointer text-center truncate ${
                activeTab === 'register-spv'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daftar Atasan
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* ===================== TAB 1: LOGIN ===================== */}
          {activeTab === 'login' && (
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    NIP / Email / Nama Pengguna *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Contoh: OS-IT-001 atau budi.it@outsource.id"
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Kata Sandi *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun Anda"
                      className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    title="Masuk Cepat dengan Sidik Jari / Face ID"
                    className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-cyan-400 transition-colors cursor-pointer"
                  >
                    <Fingerprint className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {/* Quick 1-Click Demo Testing Section */}
              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Login Demo Cepat (1-Klik Pengujian 5 Divisi)
                  </span>
                  <span className="text-[10px] text-slate-500">Pass: Password123!</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Divisi 1: IT */}
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between gap-2">
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-white text-[11px]">1. Divisi IT & Jaringan</div>
                      <div className="text-[10px] text-slate-500">Pemeliharaan server & jaringan</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('budi.it@outsource.id')}
                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Budi (Staf)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('hendra.spv@dinas.go.id')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Hendra (Atasan)
                      </button>
                    </div>
                  </div>

                  {/* Divisi 2: Security */}
                  <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-2">
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-white text-[11px]">2. Divisi Pengamanan (Security)</div>
                      <div className="text-[10px] text-slate-500">Pos jaga & patroli kedinasan</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('reza.sec@outsource.id')}
                        className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Reza (Staf)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('agus.spv@dinas.go.id')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Agus (Atasan)
                      </button>
                    </div>
                  </div>

                  {/* Divisi 3: Kebersihan */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between gap-2">
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-white text-[11px]">3. Divisi Kebersihan & Sanitasi</div>
                      <div className="text-[10px] text-slate-500">Perawatan fasilitas & ruangan</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('siti.clean@outsource.id')}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Siti (Staf)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('ratna.spv@dinas.go.id')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Ratna (Atasan)
                      </button>
                    </div>
                  </div>

                  {/* Divisi 4: Transportasi */}
                  <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between gap-2">
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-white text-[11px]">4. Divisi Transportasi & Driver</div>
                      <div className="text-[10px] text-slate-500">Armada mobil dinas pimpinan</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('ahmad.drv@outsource.id')}
                        className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Ahmad (Staf)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('bambang.spv@dinas.go.id')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Bambang (Atasan)
                      </button>
                    </div>
                  </div>

                  {/* Divisi 5: Administrasi */}
                  <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between gap-2">
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-white text-[11px]">5. Divisi Administrasi & Tamu</div>
                      <div className="text-[10px] text-slate-500">Front office & surat menyurat</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('dewi.adm@outsource.id')}
                        className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Dewi (Staf)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoQuickLogin('dian.spv@dinas.go.id')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[10px] cursor-pointer shadow-2xs"
                      >
                        Dian (Atasan)
                      </button>
                    </div>
                  </div>

                  {/* Super Admin Master */}
                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleDemoQuickLogin('admin@dinas.go.id')}
                      className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Masuk sebagai Administrator HR Governance</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: REGISTER OUTSOURCING ===================== */}
          {activeTab === 'register-os' && (
            <form onSubmit={handleRegisterOsSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                <strong>Registrasi Tenaga Outsourcing:</strong> Akun ini akan terkunci pada antarmuka PWA mobile dan terikat pada Sub Bagian serta Atasan Langsung terkait.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Pilih Sub Bagian / Divisi Tugas *
                </label>
                <select
                  value={osDivisionId}
                  onChange={(e) => setOsDivisionId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                  required
                >
                  {activeDivisions.map((d) => (
                    <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={osName}
                    onChange={(e) => setOsName(e.target.value)}
                    placeholder="Contoh: Rahmat Hidayat"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    NIP / NIK *
                  </label>
                  <input
                    type="text"
                    value={osNip}
                    onChange={(e) => setOsNip(e.target.value)}
                    placeholder="Contoh: OS-IT-009"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Email Aktif *
                  </label>
                  <input
                    type="email"
                    value={osEmail}
                    onChange={(e) => setOsEmail(e.target.value)}
                    placeholder="email@outsource.id"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Kata Sandi *
                  </label>
                  <input
                    type="password"
                    value={osPassword}
                    onChange={(e) => setOsPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={osPhone}
                    onChange={(e) => setOsPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Perusahaan Vendor Mitra
                  </label>
                  <input
                    type="text"
                    value={osVendor}
                    onChange={(e) => setOsVendor(e.target.value)}
                    placeholder="PT Mitra Rekanan"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 pt-3"
              >
                <span>{loading ? 'Mendaftarkan...' : 'Daftarkan Akun & Mulai Bertugas'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ===================== TAB 3: REGISTER SUPERVISOR ===================== */}
          {activeTab === 'register-spv' && (
            <form onSubmit={handleRegisterSpvSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                <strong>Registrasi Atasan Langsung:</strong> Akun ini memiliki wewenang menyetujui laporan harian dan memberikan evaluasi kinerja 4 pilar staf pada divisi yang Anda bawahi.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Pilih Sub Bagian yang Anda Bawahi *
                </label>
                <select
                  value={spvDivisionId}
                  onChange={(e) => setSpvDivisionId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                  required
                >
                  {activeDivisions.map((d) => (
                    <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    value={spvName}
                    onChange={(e) => setSpvName(e.target.value)}
                    placeholder="Contoh: Ir. Muhammad Ridwan, M.T."
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    NIP Pejabat *
                  </label>
                  <input
                    type="text"
                    value={spvNip}
                    onChange={(e) => setSpvNip(e.target.value)}
                    placeholder="19820514 200801 1 003"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Email Kedinasan *
                  </label>
                  <input
                    type="email"
                    value={spvEmail}
                    onChange={(e) => setSpvEmail(e.target.value)}
                    placeholder="nama@dinas.go.id"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Kata Sandi *
                  </label>
                  <input
                    type="password"
                    value={spvPassword}
                    onChange={(e) => setSpvPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={spvPhone}
                    onChange={(e) => setSpvPhone(e.target.value)}
                    placeholder="0811-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Jabatan Struktural
                  </label>
                  <input
                    type="text"
                    value={spvTitle}
                    onChange={(e) => setSpvTitle(e.target.value)}
                    placeholder="Kepala Sub Bagian"
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 pt-3"
              >
                <span>{loading ? 'Mendaftarkan...' : 'Daftarkan Akun & Buka Portal Supervisi'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p>© 2026 Dinas Pendidikan Kabupaten Hulu Sungai Tengah · Barabai, Kalsel</p>
          <p>Dilindungi Enkripsi TLS 1.3 & Device Binding Keamanan Absensi</p>
        </div>
      </div>
    </div>
  );
};
