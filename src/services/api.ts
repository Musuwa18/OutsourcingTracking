/**
 * API Service Client for OutsourceTrack & KPI Pro
 * Menghubungkan frontend React ke backend Express REST API di Port 3010
 * Dinas Pendidikan Kabupaten Hulu Sungai Tengah
 */
import { AuthUser, UserRole, Division, Vendor, UserAccount, OfficeLocation, AttendanceRecord, DailyWorkReport, WeeklyEvaluation, FieldCheckinRecord, HelpDeskConfig, InstitutionSettings, OvertimeRecord, LeaveRequest, LeaveQuota, NotificationItem } from '../types';

const API_BASE = '/api';

function getAuthHeaders(userId?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  let uid = userId;
  if (!uid && typeof window !== 'undefined') {
    try {
      const sess = localStorage.getItem('ot_session_user');
      if (sess) {
        const u = JSON.parse(sess);
        uid = u.id;
      }
    } catch {}
  }
  if (uid) {
    headers['x-user-id'] = uid;
  }
  return headers;
}

import { getHardwareDeviceFingerprint, getDeviceFingerprint } from '../lib/deviceFingerprint';

// 1. Auth: Login
export async function apiLogin(credentials: {
  usernameOrEmail: string;
  password?: string;
  deviceId?: string;
  hardwareFingerprint?: string;
  biometricKey?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const hwFp = credentials.hardwareFingerprint || credentials.deviceId || getDeviceFingerprint();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...credentials,
      deviceId: credentials.deviceId || hwFp,
      hardwareFingerprint: hwFp,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal masuk. Periksa kembali NIP/Email dan kata sandi.');
  }

  return { token: data.token, user: data.user };
}

// 2. Auth: Register
export async function apiRegister(userData: {
  nip: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  divisionId: string;
  divisionName?: string;
  roleTitle?: string;
  phone?: string;
  vendorName?: string;
  supervisedGroups?: string[];
  supervisedVendor?: string;
  deviceId?: string;
  hardwareFingerprint?: string;
  customLocation?: OfficeLocation | null;
  supervisorId?: string;
  workspaceNote?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const hwFp = userData.hardwareFingerprint || userData.deviceId || getDeviceFingerprint();
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...userData,
      deviceId: userData.deviceId || hwFp,
      hardwareFingerprint: hwFp,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Pendaftaran akun gagal.');
  }

  return { token: data.token, user: data.user };
}

// 3. Auth: Bind Device & Biometric
export async function apiBindDevice(userId: string, deviceId: string, biometricKey?: string, hardwareFingerprint?: string): Promise<void> {
  const hwFp = hardwareFingerprint || deviceId || getDeviceFingerprint();
  await fetch(`${API_BASE}/auth/device-bind`, {
    method: 'POST',
    headers: getAuthHeaders(userId),
    body: JSON.stringify({ userId, deviceId: deviceId || hwFp, hardwareFingerprint: hwFp, biometricKey }),
  });
}

// 4. Master Divisions
export async function apiFetchDivisions(): Promise<Division[]> {
  try {
    const res = await fetch(`${API_BASE}/divisions`);
    const data = await res.json();
    if (res.ok && data.divisions) {
      return data.divisions;
    }
  } catch (err) {
    console.warn('[API] Fallback offline divisions');
  }
  return [];
}

