export type UserRole = 'outsourcing' | 'supervisor' | 'admin';

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
  avatarColor: string;
  initials: string;
  joinDate: string;
  status: 'Aktif' | 'Cuti' | 'Nonaktif';
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // HH:mm:ss
  clockOutTime?: string; // HH:mm:ss
  selfieUrl: string; // Data URL or styled SVG capture
  locationCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
    withinRadius: boolean;
    locationName: string;
  };
  status: 'Hadir' | 'Terlambat' | 'Izin' | 'Alpha';
  notes?: string;
  verifiedBy?: string;
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
  predicate: 'Sangat Baik / Unggul' | 'Baik / Memenuhi Harapan' | 'Cukup / Perlu Peningkatan' | 'Kurang / Evaluasi Khusus';
  contractRecommendation: 'Direkomendasikan Perpanjang Penuh' | 'Perpanjang dengan Masa Evaluasi' | 'Pertimbangan / Pelatihan Khusus' | 'Tidak Direkomendasikan Perpanjang';
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
  distanceExceededMeters?: number;
  locationName?: string;
  severity?: 'warning' | 'critical' | 'info';
}

export interface UserAccount {
  id: string;
  name: string;
  nip: string;
  email: string;
  role: 'outsourcing' | 'coordinator' | 'supervisor' | 'admin';
  roleTitle: string;
  status: 'Aktif' | 'Tangguhkan';
  deviceBinding: {
    registered: boolean;
    deviceModel: string;
    deviceUuid: string;
    registeredAt: string;
    ipAddress: string;
  } | null;
  lastLogin: string;
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
  assignmentPolicy: 'fixed' | 'roaming';
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

