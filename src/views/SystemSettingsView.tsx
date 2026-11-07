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
  UserPlus,
  RefreshCw,
  LogOut,
  Fingerprint,
  Building2,
  Briefcase,
  Copy,
  Search,
  Calendar,
  Phone,
  UserCheck,
  FileText,
  Clock,
  Shield,
  ArrowRight,
  Coffee,
  Sun,
  Moon,
} from 'lucide-react';
import {
  Division,
  Vendor,
  OfficeLocation,
  UserAccount,
  ActiveSession,
  GeofenceGlobalConfig,
  RolePermissions,
  SupervisorMapping,
  EnterpriseSecurityConfig,
  StaffProfile,
  OUTSOURCING_JOB_ROLES,
  AttendanceGlobalSettings,
  DEFAULT_ATTENDANCE_SETTINGS,
  DayWorkSchedule,
} from '../types';
import { VisualMapPicker } from '../components/VisualMapPicker';
import {
  apiCreateDivision,
  apiUpdateDivision,
  apiDeleteDivision,
  apiCreateVendor,
  apiUpdateVendor,
  apiDeleteVendor,
  apiCreateUser,
  apiResetPassword,
  apiUpdateUserProfile,
  apiResetUserDevice,
  apiDeleteUser,
  apiSaveAttendanceSettings,
  apiApproveSupervisorChange,
  apiRejectSupervisorChange,
} from '../services/api';

interface SystemSettingsViewProps {
  locations: OfficeLocation[];
  onUpdateLocations: (locs: OfficeLocation[]) => void;
  staffList: StaffProfile[];
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
  divisions: Division[];
  onUpdateDivisions: (divs: Division[]) => void;
  vendors: Vendor[];
  onUpdateVendors: (vens: Vendor[]) => void;
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
  attendanceSettings?: AttendanceGlobalSettings;
  onUpdateAttendanceSettings?: (settings: AttendanceGlobalSettings) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  locations,
  onUpdateLocations,
  staffList,
  users,
  onUpdateUsers,
  divisions,
  onUpdateDivisions,
  vendors,
  onUpdateVendors,
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
  attendanceSettings,
  onUpdateAttendanceSettings,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'divisions' | 'vendors' | 'users' | 'geofence' | 'schedule' | 'rbac'>('divisions');