export async function apiCreateDivision(division: Partial<Division>): Promise<any> {
  const res = await fetch(`${API_BASE}/divisions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(division),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menambahkan bidang/subbagian.');
  return data;
}

export async function apiUpdateDivision(id: string, division: Partial<Division>): Promise<any> {
  const res = await fetch(`${API_BASE}/divisions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(division),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memperbarui bidang/subbagian.');
  return data;
}

export async function apiDeleteDivision(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/divisions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus bidang/subbagian.');
  return data;
}

// 4.B. Master Vendors
export async function apiFetchVendors(): Promise<Vendor[]> {
  try {
    const res = await fetch(`${API_BASE}/vendors`);
    const data = await res.json();
    if (res.ok && data.vendors) {
      return data.vendors;
    }
  } catch (err) {
    console.warn('[API] Fallback offline vendors');
  }
  return [];
}

export async function apiCreateVendor(vendor: Partial<Vendor>): Promise<any> {
  const res = await fetch(`${API_BASE}/vendors`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(vendor),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menambahkan vendor.');
  return data;
}

export async function apiUpdateVendor(id: string, vendor: Partial<Vendor>): Promise<any> {
  const res = await fetch(`${API_BASE}/vendors/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(vendor),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memperbarui vendor.');
  return data;
}

export async function apiDeleteVendor(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/vendors/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus vendor.');
  return data;
}

// 4.C. User Accounts & Management
export async function apiFetchAllUsers(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/users`);
    const data = await res.json();
    if (res.ok && data.users) {
      return data.users;
    }
  } catch (err) {
    console.warn('[API] Fallback offline users');
  }
  return [];
}

export async function apiCreateUser(userData: any): Promise<any> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menambahkan akun pegawai baru.');
  return data.user;
}

export async function apiResetPassword(userId: string, newPassword?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mereset kata sandi.');
  return data.message;
}

export async function apiChangePassword(userId: string, oldPassword: string, newPassword: string): Promise<string> {
  const res = await fetch(`${API_BASE}/users/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, oldPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengubah kata sandi.');
  return data.message;
}

export async function apiUpdateUserProfile(userId: string, profileData: any): Promise<any> {
  const res = await fetch(`${API_BASE}/users/${userId}/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memperbarui profil.');
  return data;
}

export async function apiResetUserDevice(userId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/users/${userId}/reset-device`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mereset kunci perangkat.');
  return data;
}

export async function apiDeleteUser(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus pengguna.');
}

// 5. Master Offices (Titik Lokasi Kerja Resmi HST)
export async function apiFetchOffices(): Promise<OfficeLocation[]> {
  try {
    const res = await fetch(`${API_BASE}/offices`);
    const data = await res.json();
    if (res.ok && data.offices) {
      return data.offices;
    }
  } catch (err) {
    console.warn('[API] Fallback offline offices');
  }
  return [];
}

export async function apiUpdateOffices(offices: OfficeLocation[]): Promise<OfficeLocation[]> {
  const res = await fetch(`${API_BASE}/offices`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ offices }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memperbarui master lokasi.');
  return data.offices;
}

// 6. Staff List by Division
export async function apiFetchStaff(divisionId?: string): Promise<any[]> {
  try {
    const url = divisionId && divisionId !== 'div-all'
      ? `${API_BASE}/staff?divisionId=${encodeURIComponent(divisionId)}`
      : `${API_BASE}/staff`;
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.staff) {
      return data.staff;
    }
  } catch (err) {
    console.warn('[API] Fallback offline staff');
  }
  return [];
}

// 7. Update Staff Work Location (Setting Ruang Kerja Khusus Per Orang)
export async function apiUpdateStaffLocation(
  staffId: string,
  customLocation: OfficeLocation | null,
  workspaceNote?: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/location`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ customLocation, workspaceNote }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan pengaturan lokasi staf.');
  }
  return data;
}

// 8. Update Staff Direct Supervisor
export async function apiUpdateStaffSupervisor(
  staffId: string,
  supervisorId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/supervisor`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ supervisorId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memperbarui atasan langsung staf.');
  }
}

// 9. Attendance API
export async function apiFetchAttendance(filters: {
  staffId?: string;
  divisionId?: string;
  date?: string;
  todayDateStr?: string;
} = {}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.divisionId && filters.divisionId !== 'div-all') params.append('divisionId', filters.divisionId);
    if (filters.date) params.append('date', filters.date);
    if (filters.todayDateStr) params.append('todayDateStr', filters.todayDateStr);

    const res = await fetch(`${API_BASE}/attendance?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.attendance) {
      return data.attendance;
    }
  } catch (err) {
    console.warn('[API] Fallback offline attendance');
  }
  return [];
}

export interface ServerTimeInfo {
  success: boolean;
  timestamp: number;
  iso: string;
  date: string;
  time: string;
  timezone: string;
  timezoneLabel: string;
  ntpLocked: boolean;
}

