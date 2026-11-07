export type UserRole = 'outsourcing' | 'supervisor' | 'admin';

export interface Division {
  id: string;
  name: string;
  code: string;
  description: string;
  supervisorName?: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contractNumber?: string;
  contractStart?: string;
  contractEnd?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  picName?: string;
  picPhone?: string;
  address?: string;
  status: 'Aktif' | 'Nonaktif';
  staffCount?: number;
  totalStaff?: number;
  createdAt?: string;
}

export interface AuthUser {
  id: string;
  nip: string;
  name: string;
  email: string;
  role: UserRole;
  divisionId: string;
  divisionName: string;
  roleTitle: string;
  phone?: string;
  vendorName?: string;
  avatarColor?: string;
  initials?: string;
  deviceId?: string | null;
  biometricKey?: string | null;
  customLocation?: OfficeLocation | null;
  assignedLocation?: OfficeLocation;
  workspaceNote?: string;
  supervisorId?: string;
  pendingSupervisorId?: string | null;
  supervisorChangeCount?: number;
  supervisorRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface StaffProfile {
  id: string;
  nip: string;
  name: string;
  email: string;
  phone: string;
  division: string;
  vendorName: string;
  roleTitle: string;
  assignedLocation: OfficeLocation;
  customLocation?: OfficeLocation | null;
  workspaceNote?: string;
  supervisorId?: string;
  pendingSupervisorId?: string | null;
  supervisorChangeCount?: number;
  supervisorRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  avatarColor: string;
  initials: string;
  joinDate: string;
  status: 'Aktif' | 'Cuti' | 'Nonaktif';
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  model?: string;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // HH:mm:ss
  breakOutTime?: string; // HH:mm:ss (Istirahat Keluar)
  breakInTime?: string; // HH:mm:ss (Istirahat Masuk Kembali)
  clockOutTime?: string; // HH:mm:ss
  selfieUrl: string; // Data URL or styled SVG capture
  clockOutSelfieUrl?: string | null;
  locationCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
    withinRadius: boolean;
    locationName: string;
  };
  clockOutLocationCoords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName: string;
  } | null;
  status: 'Hadir' | 'Terlambat' | 'Izin' | 'Alpha';
  isFieldDuty?: boolean;
  fieldDutyNotes?: string;
  autoClosed?: boolean;
  notes?: string;
  verifiedBy?: string;
}

export interface FieldCheckinRecord {
  id: string;
  staffId: string;
  staffName: string;
  divisionId: string;
  date: string;
  time: string;
  selfieUrl: string;
  locationCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName: string;
  };
  activityNotes?: string;
  verifiedBy?: string;
  createdAt: string;
}

export interface AiDuplicateFlag {
  isDuplicate: boolean;
  similarityScore: number; // 0.0 - 100.0%
  matchedReportId?: string;
  matchedReportTitle?: string;
  matchedReportDate?: string;
  matchedStaffName?: string;
  matchedPhotoUrl?: string;
  flagSeverity: 'high' | 'medium' | 'clean';
  reason?: string;
  justificationNote?: string;
  analyzedAt: string;
}

export interface DailyWorkReport {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: 'Pemeliharaan' | 'Inspeksi & Monitoring' | 'Penanganan Insiden' | 'Pelayanan Pengguna' | 'Laporan Administrasi';
  startTime: string;
  endTime: string;
  summary: string;
  status: 'Selesai' | 'On-Progress';
  documentationPhotoUrl: string;
  imageHash?: string;
  aiDuplicateFlag?: AiDuplicateFlag;
  locationCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName: string;
  };
  supervisorApproval: 'Pending' | 'Disetujui' | 'Revisi';
  supervisorNotes?: string;
  createdAt: string;
}

export interface CompetencyRatings {
  // Pillar A: Kualitas & Produktivitas Kerja
  qualityOfWork: number;       // 1 - 5
  quantityOfWork: number;      // 1 - 5
  timeManagement: number;      // 1 - 5

  // Pillar B: Sikap Kerja & Profesionalisme
  initiative: number;          // 1 - 5
  accountability: number;      // 1 - 5
  punctuality: number;         // 1 - 5

