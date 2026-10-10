/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  UserRole,
  StaffProfile,
  AttendanceRecord,
  DailyWorkReport,
  WeeklyEvaluation,
  MonthlyAggregate,
  SystemAuditLog,
  NotificationItem,
  OfficeLocation,
  UserAccount,
  ActiveSession,
  GeofenceGlobalConfig,
  RolePermissions,
  SupervisorMapping,
  EnterpriseSecurityConfig,
} from './types';
import {
  MOCK_STAFF,
  generateInitialAttendance,
  generateInitialReports,
  generateInitialEvaluations,
  computeMonthlyAggregates,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  createSelfieThumbnail,
  INITIAL_USER_ACCOUNTS as INITIAL_USERS,
  INITIAL_ACTIVE_SESSIONS,
  INITIAL_GEOFENCE_CONFIG,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_SUPERVISOR_MAPPINGS,
  INITIAL_SECURITY_CONFIG,
} from './data/mockData';
import { PRIMARY_OFFICES } from './utils/geo';
import { Header } from './components/Header';
import { MobileNavBar } from './components/MobileNavBar';
import { Sidebar } from './components/Sidebar';
import { StaffHomeView } from './views/StaffHomeView';
import { StaffHistoryView } from './views/StaffHistoryView';
import { AdminAttendanceView } from './views/AdminAttendanceView';
import { SupervisorEvaluationView } from './views/SupervisorEvaluationView';
import { AnalyticsMonthlyView } from './views/AnalyticsMonthlyView';
import { SettingsSecurityView } from './views/SettingsSecurityView';
import { SystemSettingsView } from './views/SystemSettingsView';
import { AuditLogView } from './views/AuditLogView';
import { PrintReportModal } from './components/PrintReportModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { SecurityMfaModal } from './components/SecurityMfaModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthView } from './views/AuthView';
import { AuthUser, Division } from './types';
import {
  apiFetchDivisions,
  apiSubmitAttendance,
  apiSubmitReport,
  apiApproveReport,
  apiSubmitEvaluation,
} from './services/api';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const FALLBACK_DIVISIONS: Division[] = [
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

export default function App() {
  // Theme & Accessibility State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ot_dark_mode') === 'true';
  });
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [glassMode, setGlassMode] = useState<boolean>(() => {
    return localStorage.getItem('ot_glass_mode') !== 'false';
  });

  const handleToggleGlassMode = () => {
    setGlassMode((prev) => {
      const next = !prev;
      localStorage.setItem('ot_glass_mode', String(next));
      return next;
    });
  };

  // Authenticated User State & Master Divisions
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('ot_session_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [divisions, setDivisions] = useState<Division[]>(FALLBACK_DIVISIONS);

  useEffect(() => {
    apiFetchDivisions().then((divs) => {
      if (divs && divs.length > 0) setDivisions(divs);
    });
  }, []);

  // Active Role & Navigation (Derived from Authenticated User)
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('ot_session_user');
    if (saved) {
      try {
        return JSON.parse(saved).role || 'outsourcing';
      } catch (e) {}
    }
    return 'outsourcing';
  });
  const [mobileTab, setMobileTab] = useState<string>('beranda');
  const [adminTab, setAdminTab] = useState<string>('monitoring-presensi');

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    localStorage.setItem('ot_session_user', JSON.stringify(user));
    localStorage.setItem('ot_session_token', token);
    if (user.role === 'outsourcing') {
      setActiveStaffId(user.id);
      setMobileTab('beranda');
    } else {
      setAdminTab('persetujuan-laporan');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ot_session_user');
    localStorage.removeItem('ot_session_token');
    showToast('Anda telah keluar dari akun.', 'info');
  };

  // Modals state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Core Data State (Stored in LocalStorage & React State for full interactive persistence)
  const [activeStaffId, setActiveStaffId] = useState<string>(() => {
    return localStorage.getItem('ot_active_staff_id') || 'staff-1';
  });
  const [staffList, setStaffList] = useState<StaffProfile[]>(() => {
    const saved = localStorage.getItem('ot_staff_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return MOCK_STAFF;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('ot_attendance_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return generateInitialAttendance();
  });
  const [dailyReports, setDailyReports] = useState<DailyWorkReport[]>(() => {
    const saved = localStorage.getItem('ot_daily_reports');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return generateInitialReports();
  });
  const [weeklyEvaluations, setWeeklyEvaluations] = useState<WeeklyEvaluation[]>(() => {
    const saved = localStorage.getItem('ot_weekly_evaluations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return generateInitialEvaluations();
  });
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    const saved = localStorage.getItem('ot_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_AUDIT_LOGS;
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('ot_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_NOTIFICATIONS;
  });

  // ================= PUSAT PENGATURAN SISTEM (PERSISTENT STATE) =================
  const [locations, setLocations] = useState<OfficeLocation[]>(() => {
    const saved = localStorage.getItem('ot_locations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return PRIMARY_OFFICES;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('ot_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_USERS;
  });

  const [sessions, setSessions] = useState<ActiveSession[]>(() => {
    const saved = localStorage.getItem('ot_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_ACTIVE_SESSIONS;
  });

  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceGlobalConfig>(() => {
    const saved = localStorage.getItem('ot_geofence_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_GEOFENCE_CONFIG;
  });

  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermissions>>(() => {
    const saved = localStorage.getItem('ot_role_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_ROLE_PERMISSIONS;
  });

  const [supervisorMappings, setSupervisorMappings] = useState<SupervisorMapping[]>(() => {
    const saved = localStorage.getItem('ot_supervisor_mappings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_SUPERVISOR_MAPPINGS;
  });

  const [securityConfig, setSecurityConfig] = useState<EnterpriseSecurityConfig>(() => {
    const saved = localStorage.getItem('ot_security_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_SECURITY_CONFIG;
  });

  // Visual Toast Feedback Notification
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3800);
  };

  // Persistent Update Handlers
  const handleUpdateLocations = (newLocs: OfficeLocation[]) => {
    setLocations(newLocs);
    localStorage.setItem('ot_locations', JSON.stringify(newLocs));
    addAuditLog('Pembaruan Master Lokasi', `Master lokasi diperbarui (${newLocs.length} lokasi aktif).`, 'Pengaturan');
  };

  const handleUpdateUsers = (newUsers: UserAccount[]) => {
    setUsers(newUsers);
    localStorage.setItem('ot_users', JSON.stringify(newUsers));
    addAuditLog('Pembaruan Data Pengguna', `Daftar akun pengguna diperbarui (${newUsers.length} total akun).`, 'Pengaturan');
  };

  const handleUpdateSessions = (newSessions: ActiveSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('ot_sessions', JSON.stringify(newSessions));
    addAuditLog('Revokasi Sesi Pengguna', `Sesi pengguna diputus oleh administrator.`, 'Autentikasi');
  };

  const handleUpdateGeofenceConfig = (newCfg: GeofenceGlobalConfig) => {
    setGeofenceConfig(newCfg);
    localStorage.setItem('ot_geofence_config', JSON.stringify(newCfg));
    addAuditLog('Pembaruan Kebijakan Geofence', `Kebijakan: ${newCfg.assignmentPolicy.toUpperCase()}, Ambang Batas GPS: ${newCfg.gpsAccuracyThreshold}m.`, 'Pengaturan');
  };

  const handleUpdateRolePermissions = (newPerms: Record<string, RolePermissions>) => {
    setRolePermissions(newPerms);
    localStorage.setItem('ot_role_permissions', JSON.stringify(newPerms));
    addAuditLog('Pembaruan Matriks Peran (RBAC)', `Matriks hak akses izin per modul diperbarui.`, 'Pengaturan');
  };

  const handleUpdateSupervisorMappings = (newMappings: SupervisorMapping[]) => {
    setSupervisorMappings(newMappings);
    localStorage.setItem('ot_supervisor_mappings', JSON.stringify(newMappings));
    addAuditLog('Pembaruan Relasi Hierarki', `Pemetaan atasan dan bawahan diperbarui.`, 'Pengaturan');
  };

  const handleUpdateSecurityConfig = (newSec: EnterpriseSecurityConfig) => {
    setSecurityConfig(newSec);
    localStorage.setItem('ot_security_config', JSON.stringify(newSec));
    addAuditLog('Pembaruan Kebijakan Keamanan', `Konfigurasi SSO/2FA/Biometrik diperbarui.`, 'Pengaturan');
  };

  // Auto-sync Core Data to LocalStorage
  useEffect(() => {
    localStorage.setItem('ot_active_staff_id', activeStaffId);
  }, [activeStaffId]);

  useEffect(() => {
    localStorage.setItem('ot_staff_list', JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem('ot_attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('ot_daily_reports', JSON.stringify(dailyReports));
  }, [dailyReports]);

  useEffect(() => {
    localStorage.setItem('ot_weekly_evaluations', JSON.stringify(weeklyEvaluations));
  }, [weeklyEvaluations]);

  useEffect(() => {
    localStorage.setItem('ot_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('ot_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Active outsourcing staff profile for staff role (Locked to authenticated user)
  const currentStaff = useMemo<StaffProfile>(() => {
    if (currentUser && currentUser.role === 'outsourcing') {
      const match = staffList.find(
        (s) => s.id === currentUser.id || s.nip === currentUser.nip || s.email === currentUser.email
      );
      if (match) return match;
      return {
        id: currentUser.id,
        nip: currentUser.nip,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '',
        division: currentUser.divisionName,
        vendorName: currentUser.vendorName || 'PT Indo Tekno Prima',
        roleTitle: currentUser.roleTitle,
        assignedLocation: PRIMARY_OFFICES[0],
        avatarColor: currentUser.avatarColor || '#4f46e5',
        initials: currentUser.initials || 'OT',
        joinDate: '2024-01-01',
        status: 'Aktif' as const,
      };
    }
    return staffList.find((s) => s.id === activeStaffId) || staffList[0];
  }, [currentUser, staffList, activeStaffId]);

  // Filtered staff list for Supervisor (strictly shows staff in their division)
  const filteredStaffList = useMemo<StaffProfile[]>(() => {
    if (currentUser?.role === 'supervisor') {
      const match = staffList.filter((s) => {
        if (currentUser.divisionId === 'div-all') return true;
        if (currentUser.divisionId === 'div-it' && s.id === 'usr-os-001') return true;
        if (currentUser.divisionId === 'div-sec' && s.id === 'usr-os-002') return true;
        if (currentUser.divisionId === 'div-cln' && s.id === 'usr-os-003') return true;
        if (currentUser.divisionId === 'div-drv' && s.id === 'usr-os-004') return true;
        if (currentUser.divisionId === 'div-adm' && s.id === 'usr-os-005') return true;
        return s.division.toLowerCase().includes(currentUser.divisionName.toLowerCase());
      });
      return match.length > 0 ? match : staffList;
    }
    return staffList;
  }, [currentUser, staffList]);

  const handleResetDemoData = () => {
    const initialAtt = generateInitialAttendance();
    const initialRep = generateInitialReports();
    const initialEval = generateInitialEvaluations();

    setStaffList(MOCK_STAFF);
    setAttendanceRecords(initialAtt);
    setDailyReports(initialRep);
    setWeeklyEvaluations(initialEval);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setActiveStaffId('staff-1');

    localStorage.setItem('ot_staff_list', JSON.stringify(MOCK_STAFF));
    localStorage.setItem('ot_attendance_records', JSON.stringify(initialAtt));
    localStorage.setItem('ot_daily_reports', JSON.stringify(initialRep));
    localStorage.setItem('ot_weekly_evaluations', JSON.stringify(initialEval));
    localStorage.setItem('ot_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem('ot_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem('ot_active_staff_id', 'staff-1');

    showToast('Seluruh data operasional berhasil di-reset ke nilai default demo.', 'success');
  };

  // Derived Monthly Aggregates
  const monthlyAggregates = useMemo(() => {
    return computeMonthlyAggregates(staffList, weeklyEvaluations, '2026-10');
  }, [staffList, weeklyEvaluations]);

  // Today's attendance for active staff
  const todayDateStr = '2026-10-09';
  const staffTodayAttendance = attendanceRecords.find(
    (a) => a.staffId === currentStaff.id && a.date === todayDateStr
  );
  const staffTodayReports = dailyReports.filter(
    (r) => r.staffId === currentStaff.id && r.date === todayDateStr
  );

  // Pending daily reports for supervisor badge
  const pendingReportsCount = dailyReports.filter((r) => r.supervisorApproval === 'Pending').length;

  // Active geofence breach count for today
  const geofenceBreachCount = attendanceRecords.filter(
    (r) => r.date === todayDateStr && !r.locationCoords.withinRadius
  ).length;

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ot_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ot_dark_mode', 'false');
    }
  }, [darkMode]);

  // Add system audit log helper
  const addAuditLog = (
    action: string,
    detail: string,
    category: SystemAuditLog['category'],
    actorName?: string,
    roleTitle?: string
  ) => {
    const now = new Date();
    const timeStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('id-ID', { hour12: false })}`;
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      actorName: actorName || (currentRole === 'outsourcing' ? `${currentStaff.name} (${currentStaff.nip})` : currentRole === 'supervisor' ? 'Hendra Wijaya, S.T.' : 'Dian Paramita, S.Kom.'),
      role: roleTitle || (currentRole === 'outsourcing' ? 'Tenaga Outsourcing' : currentRole === 'supervisor' ? 'Supervisor Operasional' : 'Administrator Utama'),
      action,
      detail,
      ipAddress: '103.24.58.12',
      category,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Add notification helper
  const addNotification = (title: string, message: string, type: NotificationItem['type']) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      title,
      message,
      type,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handle Clock In (Staff)
  const handleClockIn = (selfieBase64: string, locationData: any) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });

    const newRecord: AttendanceRecord = {
      id: `att-${currentStaff.id}-${todayDateStr}`,
      staffId: currentStaff.id,
      date: todayDateStr,
      clockInTime: timeStr,
      selfieUrl: selfieBase64,
      locationCoords: locationData,
      status: 'Hadir',
      verifiedBy: 'Sistem Geofence WebRTC',
    };

    setAttendanceRecords((prev) => {
      const filtered = prev.filter(
        (r) => !(r.staffId === currentStaff.id && r.date === todayDateStr)
      );
      return [newRecord, ...filtered];
    });

    // Background sync to SQLite server
    apiSubmitAttendance({
      staffId: currentStaff.id,
      date: todayDateStr,
      clockInTime: timeStr,
      selfieUrl: selfieBase64,
      locationCoords: locationData,
      status: 'Hadir',
      verifiedBy: 'Sistem Geofence WebRTC',
    }).catch((err) => console.warn('Sync attendance failed:', err));

    if (!locationData.withinRadius) {
      addAuditLog(
        'Pelanggaran Geofence: Presensi di Luar Radius',
        `PERINGATAN GEOFENCE: ${currentStaff.name} presensi di luar radius aman (${locationData.distanceMeters}m dari ${locationData.locationName}, batas radius ${currentStaff.assignedLocation.radiusMeters}m). Notifikasi otomatis dikirim ke supervisor.`,
        'Kehadiran'
      );

      addNotification(
        'Peringatan Geofence: Presensi di Luar Radius',
        `${currentStaff.name} (${currentStaff.nip}) melakukan Clock-In berjarak ${locationData.distanceMeters} meter dari ${locationData.locationName} (Batas Radius Aman: ${currentStaff.assignedLocation.radiusMeters}m).`,
        'geofence_alert'
      );
    } else {
      addAuditLog(
        'Presensi Masuk (Clock In)',
        `Berhasil clock-in selfie WebRTC pada ${timeStr} WIB di ${locationData.locationName} (Jarak: ${locationData.distanceMeters}m, Akurasi: ±${Math.round(locationData.accuracy)}m).`,
        'Kehadiran'
      );

      addNotification(
        'Presensi Masuk Berhasil',
        `Clock In Anda pada pukul ${timeStr} WIB telah diverifikasi dan terkunci otomatis oleh server.`,
        'attendance'
      );
    }
  };

  // Handle Clock Out (Staff)
  const handleClockOut = (selfieBase64: string, locationData: any) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.staffId === currentStaff.id && r.date === todayDateStr) {
          return {
            ...r,
            clockOutTime: timeStr,
          };
        }
        return r;
      })
    );

    // Background sync to SQLite server
    apiSubmitAttendance({
      staffId: currentStaff.id,
      date: todayDateStr,
      clockOutTime: timeStr,
      selfieUrl: selfieBase64,
      locationCoords: locationData,
      status: 'Hadir',
      verifiedBy: 'Sistem Geofence WebRTC',
    }).catch((err) => console.warn('Sync clock-out failed:', err));

    addAuditLog(
      'Presensi Pulang (Clock Out)',
      `Berhasil clock-out pada ${timeStr} WIB. Jam kerja harian terkunci.`,
      'Kehadiran'
    );

    addNotification(
      'Presensi Pulang Terkunci',
      `Clock Out tercatat pada ${timeStr} WIB. Terima kasih atas dedikasi kerja Anda hari ini!`,
      'attendance'
    );
  };

  // Handle Submit Report (Staff)
  const handleSubmitReport = (newReportData: Omit<DailyWorkReport, 'id' | 'createdAt'>) => {
    const now = new Date();
    const createdAtStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('id-ID', { hour12: false })}`;

    const newReport: DailyWorkReport = {
      ...newReportData,
      id: `rep-${Date.now()}`,
      createdAt: createdAtStr,
    };

    setDailyReports((prev) => [newReport, ...prev]);

    // Background sync to SQLite server
    apiSubmitReport({
      staffId: newReport.staffId,
      title: newReport.title,
      description: newReport.description,
      category: newReport.category,
      photoUrl: newReport.photoUrl,
      locationCoords: newReport.locationCoords,
      aiDuplicateFlag: newReport.aiDuplicateFlag,
    }).catch((err) => console.warn('Sync report failed:', err));

    if (newReport.aiDuplicateFlag?.isDuplicate) {
      addAuditLog(
        'Peringatan Integritas AI: Foto Duplikat',
        `Laporan "${newReport.title}" diserahkan dengan peringatan foto duplikat (${newReport.aiDuplicateFlag.similarityScore}% mirip dengan "${newReport.aiDuplicateFlag.matchedReportTitle || 'arsip'}"). Justifikasi: "${newReport.aiDuplicateFlag.justificationNote || '-'}"`,
        'Laporan'
      );

      addNotification(
        'Peringatan AI: Foto Terindikasi Duplikat',
        `${currentStaff.name} mengirimkan laporan "${newReport.title}" dengan foto terindikasi duplikat (${newReport.aiDuplicateFlag.similarityScore}% kesamaan). Harap periksa di feed supervisi.`,
        'approval'
      );

      showToast('Laporan terkirim dengan flag AI Duplicate ke Supervisor.', 'warning');
    } else {
      addAuditLog(
        'Pengiriman Laporan Kinerja (AI Lolos)',
        `Mengirimkan laporan "${newReport.title}" dengan foto unik terverifikasi AI perceptual hash.`,
        'Laporan'
      );

      addNotification(
        'Laporan Kinerja Dikirim',
        `Laporan "${newReport.title}" telah diterima sistem dan menunggu konfirmasi Supervisor.`,
        'approval'
      );

      showToast('Laporan berhasil dikirim (Validasi AI: Foto Unik & Otentik).', 'success');
    }
  };

  // Handle Approve Report (Supervisor)
  const handleApproveReport = (reportId: string, notes?: string) => {
    setDailyReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            supervisorApproval: 'Disetujui',
            supervisorNotes: notes,
          };
        }
        return r;
      })
    );

    // Background sync to SQLite server
    apiApproveReport(reportId, 'Disetujui', notes).catch((err) =>
      console.warn('Sync approval failed:', err)
    );

    const report = dailyReports.find((r) => r.id === reportId);
    addAuditLog(
      'Persetujuan Laporan Kinerja',
      `Supervisor menyetujui laporan: "${report?.title || reportId}".`,
      'Laporan',
      'Hendra Wijaya, S.T.',
      'Supervisor Operasional'
    );

    addNotification(
      'Laporan Telah Disetujui',
      `Laporan "${report?.title || ''}" telah disetujui oleh Supervisor.`,
      'approval'
    );
  };

  // Handle Request Revision (Supervisor)
  const handleRequestRevisionReport = (reportId: string, notes: string) => {
    setDailyReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            supervisorApproval: 'Revisi',
            supervisorNotes: notes,
          };
        }
        return r;
      })
    );

    // Background sync to SQLite server
    apiApproveReport(reportId, 'Revisi', notes).catch((err) =>
      console.warn('Sync revision request failed:', err)
    );

    const report = dailyReports.find((r) => r.id === reportId);
    addAuditLog(
      'Permintaan Revisi Laporan',
      `Supervisor meminta revisi pada laporan: "${report?.title || reportId}". Catatan: ${notes}`,
      'Laporan',
      'Hendra Wijaya, S.T.',
      'Supervisor Operasional'
    );

    addNotification(
      'Laporan Memerlukan Revisi',
      `Catatan Supervisor: "${notes}". Harap perbarui data laporan Anda.`,
      'approval'
    );
  };

  // Handle Submit Weekly Evaluation (Supervisor)
  const handleSubmitEvaluation = (
    evalData: Omit<WeeklyEvaluation, 'id' | 'submittedAt'>
  ) => {
    const now = new Date();
    const submittedAtStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('id-ID', { hour12: false })}`;

    const newEval: WeeklyEvaluation = {
      ...evalData,
      id: `eval-${Date.now()}`,
      submittedAt: submittedAtStr,
    };

    setWeeklyEvaluations((prev) => {
      // Replace existing evaluation for same staff, week, and month if present
      const filtered = prev.filter(
        (e) =>
          !(
            e.staffId === newEval.staffId &&
            e.weekNumber === newEval.weekNumber &&
            e.month === newEval.month
          )
      );
      return [newEval, ...filtered];
    });

    // Background sync to SQLite server
    apiSubmitEvaluation(newEval).catch((err) =>
      console.warn('Sync evaluation failed:', err)
    );

    const evaluatedStaff = staffList.find((s) => s.id === evalData.staffId);
    addAuditLog(
      'Pemberian Evaluasi Mingguan (4 Pilar)',
      `Menyelesaikan evaluasi Minggu ke-${evalData.weekNumber} untuk staf ${evaluatedStaff?.name} (Skor: ${evalData.overallWeeklyScore}★).`,
      'Evaluasi',
      'Hendra Wijaya, S.T.',
      'Supervisor Operasional'
    );

    addNotification(
      'Evaluasi Mingguan Selesai',
      `Penilaian 4 pilar untuk ${evaluatedStaff?.name} telah dikunci dan diagregasi ke nilai bulanan.`,
      'evaluation'
    );
  };

  // Push notification simulation trigger
  const handleSimulatePushNotification = () => {
    addNotification(
      'Peringatan Geofence: Presensi di Luar Radius',
      'Reza Pratama (Corporate Security) terdeteksi melakukan Clock-In berjarak 138 meter dari titik tugas (Batas radius aman: 80 meter).',
      'geofence_alert'
    );
  };

  // If user is not logged in, render the secure Auth View
  if (!currentUser) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
        <AuthView onLoginSuccess={handleLoginSuccess} darkMode={darkMode} />
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div
              className={`p-3.5 rounded-2xl shadow-xl border backdrop-blur-md flex items-center justify-between gap-3 text-xs ${
                toast.type === 'success'
                  ? 'bg-slate-900/95 text-white border-slate-700/80 shadow-emerald-950/20'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/95 text-amber-100 border-amber-800 shadow-amber-950/30'
                  : 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-slate-950/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' && (
                  <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {toast.type === 'warning' && (
                  <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Info className="w-4 h-4" />
                  </div>
                )}
                <span className="font-medium leading-snug">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`min-h-full flex flex-col relative transition-colors ${
        highContrast ? 'contrast-125 saturate-110 font-medium' : ''
      }`}
    >
      {/* Dynamic Ambient Glowing Orbs for Material Glass Refraction */}
      {glassMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {/* Luminous Indigo Orb (top-left) */}
          <div className="absolute -top-36 -left-36 w-96 sm:w-[34rem] h-96 sm:h-[34rem] rounded-full bg-gradient-to-br from-indigo-500/25 via-blue-500/20 to-purple-500/10 blur-3xl animate-float-slow" />
          {/* Luminous Cyan/Sky Orb (top-right) */}
          <div className="absolute top-1/4 -right-36 w-96 sm:w-[32rem] h-96 sm:h-[32rem] rounded-full bg-gradient-to-bl from-cyan-400/25 via-indigo-500/15 to-transparent blur-3xl animate-float-delayed" />
          {/* Luminous Violet/Fuchsia Orb (bottom-left) */}
          <div className="absolute -bottom-40 left-1/4 w-96 sm:w-[36rem] h-96 sm:h-[36rem] rounded-full bg-gradient-to-tr from-violet-600/20 via-fuchsia-500/10 to-indigo-500/15 blur-3xl animate-float-slow" />
          {/* Luminous Emerald/Teal Accent Orb (mid-right) */}
          <div className="absolute top-2/3 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-emerald-400/15 via-teal-500/10 to-transparent blur-3xl" />
          
          {/* Micro-grid texture for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(99,102,241,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />
        </div>
      )}

      {/* Top Header */}
      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        onRoleChange={(role) => setCurrentRole(role)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
        glassMode={glassMode}
        onToggleGlassMode={handleToggleGlassMode}
        notifications={notifications}
        onOpenNotifications={() => setNotificationDrawerOpen(true)}
        onOpenCloudSync={() => setCloudSyncOpen(true)}
        onOpenSecurityModal={() => setSecurityModalOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        
        {/* Desktop Sidebar (Rendered for Supervisor and Admin) */}
        {currentRole !== 'outsourcing' && (
          <Sidebar
            currentTab={adminTab}
            onTabChange={(tab) => setAdminTab(tab)}
            currentRole={currentRole}
            pendingReportsCount={pendingReportsCount}
            geofenceBreachCount={geofenceBreachCount}
            glassMode={glassMode}
          />
        )}

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-28 md:pb-8">
          {/* ================= OUTSOURCING STAFF VIEW (MOBILE ERGONOMIC) ================= */}
          {currentRole === 'outsourcing' && (
            <div>
              {mobileTab === 'beranda' && (
                <StaffHomeView
                  staff={currentStaff}
                  todayAttendance={staffTodayAttendance}
                  todayReports={staffTodayReports}
                  allReports={dailyReports}
                  staffList={staffList}
                  activeStaffId={currentStaff.id}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                  onSubmitReport={handleSubmitReport}
                />
              )}

              {mobileTab === 'laporan' && (
                <StaffHomeView
                  staff={currentStaff}
                  todayAttendance={staffTodayAttendance}
                  todayReports={staffTodayReports}
                  allReports={dailyReports}
                  staffList={staffList}
                  activeStaffId={currentStaff.id}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                  onSubmitReport={handleSubmitReport}
                />
              )}

              {mobileTab === 'riwayat' && (
                <StaffHistoryView
                  staff={currentStaff}
                  attendanceRecords={attendanceRecords}
                  workReports={dailyReports}
                />
              )}

              {mobileTab === 'profil' && (
                <div className="max-w-2xl mx-auto space-y-4 pb-20">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base"
                        style={{ backgroundColor: currentStaff.avatarColor }}
                      >
                        {currentStaff.initials}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {currentStaff.name}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {currentStaff.roleTitle} · {currentStaff.nip}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vendor Mitra:</span>
                        <span className="font-semibold">{currentStaff.vendorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Divisi Penugasan:</span>
                        <span className="font-semibold">{currentStaff.division}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Titik Geofence:</span>
                        <span className="font-semibold">{currentStaff.assignedLocation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Radius Aman:</span>
                        <span className="font-mono">{currentStaff.assignedLocation.radiusMeters} meter</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tanggal Bergabung:</span>
                        <span className="font-mono">{currentStaff.joinDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200">
                    <strong>Informasi Geofence & Privasi:</strong> Koordinat GPS perangkat hanya direkam saat tombol presensi atau tombol kirim laporan ditekan secara eksplisit. Tidak ada pelacakan di luar jam tugas.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= SUPERVISOR & ADMIN VIEW ================= */}
          {currentRole !== 'outsourcing' && (
            <div>
              {adminTab === 'monitoring-presensi' && (
                <AdminAttendanceView
                  staffList={staffList}
                  attendanceRecords={attendanceRecords}
                  dailyReports={dailyReports}
                  onOpenPrintModal={() => setPrintModalOpen(true)}
                />
              )}

              {adminTab === 'persetujuan-laporan' && (
                <SupervisorEvaluationView
                  staffList={filteredStaffList}
                  dailyReports={dailyReports}
                  weeklyEvaluations={weeklyEvaluations}
                  attendanceRecords={attendanceRecords}
                  onApproveReport={handleApproveReport}
                  onRequestRevisionReport={handleRequestRevisionReport}
                  onSubmitEvaluation={handleSubmitEvaluation}
                />
              )}

              {adminTab === 'evaluasi-mingguan' && (
                <SupervisorEvaluationView
                  staffList={filteredStaffList}
                  dailyReports={dailyReports}
                  weeklyEvaluations={weeklyEvaluations}
                  attendanceRecords={attendanceRecords}
                  onApproveReport={handleApproveReport}
                  onRequestRevisionReport={handleRequestRevisionReport}
                  onSubmitEvaluation={handleSubmitEvaluation}
                />
              )}

              {adminTab === 'analitik-bulanan' && (
                <AnalyticsMonthlyView
                  staffList={filteredStaffList}
                  monthlyAggregates={monthlyAggregates}
                  weeklyEvaluations={weeklyEvaluations}
                  attendanceRecords={attendanceRecords}
                  onOpenPrintModal={() => setPrintModalOpen(true)}
                />
              )}

              {adminTab === 'audit-log' && (
                <AuditLogView auditLogs={auditLogs} />
              )}

              {adminTab === 'pengaturan-keamanan' && (
                <SystemSettingsView
                  locations={locations}
                  onUpdateLocations={handleUpdateLocations}
                  staffList={staffList}
                  users={users}
                  onUpdateUsers={handleUpdateUsers}
                  sessions={sessions}
                  onUpdateSessions={handleUpdateSessions}
                  geofenceConfig={geofenceConfig}
                  onUpdateGeofenceConfig={handleUpdateGeofenceConfig}
                  rolePermissions={rolePermissions}
                  onUpdateRolePermissions={handleUpdateRolePermissions}
                  supervisorMappings={supervisorMappings}
                  onUpdateSupervisorMappings={handleUpdateSupervisorMappings}
                  securityConfig={securityConfig}
                  onUpdateSecurityConfig={handleUpdateSecurityConfig}
                  onResetDemoData={handleResetDemoData}
                  onShowToast={showToast}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Rendered on mobile for ALL roles) */}
      <MobileNavBar
        currentRole={currentRole}
        activeTab={currentRole === 'outsourcing' ? mobileTab : adminTab}
        onTabChange={(tab) => {
          if (currentRole === 'outsourcing') {
            setMobileTab(tab);
          } else {
            setAdminTab(tab);
          }
        }}
        pendingReportsCount={pendingReportsCount}
        geofenceBreachCount={geofenceBreachCount}
        glassMode={glassMode}
      />

      {/* Printable PDF Modal */}
      <PrintReportModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        staffList={filteredStaffList}
        attendanceRecords={attendanceRecords}
        monthlyAggregates={monthlyAggregates}
        dailyReports={dailyReports}
        weeklyEvaluations={weeklyEvaluations}
        divisions={divisions}
        currentDivisionId={currentUser?.divisionId}
      />

      {/* Google Drive Cloud Sync Modal */}
      <GoogleDriveSyncModal
        isOpen={cloudSyncOpen}
        onClose={() => setCloudSyncOpen(false)}
        onSyncComplete={() => {
          addAuditLog(
            'Sinkronisasi Google Drive',
            'Sinkronisasi cadangan arsip ke Google Drive Corporate Storage berhasil.',
            'Sistem'
          );
          addNotification(
            'Sinkronisasi Cloud Berhasil',
            'Cadangan basis data terenkripsi telah disimpan ke Google Drive.',
            'system'
          );
          showToast('Cadangan basis data berhasil disinkronisasi ke Google Drive.', 'success');
        }}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          );
        }}
        onMarkAllAsRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onSimulatePushNotification={handleSimulatePushNotification}
      />

      {/* Google Auth & MFA Modal */}
      <SecurityMfaModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
      />

      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border backdrop-blur-md flex items-center justify-between gap-3 text-xs ${
              toast.type === 'success'
                ? 'bg-slate-900/95 text-white border-slate-700/80 shadow-emerald-950/20'
                : toast.type === 'warning'
                ? 'bg-amber-950/95 text-amber-100 border-amber-800 shadow-amber-950/30'
                : 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-slate-950/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && (
                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Info className="w-4 h-4" />
                </div>
              )}
              <span className="font-medium leading-snug">{toast.message}</span>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