export async function apiFetchServerTime(): Promise<ServerTimeInfo> {
  const res = await fetch(`${API_BASE}/time`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengambil waktu server.');
  }
  return data as ServerTimeInfo;
}

export async function apiSubmitAttendance(attData: any): Promise<any> {
  const hwFp = attData.hardwareFingerprint || attData.deviceFingerprint || attData.deviceId || getDeviceFingerprint();
  const payload = {
    ...attData,
    hardwareFingerprint: hwFp,
    deviceFingerprint: hwFp,
    deviceId: attData.deviceId || hwFp,
  };
  const res = await fetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: getAuthHeaders(attData.staffId),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan presensi ke server.');
  }
  return data.attendance;
}

export async function apiFetchTodayAttendance(staffId: string): Promise<AttendanceRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/attendance/today?staffId=${encodeURIComponent(staffId)}`, {
      headers: getAuthHeaders(staffId),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.attendance as AttendanceRecord;
    }
  } catch (err) {
    console.warn('[API] Fallback offline today attendance:', err);
  }
  return null;
}

export async function apiSubmitBreakAttendance(breakData: {
  type: 'break-out' | 'break-in';
  id?: string;
  staffId: string;
  date?: string;
  time?: string;
  selfieUrl?: string;
  locationCoords?: Partial<AttendanceRecord['locationCoords']>;
}): Promise<AttendanceRecord> {
  const res = await fetch(`${API_BASE}/attendance/break`, {
    method: 'POST',
    headers: getAuthHeaders(breakData.staffId),
    body: JSON.stringify(breakData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan presensi sesi istirahat.');
  }
  return data.attendance as AttendanceRecord;
}

// 10. Daily Reports API
export async function apiFetchReports(filters: {
  staffId?: string;
  divisionId?: string;
} = {}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.divisionId && filters.divisionId !== 'div-all') params.append('divisionId', filters.divisionId);

    const res = await fetch(`${API_BASE}/reports?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.reports) {
      return data.reports;
    }
  } catch (err) {
    console.warn('[API] Fallback offline reports');
  }
  return [];
}

export async function apiSubmitReport(reportData: any): Promise<any> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(reportData.staffId),
    body: JSON.stringify(reportData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengirim laporan kerja ke server.');
  }
  return data.report;
}

export async function apiApproveReport(reportId: string, approvalStatus: string, supervisorNotes?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approvalStatus, supervisorNotes: supervisorNotes || '' }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Gagal memperbarui status laporan.');
  }
}

// 11. Evaluations API
export async function apiFetchEvaluations(filters: {
  staffId?: string;
  divisionId?: string;
} = {}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.divisionId && filters.divisionId !== 'div-all') params.append('divisionId', filters.divisionId);

    const res = await fetch(`${API_BASE}/evaluations?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.evaluations) {
      return data.evaluations;
    }
  } catch (err) {
    console.warn('[API] Fallback offline evaluations');
  }
  return [];
}

export async function apiSubmitEvaluation(evalData: any): Promise<any> {
  const res = await fetch(`${API_BASE}/evaluations`, {
    method: 'POST',
    headers: getAuthHeaders(evalData.supervisorId),
    body: JSON.stringify(evalData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan evaluasi mingguan ke server.');
  }
  return data.evaluation;
}

// 12. GEMINI DATA ANALYTICS AI CHAT
export async function apiAskAiAnalytics(message: string): Promise<{
  reply: string;
  model: string;
  timestamp: string;
}> {
  const res = await fetch(`${API_BASE}/analytics/ai-chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mendapatkan analisis AI.');
  }

  return {
    reply: data.reply,
    model: data.model,
    timestamp: data.timestamp,
  };
}

// 13. Attendance Schedule & Work Hours Settings
export async function apiGetAttendanceSettings(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/settings/attendance`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.settings || null;
  } catch (err) {
    console.warn('apiGetAttendanceSettings warning:', err);
    return null;
  }
}

export async function apiSaveAttendanceSettings(settings: any): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/attendance`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ settings }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan pengaturan jadwal kerja ke server.');
  }
  return data.settings;
}

