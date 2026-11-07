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
  AttendanceGlobalSettings,
  DEFAULT_ATTENDANCE_SETTINGS,
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
import { SystemSettingsView, SettingsTab } from './views/SystemSettingsView';
import { AuditLogView } from './views/AuditLogView';
import { PrintReportModal } from './components/PrintReportModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { SecurityMfaModal } from './components/SecurityMfaModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AiAnalyticsChatModal } from './components/AiAnalyticsChatModal';
import { CustomLocationModal } from './components/CustomLocationModal';
import { AuthView } from './views/AuthView';
import { AuthUser, Division, Vendor, FieldCheckinRecord, HelpDeskConfig, DEFAULT_HELPDESK_CONFIG } from './types';
import {
  apiFetchDivisions,
  apiFetchVendors,
  apiFetchAllUsers,
  apiFetchOffices,
  apiUpdateOffices,
  apiFetchAttendance,
  apiFetchReports,
  apiFetchEvaluations,
  apiSubmitAttendance,
  apiSubmitReport,
  apiApproveReport,
  apiSubmitEvaluation,
  apiGetAttendanceSettings,
  apiFetchFieldCheckins,
  apiSubmitFieldCheckin,
  apiGetHelpDeskSettings,
  apiUpdateStaffSupervisor,
} from './services/api';
import { getTodayDateStr, getCurrentWitaTimeStr } from './utils/date';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { SessionTimeoutModal } from './components/SessionTimeoutModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { ProfileModal } from './components/ProfileModal';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const FALLBACK_DIVISIONS: Division[] = [
  {
    id: 'div-kadis',
    name: 'Pucuk Pimpinan SKPD',
    code: 'KADIS',
    description: 'Pimpinan tertinggi Dinas Pendidikan Kabupaten Hulu Sungai Tengah.',
    supervisorName: 'H. Muhammad Anhar, S.STP, ME'
  },
  {
    id: 'div-sekretariat',
    name: 'Sekretariat Dinas Pendidikan',
    code: 'SEKRETARIAT',
    description: 'Pengkoordinasian program, administrasi keuangan, kepegawaian, dan rumah tangga dinas.',
    supervisorName: 'Salihin, S.Pd.SD'
  },
  {
    id: 'div-renlap',
    name: 'Sub Bagian Perencanaan dan Pelaporan',
    code: 'SUB-RENLAP',
    description: 'Penyusunan rencana kerja, evaluasi program, pelaporan kinerja dinas, dan dukungan TI.',
    supervisorName: 'Muhammad Sugeng Wahyudi, A.Md'
  },
  {
    id: 'div-keuangan',
    name: 'Sub Bagian Keuangan',
    code: 'SUB-KEU',
    description: 'Pengelolaan administrasi keuangan, penatausahaan kas, dan pelaporan SPJ dinas.',
    supervisorName: 'Hj. Rabiatul Adawiyah, SE'
  },
  {
    id: 'div-umpeg',
    name: 'Sub Bagian Umum dan Kepegawaian',
    code: 'SUB-UMPEG',
    description: 'Pelayanan administrasi umum, ketertiban, kepegawaian, pengamanan kantor, dan kebersihan.',
    supervisorName: 'Ahmad Humaidi, S.Pd.'
  },
  {
    id: 'div-arsip',
    name: 'Unit Kerja Kearsipan & Arsiparis',
    code: 'ARSIP',
    description: 'Tata kelola kearsipan naskah dinas, dokumen fisik, dan digitalisasi dokumen dinas.',
    supervisorName: 'Petugas Arsip'
  },
  {
    id: 'div-sd',
    name: 'Bidang Pembinaan Sekolah Dasar',
    code: 'BID-SD',
    description: 'Pembinaan kurikulum, peserta didik, GTK, dan kelembagaan Sekolah Dasar se-Kab. HST.',
    supervisorName: 'Badaruddin, M.Pd'
  },
  {
    id: 'div-smp',
    name: 'Bidang Pembinaan SMP',
    code: 'BID-SMP',
    description: 'Pembinaan kurikulum, peserta didik, GTK, dan kelembagaan Sekolah Menengah Pertama se-Kab. HST.',
    supervisorName: 'Alamsyah Mappaompo, S.Pd. MM'
  },
  {
    id: 'div-sarpras',
    name: 'Bidang Sarana Prasarana dan Kelembagaan',
    code: 'BID-SARPRAS',
    description: 'Pembangunan, pemeliharaan, pengadaan sarpras PAUD, SD, SMP, dan inventarisasi aset dinas.',
    supervisorName: 'Bayhaki Novie, S.Pd'
  },
  {
    id: 'div-paud',
    name: 'Bidang PAUD dan Pendidikan Masyarakat',
    code: 'BID-PAUD',
    description: 'Pembinaan PAUD, TK, Pendidikan Kesetaraan, Sanggar Kegiatan Belajar (SKB), dan Dikmas.',
    supervisorName: 'Andry Rachmat Hidayat, S.Kom'
  }
];

