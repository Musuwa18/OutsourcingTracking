/**
 * API Service Client for OutsourceTrack & KPI Pro
 * Menghubungkan frontend React ke backend Express REST API di Port 3010
 */
import { AuthUser, Division, AttendanceRecord, DailyWorkReport, WeeklyEvaluation } from '../types';

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

// 5. Staff List by Division
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

// 6. Attendance API
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

// 7. Daily Reports API
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

export async function apiApproveReport(reportId: string, approvalStatus: string, supervisorNotes: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approvalStatus, supervisorNotes }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Gagal memperbarui status laporan.');
  }
}

// 8. Evaluations API
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