// 14. SUPERVISOR ASSIGNMENT & APPROVAL WORKFLOW
export async function apiGetSupervisors(): Promise<AuthUser[]> {
  try {
    const res = await fetch(`${API_BASE}/supervisors`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Gagal mengambil daftar atasan.');
    }
    return data.supervisors || [];
  } catch (err: unknown) {
    console.warn('apiGetSupervisors warning:', err);
    return [];
  }
}

export async function apiUpdateUserSupervisor(userId: string, supervisorId: string): Promise<{
  mode: 'DIRECT' | 'PENDING';
  user: AuthUser;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/user/supervisor`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, supervisorId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal mengajukan perubahan atasan.');
  }
  return data;
}

export async function apiApproveSupervisorChange(userId: string): Promise<{ user: AuthUser; message: string }> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/approve-supervisor`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal menyetujui pengajuan atasan.');
  }
  return data;
}

export async function apiRejectSupervisorChange(userId: string): Promise<{ user: AuthUser; message: string }> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/reject-supervisor`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal menolak pengajuan atasan.');
  }
  return data;
}

export interface ProfileChangeRequestPayload {
  userId: string;
  phone?: string;
  divisionId?: string;
  jobRole?: string;
  locationId?: string;
  vendor?: string;
}

export async function apiSubmitProfileChangeRequest(
  payload: ProfileChangeRequestPayload
): Promise<{
  success: boolean;
  user: AuthUser;
  message: string;
  divisionRequested?: boolean;
  adminRequested?: boolean;
}> {
  const res = await fetch(`${API_BASE}/user/request-profile-update`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal mengajukan perubahan profil.');
  }
  return data;
}

export async function apiApproveDivisionChange(userId: string): Promise<{ user: AuthUser; message: string }> {
  const res = await fetch(`${API_BASE}/supervisor/approve-division/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal menyetujui perubahan divisi.');
  }
  return data;
}

export async function apiRejectDivisionChange(userId: string): Promise<{ user: AuthUser; message: string }> {
  const res = await fetch(`${API_BASE}/supervisor/reject-division/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal menolak perubahan divisi.');
  }
  return data;
}

export async function apiApproveAssignmentChange(userId: string): Promise<{ user: AuthUser; message: string }> {
  const res = await fetch(`${API_BASE}/admin/approve-assignment/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal menyetujui pengajuan penugasan.');
  }
  return data;
}

export async function apiRejectAssignmentChange(userId: string): Promise<{ user: AuthUser; message: string }> {
  const res = await fetch(`${API_BASE}/admin/reject-assignment/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal menolak pengajuan penugasan.');
  }
  return data;
}

// 15. FIELD DUTY CHECK-INS (MULTI-TITIK HARIAN)
export async function apiSubmitFieldCheckin(data: {
  staffId: string;
  staffName?: string;
  divisionId?: string;
  date?: string;
  time?: string;
  selfieUrl: string;
  locationCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName: string;
  };
  activityNotes?: string;
  verifiedBy?: string;
}): Promise<FieldCheckinRecord> {
  const res = await fetch(`${API_BASE}/attendance/field-checkin`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal menyimpan presensi tugas lapangan.');
  }
  return json.checkin;
}

export async function apiFetchFieldCheckins(filters: {
  staffId?: string;
  date?: string;
  divisionId?: string;
} = {}): Promise<FieldCheckinRecord[]> {
  try {
    const params = new URLSearchParams();
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.date) params.append('date', filters.date);
    if (filters.divisionId) params.append('divisionId', filters.divisionId);

    const res = await fetch(`${API_BASE}/attendance/field-checkins?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.checkins || [];
  } catch (err: unknown) {
    console.warn('apiFetchFieldCheckins warning:', err);
    return [];
  }
}

// 16. HELPDESK & IT SUPPORT CONFIGURATION
export async function apiGetHelpDeskSettings(): Promise<HelpDeskConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/settings/helpdesk`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.settings || null;
  } catch (err: unknown) {
    console.warn('apiGetHelpDeskSettings warning:', err);
    return null;
  }
}

export async function apiSaveHelpDeskSettings(settings: HelpDeskConfig): Promise<HelpDeskConfig> {
  const res = await fetch(`${API_BASE}/settings/helpdesk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ settings }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal menyimpan pengaturan pusat bantuan.');
  }
  return json.settings;
}