  // Pillar C: Kompetensi Interpersonal
  teamwork: number;            // 1 - 5
  communication: number;       // 1 - 5
  customerOrientation: number; // 1 - 5

  // Pillar D: Adaptabilitas & Pengembangan Diri
  adaptability: number;        // 1 - 5
  problemSolving: number;      // 1 - 5
}

export interface WeeklyEvaluation {
  id: string;
  staffId: string;
  supervisorId: string;
  supervisorName: string;
  weekNumber: number; // 1, 2, 3, 4
  month: string;      // YYYY-MM
  date: string;       // YYYY-MM-DD (typically Friday)
  ratings: CompetencyRatings;
  qualitativeFeedback: string;
  overallWeeklyScore: number; // 1.0 - 5.0
  submittedAt: string;
}

export interface MonthlyAggregate {
  staffId: string;
  month: string; // YYYY-MM
  weekScores: (number | null)[]; // [W1, W2, W3, W4]
  averageScore: number;
  predicate: 'Sangat Baik / Unggul' | 'Baik / Memenuhi Harapan' | 'Cukup / Perlu Peningkatan' | 'Kurang / Evaluasi Khusus' | 'Belum Ada Penilaian';
  contractRecommendation: 'Direkomendasikan Perpanjang Penuh' | 'Perpanjang dengan Masa Evaluasi' | 'Pertimbangan / Pelatihan Khusus' | 'Tidak Direkomendasikan Perpanjang' | 'Belum Ada Evaluasi';
  pillarScores: {
    quality: number;
    professionalism: number;
    interpersonal: number;
    adaptability: number;
  };
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  role: string;
  action: string;
  detail: string;
  ipAddress: string;
  category: 'Kehadiran' | 'Evaluasi' | 'Laporan' | 'Autentikasi' | 'Sistem' | 'Pengaturan';
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'approval' | 'attendance' | 'evaluation' | 'system' | 'geofence_alert';
  read: boolean;
  staffId?: string;
  userId?: string;
  distanceExceededMeters?: number;
  locationName?: string;
  severity?: 'warning' | 'critical' | 'info';
}

export const OUTSOURCING_JOB_ROLES = [
  'Administrasi Perkantoran',
  'Resepsionis',
  'Petugas Kebersihan',
  'Penjaga Malam / Wakar',
  'Driver / Pengemudi',
] as const;

export type OutsourcingJobRole = typeof OUTSOURCING_JOB_ROLES[number];

export interface UserAccount {
  id: string;
  name: string;
  nip: string;
  email: string;
  role: 'outsourcing' | 'coordinator' | 'supervisor' | 'admin';
  roleTitle: string;
  status: 'Aktif' | 'Nonaktif' | 'Tangguhkan';
  divisionId?: string;
  divisionName?: string;
  vendorName?: string;
  supervisorId?: string;
  pendingSupervisorId?: string | null;
  supervisorChangeCount?: number;
  supervisorRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  phone?: string;
  deviceId?: string | null;
  deviceBinding: {
    registered: boolean;
    deviceModel: string;
    deviceUuid?: string;
    registeredAt?: string;
    ipAddress?: string;
  } | null;
  lastLogin?: string;
  avatarColor: string;
  initials: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  role: string;
  device: string;
  ipAddress: string;
  loginTime: string;
  isCurrentSession: boolean;
}

export interface GeofenceGlobalConfig {
  assignmentPolicy: 'fixed' | 'roaming' | 'any_office' | 'strict_assigned';
  gpsAccuracyThreshold: number; // in meters (default 30)
  autoNotifySupervisorOnBreach: boolean;
  strictOpenSkyWarning: boolean;
}

export interface RolePermissions {
  // Presensi
  attendance_clock: boolean;
  attendance_view_self: boolean;
  attendance_view_all: boolean;
  attendance_override_location: boolean;
  // Laporan Kinerja
  report_submit: boolean;
  report_review: boolean;
  report_request_revision: boolean;
  report_delete: boolean;
  // Penilaian KPI 5-Bintang
  kpi_rate_weekly: boolean;
  kpi_view_monthly: boolean;
  kpi_download_raport: boolean;
  // Administrasi & Konfigurasi
  admin_manage_geofence: boolean;
  admin_manage_users: boolean;
  admin_export_reports: boolean;
  admin_view_audit_log: boolean;
}