  // ================= TAB: SCHEDULE & ATTENDANCE RULES =================
  const [scheduleSettings, setScheduleSettings] = useState<AttendanceGlobalSettings>(() => {
    return attendanceSettings || DEFAULT_ATTENDANCE_SETTINGS;
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [newPurposeInput, setNewPurposeInput] = useState('');

  // Sync internal schedule state if props change
  React.useEffect(() => {
    if (attendanceSettings) {
      setScheduleSettings(attendanceSettings);
    }
  }, [attendanceSettings]);

  // ================= SCHEDULE & WORK HOURS HANDLERS =================
  const handleDayToggle = (dayKey: string, enabled: boolean) => {
    setScheduleSettings((prev) => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [dayKey]: {
          ...prev.workSchedule[dayKey],
          enabled,
        },
      },
    }));
  };

  const handleDayChange = (dayKey: string, field: keyof DayWorkSchedule, val: any) => {
    setScheduleSettings((prev) => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [dayKey]: {
          ...prev.workSchedule[dayKey],
          [field]: val,
        },
      },
    }));
  };

  const handleApplyPreset = (preset: 'default_disdik' | 'ramadhan' | 'six_days' | 'wakar') => {
    if (preset === 'default_disdik') {
      setScheduleSettings(DEFAULT_ATTENDANCE_SETTINGS);
      onShowToast('Preset Standar Disdik HST (Jumat 11:00 & Sen-Kam 16:30) diterapkan!', 'info');
    } else if (preset === 'ramadhan') {
      setScheduleSettings((prev) => ({
        ...prev,
        workSchedule: {
          ...prev.workSchedule,
          monday: { ...prev.workSchedule.monday, clockInStart: '07:30', clockInEnd: '08:30', clockOutStart: '15:30', enableBreak: true, breakStart: '12:00', breakEnd: '12:30' },
          tuesday: { ...prev.workSchedule.tuesday, clockInStart: '07:30', clockInEnd: '08:30', clockOutStart: '15:30', enableBreak: true, breakStart: '12:00', breakEnd: '12:30' },
          wednesday: { ...prev.workSchedule.wednesday, clockInStart: '07:30', clockInEnd: '08:30', clockOutStart: '15:30', enableBreak: true, breakStart: '12:00', breakEnd: '12:30' },
          thursday: { ...prev.workSchedule.thursday, clockInStart: '07:30', clockInEnd: '08:30', clockOutStart: '15:30', enableBreak: true, breakStart: '12:00', breakEnd: '12:30' },
          friday: { ...prev.workSchedule.friday, clockInStart: '07:30', clockInEnd: '08:30', clockOutStart: '10:30', enableBreak: false },
          saturday: { ...prev.workSchedule.saturday, enabled: false },
          sunday: { ...prev.workSchedule.sunday, enabled: false },
        },
      }));
      onShowToast('Preset Jam Kerja Ramadhan diterapkan!', 'info');
    } else if (preset === 'six_days') {
      setScheduleSettings((prev) => ({
        ...prev,
        workSchedule: {
          ...prev.workSchedule,
          saturday: { ...prev.workSchedule.saturday, enabled: true, clockInStart: '08:00', clockInEnd: '09:00', clockOutStart: '13:00', enableBreak: false },
        },
      }));
      onShowToast('Preset Piket Operasional 6 Hari Kerja (Sabtu Aktif) diterapkan!', 'info');
    } else if (preset === 'wakar') {
      const nightSchedule = {
        enabled: true,
        clockInStart: '19:30',
        clockInEnd: '21:00',
        clockOutStart: '05:30',
        clockOutEnd: '07:00',
        enableBreak: false,
        breakStart: '00:00',
        breakEnd: '01:00',
      };
      setScheduleSettings((prev) => ({
        ...prev,
        workSchedule: {
          monday: { ...prev.workSchedule.monday, ...nightSchedule, dayName: 'Senin' },
          tuesday: { ...prev.workSchedule.tuesday, ...nightSchedule, dayName: 'Selasa' },
          wednesday: { ...prev.workSchedule.wednesday, ...nightSchedule, dayName: 'Rabu' },
          thursday: { ...prev.workSchedule.thursday, ...nightSchedule, dayName: 'Kamis' },
          friday: { ...prev.workSchedule.friday, ...nightSchedule, dayName: 'Jumat' },
          saturday: { ...prev.workSchedule.saturday, ...nightSchedule, dayName: 'Sabtu' },
          sunday: { ...prev.workSchedule.sunday, ...nightSchedule, dayName: 'Minggu' },
        },
      }));
      onShowToast('Preset Jaga Malam / Wakar (20:00 - 06:00 WITA) diterapkan!', 'info');
    }
  };

  const handleAddPurpose = () => {
    if (!newPurposeInput.trim()) return;
    setScheduleSettings((prev) => ({
      ...prev,
      fieldDutySettings: {
        ...prev.fieldDutySettings,
        allowedPurposes: [...prev.fieldDutySettings.allowedPurposes, newPurposeInput.trim()],
      },
    }));
    setNewPurposeInput('');
  };

  const handleRemovePurpose = (idx: number) => {
    setScheduleSettings((prev) => ({
      ...prev,
      fieldDutySettings: {
        ...prev.fieldDutySettings,
        allowedPurposes: prev.fieldDutySettings.allowedPurposes.filter((_, i) => i !== idx),
      },
    }));
  };

  const handleSaveScheduleSettings = async () => {
    setIsSavingSchedule(true);
    try {
      await apiSaveAttendanceSettings(scheduleSettings);
      if (onUpdateAttendanceSettings) {
        onUpdateAttendanceSettings(scheduleSettings);
      }
      onShowToast('Pengaturan jam kerja & presensi berhasil disimpan ke SQLite server!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menyimpan pengaturan jadwal.', 'warning');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // ================= TAB: DIVISIONS (BIDANG & SUBBAGIAN) =================
  const [divisionSearch, setDivisionSearch] = useState('');
  const [divisionModalOpen, setDivisionModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [divName, setDivName] = useState('');
  const [divCode, setDivCode] = useState('');
  const [divDesc, setDivDesc] = useState('');
  const [divSupervisor, setDivSupervisor] = useState('');
  const [isSavingDivision, setIsSavingDivision] = useState(false);

  // ================= TAB: VENDORS (PERUSAHAAN PENYEDIA) =================
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [venName, setVenName] = useState('');
  const [venCode, setVenCode] = useState('');
  const [venContract, setVenContract] = useState('');
  const [venStart, setVenStart] = useState('2026-01-02');
  const [venEnd, setVenEnd] = useState('2026-12-31');
  const [venPic, setVenPic] = useState('');
  const [venPhone, setVenPhone] = useState('');
  const [venAddress, setVenAddress] = useState('');
  const [venStatus, setVenStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [isSavingVendor, setIsSavingVendor] = useState(false);

  // ================= RESET PASSWORD & USER EDIT =================
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetUserForReset, setTargetUserForReset] = useState<UserAccount | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('Password123!');
  const [isResettingPass, setIsResettingPass] = useState(false);

  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [targetUserForEdit, setTargetUserForEdit] = useState<UserAccount | null>(null);
  const [editUserDivisionId, setEditUserDivisionId] = useState('');
  const [editUserSupervisorId, setEditUserSupervisorId] = useState('');
  const [editUserVendorName, setEditUserVendorName] = useState('');
  const [editUserRoleTitle, setEditUserRoleTitle] = useState('');
  const [editUserRole, setEditUserRole] = useState<'outsourcing' | 'coordinator' | 'supervisor' | 'admin'>('outsourcing');
  const [editUserStatus, setEditUserStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);

  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserLocationId, setNewUserLocationId] = useState(locations[0]?.id || 'loc-disdik-hst');
  // ================= TAB: GEOFENCE STATE =================
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [locModalOpen, setLocModalOpen] = useState(false);

  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locLat, setLocLat] = useState(-6.22384);
  const [locLng, setLocLng] = useState(106.80892);
  const [locRadius, setLocRadius] = useState(80);

  const [assignmentPolicy, setAssignmentPolicy] = useState(geofenceConfig.assignmentPolicy);
  const [gpsThreshold, setGpsThreshold] = useState(geofenceConfig.gpsAccuracyThreshold);
  const [strictOpenSky, setStrictOpenSky] = useState(geofenceConfig.strictOpenSkyWarning);

  // ================= TAB: USER MANAGEMENT STATE =================
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);

  const [newUserName, setNewUserName] = useState('');
  const [newUserNip, setNewUserNip] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'outsourcing' | 'coordinator' | 'supervisor' | 'admin'>('outsourcing');
  const [newUserRoleTitle, setNewUserRoleTitle] = useState('');

  // ================= TAB: RBAC LOCAL STATE =================
  const [localPermissions, setLocalPermissions] = useState<Record<string, RolePermissions>>(rolePermissions);

  // Helper for supervisor name lookup
  const getSupervisorName = (supId?: string) => {
    if (!supId) return 'Belum Ditetapkan';
    const found = users.find((u) => u.id === supId || u.nip === supId);
    return found ? found.name : supId;
  };

  const supervisorCandidates = users.filter(
    (u) => u.role === 'supervisor' || u.role === 'admin' || u.role === 'coordinator'
  );

  // ================= ACTION HANDLERS: DIVISIONS =================
  const handleOpenAddDivision = () => {
    setEditingDivision(null);
    setDivName('');
    setDivCode('');
    setDivDesc('');
    setDivSupervisor('');
    setDivisionModalOpen(true);
  };

  const handleOpenEditDivision = (div: Division) => {
    setEditingDivision(div);
    setDivName(div.name);
    setDivCode(div.code || '');
    setDivDesc(div.description || '');
    setDivSupervisor(div.supervisorName || '');
    setDivisionModalOpen(true);
  };

  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!divName.trim()) {
      onShowToast('Nama bidang / subbagian wajib diisi', 'warning');
      return;
    }
    setIsSavingDivision(true);
    try {
      if (editingDivision) {
        const res = await apiUpdateDivision(editingDivision.id, {
          name: divName.trim(),
          code: divCode.trim().toUpperCase() || 'DIV',
          description: divDesc.trim(),
          supervisorName: divSupervisor.trim(),
        });
        const savedDiv = res?.division || (res?.id ? res : null);
        if (savedDiv) {
          const updated = divisions.map((d) => (d.id === editingDivision.id ? savedDiv : d));
          onUpdateDivisions(updated);
          onShowToast(`Bidang "${savedDiv.name}" berhasil diperbarui.`, 'success');
          setDivisionModalOpen(false);
        } else {
          onShowToast(res?.message || 'Gagal memperbarui bidang', 'warning');
        }
      } else {
        const res = await apiCreateDivision({
          name: divName.trim(),
          code: divCode.trim().toUpperCase() || 'DIV',
          description: divDesc.trim(),
          supervisorName: divSupervisor.trim(),
        });
        const newDiv = res?.division || (res?.id ? res : null);
        if (newDiv) {
          onUpdateDivisions([...divisions, newDiv]);
          onShowToast(`Bidang baru "${newDiv.name}" berhasil didaftarkan.`, 'success');
          setDivisionModalOpen(false);
        } else {
          onShowToast(res?.message || 'Gagal menambah bidang', 'warning');
        }
      }
    } catch (err: any) {
      onShowToast(err.message || 'Terjadi kesalahan sistem', 'warning');
    } finally {
      setIsSavingDivision(false);
    }
  };

  const handleDeleteDivision = async (id: string, name: string) => {
    if (!window.confirm(`Hapus bidang "${name}" dari master data dinas?`)) return;
    try {
      await apiDeleteDivision(id);
      onUpdateDivisions(divisions.filter((d) => d.id !== id));
      onShowToast(`Bidang "${name}" telah dihapus.`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menghapus bidang', 'warning');
    }
  };

  // ================= ACTION HANDLERS: VENDORS =================
  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setVenName('');
    setVenCode('');
    setVenContract('');
    setVenStart('2026-01-02');
    setVenEnd('2026-12-31');
    setVenPic('');
    setVenPhone('');
    setVenAddress('');
    setVenStatus('Aktif');
    setVendorModalOpen(true);
  };

  const handleOpenEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVenName(v.name);
    setVenCode(v.code || '');
    setVenContract(v.contractNumber || '');
    setVenStart(v.contractStartDate || '2026-01-02');
    setVenEnd(v.contractEndDate || '2026-12-31');
    setVenPic(v.picName || '');
    setVenPhone(v.picPhone || '');
    setVenAddress(v.address || '');
    setVenStatus(v.status || 'Aktif');
    setVendorModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venName.trim()) {
      onShowToast('Nama badan usaha / perusahaan vendor wajib diisi', 'warning');
      return;
    }
    setIsSavingVendor(true);
    try {
      if (editingVendor) {
        const res = await apiUpdateVendor(editingVendor.id, {
          name: venName.trim(),
          code: venCode.trim().toUpperCase(),
          contractNumber: venContract.trim(),
          contractStartDate: venStart,
          contractEndDate: venEnd,
          picName: venPic.trim(),
          picPhone: venPhone.trim(),
          address: venAddress.trim(),
          status: venStatus,
        });
        const savedVendor = res?.vendor || (res?.id ? res : null);
        if (savedVendor) {
          const updated = vendors.map((v) => (v.id === editingVendor.id ? { ...v, ...savedVendor } : v));
          onUpdateVendors(updated);
          onShowToast(`Data vendor "${savedVendor.name}" berhasil diperbarui.`, 'success');
          setVendorModalOpen(false);
        } else {
          onShowToast(res?.message || 'Gagal memperbarui vendor', 'warning');
        }
      } else {
        const res = await apiCreateVendor({
          name: venName.trim(),
          code: venCode.trim().toUpperCase(),
          contractNumber: venContract.trim(),
          contractStartDate: venStart,
          contractEndDate: venEnd,
          picName: venPic.trim(),
          picPhone: venPhone.trim(),
          address: venAddress.trim(),
          status: venStatus,
        });
        const newVendor = res?.vendor || (res?.id ? res : null);
        if (newVendor) {
          onUpdateVendors([...vendors, newVendor]);
          onShowToast(`Perusahaan vendor "${newVendor.name}" berhasil ditambahkan.`, 'success');
          setVendorModalOpen(false);
        } else {
          onShowToast(res?.message || 'Gagal menambah vendor', 'warning');
        }
      }
    } catch (err: any) {
      onShowToast(err.message || 'Terjadi kesalahan sistem', 'warning');
    } finally {
      setIsSavingVendor(false);
    }
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!window.confirm(`Hapus perusahaan vendor "${name}" dari master sistem?`)) return;
    try {
      await apiDeleteVendor(id);
      onUpdateVendors(vendors.filter((v) => v.id !== id));
      onShowToast(`Vendor "${name}" telah dihapus.`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menghapus vendor', 'warning');
    }
  };

  // ================= ACTION HANDLERS: USER RESET PASSWORD & EDIT =================
  const handleOpenResetModal = (user: UserAccount) => {
    setTargetUserForReset(user);
    setResetPasswordInput('Password123!');
    setResetModalOpen(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForReset) return;
    if (!resetPasswordInput || resetPasswordInput.length < 6) {
      onShowToast('Kata sandi minimal 6 karakter', 'warning');
      return;
    }
    setIsResettingPass(true);
    try {
      const msg = await apiResetPassword(targetUserForReset.id, resetPasswordInput);
      onShowToast(msg || `Kata sandi akun "${targetUserForReset.name}" berhasil di-reset menjadi: ${resetPasswordInput}`, 'success');
      setResetModalOpen(false);
    } catch (err: any) {
      onShowToast(err.message || 'Terjadi kesalahan sistem', 'warning');
    } finally {
      setIsResettingPass(false);
    }
  };

  const handleOpenEditUser = (user: UserAccount) => {
    setTargetUserForEdit(user);
    setEditUserDivisionId(user.divisionId || '');
    setEditUserSupervisorId(user.supervisorId || '');
    setEditUserVendorName(user.vendorName || (vendors[0]?.name || ''));
    setEditUserRoleTitle(user.roleTitle || '');
    setEditUserRole(user.role);
    setEditUserStatus(user.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif');
    setEditUserModalOpen(true);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForEdit) return;
    setIsSavingUserEdit(true);
    try {
      const selectedDiv = divisions.find((d) => d.id === editUserDivisionId);
      const res = await apiUpdateUserProfile(targetUserForEdit.id, {
        divisionId: editUserDivisionId,
        divisionName: selectedDiv?.name || targetUserForEdit.divisionName,
        supervisorId: editUserSupervisorId,
        vendorName: editUserVendorName,
        roleTitle: editUserRoleTitle.trim() || targetUserForEdit.roleTitle,
        role: editUserRole,
        status: editUserStatus,
      });

      if (res && (res.success || res.id || res.user)) {
        const updatedUsers = users.map((u) => {
          if (u.id === targetUserForEdit.id) {
            return {
              ...u,
              divisionId: editUserDivisionId,
              divisionName: selectedDiv?.name || u.divisionName,
              supervisorId: editUserSupervisorId,
              pendingSupervisorId: null,
              supervisorRequestStatus: 'APPROVED' as const,
              vendorName: editUserVendorName,
              roleTitle: editUserRoleTitle.trim() || u.roleTitle,
              role: editUserRole,
              status: editUserStatus,
            };
          }
          return u;
        });
        onUpdateUsers(updatedUsers);
        onShowToast(`Penugasan dan atasan untuk "${targetUserForEdit.name}" berhasil disimpan.`, 'success');
        setEditUserModalOpen(false);
      } else {
        onShowToast((res && res.message) || 'Gagal memperbarui pengguna', 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Terjadi kesalahan sistem', 'warning');
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  // ================= ACTION HANDLERS: TAB 1 (GEOFENCE) =================
  const handleOpenAddLocation = () => {
    setIsNewLocation(true);
    setEditingLocation(null);
    setLocName('');
    setLocAddress('');
    setLocLat(-2.5936);
    setLocLng(115.3812);
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
        address: locAddress.trim() || 'Alamat Penugasan Lapangan Barabai',
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
  const handleToggleUserStatus = async (user: UserAccount) => {
    if (user.nip === 'ADMIN-HST' || user.email === 'admin@disdikhst.go.id') {
      onShowToast('Akun Super Administrator Utama tidak dapat dinonaktifkan demi keamanan sistem.', 'warning');
      return;
    }
    const nextStatus = user.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    try {
      await apiUpdateUserProfile(user.id, { status: nextStatus });
      const updated = users.map((u) => (u.id === user.id ? { ...u, status: nextStatus as 'Aktif' | 'Nonaktif' } : u));
      onUpdateUsers(updated);
      onShowToast(`Status akun "${user.name}" diubah menjadi "${nextStatus}".`, 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mengubah status akun pegawai.', 'warning');
    }
  };

  const handleResetDeviceBinding = async (user: UserAccount) => {
    try {
      await apiResetUserDevice(user.id);
      const updated = users.map((u) => {
        if (u.id === user.id) {
          return {
            ...u,
            deviceId: null,
            deviceBinding: null,
          };
        }
        return u;
      });
      onUpdateUsers(updated);
      onShowToast(`Kunci perangkat untuk ${user.name} berhasil di-reset. Staf dapat login dari HP baru.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mereset kunci perangkat.', 'warning');
    }
  };

  const handleApproveSupervisorRequest = async (userId: string) => {
    try {
      const res = await apiApproveSupervisorChange(userId);
      const updated = users.map((u) => (u.id === userId ? { ...u, ...res.user } : u));
      onUpdateUsers(updated);
      onShowToast(res.message, 'success');
      if (targetUserForEdit && targetUserForEdit.id === userId) {
        setTargetUserForEdit({ ...targetUserForEdit, ...res.user });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyetujui pengajuan atasan.';
      onShowToast(message, 'warning');
    }
  };

  const handleRejectSupervisorRequest = async (userId: string) => {
    try {
      const res = await apiRejectSupervisorChange(userId);
      const updated = users.map((u) => (u.id === userId ? { ...u, ...res.user } : u));
      onUpdateUsers(updated);
      onShowToast(res.message, 'info');
      if (targetUserForEdit && targetUserForEdit.id === userId) {
        setTargetUserForEdit({ ...targetUserForEdit, ...res.user });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menolak pengajuan atasan.';
      onShowToast(message, 'warning');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.nip === 'ADMIN-HST' || userToDelete.email === 'admin@disdikhst.go.id') {
      onShowToast('Akun Super Administrator Utama dilindungi dan tidak dapat dihapus.', 'warning');
      setUserToDelete(null);
      return;
    }
    setIsDeletingUser(true);
    try {
      await apiDeleteUser(userToDelete.id);
      const updated = users.filter((u) => u.id !== userToDelete.id);
      onUpdateUsers(updated);
      onShowToast(`Akun pegawai "${userToDelete.name}" berhasil dihapus permanen dari sistem.`, 'success');
      setUserToDelete(null);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menghapus data pegawai.', 'warning');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleRevokeSession = (sessionId: string, userName: string) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    onUpdateSessions(updated);
    onShowToast(`Sesi aktif untuk "${userName}" berhasil diputus (Revoked).`, 'info');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserNip.trim() || !newUserEmail.trim()) {
      onShowToast('Harap lengkapi seluruh field akun pengguna', 'warning');
      return;
    }

    setIsCreatingUser(true);
    try {
      const selectedDiv = divisions[0];
      const created = await apiCreateUser({
        name: newUserName.trim(),
        nip: newUserNip.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        roleTitle: newUserRoleTitle.trim() || (newUserRole === 'outsourcing' ? 'Staf Lapangan Alih Daya' : 'Pejabat Operasional'),
        divisionId: selectedDiv?.id || 'div-umpeg',
        divisionName: selectedDiv?.name || 'Sub Bagian Dinas',
        vendorName: vendors[0]?.name || 'PT Handil Bakti Utama (Mitra Disdik HST)',
        password: 'Password123!',
        customLocation: locations.find((l) => l.id === newUserLocationId) || locations[0],
      });
      const newUser: UserAccount = {
        id: created.id,
        name: created.name,
        nip: created.nip,
        email: created.email,
        role: created.role,
        roleTitle: created.roleTitle,
        divisionId: created.divisionId,
        divisionName: created.divisionName,
        supervisorId: created.supervisorId,
        vendorName: created.vendorName,
        status: 'Aktif',
        deviceBinding: null,
        lastLogin: 'Belum pernah login',
        avatarColor: created.avatarColor || '#6366f1',
        initials: created.initials || 'OS',
      };

      onUpdateUsers([...users, newUser]);
      setNewUserModalOpen(false);
      onShowToast(`Akun pengguna "${newUser.name}" berhasil dibuat dan tersimpan permanen di database.`, 'success');

      // Reset inputs
      setNewUserName('');
      setNewUserNip('');
      setNewUserEmail('');
      setNewUserRoleTitle('');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menambahkan akun pegawai baru.', 'warning');
    } finally {
      setIsCreatingUser(false);
    }
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

  // Filtered queries
  const filteredDivisions = divisions.filter((d) => {
    if (!divisionSearch.trim()) return true;
    const q = divisionSearch.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.code && d.code.toLowerCase().includes(q)) ||
      (d.supervisorName && d.supervisorName.toLowerCase().includes(q))
    );
  });

  const filteredVendors = vendors.filter((v) => {
    if (!vendorSearch.trim()) return true;
    const q = vendorSearch.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.code && v.code.toLowerCase().includes(q)) ||
      (v.contractNumber && v.contractNumber.toLowerCase().includes(q)) ||
      (v.picName && v.picName.toLowerCase().includes(q))
    );
  });

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchNip = u.nip.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchDiv = u.divisionName?.toLowerCase().includes(q);
      const matchVendor = u.vendorName?.toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchEmail && !matchDiv && !matchVendor) return false;
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
            Pengelolaan kepegawaian, master bidang, vendor alih daya, geofencing, dan kontrol keamanan
          </p>
        </div>

        {/* 5 Main Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 glass-pill rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('divisions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'divisions'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Master Bidang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'vendors'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Master Vendor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staf & Atasan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geofence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'geofence'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Master Geofencing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Jadwal & Aturan Kerja</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rbac')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rbac'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Peran & RBAC</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MASTER BIDANG & SUBBAGIAN (DIVISIONS CRUD)                         */}
      {/* ========================================================================= */}
      {activeTab === 'divisions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Master Bidang & Sub Bagian Dinas Pendidikan</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {divisions.length} Divisi Resmi
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Struktur organisasi kedinasan, kode divisi, atasan penanggung jawab, dan pemetaan penempatan alih daya
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddDivision}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Bidang / Bagian</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama bidang, kode divisi (BID-SD, SUB-KEU), atau nama penanggung jawab..."
              value={divisionSearch}
              onChange={(e) => setDivisionSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Divisions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDivisions.map((div) => {
              const assignedCount = users.filter((u) => u.divisionId === div.id || u.divisionName === div.name).length;
              return (
                <div
                  key={div.id}
                  className="p-5 glass-card flex flex-col justify-between space-y-4 group transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {div.name}
                          </h3>
                          <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {div.code || 'DIV'}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold shrink-0">
                        {assignedCount} Staf
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {div.description || 'Unit kerja operasional di lingkungan Dinas Pendidikan Kab. Hulu Sungai Tengah.'}
                    </p>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Atasan / Penanggung Jawab:</span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{div.supervisorName || 'Belum Ditetapkan'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenEditDivision(div)}
                      className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDivision(div.id, div.name)}
                      className="text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus Bidang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MASTER PERUSAHAAN PENYEDIA / VENDOR OUTSOURCING                    */}
      {/* ========================================================================= */}
      {activeTab === 'vendors' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Master Perusahaan Penyedia Jasa (Vendor Alih Daya)</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {vendors.length} Vendor Rekanan
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pengelolaan badan usaha (PT / CV penyedia tenaga kerja), nomor SPK/kontrak, masa berlaku, PIC, dan rekapitulasi penempatan
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddVendor}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Perusahaan Vendor</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama perusahaan (PT/CV), kode vendor, nomor SPK, atau nama PIC..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Vendors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((ven) => {
              const totalAssigned =
                ven.totalStaff ??
                users.filter((u) => u.vendorName?.toLowerCase() === ven.name.toLowerCase()).length;
              return (
                <div
                  key={ven.id}
                  className="p-5 glass-card flex flex-col justify-between space-y-4 group transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {ven.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                              {ven.code || 'VND'}
                            </span>
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                                ven.status === 'Aktif'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {ven.status || 'Aktif'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold shrink-0">
                        {totalAssigned} Petugas
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] text-slate-400">Nomor Kontrak / SPK:</div>
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">
                            {ven.contractNumber || 'SPK/DISDIK/2026/001'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <div className="text-[10px] text-slate-500 font-mono">
                          Masa Berlaku: {ven.contractStartDate || '2026-01-02'} s/d {ven.contractEndDate || '2026-12-31'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                            PIC: {ven.picName || '-'}
                          </span>
                        </div>
                        {ven.picPhone && (
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{ven.picPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenEditVendor(ven)}
                      className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Profil Vendor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteVendor(ven.id, ven.name)}
                      className="text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus Vendor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANAJEMEN PENGGUNA, PENUGASAN ATASAN & RESET PASSWORD              */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Manajemen Staf, Pengaturan Atasan & Keamanan Akun</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {users.length} Akun Terdaftar
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pendaftaran identitas, penetapan atasan langsung penilai, divisi penugasan, reset password, dan device binding (1 HP)
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
                placeholder="Cari nama pegawai, NIP, email, divisi, atau nama vendor..."
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
                    <th className="py-3 px-4">Divisi & Atasan</th>
                    <th className="py-3 px-4">Vendor Penampung</th>
                    <th className="py-3 px-4">Status & Device</th>
                    <th className="py-3 px-4 text-right">Aksi Manajemen</th>
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
                            style={{ backgroundColor: u.avatarColor || '#6366f1' }}
                          >
                            {u.initials || 'US'}
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
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            u.role === 'admin'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : u.role === 'supervisor'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : u.role === 'coordinator'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.roleTitle}
                        </span>
                      </td>

                      {/* Divisi & Atasan Langsung */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {u.divisionName || 'Dinas Pendidikan HST'}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                            <span className="text-slate-400">Atasan:</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                              {getSupervisorName(u.supervisorId)}
                            </span>
                          </div>
                          {u.supervisorRequestStatus === 'PENDING' && (
                            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-300 space-y-1">
                              <div className="flex items-center gap-1 font-bold">
                                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Pengajuan: {getSupervisorName(u.pendingSupervisorId)}</span>
                              </div>
                              <div className="flex items-center gap-1 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleApproveSupervisorRequest(u.id)}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] cursor-pointer transition-colors"
                                >
                                  Setujui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectSupervisorRequest(u.id)}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] cursor-pointer transition-colors"
                                >
                                  Tolak
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Vendor Penyedia */}
                      <td className="py-3 px-4">
                        <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                          {u.vendorName || '-'}
                        </div>
                      </td>

                      {/* Status & Device Binding */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs ${
                              u.status === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200'
                            }`}
                            title="Klik untuk mengaktifkan / menonaktifkan akun"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Aktif' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.status || 'Aktif'}
                          </button>
                          {(u.deviceId || u.deviceBinding?.registered) ? (
                            <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[110px]" title={u.deviceBinding?.deviceModel || u.deviceId || 'Terkunci'}>
                                {u.deviceBinding?.deviceModel || u.deviceId}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[9px] text-amber-500 font-medium">Device: Bebas</div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Penugasan, Jenis Pekerjaan, Atasan & Vendor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(u)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Reset Kata Sandi Pengguna"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {(u.deviceId || u.deviceBinding?.registered) && (
                            <button
                              type="button"
                              onClick={() => handleResetDeviceBinding(u)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Reset Kunci Perangkat (Ganti HP)"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          )}

                          {u.nip !== 'ADMIN-HST' && u.email !== 'admin@disdikhst.go.id' && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Pegawai (Kewenangan Super Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MASTER LOKASI & GEOFENCING                                         */}
      {/* ========================================================================= */}
      {activeTab === 'geofence' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
                      <strong className="text-slate-900 dark:text-white tabular-nums">{typeof loc.latitude === 'number' ? loc.latitude.toFixed(5) : loc.latitude}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Lng:</span>
                      <strong className="text-slate-900 dark:text-white tabular-nums">{typeof loc.longitude === 'number' ? loc.longitude.toFixed(5) : loc.longitude}</strong>
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
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Kebijakan Penugasan Lokasi Staf:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="policy"
                      value="any_office"
                      checked={assignmentPolicy === 'any_office'}
                      onChange={() => setAssignmentPolicy('any_office')}
                      className="accent-indigo-600"
                    />
                    <span>Fleksibel (Boleh absen di lokasi kantor terdaftar mana pun)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="policy"
                      value="strict_assigned"
                      checked={assignmentPolicy === 'strict_assigned'}
                      onChange={() => setAssignmentPolicy('strict_assigned')}
                      className="accent-indigo-600"
                    />
                    <span>Ketat Terikat (Hanya lokasi spesifik yang ditugaskan supervisor)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Toleransi Akurasi Sensor GPS:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={20}
                    max={200}
                    step={10}
                    value={gpsThreshold}
                    onChange={(e) => setGpsThreshold(Number(e.target.value))}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded-lg">
                    {gpsThreshold}m
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Mencegah GPS spoofing / fake mock location jika akurasi melebihi batas toleransi.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveGeofencePolicy}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Kebijakan Geofence</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: JADWAL & ATURAN PRESENSI CANGGIH (SCHEDULE & WORK HOURS)           */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Pengaturan Jadwal Jam Kerja &amp; Aturan Presensi Terpadu</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  WITA (Asia/Makassar)
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Konfigurasi jam masuk, jam pulang, istirahat per hari (Senin-Kamis 16:30, Jumat 11:00), auto-close, dan izin tugas lapangan
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveScheduleSettings}
              disabled={isSavingSchedule}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/20 self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingSchedule ? 'Menyimpan...' : 'Simpan Pengaturan Jadwal'}</span>
            </button>
          </div>

          {/* Preset Cepat (Quick Presets) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-slate-50 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-slate-900/40 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Preset Pintas Jam Kerja Dinas:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('default_disdik')}
                className="p-3 text-left rounded-xl bg-white dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 group-hover:text-indigo-600 dark:group-hover:text-cyan-400">
                  Standar Disdik HST (Resmi)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sen-Kam pulang 16:30, Jumat pulang 11:00
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('wakar')}
                className="p-3 text-left rounded-xl bg-white dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-300 group-hover:text-indigo-700 dark:group-hover:text-cyan-400">
                  🌙 Jaga Malam / Wakar
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Masuk 20:00 (19:30-21:00) · Pulang 06:00 (05:30-07:00 WITA)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('ramadhan')}
                className="p-3 text-left rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  Bulan Ramadhan
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sen-Kam pulang 15:30, Jumat pulang 10:30
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('six_days')}
                className="p-3 text-left rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Piket 6 Hari Kerja
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sen-Jum standar, Sabtu piket 08:00 - 13:00 WITA
                </div>
              </button>
            </div>
          </div>

          {/* Tabel Matriks Jam Kerja 7 Hari */}
          <div className="p-6 glass-card space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                <span>Matriks Jam Kerja Mingguan (Senin - Minggu)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tentukan jam masuk, batas toleransi, sesi istirahat keluar/masuk, dan jam pulang untuk masing-masing hari kerja
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'monday', label: 'Senin' },
                { key: 'tuesday', label: 'Selasa' },
                { key: 'wednesday', label: 'Rabu' },
                { key: 'thursday', label: 'Kamis' },
                { key: 'friday', label: 'Jumat' },
                { key: 'saturday', label: 'Sabtu' },
                { key: 'sunday', label: 'Minggu' },
              ].map(({ key, label }) => {
                const day = scheduleSettings.workSchedule[key] || {
                  enabled: key !== 'saturday' && key !== 'sunday',
                  dayName: label,
                  clockInStart: '07:00',
                  clockInEnd: '08:30',
                  clockOutStart: key === 'friday' ? '11:00' : '16:30',
                  clockOutEnd: '21:00',
                  enableBreak: key !== 'friday' && key !== 'saturday' && key !== 'sunday',
                  breakStart: '12:00',
                  breakEnd: '13:00',
                };

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all ${
                      day.enabled
                        ? key === 'friday'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/40 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Kolom 1: Nama Hari & Switch Aktif/Libur */}
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={day.enabled}
                            onChange={(e) => handleDayToggle(key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{label}</span>
                            {key === 'friday' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                                Khusus Jumat
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {day.enabled ? 'Hari Kerja Aktif' : 'Libur / Off'}
                          </span>
                        </div>
                      </div>

                      {/* Kolom 2: Jam Masuk & Jam Pulang */}
                      {day.enabled ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 text-xs">
                          {/* Jam Masuk */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Presensi Masuk (Clock In)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="time"
                                value={day.clockInStart}
                                onChange={(e) => handleDayChange(key, 'clockInStart', e.target.value)}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
                              />
                              <span className="text-slate-400 text-[11px]">s.d.</span>
                              <input
                                type="time"
                                value={day.clockInEnd}
                                onChange={(e) => handleDayChange(key, 'clockInEnd', e.target.value)}
                                title="Batas toleransi masuk tepat waktu"
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Sesi Istirahat */}
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Sesi Istirahat Siang
                              </span>
                              <label className="text-[10px] flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={day.enableBreak}
                                  onChange={(e) => handleDayChange(key, 'enableBreak', e.target.checked)}
                                  className="w-3.5 h-3.5 accent-indigo-600 rounded"
                                />
                                <span>Aktif</span>
                              </label>
                            </div>
                            {day.enableBreak ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="time"
                                  value={day.breakStart}
                                  onChange={(e) => handleDayChange(key, 'breakStart', e.target.value)}
                                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                                />
                                <span className="text-slate-400 text-[11px]">-</span>
                                <input
                                  type="time"
                                  value={day.breakEnd}
                                  onChange={(e) => handleDayChange(key, 'breakEnd', e.target.value)}
                                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                                />
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 font-medium py-1">
                                {key === 'friday' ? 'Ditiadakan (Langsung pulang jam 11:00)' : 'Nonaktif'}
                              </div>
                            )}
                          </div>

                          {/* Jam Pulang */}
                          <div className={`p-2.5 rounded-xl border space-y-1 ${
                            key === 'friday'
                              ? 'bg-amber-100/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60'
                          }`}>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Presensi Pulang (Clock Out)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="time"
                                value={day.clockOutStart}
                                onChange={(e) => handleDayChange(key, 'clockOutStart', e.target.value)}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-extrabold text-indigo-700 dark:text-cyan-400"
                              />
                              <span className="text-slate-400 text-[11px]">WITA</span>
                              {key === 'friday' && (
                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 ml-auto">
                                  (Jam 11:00)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-medium italic flex-1 py-2">
                          Tidak ada kewajiban presensi pada hari ini (Hari Libur / Bebas Tugas)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pengaturan Kebijakan Sesi & Auto-Close */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 glass-card space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-600" />
                <span>Aturan Sesi Istirahat Siang</span>
              </h3>
              <p className="text-xs text-slate-500">
                Atur fleksibilitas staf dalam melakukan presensi keluar dan masuk kembali saat istirahat siang
              </p>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleSettings.breakSettings.mandatory}
                    onChange={(e) =>
                      setScheduleSettings((prev) => ({
                        ...prev,
                        breakSettings: { ...prev.breakSettings, mandatory: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 mt-0.5 accent-indigo-600 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">Wajib Presensi Sesi Istirahat</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Jika diaktifkan, staf harus mencatatkan jam keluar istirahat dan jam masuk kembali sebelum diperbolehkan Clock Out pulang.
                    </p>
                  </div>
                </label>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Toleransi Menit Keterlambatan Istirahat:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={scheduleSettings.breakSettings.toleranceMinutes}
                      onChange={(e) =>
                        setScheduleSettings((prev) => ({
                          ...prev,
                          breakSettings: { ...prev.breakSettings, toleranceMinutes: parseInt(e.target.value) || 0 },
                        }))
                      }
                      className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-center font-bold"
                    />
                    <span className="text-slate-500">menit</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 glass-card space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                <span>Kunci Otomatis (Auto-Close) Pergantian Hari</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pencegahan sesi menggantung jika staf lupa melakukan Clock Out pada hari sebelumnya
              </p>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleSettings.autoCloseMissingClockOut}
                    onChange={(e) =>
                      setScheduleSettings((prev) => ({
                        ...prev,
                        autoCloseMissingClockOut: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 mt-0.5 accent-indigo-600 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">Auto-Close Otomatis pada 23:59 WITA</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Jika staf lupa Clock Out hingga tengah malam, sistem otomatis menutup sesi kemarin pada pukul 23:59:59 dan mereset hari baru bersih untuk Clock In masuk berikutnya.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Card 3: Parameter Penugasan Lapangan (Dinas Luar) */}
          <div className="p-6 glass-card space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-600" />
                <span>Parameter &amp; Kebijakan Penugasan Lapangan (Dinas Luar)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengaturan staf alih daya yang bertugas ke sekolah, korwil, pengawasan sarpras, atau kegiatan kedinasan luar kantor
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleSettings.fieldDutySettings.allowSelfAssignment}
                  onChange={(e) =>
                    setScheduleSettings((prev) => ({
                      ...prev,
                      fieldDutySettings: { ...prev.fieldDutySettings, allowSelfAssignment: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 mt-0.5 accent-indigo-600 rounded"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Izin Presensi Tugas Lapangan Mandiri</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Staf dapat mengaktifkan toggle "Tugas Lapangan / Dinas Luar" saat presensi selfie di lokasi tugas lapangan.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleSettings.fieldDutySettings.bypassGeofenceOnFieldDuty}
                  onChange={(e) =>
                    setScheduleSettings((prev) => ({
                      ...prev,
                      fieldDutySettings: { ...prev.fieldDutySettings, bypassGeofenceOnFieldDuty: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 mt-0.5 accent-indigo-600 rounded"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Bypass Geofence saat Tugas Lapangan</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Menghilangkan peringatan pelanggaran merah di dashboard atasan jika staf telah mencentang mode tugas dinas luar.
                  </p>
                </div>
              </label>
            </div>

            {/* Daftar Jenis Penugasan Lapangan Resmi */}
            <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Daftar Jenis Penugasan Lapangan Resmi Terdaftar:
              </span>
              <div className="flex flex-wrap gap-2">
                {scheduleSettings.fieldDutySettings.allowedPurposes.map((purpose, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  >
                    <span>{purpose}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePurpose(idx)}
                      className="text-amber-700 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-100 cursor-pointer"
                      title="Hapus Jenis Tugas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-2 max-w-md">
                <input
                  type="text"
                  value={newPurposeInput}
                  onChange={(e) => setNewPurposeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPurpose()}
                  placeholder="Tambah jenis penugasan dinas baru..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddPurpose}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>

          {/* Tombol Simpan Bawah */}
          <div className="flex justify-end p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={handleSaveScheduleSettings}
              disabled={isSavingSchedule}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/25"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSchedule ? 'Menyimpan ke Server...' : 'Simpan Semua Pengaturan Jam Kerja & Presensi'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PENGATURAN PERAN & HAK AKSES (RBAC)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'rbac' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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

          {/* Supervisor-Subordinate Mapping */}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / UBAH MASTER BIDANG                                      */}
      {/* ========================================================================= */}
      {divisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingDivision ? `Ubah Bidang: ${editingDivision.name}` : 'Tambah Bidang / Sub Bagian Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDivisionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDivision} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bidang / Sub Bagian
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bidang Pembinaan Sekolah Dasar"
                  value={divName}
                  onChange={(e) => setDivName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Singkatan (Div Code)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BID-SD"
                    value={divCode}
                    onChange={(e) => setDivCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Atasan / Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    placeholder="Badaruddin, M.Pd"
                    value={divSupervisor}
                    onChange={(e) => setDivSupervisor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Lingkup Tugas
                </label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan tupoksi unit kerja..."
                  value={divDesc}
                  onChange={(e) => setDivDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDivisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingDivision}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {isSavingDivision ? 'Menyimpan...' : 'Simpan Data Bidang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH / UBAH MASTER VENDOR                                      */}
      {/* ========================================================================= */}
      {vendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingVendor ? `Ubah Vendor: ${editingVendor.name}` : 'Tambah Perusahaan Vendor Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVendorModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Resmi Badan Usaha / Vendor
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Handil Bakti Utama"
                  value={venName}
                  onChange={(e) => setVenName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Vendor
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VND-HBU"
                    value={venCode}
                    onChange={(e) => setVenCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Kerjasama
                  </label>
                  <select
                    value={venStatus}
                    onChange={(e) => setVenStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Aktif">Aktif (Berjalan)</option>
                    <option value="Nonaktif">Nonaktif / Berakhir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Kontrak / SPK Pengadaan
                </label>
                <input
                  type="text"
                  placeholder="027/05/SPK-OUT/DISDIK-HST/2026"
                  value={venContract}
                  onChange={(e) => setVenContract(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mulai Berlaku Kontrak
                  </label>
                  <input
                    type="date"
                    value={venStart}
                    onChange={(e) => setVenStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selesai Masa Kontrak
                  </label>
                  <input
                    type="date"
                    value={venEnd}
                    onChange={(e) => setVenEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama PIC / Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    placeholder="H. Fathurrahman"
                    value={venPic}
                    onChange={(e) => setVenPic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / Telp PIC
                  </label>
                  <input
                    type="text"
                    placeholder="081250001122"
                    value={venPhone}
                    onChange={(e) => setVenPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Kantor Perusahaan
                </label>
                <textarea
                  rows={2}
                  placeholder="Jl. Perintis Kemerdekaan No. 12, Barabai, HST..."
                  value={venAddress}
                  onChange={(e) => setVenAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVendorModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingVendor}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {isSavingVendor ? 'Menyimpan...' : 'Simpan Data Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD PENGGUNA                                         */}
      {/* ========================================================================= */}
      {resetModalOpen && targetUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Kata Sandi Akun
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1">
                <div className="text-[10px] text-slate-400">Target Pengguna:</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {targetUserForReset.name}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  NIP: {targetUserForReset.nip} · {targetUserForReset.email}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru yang Ditetapkan
                </label>
                <input
                  type="text"
                  required
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm tracking-wide"
                />
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>Minimal 6 karakter</span>
                  <button
                    type="button"
                    onClick={() => setResetPasswordInput('Password123!')}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Gunakan Default (Password123!)
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Pengguna akan dapat langsung login menggunakan kata sandi baru ini. Disarankan meminta pengguna segera mengganti sandi melalui menu Profil setelah login.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResettingPass}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {isResettingPass ? 'Mereset...' : 'Terapkan Sandi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT PENUGASAN, ATASAN LANGSUNG & VENDOR                        */}
      {/* ========================================================================= */}
      {editUserModalOpen && targetUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit Penugasan & Atasan: {targetUserForEdit.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bidang / Sub Bagian Penugasan
                  </label>
                  <select
                    value={editUserDivisionId}
                    onChange={(e) => setEditUserDivisionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Pilih Bidang --</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Atasan Langsung (Penilai KPI)
                  </label>
                  {targetUserForEdit?.supervisorRequestStatus === 'PENDING' && (
                    <div className="mb-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold">Pengajuan Pergantian:</span> ke{' '}
                        <strong>{getSupervisorName(targetUserForEdit.pendingSupervisorId)}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveSupervisorRequest(targetUserForEdit.id)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectSupervisorRequest(targetUserForEdit.id)}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  )}
                  <select
                    value={editUserSupervisorId}
                    onChange={(e) => setEditUserSupervisorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Belum Ditetapkan --</option>
                    {supervisorCandidates.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.roleTitle})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Perusahaan Penyedia (Vendor)
                  </label>
                  <select
                    value={editUserVendorName}
                    onChange={(e) => setEditUserVendorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Pilih Vendor Rekanan --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Peran (Role)
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="outsourcing">Tenaga Outsourcing</option>
                    <option value="coordinator">Pengawas Lapangan</option>
                    <option value="supervisor">Supervisor Operasional</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Formasi / Jenis Pekerjaan Baku
                  </label>
                  <select
                    value={OUTSOURCING_JOB_ROLES.includes(editUserRoleTitle as any) ? editUserRoleTitle : '__CUSTOM__'}
                    onChange={(e) => {
                      if (e.target.value !== '__CUSTOM__') {
                        setEditUserRoleTitle(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {OUTSOURCING_JOB_ROLES.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                    <option value="__CUSTOM__">-- Kustom / Posisi Lain --</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Akun Pegawai
                  </label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value as 'Aktif' | 'Nonaktif')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer font-medium"
                  >
                    <option value="Aktif">Aktif (Dapat Login & Presensi)</option>
                    <option value="Nonaktif">Nonaktif (Akses Dinonaktifkan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan / Posisi Kerja Spesifik
                </label>
                <input
                  type="text"
                  value={editUserRoleTitle}
                  onChange={(e) => setEditUserRoleTitle(e.target.value)}
                  placeholder="Contoh: Administrasi Perkantoran / Pramubakti"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {isSavingUserEdit ? 'Menyimpan...' : 'Simpan Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4.B: KONFIRMASI HAPUS PEGAWAI (KEWENANGAN SUPER ADMIN)              */}
      {/* ========================================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/50 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Konfirmasi Hapus Akun Pegawai
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Apakah Anda yakin ingin menghapus data pegawai <strong>{userToDelete.name}</strong> ({userToDelete.nip || userToDelete.email})? Tindakan ini akan menghapus akun, penugasan, presensi, dan evaluasi terkait secara permanen.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1">
                <div><span className="text-slate-400">Jabatan:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{userToDelete.roleTitle}</span></div>
                <div><span className="text-slate-400">Vendor:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{userToDelete.vendorName || '-'}</span></div>
                <div><span className="text-slate-400">Divisi:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{userToDelete.divisionName || '-'}</span></div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeletingUser}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeletingUser}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingUser ? 'Menghapus...' : 'Hapus Permanen'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TAMBAH / UBAH LOKASI MASTER (GEOFENCE MAP PICKER)                */}
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
                  placeholder="Contoh: Kantor Dinas Pendidikan Kab. HST"
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
                  placeholder="Jl. Perintis Kemerdekaan No. 1, Barabai..."
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

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
      {/* MODAL 6: PENDAFTARAN USER BARU                                            */}
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
                  placeholder="danang@disdikhst.go.id"
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
                  placeholder="Contoh: Petugas Kebersihan Area Kantor"
                  value={newUserRoleTitle}
                  onChange={(e) => setNewUserRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Pilih Lokasi Tempat Bekerja / Titik Tugas *</span>
                </label>
                <select
                  value={newUserLocationId}
                  onChange={(e) => setNewUserLocationId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-xs"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} (Radius Absen: {loc.radiusMeters} meter)
                    </option>
                  ))}
                </select>
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
                  disabled={isCreatingUser}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {isCreatingUser ? 'Mendaftarkan...' : 'Daftarkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