// Default fallback for outsourcing staff profile to prevent undefined crashes
const DEFAULT_FALLBACK_STAFF: StaffProfile = {
  id: 'usr-os-default',
  nip: 'OS-DISDIK',
  name: 'Staf Alih Daya',
  email: 'staff@outsource.id',
  phone: '',
  division: 'Dinas Pendidikan Kab. HST',
  vendorName: 'PT Handil Bakti Utama (Mitra Disdik HST)',
  roleTitle: 'Tenaga Outsourcing',
  assignedLocation: PRIMARY_OFFICES[0],
  avatarColor: '#4f46e5',
  initials: 'OS',
  joinDate: '2026-01-01',
  status: 'Aktif',
};

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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    apiFetchDivisions().then((divs) => {
      if (divs && divs.length > 0) setDivisions(divs);
    });
    apiFetchVendors().then((vens) => {
      if (vens && vens.length > 0) setVendors(vens);
    });
    apiFetchOffices().then((offs) => {
      if (offs && offs.length > 0) {
        setLocations(offs);
        localStorage.setItem('ot_locations', JSON.stringify(offs));
      }
    });
    apiFetchAllUsers().then((usrs) => {
      if (usrs && usrs.length > 0) {
        setUsers(usrs);
        localStorage.setItem('ot_users', JSON.stringify(usrs));
        const osUsers = usrs.filter((u: any) => u.role === 'outsourcing');
        const mappedStaff = osUsers.map((u: any) => {
          let customLoc = undefined;
          if (u.customLocationJson) {
            try {
              customLoc = typeof u.customLocationJson === 'string' ? JSON.parse(u.customLocationJson) : u.customLocationJson;
            } catch (e) {}
          }
          return {
            id: u.id,
            nip: u.nip,
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            division: u.divisionName,
            vendorName: u.vendorName || 'PT Handil Bakti Utama (Mitra Disdik HST)',
            roleTitle: u.roleTitle,
            assignedLocation: customLoc || PRIMARY_OFFICES[0],
            customLocation: customLoc,
            workspaceNote: u.workspaceNote || '',
            supervisorId: u.supervisorId || undefined,
            avatarColor: u.avatarColor || '#4f46e5',
            initials: u.initials || u.name.slice(0, 2).toUpperCase(),
            joinDate: '2026-01-02',
            status: 'Aktif' as const,
          };
        });
        setStaffList(mappedStaff);
        localStorage.setItem('ot_staff_list', JSON.stringify(mappedStaff));

        // Sinkronisasi otomatis supervisorMappings dengan atasan aktif dan penugasan riil dari database
        const spvUsers = usrs.filter((u: UserAccount) => u.role === 'supervisor');
        setSupervisorMappings((prev) => {
          const currentSpvIds = new Set(spvUsers.map((s: UserAccount) => s.id));
          const updatedMappings: SupervisorMapping[] = spvUsers.map((spv: UserAccount) => {
            const existing = prev.find((m) => m.supervisorId === spv.id || (spv.nip && m.supervisorId === spv.nip));
            const staffDirectlyAssigned = mappedStaff
              .filter((s: StaffProfile) => s.supervisorId === spv.id || (spv.nip && s.supervisorId === spv.nip))
              .map((s: StaffProfile) => s.id);
            const mergedIds = Array.from(new Set([
              ...(existing ? existing.assignedStaffIds : []),
              ...staffDirectlyAssigned,
            ]));
            return {
              supervisorId: spv.id,
              supervisorName: spv.name,
              supervisorRole: spv.roleTitle || 'Supervisor Operasional',
              assignedStaffIds: mergedIds,
            };
          });

          for (const m of prev) {
            if (!currentSpvIds.has(m.supervisorId)) {
              updatedMappings.push(m);
            }
          }

          localStorage.setItem('ot_supervisor_mappings', JSON.stringify(updatedMappings));
          return updatedMappings;
        });

        // Sinkronisasi otomatis session user aktif dengan data terbaru dari server
        setCurrentUser((prevUser) => {
          if (!prevUser) return null;
          const fresh = usrs.find(
            (u) => u.id === prevUser.id || u.nip === prevUser.nip || u.email === prevUser.email
          );
          if (fresh) {
            const updated: AuthUser = {
              ...prevUser,
              name: fresh.name,
              initials: fresh.initials || fresh.name.slice(0, 2).toUpperCase(),
              avatarColor: fresh.avatarColor || prevUser.avatarColor,
              roleTitle: fresh.roleTitle || prevUser.roleTitle,
              divisionName: fresh.divisionName || prevUser.divisionName,
              divisionId: fresh.divisionId || prevUser.divisionId,
              vendorName: fresh.vendorName || prevUser.vendorName,
              supervisorId: fresh.supervisorId,
              pendingSupervisorId: fresh.pendingSupervisorId,
              supervisorChangeCount: fresh.supervisorChangeCount,
              supervisorRequestStatus: fresh.supervisorRequestStatus,
            };
            localStorage.setItem('ot_session_user', JSON.stringify(updated));
            return updated;
          }
          return prevUser;
        });
      }
    });

    // 1. Sinkronisasi Server-First Riwayat Presensi (Clock In / Out) dari SQLite
    apiFetchAttendance({ todayDateStr: getTodayDateStr() }).then((attList) => {
      if (attList && attList.length > 0) {
        setAttendanceRecords(attList);
        localStorage.setItem('ot_attendance_records', JSON.stringify(attList));
      }
    });

    // 1b. Sinkronisasi Pengaturan Presensi & Jam Kerja dari SQLite
    apiGetAttendanceSettings().then((settings) => {
      if (settings) {
        setAttendanceSettings(settings);
        localStorage.setItem('ot_attendance_settings', JSON.stringify(settings));
      }
    });

    // 2. Sinkronisasi Server-First Laporan Kerja Harian dari SQLite
    apiFetchReports().then((repList) => {
      if (repList && repList.length > 0) {
        setDailyReports(repList);
        localStorage.setItem('ot_daily_reports', JSON.stringify(repList));
      }
    });

    // 3. Sinkronisasi Server-First Evaluasi Kinerja Mingguan dari SQLite
    apiFetchEvaluations().then((evalList) => {
      if (evalList && evalList.length > 0) {
        setWeeklyEvaluations(evalList);
        localStorage.setItem('ot_weekly_evaluations', JSON.stringify(evalList));
      }
    });

    // 4. Sinkronisasi Kunjungan Tugas Lapangan (Multi-Titik) dari SQLite
    apiFetchFieldCheckins().then((fcList) => {
      if (fcList && fcList.length > 0) {
        setFieldCheckins(fcList);
      }
    });

    // 5. Sinkronisasi Konfigurasi Pusat Bantuan & Helpdesk dari SQLite
    apiGetHelpDeskSettings().then((cfg) => {
      if (cfg) setHelpDeskConfig(cfg);
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role !== 'outsourcing') {
        apiFetchAllUsers().then((usrs) => {
          if (usrs && usrs.length > 0) {
            setUsers(usrs);
            localStorage.setItem('ot_users', JSON.stringify(usrs));
          }
        });
      }

      // Re-fetch presensi & laporan setiap kali user login atau sesi diperbarui
      apiFetchAttendance({ todayDateStr: getTodayDateStr() }).then((attList) => {
        if (attList && attList.length > 0) {
          setAttendanceRecords(attList);
          localStorage.setItem('ot_attendance_records', JSON.stringify(attList));
        }
      });

      apiFetchReports().then((repList) => {
        if (repList && repList.length > 0) {
          setDailyReports(repList);
          localStorage.setItem('ot_daily_reports', JSON.stringify(repList));
        }
      });
    }
  }, [currentUser]);

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
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsTab>('users');
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

  // 15-Minute Inactivity Auto-Logout Protocol (with 60-second warning modal)
  const { isWarningOpen, remainingSeconds, extendSession, logoutNow } = useSessionTimeout({
    timeoutMs: 15 * 60 * 1000,
    warningDurationMs: 60 * 1000,
    onTimeout: () => {
      handleLogout();
      showToast('Sesi Anda telah berakhir otomatis karena 15 menit tidak ada aktivitas.', 'warning');
    },
    enabled: Boolean(currentUser),
  });

  // Route guard: Redirect supervisor if accessing admin-only tabs
  useEffect(() => {
    if (currentRole === 'supervisor') {
      if (adminTab === 'pengaturan-keamanan' || adminTab === 'audit-log') {
        setAdminTab('persetujuan-laporan');
      }
    }
  }, [currentRole, adminTab]);

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
  const [fieldCheckins, setFieldCheckins] = useState<FieldCheckinRecord[]>([]);
  const [helpDeskConfig, setHelpDeskConfig] = useState<HelpDeskConfig>(DEFAULT_HELPDESK_CONFIG);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    const saved = localStorage.getItem('ot_audit_logs');
    if (saved) {
      try {
        const parsed: SystemAuditLog[] = JSON.parse(saved);
        // Pembersihan otomatis jika ada nama dummy lawas
        return parsed.map((log) => {
          if (log.actorName && log.actorName.includes('Dian Paramita')) {
            return {
              ...log,
              actorName: 'Admin Sistem Disdik HST',
              role: 'Super Administrator & Analis Sistem TI',
            };
          }
          if (log.actorName && log.actorName.includes('Hendra Wijaya')) {
            return {
              ...log,
              actorName: 'Muhammad Sugeng Wahyudi, A.Md',
              role: 'Kasubag Perencanaan dan Pelaporan',
            };
          }
          return log;
        });
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
    return [];
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

  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceGlobalSettings>(() => {
    const saved = localStorage.getItem('ot_attendance_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_ATTENDANCE_SETTINGS;
  });

  // Gemini AI Analytics & Custom Location Modal States
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);
  const [customLocationStaff, setCustomLocationStaff] = useState<StaffProfile | null>(null);

  const handleStaffLocationUpdated = (staffId: string, newLocation: OfficeLocation, note?: string) => {
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === staffId || s.nip === staffId) {
          return {
            ...s,
            assignedLocation: newLocation,
            customLocation: newLocation,
            workspaceNote: note || s.workspaceNote,
          };
        }
        return s;
      })
    );
    addAuditLog(
      'Pembaruan Lokasi Kerja Staf',
      `Titik tugas dan ruang kerja untuk staf ${staffId} disetel ke ${newLocation.name} (Radius: ${newLocation.radiusMeters}m).`,
      'Pengaturan'
    );
  };

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
    apiUpdateOffices(newLocs).catch((err) => console.warn('Sync offices to server failed:', err));
    addAuditLog('Pembaruan Master Lokasi', `Master lokasi diperbarui (${newLocs.length} lokasi aktif).`, 'Pengaturan');
  };

  const handleUpdateUsers = (newUsers: UserAccount[]) => {
    setUsers(newUsers);
    localStorage.setItem('ot_users', JSON.stringify(newUsers));
    
    // Sinkronkan staffList alih daya secara otomatis
    const activeStaff: StaffProfile[] = newUsers
      .filter((u) => u.role === 'outsourcing')
      .map((u) => ({
        id: u.id,
        nip: u.nip,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        division: u.divisionName || '',
        vendorName: u.vendorName || '',
        roleTitle: u.roleTitle || 'Tenaga Outsourcing',
        assignedLocation: locations[0],
        supervisorId: u.supervisorId,
        avatarColor: u.avatarColor || '#4f46e5',
        initials: u.initials || 'OS',
        joinDate: '2026-01-01',
        status: (u.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif') as any,
      }));
    setStaffList(activeStaff);

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

  const handleAssignSupervisorStaff = async (supervisorId: string, staffId: string, assign: boolean) => {
    const targetSupervisor =
      users.find((u) => u.id === supervisorId || (u.nip && u.nip === supervisorId)) ||
      supervisorMappings.find((m) => m.supervisorId === supervisorId);
    const targetStaff = staffList.find((s) => s.id === staffId);

    // 1. Update supervisorMappings state & localStorage
    setSupervisorMappings((prev) => {
      const updated = prev.map((m) => {
        if (m.supervisorId === supervisorId) {
          const exists = m.assignedStaffIds.includes(staffId);
          const newIds = assign
            ? (exists ? m.assignedStaffIds : [...m.assignedStaffIds, staffId])
            : m.assignedStaffIds.filter((id) => id !== staffId);
          return { ...m, assignedStaffIds: newIds };
        }
        // Single supervisor invariant: cabut dari supervisor lain jika di-assign ke supervisor baru
        if (assign && m.assignedStaffIds.includes(staffId)) {
          return { ...m, assignedStaffIds: m.assignedStaffIds.filter((id) => id !== staffId) };
        }
        return m;
      });
      localStorage.setItem('ot_supervisor_mappings', JSON.stringify(updated));
      return updated;
    });

    // 2. Update staffList state & localStorage
    setStaffList((prev) => {
      const updated = prev.map((s) => {
        if (s.id === staffId) {
          return {
            ...s,
            supervisorId: assign ? supervisorId : undefined,
          };
        }
        return s;
      });
      localStorage.setItem('ot_staff_list', JSON.stringify(updated));
      return updated;
    });

    // 3. Update users state & localStorage
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === staffId) {
          return {
            ...u,
            supervisorId: assign ? supervisorId : null,
            pendingSupervisorId: null,
            supervisorRequestStatus: assign ? ('APPROVED' as const) : ('NONE' as const),
          };
        }
        return u;
      });
      localStorage.setItem('ot_users', JSON.stringify(updated));
      return updated;
    });

    // 4. Persist to Backend SQLite database
    try {
      await apiUpdateStaffSupervisor(staffId, assign ? supervisorId : '');
      const spvName =
        targetSupervisor?.name ||
        ('supervisorName' in (targetSupervisor || {})
          ? (targetSupervisor as SupervisorMapping).supervisorName
          : supervisorId);
      const actionText = assign
        ? `Staf ${targetStaff?.name || staffId} berhasil ditugaskan ke atasan ${spvName}.`
        : `Penugasan staf ${targetStaff?.name || staffId} dari atasan ${spvName} berhasil dicabut.`;
      showToast(actionText, 'success');
      addAuditLog('Pembaruan Relasi Hierarki', actionText, 'Pengaturan');
    } catch (err: unknown) {
      console.error('Failed to sync supervisor assignment to backend:', err);
      showToast('Gagal menyinkronkan penugasan ke server. Perubahan disimpan secara lokal.', 'warning');
    }
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
        division: currentUser.divisionName || 'Dinas Pendidikan Kab. HST',
        vendorName: currentUser.vendorName || 'PT Handil Bakti Utama (Mitra Disdik HST)',
        roleTitle: currentUser.roleTitle || 'Tenaga Outsourcing',
        assignedLocation: (currentUser as any).customLocation || PRIMARY_OFFICES[0],
        avatarColor: currentUser.avatarColor || '#4f46e5',
        initials: currentUser.initials || 'OS',
        joinDate: '2026-01-01',
        status: 'Aktif' as const,
      };
    }
    const found = staffList.find((s) => s.id === activeStaffId);
    if (found) return found;
    if (staffList.length > 0 && staffList[0]) return staffList[0];
    return DEFAULT_FALLBACK_STAFF;
  }, [currentUser, staffList, activeStaffId]);

  // Filtered staff list for Supervisor (strictly shows staff who selected them as supervisor or mapped by admin)
  const filteredStaffList = useMemo<StaffProfile[]>(() => {
    if (currentUser?.role === 'supervisor') {
      const currentSpvId = currentUser.id;
      const currentSpvNip = currentUser.nip;

      // Check admin mappings for this supervisor
      const mapping = supervisorMappings.find(
        (m) =>
          (currentSpvId && m.supervisorId === currentSpvId) ||
          (currentSpvNip && m.supervisorId === currentSpvNip)
      );
      const assignedFromMapping = mapping?.assignedStaffIds || [];

      return staffList.filter((s) => {
        const matchesDirectSupervisor = Boolean(
          s.supervisorId &&
            (s.supervisorId === currentSpvId || (currentSpvNip && s.supervisorId === currentSpvNip))
        );
        const matchesMapping = assignedFromMapping.includes(s.id);
        return matchesDirectSupervisor || matchesMapping;
      });
    }
    return staffList;
  }, [currentUser, staffList, supervisorMappings]);

  // Derived Monthly Aggregates
  const monthlyAggregates = useMemo(() => {
    return computeMonthlyAggregates(staffList, weeklyEvaluations, '2026-10');
  }, [staffList, weeklyEvaluations]);

  // Today's attendance for active staff (mendukung shift malam / overnight shift H ke H+1)
  const todayDateStr = getTodayDateStr();
  const staffTodayAttendance = useMemo(() => {
    const todayRec = attendanceRecords.find(
      (a) => (a.staffId === currentStaff?.id || a.staffId === currentUser?.id) && a.date === todayDateStr
    );
    if (todayRec) return todayRec;

    // Cek shift malam aktif dari hari kemarin jika saat ini masih pagi hari (sebelum jam 12 siang)
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateStr = yesterday.toISOString().slice(0, 10);
      const overnightRec = attendanceRecords.find(
        (a) =>
          (a.staffId === currentStaff?.id || a.staffId === currentUser?.id) &&
          a.date === yesterdayDateStr &&
          Boolean(a.clockInTime && a.clockInTime >= '18:00') &&
          (!a.clockOutTime || a.clockOutTime === '-' || Boolean(a.autoClosed))
      );
      if (overnightRec) return overnightRec;
    }
    return undefined;
  }, [attendanceRecords, currentStaff, currentUser, todayDateStr]);
  const staffTodayReports = dailyReports.filter(
    (r) => (r.staffId === currentStaff?.id || r.staffId === currentUser?.id) && r.date === todayDateStr
  );

  // Pending daily reports for supervisor badge
  const pendingReportsCount = dailyReports.filter((r) => r.supervisorApproval === 'Pending').length;

  // Active geofence breach count for today (excluding approved field duty)
  const geofenceBreachCount = attendanceRecords.filter(
    (r) => r.date === todayDateStr && (r.locationCoords ? !r.locationCoords.withinRadius && !r.isFieldDuty : false)
  ).length;
  // Isolasi Notifikasi: hanya tampilkan notifikasi yang relevan dengan pengguna yang sedang login
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return notifications;
    if (currentUser.role === 'supervisor') {
      return notifications.filter(
        (n) => n.type === 'geofence_alert' || n.type === 'approval' || n.type === 'evaluation' || !n.staffId || n.userId === currentUser.id
      );
    }
    // Staf outsourcing: hanya notifikasi pribadi miliknya
    return notifications.filter((n) => {
      if (n.staffId && n.staffId !== currentUser.id && n.staffId !== currentStaff?.id) return false;
      if (n.userId && n.userId !== currentUser.id && n.userId !== currentStaff?.id) return false;
      if (n.type === 'geofence_alert' && n.staffId !== currentUser.id && n.staffId !== currentStaff?.id) return false;
      if (n.title.toLowerCase().includes('laporan baru masuk') || n.title.toLowerCase().includes('menunggu konfirmasi')) return false;
      return true;
    });
  }, [notifications, currentUser, currentStaff]);

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
    const resolvedActorName =
      actorName ||
      currentUser?.name ||
      (currentRole === 'outsourcing'
        ? `${currentStaff?.name || 'Staf Alih Daya'} (${currentStaff?.nip || '-'})`
        : currentRole === 'supervisor'
        ? 'Pejabat Penilai Disdik HST'
        : 'Admin Sistem Disdik HST');

    const resolvedRole =
      roleTitle ||
      currentUser?.roleTitle ||
      (currentRole === 'outsourcing'
        ? 'Tenaga Outsourcing'
        : currentRole === 'supervisor'
        ? 'Supervisor Operasional'
        : 'Administrator Utama');

    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      actorName: resolvedActorName,
      role: resolvedRole,
      action,
      detail,
      ipAddress: '103.24.58.12',
      category,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Add notification helper
  const addNotification = (
    title: string,
    message: string,
    type: NotificationItem['type'],
    meta?: Partial<NotificationItem>
  ) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      title,
      message,
      type,
      read: false,
      ...meta,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handle Clock In (Staff)
  const handleClockIn = (selfieBase64: string, locationData: any) => {
    const timeStr = getCurrentWitaTimeStr();
    const targetStaffId = currentStaff?.id || 'usr-os-default';

    const isFieldDuty = Boolean(locationData.isFieldDuty);
    const fieldDutyNotes = locationData.fieldDutyNotes || undefined;

    const newRecord: AttendanceRecord = {
      id: `att-${targetStaffId}-${todayDateStr}`,
      staffId: targetStaffId,
      date: todayDateStr,
      clockInTime: timeStr,
      selfieUrl: selfieBase64,
      locationCoords: locationData,
      status: 'Hadir',
      verifiedBy: isFieldDuty ? 'Disetujui: Penugasan Lapangan' : 'Sistem Geofence WebRTC',
      isFieldDuty,
      fieldDutyNotes,
    };

    setAttendanceRecords((prev) => {
      const filtered = prev.filter(
        (r) => !(r.staffId === targetStaffId && r.date === todayDateStr)
      );
      return [newRecord, ...filtered];
    });

    // Background sync to SQLite server
    apiSubmitAttendance({
      staffId: targetStaffId,
      date: todayDateStr,
      clockInTime: timeStr,
      selfieUrl: selfieBase64,
      locationCoords: locationData,
      status: 'Hadir',
      verifiedBy: isFieldDuty ? 'Disetujui: Penugasan Lapangan' : 'Sistem Geofence WebRTC',
      isFieldDuty,
      fieldDutyNotes,
    }).catch((err) => console.warn('Sync attendance failed:', err));

    if (isFieldDuty) {
      addAuditLog(
        'Presensi Penugasan Lapangan (Clock In)',
        `${currentStaff?.name || 'Staf'} melakukan Clock-In Tugas Lapangan (${fieldDutyNotes || 'Dinas Luar'}). Koordinat: ${locationData.latitude ? locationData.latitude.toFixed(6) : '-'}, ${locationData.longitude ? locationData.longitude.toFixed(6) : '-'}. Radius dilewati otomatis sesuai kebijakan penugasan.`,
        'Kehadiran'
      );

      addNotification(
        'Presensi Tugas Lapangan Berhasil',
        `Clock In Tugas Lapangan tercatat pada pukul ${timeStr} WITA (${fieldDutyNotes || 'Dinas Luar'}).`,
        'attendance',
        { staffId: targetStaffId, userId: currentUser.id }
      );
    } else if (!locationData.withinRadius) {
      addAuditLog(
        'Pelanggaran Geofence: Presensi di Luar Radius',
        `PERINGATAN GEOFENCE: ${currentStaff?.name || 'Staf'} presensi di luar radius aman (${locationData.distanceMeters}m dari ${locationData.locationName}, batas radius ${currentStaff?.assignedLocation?.radiusMeters || 80}m). Notifikasi otomatis dikirim ke supervisor.`,
        'Kehadiran'
      );

      addNotification(
        'Peringatan Geofence: Presensi di Luar Radius',
        `${currentStaff?.name || 'Staf'} (${currentStaff?.nip || '-'}) melakukan Clock-In berjarak ${locationData.distanceMeters} meter dari ${locationData.locationName} (Batas Radius Aman: ${currentStaff?.assignedLocation?.radiusMeters || 80}m).`,
        'geofence_alert',
        { staffId: targetStaffId, severity: 'warning', distanceExceededMeters: locationData.distanceMeters, locationName: locationData.locationName }
      );
    } else {
      addAuditLog(
        'Presensi Masuk (Clock In)',
        `Berhasil clock-in selfie WebRTC pada ${timeStr} WITA di ${locationData.locationName} (Jarak: ${locationData.distanceMeters}m, Akurasi: ±${Math.round(locationData.accuracy || 0)}m).`,
        'Kehadiran'
      );

      addNotification(
        'Presensi Masuk Berhasil',
        `Clock In Anda pada pukul ${timeStr} WITA telah diverifikasi dan terkunci otomatis oleh server.`,
        'attendance',
        { staffId: targetStaffId, userId: currentUser.id }
      );
    }
  };

  // Handle Break Out (Staff)
  const handleBreakOut = (selfieBase64: string, locationData: any) => {
    const timeStr = getCurrentWitaTimeStr();
    const targetStaffId = currentStaff?.id || 'usr-os-default';

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.staffId === targetStaffId && r.date === todayDateStr) {
          return {
            ...r,
            breakOutTime: timeStr,
          };
        }
        return r;
      })
    );

    apiSubmitAttendance({
      staffId: targetStaffId,
      date: todayDateStr,
      breakOutTime: timeStr,
      locationCoords: locationData,
      status: 'Hadir',
    }).catch((err) => console.warn('Sync break-out failed:', err));

    addAuditLog(
      'Sesi Istirahat Keluar (Break Out)',
      `Staf (${currentStaff?.name || 'Staf'}) mencatat jam istirahat keluar pada ${timeStr} WITA.`,
      'Kehadiran'
    );

    addNotification(
      'Istirahat Dimulai',
      `Jam istirahat keluar tercatat pada ${timeStr} WITA. Selamat beristirahat.`,
      'attendance',
      { staffId: targetStaffId, userId: currentUser.id }
    );
  };

  // Handle Break In (Staff)
  const handleBreakIn = (selfieBase64: string, locationData: any) => {
    const timeStr = getCurrentWitaTimeStr();
    const targetStaffId = currentStaff?.id || 'usr-os-default';

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.staffId === targetStaffId && r.date === todayDateStr) {
          return {
            ...r,
            breakInTime: timeStr,
          };
        }
        return r;
      })
    );

    apiSubmitAttendance({
      staffId: targetStaffId,
      date: todayDateStr,
      breakInTime: timeStr,
      locationCoords: locationData,
      status: 'Hadir',
    }).catch((err) => console.warn('Sync break-in failed:', err));

    addAuditLog(
      'Sesi Kembali Kerja (Break In)',
      `Staf (${currentStaff?.name || 'Staf'}) kembali dari istirahat pada ${timeStr} WITA. Melanjutkan dinas aktif.`,
      'Kehadiran'
    );

    addNotification(
      'Kembali Bertugas',
      `Jam selesai istirahat tercatat pada ${timeStr} WITA. Selamat melanjutkan tugas!`,
      'attendance',
      { staffId: targetStaffId, userId: currentUser.id }
    );
  };

  // Handle Clock Out (Staff - Mendukung Clock Out Shift Malam / Overnight)
  const handleClockOut = (selfieBase64: string, locationData: Partial<AttendanceRecord['locationCoords']>) => {
    const timeStr = getCurrentWitaTimeStr();
    const targetStaffId = currentStaff?.id || 'usr-os-default';
    const targetRecord = staffTodayAttendance;
    const targetDate = targetRecord?.date || todayDateStr;

    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (
          (targetRecord && r.id === targetRecord.id) ||
          (r.staffId === targetStaffId && r.date === targetDate)
        ) {
          return {
            ...r,
            clockOutTime: timeStr,
            clockOutSelfieUrl: selfieBase64,
            clockOutLocationCoords: locationData ? {
              latitude: locationData.latitude || -2.591165,
              longitude: locationData.longitude || 115.373661,
              accuracy: locationData.accuracy || 15,
              locationName: locationData.locationName || 'Lokasi Pulang',
            } : null,
            autoClosed: false,
          };
        }
        return r;
      })
    );

    // Background sync to SQLite server
    apiSubmitAttendance({
      id: targetRecord?.id,
      staffId: targetStaffId,
      date: targetDate,
      clockOutTime: timeStr,
      selfieUrl: selfieBase64,
      clockOutSelfieUrl: selfieBase64,
      locationCoords: locationData,
      status: targetRecord?.status || 'Hadir',
      autoClosed: false,
      verifiedBy: 'Sistem Geofence WebRTC',
    }).catch((err) => console.warn('Sync clock-out failed:', err));

    addAuditLog(
      'Presensi Pulang (Clock Out)',
      `Berhasil clock-out pada ${timeStr} WITA. Jam kerja harian terkunci.`,
      'Kehadiran'
    );

    addNotification(
      'Presensi Pulang Terkunci',
      `Clock Out tercatat pada ${timeStr} WITA. Terima kasih atas dedikasi kerja Anda hari ini!`,
      'attendance',
      { staffId: targetStaffId, userId: currentUser.id }
    );
  };

  // Handle Field Duty Checkin (Staff - Multi-titik kunjungan harian)
  const handleFieldCheckin = (selfieBase64: string, locationData: Partial<AttendanceRecord['locationCoords']>) => {
    const timeStr = getCurrentWitaTimeStr();
    const targetStaffId = currentStaff?.id || 'usr-os-default';

    const newCheckin: FieldCheckinRecord = {
      id: `fld-${targetStaffId}-${Date.now()}`,
      staffId: targetStaffId,
      staffName: currentStaff?.name || 'Staf Lapangan',
      divisionId: currentStaff?.division || 'div-umpeg',
      date: todayDateStr,
      time: timeStr,
      selfieUrl: selfieBase64,
      locationCoords: {
        latitude: locationData.latitude || -2.591165,
        longitude: locationData.longitude || 115.373661,
        accuracy: locationData.accuracy || 15,
        locationName: locationData.locationName || 'Lokasi Tugas Lapangan',
      },
      activityNotes: locationData.fieldDutyNotes || 'Presensi tugas lapangan',
      verifiedBy: 'Sistem GPS WebRTC',
      createdAt: new Date().toISOString(),
    };

    setFieldCheckins((prev) => [newCheckin, ...prev]);

    apiSubmitFieldCheckin({
      staffId: targetStaffId,
      staffName: currentStaff?.name,
      divisionId: currentStaff?.division,
      date: todayDateStr,
      time: timeStr,
      selfieUrl: selfieBase64,
      locationCoords: {
        latitude: locationData.latitude || -2.591165,
        longitude: locationData.longitude || 115.373661,
        accuracy: locationData.accuracy || 15,
        locationName: locationData.locationName || 'Lokasi Tugas Lapangan',
      },
      activityNotes: locationData.fieldDutyNotes,
      verifiedBy: 'Sistem GPS WebRTC',
    }).catch((err: unknown) => console.warn('Submit field checkin failed:', err));

    addAuditLog(
      'Presensi Tugas Lapangan',
      `Check-in titik lapangan: "${locationData.locationName || 'Tugas Lapangan'}" pada ${timeStr} WITA.`,
      'Kehadiran'
    );

    showToast(`Presensi tugas lapangan di "${locationData.locationName || 'Lokasi Tugas'}" berhasil dicatat!`, 'success');
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
      description: newReport.summary,
      summary: newReport.summary,
      category: newReport.category,
      photoUrl: newReport.documentationPhotoUrl,
      documentationPhotoUrl: newReport.documentationPhotoUrl,
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
        `${currentStaff?.name || 'Staf'} mengirimkan laporan "${newReport.title}" dengan foto terindikasi duplikat (${newReport.aiDuplicateFlag.similarityScore}% kesamaan). Harap periksa di feed supervisi.`,
        'approval',
        { staffId: currentStaff?.id, severity: 'warning' }
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
        'approval',
        { staffId: currentStaff?.id, userId: currentUser.id }
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
      currentUser?.name || 'Pejabat Penilai Disdik HST',
      currentUser?.roleTitle || 'Supervisor Kedinasan'
    );

    addNotification(
      'Laporan Telah Disetujui',
      `Laporan "${report?.title || ''}" telah disetujui oleh Supervisor.`,
      'approval',
      { staffId: report?.staffId, userId: report?.staffId }
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
      currentUser?.name || 'Pejabat Penilai Disdik HST',
      currentUser?.roleTitle || 'Supervisor Kedinasan'
    );

    addNotification(
      'Laporan Memerlukan Revisi',
      `Catatan Supervisor: "${notes}". Harap perbarui data laporan Anda.`,
      'approval',
      { staffId: report?.staffId, userId: report?.staffId }
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
      currentUser?.name || 'Pejabat Penilai Disdik HST',
      currentUser?.roleTitle || 'Supervisor Kedinasan'
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
        <AuthView
          divisions={divisions}
          vendors={vendors}
          locations={locations}
          onLoginSuccess={handleLoginSuccess}
          onShowToast={showToast}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
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
        <PwaInstallBanner />
      </div>
    );
  }

  return (
    <div
      className={`min-h-full w-full max-w-full overflow-x-hidden flex flex-col relative transition-colors ${
        highContrast ? 'contrast-125 saturate-110 font-medium' : ''
      }`}
    >
      {/* Soothing Ambient Background (Calm & Non-Glaring) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 ambient-calm" aria-hidden="true" />

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
        notifications={userNotifications}
        onOpenNotifications={() => setNotificationDrawerOpen(true)}
        onOpenCloudSync={() => setCloudSyncOpen(true)}
        onOpenSecurityModal={() => setSecurityModalOpen(true)}
        onOpenAiChat={() => setAiChatOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        helpDeskConfig={helpDeskConfig}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full max-w-full mx-auto relative z-10 overflow-x-hidden">
        
        {/* Desktop Sidebar (Rendered for Supervisor and Admin) */}
        {currentRole !== 'outsourcing' && (
          <Sidebar
            currentTab={adminTab}
            onTabChange={(tab) => {
              if (currentRole === 'supervisor' && (tab === 'pengaturan-keamanan' || tab === 'audit-log')) {
                return;
              }
              setAdminTab(tab);
            }}
            currentRole={currentRole}
            pendingReportsCount={pendingReportsCount}
            geofenceBreachCount={geofenceBreachCount}
            glassMode={glassMode}
            settingsSubTab={settingsSubTab}
            onSettingsSubTabChange={(sub) => {
              if (currentRole !== 'admin') return;
              setAdminTab('pengaturan-keamanan');
              setSettingsSubTab(sub as SettingsTab);
            }}
          />
        )}

        {/* Content Viewport */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 w-full max-w-full overflow-x-hidden pb-28 md:pb-8">
          {/* ================= OUTSOURCING STAFF VIEW (MOBILE ERGONOMIC) ================= */}
          {currentRole === 'outsourcing' && (
            <div>
              {mobileTab === 'beranda' && (
                <StaffHomeView
                  tabMode="presensi"
                  staff={currentStaff}
                  todayAttendance={staffTodayAttendance}
                  todayReports={staffTodayReports}
                  allReports={dailyReports}
                  staffList={staffList}
                  activeStaffId={currentStaff?.id || ''}
                  attendanceSettings={attendanceSettings}
                  fieldCheckins={fieldCheckins}
                  onClockIn={handleClockIn}
                  onFieldCheckin={handleFieldCheckin}
                  onBreakOut={handleBreakOut}
                  onBreakIn={handleBreakIn}
                  onClockOut={handleClockOut}
                  onSubmitReport={handleSubmitReport}
                  onNavigateToReports={() => setMobileTab('laporan')}
                />
              )}

              {mobileTab === 'laporan' && (
                <StaffHomeView
                  tabMode="laporan"
                  staff={currentStaff}
                  todayAttendance={staffTodayAttendance}
                  todayReports={staffTodayReports}
                  allReports={dailyReports}
                  staffList={staffList}
                  activeStaffId={currentStaff?.id || ''}
                  attendanceSettings={attendanceSettings}
                  fieldCheckins={fieldCheckins}
                  onClockIn={handleClockIn}
                  onFieldCheckin={handleFieldCheckin}
                  onBreakOut={handleBreakOut}
                  onBreakIn={handleBreakIn}
                  onClockOut={handleClockOut}
                  onSubmitReport={handleSubmitReport}
                />
              )}

              {mobileTab === 'riwayat' && (
                <StaffHistoryView
                  staff={currentStaff}
                  attendanceRecords={attendanceRecords}
                  fieldCheckins={fieldCheckins}
                  workReports={dailyReports}
                />
              )}

              {mobileTab === 'profil' && (
                <div className="max-w-2xl mx-auto space-y-4 pb-20">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base"
                        style={{ backgroundColor: currentStaff?.avatarColor || '#4f46e5' }}
                      >
                        {currentStaff?.initials || 'OS'}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {currentStaff?.name || 'Staf Alih Daya'}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {currentStaff?.roleTitle || 'Tenaga Outsourcing'} · {currentStaff?.nip || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vendor Mitra:</span>
                        <span className="font-semibold">{currentStaff?.vendorName || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Divisi Penugasan:</span>
                        <span className="font-semibold">{currentStaff?.division || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Titik Geofence:</span>
                        <span className="font-semibold">{currentStaff?.assignedLocation?.name || 'Kantor Disdik HST'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Radius Aman:</span>
                        <span className="font-mono">{currentStaff?.assignedLocation?.radiusMeters || 80} meter</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tanggal Bergabung:</span>
                        <span className="font-mono">{currentStaff?.joinDate || '-'}</span>
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
                  staffList={filteredStaffList}
                  attendanceRecords={attendanceRecords}
                  dailyReports={dailyReports}
                  fieldCheckins={fieldCheckins}
                  onOpenPrintModal={() => setPrintModalOpen(true)}
                  onOpenAiChat={() => setAiChatOpen(true)}
                />
              )}

              {adminTab === 'persetujuan-laporan' && (
                <SupervisorEvaluationView
                  currentUser={currentUser}
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
                  currentUser={currentUser}
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
                  onOpenAiChat={() => setAiChatOpen(true)}
                />
              )}

              {adminTab === 'audit-log' && currentRole === 'admin' && (
                <AuditLogView auditLogs={auditLogs} />
              )}

              {adminTab === 'pengaturan-keamanan' && currentRole === 'admin' && (
                <SystemSettingsView
                  locations={locations}
                  onUpdateLocations={handleUpdateLocations}
                  staffList={staffList}
                  users={users}
                  onUpdateUsers={handleUpdateUsers}
                  divisions={divisions}
                  onUpdateDivisions={(newDivs) => setDivisions(newDivs)}
                  vendors={vendors}
                  onUpdateVendors={(newVens) => setVendors(newVens)}
                  sessions={sessions}
                  onUpdateSessions={handleUpdateSessions}
                  geofenceConfig={geofenceConfig}
                  onUpdateGeofenceConfig={handleUpdateGeofenceConfig}
                  rolePermissions={rolePermissions}
                  onUpdateRolePermissions={handleUpdateRolePermissions}
                  supervisorMappings={supervisorMappings}
                  onUpdateSupervisorMappings={handleUpdateSupervisorMappings}
                  onAssignSupervisorStaff={handleAssignSupervisorStaff}
                  securityConfig={securityConfig}
                  onUpdateSecurityConfig={handleUpdateSecurityConfig}
                  attendanceSettings={attendanceSettings}
                  onUpdateAttendanceSettings={(s) => setAttendanceSettings(s)}
                  helpDeskConfig={helpDeskConfig}
                  onUpdateHelpDeskConfig={(cfg) => setHelpDeskConfig(cfg)}
                  onConfigureLocation={(staff) => setCustomLocationStaff(staff)}
                  activeSubTab={settingsSubTab}
                  onSubTabChange={(sub) => setSettingsSubTab(sub)}
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
            if (currentRole === 'supervisor' && (tab === 'pengaturan-keamanan' || tab === 'audit-log')) {
              return;
            }
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
        currentUser={currentUser}
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
        notifications={userNotifications}
        userRole={currentUser?.role}
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

      {/* Gemini AI Analytics Chat Modal */}
      <AiAnalyticsChatModal
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        currentUserRole={currentRole}
        currentUserName={currentUser?.name}
      />

      {/* Setting Ruang Kerja & Titik Geofence Khusus */}
      <CustomLocationModal
        isOpen={Boolean(customLocationStaff)}
        staff={customLocationStaff}
        onClose={() => setCustomLocationStaff(null)}
        onLocationUpdated={handleStaffLocationUpdated}
        onShowToast={showToast}
      />

      {/* PWA Mobile & Desktop Install Prompt */}
      <PwaInstallBanner />

      {/* 15-Minute Session Inactivity Timeout Countdown */}
      <SessionTimeoutModal
        isOpen={isWarningOpen}
        remainingSeconds={remainingSeconds}
        onExtend={extendSession}
        onLogout={logoutNow}
      />

      {/* User Profile & Password Change Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updated) => {
          setCurrentUser(updated);
          localStorage.setItem('ot_session_user', JSON.stringify(updated));
          setStaffList((prev) =>
            prev.map((s) =>
              s.id === updated.id
                ? {
                    ...s,
                    phone: updated.phone || s.phone,
                    supervisorId: updated.supervisorId,
                    pendingSupervisorId: updated.pendingSupervisorId,
                    supervisorChangeCount: updated.supervisorChangeCount,
                    supervisorRequestStatus: updated.supervisorRequestStatus,
                  }
                : s
            )
          );
        }}
        onShowToast={showToast}
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
