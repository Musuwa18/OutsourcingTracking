import React, { useState } from 'react';
import {
  MapPin,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Smartphone,
  RotateCcw,
  KeyRound,
  Check,
  X,
  AlertCircle,
  Save,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Sliders,
  Globe,
  Radio,
  UserPlus,
  RefreshCw,
  LogOut,
  Fingerprint,
} from 'lucide-react';
import {
  OfficeLocation,
  UserAccount,
  ActiveSession,
  GeofenceGlobalConfig,
  RolePermissions,
  SupervisorMapping,
  EnterpriseSecurityConfig,
  StaffProfile,
} from '../types';
import { VisualMapPicker } from '../components/VisualMapPicker';

interface SystemSettingsViewProps {
  locations: OfficeLocation[];
  onUpdateLocations: (locs: OfficeLocation[]) => void;
  staffList: StaffProfile[];
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
  sessions: ActiveSession[];
  onUpdateSessions: (sessions: ActiveSession[]) => void;
  geofenceConfig: GeofenceGlobalConfig;
  onUpdateGeofenceConfig: (cfg: GeofenceGlobalConfig) => void;
  rolePermissions: Record<string, RolePermissions>;
  onUpdateRolePermissions: (perms: Record<string, RolePermissions>) => void;
  supervisorMappings: SupervisorMapping[];
  onUpdateSupervisorMappings: (mappings: SupervisorMapping[]) => void;
  securityConfig: EnterpriseSecurityConfig;
  onUpdateSecurityConfig: (cfg: EnterpriseSecurityConfig) => void;
  onResetDemoData?: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  locations,
  onUpdateLocations,
  staffList,
  users,
  onUpdateUsers,
  sessions,
  onUpdateSessions,
  geofenceConfig,
  onUpdateGeofenceConfig,
  rolePermissions,
  onUpdateRolePermissions,
  supervisorMappings,
  onUpdateSupervisorMappings,
  securityConfig,
  onUpdateSecurityConfig,
  onResetDemoData,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'geofence' | 'users' | 'rbac'>('geofence');

  // ================= TAB 1: GEOFENCE STATE =================
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [locModalOpen, setLocModalOpen] = useState(false);