// 17. INSTITUTION IDENTITY & KOP SURAT CONFIGURATION
export async function apiGetInstitutionSettings(): Promise<InstitutionSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/settings/institution`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.settings || json;
  } catch (err: unknown) {
    console.warn('apiGetInstitutionSettings warning:', err);
    return null;
  }
}

export async function apiSaveInstitutionSettings(settings: InstitutionSettings): Promise<InstitutionSettings> {
  const res = await fetch(`${API_BASE}/settings/institution`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ settings }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal menyimpan pengaturan identitas instansi.');
  }
  return json.settings || settings;
}

// 18. OVERTIME ENGINE PRO API
export async function apiSubmitOvertimeRequest(data: {
  staffId: string;
  staffName?: string;
  staffNip?: string;
  divisionId?: string;
  divisionName?: string;
  supervisorId?: string;
  supervisorName?: string;
  date: string;
  startTimePlan?: string;
  estimatedHours: number;
  reason: string;
}): Promise<OvertimeRecord> {
  const res = await fetch(`${API_BASE}/overtime/request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal mengajukan izin lembur.');
  }
  return json.overtime;
}

export async function apiFetchOvertime(filters: {
  staffId?: string;
  supervisorId?: string;
  date?: string;
  status?: string;
} = {}): Promise<OvertimeRecord[]> {
  try {
    const params = new URLSearchParams();
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.supervisorId) params.append('supervisorId', filters.supervisorId);
    if (filters.date) params.append('date', filters.date);
    if (filters.status) params.append('status', filters.status);
    const res = await fetch(`${API_BASE}/overtime?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.overtime || [];
  } catch (err: unknown) {
    console.warn('apiFetchOvertime warning:', err);
    return [];
  }
}

export async function apiApproveOvertime(id: string, payload: {
  approved: boolean;
  supervisorNotes?: string;
}): Promise<OvertimeRecord> {
  const res = await fetch(`${API_BASE}/overtime/${id}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal memperbarui persetujuan lembur.');
  }
  return json.overtime;
}

export async function apiStartOvertime(id: string, payload: {
  clockInTime: string;
  selfieUrl: string;
  coords?: Partial<OvertimeRecord['clockInCoords']>;
}): Promise<OvertimeRecord> {
  const res = await fetch(`${API_BASE}/overtime/${id}/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal mencatat jam mulai lembur.');
  }
  return json.overtime;
}

export async function apiFinishOvertime(id: string, payload: {
  clockOutTime: string;
  selfieUrl: string;
  coords?: Partial<OvertimeRecord['clockOutCoords']>;
  workSummary: string;
  durationMinutes: number;
}): Promise<OvertimeRecord> {
  const res = await fetch(`${API_BASE}/overtime/${id}/finish`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal mengunci jam selesai lembur.');
  }
  return json.overtime;
}

// 13. Modul Manajemen Izin & Cuti Terpadu (Smart Leave Pro)
export async function apiSubmitLeaveRequest(data: {
  staffId: string;
  staffName?: string;
  staffNip?: string;
  divisionId?: string;
  divisionName?: string;
  supervisorId?: string;
  supervisorName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  attachmentUrl?: string;
}): Promise<LeaveRequest> {
  const res = await fetch(`${API_BASE}/leave/request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal mengajukan izin/cuti.');
  }
  return json.leave;
}

export async function apiFetchLeaves(filters: {
  staffId?: string;
  supervisorId?: string;
  date?: string;
  status?: string;
  leaveType?: string;
} = {}): Promise<LeaveRequest[]> {
  try {
    const params = new URLSearchParams();
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.supervisorId) params.append('supervisorId', filters.supervisorId);
    if (filters.date) params.append('date', filters.date);
    if (filters.status) params.append('status', filters.status);
    if (filters.leaveType) params.append('leaveType', filters.leaveType);
    const res = await fetch(`${API_BASE}/leave?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.leaves || [];
  } catch (err: unknown) {
    console.warn('apiFetchLeaves warning:', err);
    return [];
  }
}

export async function apiApproveLeave(id: string, payload: {
  approved: boolean;
  supervisorNotes?: string;
  verifiedBy?: string;
}): Promise<LeaveRequest> {
  const res = await fetch(`${API_BASE}/leave/${id}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Gagal memproses persetujuan izin/cuti.');
  }
  return json.leave;
}