export interface SupervisorMapping {
  supervisorId: string;
  supervisorName: string;
  supervisorRole: string;
  assignedStaffIds: string[];
}

export interface EnterpriseSecurityConfig {
  requireGoogleSso: boolean;
  requireTwoFactorTotp: boolean;
  requireWebAuthnBiometric: boolean;
  livenessDetection: boolean;
  duplicateReportAiDetection: boolean;
  offlineCryptographicSync: boolean;
  aiNarrativeSummaryEnabled: boolean;
  scheduled1630Reminder: boolean;
}

export interface DayWorkSchedule {
  enabled: boolean;          // Apakah hari kerja aktif
  dayName: string;           // 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
  clockInStart: string;      // Contoh: '07:00'
  clockInEnd: string;        // Batas toleransi masuk, contoh: '08:30'
  clockOutStart: string;     // Contoh: '16:30' (Senin-Kamis), '11:00' (Jumat)
  clockOutEnd: string;       // Batas akhir clock out, contoh: '21:00'
  enableBreak: boolean;      // Mengaktifkan sesi istirahat (Senin-Kamis: true, Jumat: false)
  breakStart: string;        // Contoh: '12:00'
  breakEnd: string;          // Contoh: '13:00'
}

export interface WakarSchedule {
  enabled: boolean;
  clockInStart: string; // '19:30'
  clockInEnd: string;   // '21:00'
  clockOutStart: string;// '05:30'
  clockOutEnd: string;  // '07:00'
  dayName?: string;     // 'Jaga Malam / Wakar'
}

export interface AttendanceGlobalSettings {
  workSchedule: Record<string, DayWorkSchedule>;
  wakarSchedule?: WakarSchedule;
  breakSettings: {
    enabled: boolean;
    mandatory: boolean;
    toleranceMinutes: number;
  };
  fieldDutySettings: {
    allowSelfAssignment: boolean;       // Staf boleh lapor dinas luar mandiri
    requireSupervisorApproval: boolean;  // Membutuhkan verifikasi atasan
    bypassGeofenceOnFieldDuty: boolean; // Menghilangkan status pelanggaran merah jika dinas luar
    allowedPurposes: string[];          // Jenis penugasan resmi
  };
  autoCloseMissingClockOut: boolean;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceGlobalSettings = {
  workSchedule: {
    monday: {
      enabled: true,
      dayName: 'Senin',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    tuesday: {
      enabled: true,
      dayName: 'Selasa',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    wednesday: {
      enabled: true,
      dayName: 'Rabu',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    thursday: {
      enabled: true,
      dayName: 'Kamis',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    friday: {
      enabled: true,
      dayName: 'Jumat',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '11:00',
      clockOutEnd: '20:00',
      enableBreak: false,
      breakStart: '11:30',
      breakEnd: '13:30',
    },
    saturday: {
      enabled: false,
      dayName: 'Sabtu',
      clockInStart: '08:00',
      clockInEnd: '09:00',
      clockOutStart: '13:00',
      clockOutEnd: '17:00',
      enableBreak: false,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    sunday: {
      enabled: false,
      dayName: 'Minggu',
      clockInStart: '08:00',
      clockInEnd: '09:00',
      clockOutStart: '13:00',
      clockOutEnd: '17:00',
      enableBreak: false,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
  },
  breakSettings: {
    enabled: true,
    mandatory: false,
    toleranceMinutes: 15,
  },
  fieldDutySettings: {
    allowSelfAssignment: true,
    requireSupervisorApproval: false,
    bypassGeofenceOnFieldDuty: true,
    allowedPurposes: [
      'Monitoring & Pengawasan Sekolah',
      'Inspeksi & Pemeliharaan Sarpras',
      'Pelayanan Operasional Korwil',
      'Pendampingan Acara Kedinasan',
      'Pengantaran Berkas & Logistik Dinas',
    ],
  },
  autoCloseMissingClockOut: true,
  wakarSchedule: {
    enabled: true,
    dayName: 'Jaga Malam / Wakar',
    clockInStart: '19:30',
    clockInEnd: '21:00',
    clockOutStart: '05:30',
    clockOutEnd: '07:00',
  },
};


