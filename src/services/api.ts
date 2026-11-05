/**
 * API Service Client for OutsourceTrack & KPI Pro
 * Menghubungkan frontend React ke backend Express REST API di Port 3010
 * Dinas Pendidikan Kabupaten Hulu Sungai Tengah
 */
import { AuthUser, Division, Vendor, UserAccount, OfficeLocation, AttendanceRecord, DailyWorkReport, WeeklyEvaluation } from '../types';

const API_BASE = '/api';

function getAuthHeaders(userId?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

// 1. Auth: Login
export async function apiLogin(credentials: {
  usernameOrEmail: string;
  password?: string;
  deviceId?: string;
  biometricKey?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(credentials),
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
  role: 'outsourcing' | 'supervisor';
  divisionId: string;
  divisionName?: string;
  roleTitle?: string;
  phone?: string;
  vendorName?: string;
  deviceId?: string;
  customLocation?: OfficeLocation | null;
  supervisorId?: string;
  workspaceNote?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Pendaftaran akun gagal.');
  }

  return { token: data.token, user: data.user };
}

// 3. Auth: Bind Device & Biometric
export async function apiBindDevice(userId: string, deviceId: string, biometricKey?: string): Promise<void> {
  await fetch(`${API_BASE}/auth/device-bind`, {
    method: 'POST',
    headers: getAuthHeaders(userId),
    body: JSON.stringify({ userId, deviceId, biometricKey }),
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
): Promise<void> {
  const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(staffId)}/location`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ customLocation, workspaceNote }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan pengaturan lokasi staf.');
  }
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
} = {}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.divisionId && filters.divisionId !== 'div-all') params.append('divisionId', filters.divisionId);
    if (filters.date) params.append('date', filters.date);

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

export async function apiSubmitAttendance(attData: any): Promise<any> {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: getAuthHeaders(attData.staffId),
    body: JSON.stringify(attData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan presensi ke server.');
  }
  return data.attendance;
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