  // Form fields for location modal
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locLat, setLocLat] = useState(-6.22384);
  const [locLng, setLocLng] = useState(106.80892);
  const [locRadius, setLocRadius] = useState(80);

  // Global Geofence Config Local State
  const [assignmentPolicy, setAssignmentPolicy] = useState(geofenceConfig.assignmentPolicy);
  const [gpsThreshold, setGpsThreshold] = useState(geofenceConfig.gpsAccuracyThreshold);
  const [strictOpenSky, setStrictOpenSky] = useState(geofenceConfig.strictOpenSkyWarning);

  // ================= TAB 2: USER MANAGEMENT STATE =================
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);

  // Form fields for new user
  const [newUserName, setNewUserName] = useState('');
  const [newUserNip, setNewUserNip] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'outsourcing' | 'coordinator' | 'supervisor' | 'admin'>('outsourcing');
  const [newUserRoleTitle, setNewUserRoleTitle] = useState('');

  // ================= TAB 3: RBAC LOCAL STATE =================
  const [localPermissions, setLocalPermissions] = useState<Record<string, RolePermissions>>(rolePermissions);

  // ================= ACTION HANDLERS: TAB 1 (GEOFENCE) =================
  const handleOpenAddLocation = () => {
    setIsNewLocation(true);
    setEditingLocation(null);
    setLocName('');
    setLocAddress('');
    setLocLat(-6.22384);
    setLocLng(106.80892);
    setLocRadius(80);
    setLocModalOpen(true);
  };

  const handleOpenEditLocation = (loc: OfficeLocation) => {
    setIsNewLocation(false);
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocAddress(loc.address);
    setLocLat(loc.latitude);
    setLocLng(loc.longitude);
    setLocRadius(loc.radiusMeters);
    setLocModalOpen(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) {
      onShowToast('Nama lokasi wajib diisi', 'warning');
      return;
    }

    if (isNewLocation) {
      const newLoc: OfficeLocation = {
        id: `loc-${Date.now()}`,
        name: locName.trim(),
        address: locAddress.trim() || 'Alamat Penugasan Lapangan',
        latitude: locLat,
        longitude: locLng,
        radiusMeters: locRadius,
      };
      onUpdateLocations([...locations, newLoc]);
      onShowToast(`Lokasi "${newLoc.name}" berhasil ditambahkan ke master lokasi.`, 'success');
    } else if (editingLocation) {
      const updated = locations.map((l) =>
        l.id === editingLocation.id
          ? {
              ...l,
              name: locName.trim(),
              address: locAddress.trim(),
              latitude: locLat,
              longitude: locLng,
              radiusMeters: locRadius,
            }
          : l
      );
      onUpdateLocations(updated);
      onShowToast(`Lokasi "${locName}" berhasil diperbarui.`, 'success');
    }
    setLocModalOpen(false);
  };

  const handleDeleteLocation = (id: string, name: string) => {
    if (locations.length <= 1) {
      onShowToast('Minimal 1 lokasi induk harus tetap tersedia di sistem', 'warning');
      return;
    }
    const updated = locations.filter((l) => l.id !== id);
    onUpdateLocations(updated);
    onShowToast(`Lokasi "${name}" telah dihapus dari sistem.`, 'info');
  };

  const handleSaveGeofencePolicy = () => {
    const updated: GeofenceGlobalConfig = {
      ...geofenceConfig,
      assignmentPolicy,
      gpsAccuracyThreshold: gpsThreshold,
      strictOpenSkyWarning: strictOpenSky,
    };
    onUpdateGeofenceConfig(updated);
    onShowToast('Aturan penugasan lokasi & threshold akurasi GPS berhasil disimpan.', 'success');
  };

  // ================= ACTION HANDLERS: TAB 2 (USERS) =================
  const handleToggleUserStatus = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'Aktif' ? 'Tangguhkan' : 'Aktif';
        onShowToast(`Status akun ${u.name} diubah menjadi "${nextStatus}".`, 'info');
        return { ...u, status: nextStatus as 'Aktif' | 'Tangguhkan' };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleResetDeviceBinding = (user: UserAccount) => {
    const updated = users.map((u) => {
      if (u.id === user.id) {
        return {
          ...u,
          deviceBinding: null,
        };
      }
      return u;
    });
    onUpdateUsers(updated);
    onShowToast(`Kunci perangkat untuk ${user.name} berhasil di-reset. Staf dapat mendaftarkan HP baru pada login berikutnya.`, 'success');
  };

  const handleRevokeSession = (sessionId: string, userName: string) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    onUpdateSessions(updated);
    onShowToast(`Sesi aktif untuk "${userName}" berhasil diputus (Revoked).`, 'info');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserNip.trim() || !newUserEmail.trim()) {
      onShowToast('Harap lengkapi seluruh field akun pengguna', 'warning');
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      nip: newUserNip.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      roleTitle: newUserRoleTitle.trim() || (newUserRole === 'outsourcing' ? 'Staf Lapangan Alih Daya' : 'Pejabat Operasional'),
      status: 'Aktif',
      deviceBinding: null,
      lastLogin: 'Belum pernah login',
      avatarColor: '#6366f1',
      initials: newUserName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'US',
    };

    onUpdateUsers([...users, newUser]);
    setNewUserModalOpen(false);
    onShowToast(`Akun pengguna "${newUser.name}" berhasil dibuat dengan proteksi device binding aktif.`, 'success');

    // Reset inputs
    setNewUserName('');
    setNewUserNip('');
    setNewUserEmail('');
    setNewUserRoleTitle('');
  };

  // ================= ACTION HANDLERS: TAB 3 (RBAC) =================
  const handleTogglePermission = (roleKey: string, permKey: keyof RolePermissions) => {
    setLocalPermissions((prev) => {
      const current = prev[roleKey] || ({} as RolePermissions);
      const updated = {
        ...prev,
        [roleKey]: {
          ...current,
          [permKey]: !current[permKey],
        },
      };
      return updated;
    });
  };

  const handleSavePermissions = () => {
    onUpdateRolePermissions(localPermissions);
    onShowToast('Matriks hak akses (RBAC) berhasil disimpan dan diterapkan.', 'success');
  };

  const handleToggleSupervisorStaff = (mappingId: string, staffId: string) => {
    const updated = supervisorMappings.map((m) => {
      if (m.supervisorId === mappingId) {
        const hasStaff = m.assignedStaffIds.includes(staffId);
        const newStaffIds = hasStaff
          ? m.assignedStaffIds.filter((id) => id !== staffId)
          : [...m.assignedStaffIds, staffId];
        return {
          ...m,
          assignedStaffIds: newStaffIds,
        };
      }
      return m;
    });
    onUpdateSupervisorMappings(updated);
    onShowToast('Pemetaan atasan-bawahan berhasil diperbarui.', 'info');
  };

  const handleToggleSecurityOption = (key: keyof EnterpriseSecurityConfig) => {
    const updated = {
      ...securityConfig,
      [key]: !securityConfig[key],
    };
    onUpdateSecurityConfig(updated);
    onShowToast(`Konfigurasi keamanan "${key}" diperbarui.`, 'success');
  };

  // Filtered users for Tab 2
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchNip = u.nip.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchEmail) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pusat Pengaturan Sistem (Administration)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi master geofencing, kontrol keamanan akun, dan matriks hak akses RBAC
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onResetDemoData && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin mereset seluruh data kehadiran, laporan, evaluasi, dan log sistem kembali ke default demo?')) {
                  onResetDemoData();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              title="Reset data demo ke kondisi awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Reset Data Demo</span>
            </button>
          )}

          {/* 3 Main Configuration Tabs */}
          <div className="flex items-center gap-1.5 p-1 glass-pill rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('geofence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'geofence'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>Master Geofencing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pengguna & Device</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rbac')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'rbac'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Peran & RBAC</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MASTER LOKASI & GEOFENCING                                         */}
      {/* ========================================================================= */}
      {activeTab === 'geofence' && (
        <div className="space-y-6">
          
          {/* Section Header with Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daftar Master Lokasi Penugasan (Multi-Geofence)</span>
                <span className="text-xs font-mono font-normal text-slate-400">({locations.length} Lokasi)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Titik perimeter resmi absensi dengan radius toleransi GPS terverifikasi
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddLocation}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Lokasi Baru</span>
            </button>
          </div>

          {/* Location Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-5 glass-card flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {loc.name}
                      </h3>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                      R: {loc.radiusMeters}m
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {loc.address}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Lat:</span>
                      <strong className="text-slate-900 dark:text-white tabular-nums">{loc.latitude.toFixed(5)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Lng:</span>
                      <strong className="text-slate-900 dark:text-white tabular-nums">{loc.longitude.toFixed(5)}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenEditLocation(loc)}
                    className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah Koordinat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                    className="text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Hapus Lokasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Aturan Penugasan Lokasi & GPS Threshold Card */}
          <div className="p-6 glass-card space-y-5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Aturan Penugasan Lokasi & Sensor GPS Perangkat
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Kebijakan Penugasan */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Kebijakan Penugasan Lokasi Staf:
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentPolicy"
                      checked={assignmentPolicy === 'fixed'}
                      onChange={() => setAssignmentPolicy('fixed')}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <strong className="text-slate-900 dark:text-white block font-semibold">
                        Fixed Location (Terkunci 1 Titik Kantor)
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Staf hanya dapat melakukan clock-in pada kantor spesifik yang ditugaskan di profilnya.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentPolicy"
                      checked={assignmentPolicy === 'roaming'}
                      onChange={() => setAssignmentPolicy('roaming')}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <strong className="text-slate-900 dark:text-white block font-semibold">
                        Roaming / Floating (Dapat Absen di Mana Saja Terdaftar)
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Ideal untuk teknisi keliling, kurir, atau inspektur lapangan yang berpindah pos tugas.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Threshold Akurasi GPS */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 dark:text-slate-200">
                    Threshold Akurasi Maksimal GPS:
                  </label>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold tabular-nums">
                    &lt; {gpsThreshold} meter
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  step={5}
                  value={gpsThreshold}
                  onChange={(e) => setGpsThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Standar anti-mock: Jika akurasi sinyal di atas {gpsThreshold}m (misal saat sinyal tertutup kanopi gedung tebal), sistem menolak presensi dan meminta staf bergeser ke area terbuka.
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Peringatan "Open-Sky" Otomatis
                  </span>
                  <button
                    type="button"
                    onClick={() => setStrictOpenSky(!strictOpenSky)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      strictOpenSky ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        strictOpenSky ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveGeofencePolicy}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Aturan Geofence</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENGATURAN PENGGUNA & KEAMANAN LOGIN (USER MANAGEMENT)             */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          
          {/* Top Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Manajemen Akun Pengguna & Device Binding</span>
                <span className="text-xs font-mono font-normal text-slate-400">({users.length} Akun)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Pendaftaran identitas, kunci 1 Akun = 1 HP (Anti-Joki), dan kontrol sesi aktif
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNewUserModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Pengguna</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Cari nama pengguna, NIP, atau email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Tingkat Peran</option>
                <option value="outsourcing">Tenaga Outsourcing</option>
                <option value="coordinator">Pengawas Lapangan</option>
                <option value="supervisor">Supervisor Operasional</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>
          </div>

          {/* User Accounts Table */}
          <div className="rounded-2xl glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">NIP / ID</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Device Binding (1 HP)</th>
                    <th className="py-3 px-4">Login Terakhir</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                            style={{ backgroundColor: u.avatarColor }}
                          >
                            {u.initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {u.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {u.nip}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          u.role === 'admin'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : u.role === 'supervisor'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : u.role === 'coordinator'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {u.roleTitle}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u.id)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                            u.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status}
                        </button>
                      </td>

                      {/* Device Binding */}
                      <td className="py-3 px-4">
                        {u.deviceBinding?.registered ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{u.deviceBinding.deviceModel}</span>
                            </div>
                            <div className="text-[9px] font-mono text-slate-400">
                              {u.deviceBinding.deviceUuid.substring(0, 14)}...
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Belum Terikat
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 tabular-nums">
                        {u.lastLogin}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {u.deviceBinding?.registered && (
                          <button
                            type="button"
                            onClick={() => handleResetDeviceBinding(u)}
                            className="px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                            title="Reset Kunci Perangkat jika staf mengganti HP"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-500" />
                            <span>Reset Device</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Sessions & Security Enforcements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Active Sessions Monitoring */}
            <div className="p-5 glass-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span>Sesi Login Aktif Real-Time</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {sessions.length} Sesi Terbuka
                </span>
              </div>

              <div className="space-y-2">
                {sessions.map((ses) => (
                  <div
                    key={ses.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{ses.userName}</span>
                        {ses.isCurrentSession && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                            Sesi Anda
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {ses.device} · {ses.ipAddress}
                      </div>
                    </div>

                    {!ses.isCurrentSession && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(ses.id, ses.userName)}
                        className="px-2.5 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-medium"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Authentication Policies (SSO, 2FA, Biometrics) */}
            <div className="p-5 glass-card space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>Kebijakan Autentikasi Modern</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Wajibkan Google Workspace SSO
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Login hanya diperbolehkan melalui domain email resmi perusahaan
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSecurityOption('requireGoogleSso')}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      securityConfig.requireGoogleSso ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      securityConfig.requireGoogleSso ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Two-Factor Authentication (2FA / TOTP)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Verifikasi kode 6 digit Google Authenticator bagi tingkatan admin & supervisor
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSecurityOption('requireTwoFactorTotp')}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      securityConfig.requireTwoFactorTotp ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      securityConfig.requireTwoFactorTotp ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      WebAuthn Biometrik (Fingerprint / Face ID)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sensor biometrik bawaan HP untuk membuka sesi tanpa password berulang
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSecurityOption('requireWebAuthnBiometric')}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      securityConfig.requireWebAuthnBiometric ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      securityConfig.requireWebAuthnBiometric ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PENGATURAN PERAN & HAK AKSES (RBAC)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Matriks Hak Akses Dinamis (Role-Based Access Control)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Atur izin akses spesifik untuk setiap kelompok modul operasional dan administratif
              </p>
            </div>

            <button
              type="button"
              onClick={handleSavePermissions}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan Matriks</span>
            </button>
          </div>

          {/* Dynamic RBAC Table */}
          <div className="rounded-2xl glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="py-3 px-4 w-1/3">Modul & Hak Akses</th>
                    <th className="py-3 px-4 text-center">Tenaga Outsourcing</th>
                    <th className="py-3 px-4 text-center">Pengawas Lapangan</th>
                    <th className="py-3 px-4 text-center">Supervisor KPI</th>
                    <th className="py-3 px-4 text-center">Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  
                  {/* Category A: Presensi */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={5} className="py-2 px-4 font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      A. Modul Presensi & Kehadiran Cerdas
                    </td>
                  </tr>

                  {[
                    { key: 'attendance_clock', label: 'Clock In / Clock Out (Selfie WebRTC)' },
                    { key: 'attendance_view_self', label: 'Lihat Riwayat Presensi Sendiri' },
                    { key: 'attendance_view_all', label: 'Monitoring Presensi Seluruh Staf Alih Daya' },
                    { key: 'attendance_override_location', label: 'Override / Dispensasi Pelanggaran Geofence' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {row.label}
                      </td>
                      {['outsourcing', 'coordinator', 'supervisor', 'admin'].map((roleKey) => {
                        const checked = localPermissions[roleKey]?.[row.key as keyof RolePermissions] || false;
                        return (
                          <td key={roleKey} className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(roleKey, row.key as keyof RolePermissions)}
                              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Category B: Laporan Kinerja */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={5} className="py-2 px-4 font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      B. Modul Laporan Kinerja Harian
                    </td>
                  </tr>

                  {[
                    { key: 'report_submit', label: 'Kirim Laporan Harian (Watermark GPS Kamera)' },
                    { key: 'report_review', label: 'Verifikasi & Setujui Hasil Kerja Bawahan' },
                    { key: 'report_request_revision', label: 'Instruksikan Revisi & Catatan Lapangan' },
                    { key: 'report_delete', label: 'Hapus / Koreksi Arsip Laporan' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {row.label}
                      </td>
                      {['outsourcing', 'coordinator', 'supervisor', 'admin'].map((roleKey) => {
                        const checked = localPermissions[roleKey]?.[row.key as keyof RolePermissions] || false;
                        return (
                          <td key={roleKey} className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(roleKey, row.key as keyof RolePermissions)}
                              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Category C: Penilaian KPI 5-Bintang */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={5} className="py-2 px-4 font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      C. Modul Penilaian KPI (4 Pilar, 11 Kompetensi)
                    </td>
                  </tr>

                  {[
                    { key: 'kpi_rate_weekly', label: 'Pengisian Rating Bintang 1-5 Berkala (Jumat)' },
                    { key: 'kpi_view_monthly', label: 'Akses Analitik Spider Radar & Predikat Kinerja' },
                    { key: 'kpi_download_raport', label: 'Unduh Raport KPI & Rekomendasi Kontrak' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {row.label}
                      </td>
                      {['outsourcing', 'coordinator', 'supervisor', 'admin'].map((roleKey) => {
                        const checked = localPermissions[roleKey]?.[row.key as keyof RolePermissions] || false;
                        return (
                          <td key={roleKey} className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(roleKey, row.key as keyof RolePermissions)}
                              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Category D: Administrasi & Konfigurasi */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={5} className="py-2 px-4 font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      D. Administrasi Sistem & Keamanan
                    </td>
                  </tr>

                  {[
                    { key: 'admin_manage_geofence', label: 'Kelola Master Lokasi & Radius Geofence' },
                    { key: 'admin_manage_users', label: 'Kelola Akun Staf & Reset Device Binding' },
                    { key: 'admin_export_reports', label: 'Ekspor Data Rekapitulasi Excel / PDF' },
                    { key: 'admin_view_audit_log', label: 'Akses Log Aktivitas & Jejak Audit Lengkap' },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {row.label}
                      </td>
                      {['outsourcing', 'coordinator', 'supervisor', 'admin'].map((roleKey) => {
                        const checked = localPermissions[roleKey]?.[row.key as keyof RolePermissions] || false;
                        return (
                          <td key={roleKey} className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(roleKey, row.key as keyof RolePermissions)}
                              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supervisor-Subordinate Mapping Section */}
          <div className="p-6 glass-card space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Pemetaan Relasi Atasan - Bawahan (Supervisor Mapping)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tentukan daftar personel alih daya yang berada di bawah pengawasan dan penilaian masing-masing atasan
              </p>
            </div>

            <div className="space-y-4">
              {supervisorMappings.map((mapping) => (
                <div
                  key={mapping.supervisorId}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {mapping.supervisorName}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        ({mapping.supervisorRole})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                      {mapping.assignedStaffIds.length} Staf Dibawahi
                    </span>
                  </div>

                  {/* Staff Selection Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {staffList.map((st) => {
                      const isAssigned = mapping.assignedStaffIds.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                            isAssigned
                              ? 'bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-700 font-medium text-slate-900 dark:text-white'
                              : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleToggleSupervisorStaff(mapping.supervisorId, st.id)}
                            className="w-3.5 h-3.5 accent-indigo-600 rounded"
                          />
                          <span className="truncate">{st.name} ({st.initials})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rekomendasi Fitur Enterprise Modern */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Fitur Enterprise Modern (Anti-Joki & Otomasi AI)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Liveness Detection (Anti-Joki Foto)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Verifikasi kedipan mata & deteksi senyum langsung pada kamera WebRTC
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSecurityOption('livenessDetection')}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    securityConfig.livenessDetection ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    securityConfig.livenessDetection ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Deteksi Duplikasi Laporan Otomatis via AI
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tandai otomatis jika staf mengunggah foto pekerjaan identik dengan hari sebelumnya
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSecurityOption('duplicateReportAiDetection')}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    securityConfig.duplicateReportAiDetection ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    securityConfig.duplicateReportAiDetection ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    PWA Offline-First & Stempel Kriptografis
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rekam presensi di basemen tanpa sinyal dan sinkronkan otomatis saat online
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSecurityOption('offlineCryptographicSync')}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    securityConfig.offlineCryptographicSync ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    securityConfig.offlineCryptographicSync ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Pengingat Laporan Otomatis Pukul 16:30
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Kirim notifikasi ramah ke HP staf yang belum melengkapi laporan harian
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSecurityOption('scheduled1630Reminder')}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    securityConfig.scheduled1630Reminder ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    securityConfig.scheduled1630Reminder ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / UBAH LOKASI MASTER (GEOFENCE MAP PICKER)                */}
      {/* ========================================================================= */}
      {locModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isNewLocation ? 'Tambah Lokasi Penugasan Baru' : `Ubah Lokasi: ${editingLocation?.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLocModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lokasi / Kantor / Pos Tugas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gedung Workshop Logistik Slipi"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap Lokasi
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jl. Nama Jalan No. XX, Kecamatan, Kota..."
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Visual Map Picker */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Visual Map Picker & Geofence Radius Circle
                </label>
                <VisualMapPicker
                  latitude={locLat}
                  longitude={locLng}
                  radiusMeters={locRadius}
                  locationName={locName}
                  onChangeCoordinates={(lat, lng) => {
                    setLocLat(lat);
                    setLocLng(lng);
                  }}
                  onChangeRadius={(r) => setLocRadius(r)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLocModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Lokasi Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH USER BARU                                                 */}
      {/* ========================================================================= */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pendaftaran Akun Pengguna Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Danang Prasetyo"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NIP / ID Karyawan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="OS-2024-110"
                    value={newUserNip}
                    onChange={(e) => setNewUserNip(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Peran (Role)
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="outsourcing">Tenaga Outsourcing</option>
                    <option value="coordinator">Pengawas Lapangan</option>
                    <option value="supervisor">Supervisor KPI</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Korporat / Login
                </label>
                <input
                  type="email"
                  required
                  placeholder="danang@mitradaya.co.id"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan / Posisi Kerja
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Petugas Kebersihan Area Basemen"
                  value={newUserRoleTitle}
                  onChange={(e) => setNewUserRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Device Binding Aktif: Pengguna akan otomatis mengunci 1 HP pertamanya saat login perdana.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Daftarkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