export async function apiFetchLeaveQuota(staffId: string, year?: number): Promise<LeaveQuota | null> {
  try {
    const url = year ? `${API_BASE}/leave/quota/${staffId}?year=${year}` : `${API_BASE}/leave/quota/${staffId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.quota || null;
  } catch (err: unknown) {
    console.warn('apiFetchLeaveQuota warning:', err);
    return null;
  }
}

// 14. REAL-TIME NOTIFICATIONS API
export async function apiFetchNotifications(filters: {
  userId?: string;
  role?: string;
  staffId?: string;
} = {}): Promise<NotificationItem[]> {
  try {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.role) params.append('role', filters.role);
    if (filters.staffId) params.append('staffId', filters.staffId);
    const res = await fetch(`${API_BASE}/notifications?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.notifications || [];
  } catch (err: unknown) {
    console.warn('apiFetchNotifications warning:', err);
    return [];
  }
}

export async function apiCreateNotification(data: Partial<NotificationItem>): Promise<NotificationItem | null> {
  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.notification || null;
  } catch (err: unknown) {
    console.warn('apiCreateNotification warning:', err);
    return null;
  }
}

export async function apiMarkNotificationRead(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
  } catch (err: unknown) {
    console.warn('apiMarkNotificationRead warning:', err);
  }
}

export async function apiMarkAllNotificationsRead(userId?: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
  } catch (err: unknown) {
    console.warn('apiMarkAllNotificationsRead warning:', err);
  }
}

// ==============================================================================
// 15. WEBAUTHN / FIDO2 BIOMETRIC AUTHENTICATION SERVICES
// ==============================================================================

export interface BiometricStatusInfo {
  success: boolean;
  enrolled: boolean;
  count: number;
  credentials: Array<{
    id: string;
    credentialId: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt?: string;
  }>;
}

export async function apiBiometricRegisterOptions(userId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/biometric/register-options`, {
    method: 'POST',
    headers: getAuthHeaders(userId),
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyiapkan pendaftaran biometrik.');
  return data.options;
}

export async function apiBiometricRegisterVerify(
  userId: string,
  response: any,
  deviceName?: string
): Promise<{ success: boolean; message: string; credential: any }> {
  const res = await fetch(`${API_BASE}/auth/biometric/register-verify`, {
    method: 'POST',
    headers: getAuthHeaders(userId),
    body: JSON.stringify({ userId, response, deviceName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memverifikasi pendaftaran biometrik.');
  return data;
}

export async function apiBiometricLoginOptions(usernameOrEmail?: string): Promise<{ options: any; challengeKey: string }> {
  const res = await fetch(`${API_BASE}/auth/biometric/login-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menyiapkan autentikasi biometrik.');
  return { options: data.options, challengeKey: data.challengeKey };
}

export async function apiBiometricLoginVerify(response: any, challengeKey?: string, deviceId?: string, hardwareFingerprint?: string): Promise<{ token: string; user: AuthUser }> {
  const hwFp = hardwareFingerprint || deviceId || getDeviceFingerprint();
  const res = await fetch(`${API_BASE}/auth/biometric/login-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response, challengeKey, deviceId: deviceId || hwFp, hardwareFingerprint: hwFp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Verifikasi biometrik tidak berhasil.');
  return data;
}

export async function apiGetBiometricStatus(userId: string): Promise<BiometricStatusInfo> {
  const res = await fetch(`${API_BASE}/auth/biometric/user/${encodeURIComponent(userId)}`, {
    headers: getAuthHeaders(userId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memeriksa status biometrik.');
  return data;
}

export async function apiDeleteBiometricCredential(credentialId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/biometric/credential/${encodeURIComponent(credentialId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(userId),
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus kunci biometrik.');
}
