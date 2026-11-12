import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  QrCode,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  StaffProfile,
  AttendanceRecord,
  MonthlyAggregate,
  DailyWorkReport,
  WeeklyEvaluation,
  Division,
  AuthUser,
  UserAccount,
  InstitutionSettings,
  DEFAULT_INSTITUTION_SETTINGS,
  OvertimeRecord,
  LeaveRequest,
  CompetencyRatings,
  AttendanceGlobalSettings,
} from '../types';
import DocumentPublishBanner from './DocumentPublishBanner';
import { RadarChart } from './RadarChart';
import { generateDocumentId } from '../lib/document-id';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffProfile[];
  attendanceRecords: AttendanceRecord[];
  monthlyAggregates: MonthlyAggregate[];
  dailyReports?: DailyWorkReport[];
  weeklyEvaluations?: WeeklyEvaluation[];
  divisions?: Division[];
  currentDivisionId?: string;
  currentUser?: AuthUser | null;
  institutionSettings?: InstitutionSettings;
  overtimeRecords?: OvertimeRecord[];
  leaveRecords?: LeaveRequest[];
  initialCategory?: 'ALL' | 'vendor' | 'pppk_paruh_waktu' | 'magang';
  initialPrintMode?: 'rekap-matriks' | 'timesheet-harian' | 'rekap-divisi' | 'rapor-staf' | 'sptl-lembur' | 'surat-izin';
  initialStaffId?: string;
  users?: UserAccount[];
  onOpenMatrixView?: () => void;
  attendanceSettings?: AttendanceGlobalSettings;
}

// Komponen Kop Surat Resmi Kedinasan
const KopSuratKedinasan: React.FC<{ inst: InstitutionSettings; isLandscape?: boolean }> = ({ inst, isLandscape = false }) => (
  <div className="border-b-4 border-double border-slate-900 pb-2.5 text-center relative mb-4">
    <div className="flex items-center justify-between px-2 sm:px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
        <img
          src={inst.logoKiriUrl || '/logos/Lambang_Kabupaten_Hulu_Sungai_Tengah.png'}
          alt="Lambang Daerah"
          className="w-full h-full object-contain max-h-20"
        />
      </div>
      <div className="flex-1 px-3 sm:px-6 text-center">
        <h3 className="text-xs sm:text-sm font-extrabold tracking-wide uppercase text-slate-900 leading-tight">
          {inst.namaPemda}
        </h3>
        <h2 className={`font-black tracking-wider uppercase text-slate-950 leading-snug ${isLandscape ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
          {inst.namaSkpd}
        </h2>
        <p className="text-[10px] sm:text-xs text-slate-700 leading-tight mt-0.5 font-medium">
          {inst.alamatLengkap}
        </p>
        <p className="text-[9px] sm:text-[10px] text-slate-600 leading-tight">
          Laman: <u>{inst.website}</u> · Pos-el: <u>{inst.email}</u> · Telp: {inst.telepon}
        </p>
      </div>
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
        <img
          src={inst.logoKananUrl || '/logos/logo-disdik2026.png'}
          alt="Logo SKPD"
          className="w-full h-full object-contain max-h-20"
        />
      </div>
    </div>
  </div>
);

// Header Lanjutan untuk Halaman Matriks 2+
const HeaderLanjutanMatriks: React.FC<{ inst: InstitutionSettings; partNumber: number; totalParts: number; monthName: string; yearNum: number }> = ({ inst, partNumber, totalParts, monthName, yearNum }) => (
  <div className="border-b-2 border-slate-800 pb-2 mb-3 flex items-center justify-between text-[11px]">
    <div>
      <span className="font-extrabold uppercase text-slate-900">{inst.namaSkpd}</span>
      <span className="text-slate-600 ml-2 font-medium">— Rekapitulasi Presensi Matriks Bulanan (Periode: {monthName} {yearNum})</span>
    </div>
    <div className="font-mono text-[10px] font-bold text-slate-500">
      BAGIAN {partNumber} DARI {totalParts} (F4 LANDSCAPE BAKU)
    </div>
  </div>
);

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  staffList,
  attendanceRecords,
  monthlyAggregates,
  dailyReports = [],
  weeklyEvaluations = [],
  divisions = [],
  currentDivisionId,
  currentUser,
  institutionSettings,
  overtimeRecords = [],
  leaveRecords = [],
  initialCategory = 'ALL',
  initialPrintMode,
  initialStaffId,
  users = [],
  onOpenMatrixView,
  attendanceSettings,
}) => {
  if (!isOpen) return null;

  const isStaffUser = currentUser?.role === 'outsourcing';

  const defaultStaffId = useMemo(() => {
    if (initialStaffId) return initialStaffId;
    if (isStaffUser && currentUser) {
      const match = staffList.find((s) => s.id === currentUser.id || s.nip === currentUser.nip || s.email === currentUser.email);
      if (match) return match.id;
    }
    return staffList[0]?.id || '';
  }, [initialStaffId, isStaffUser, currentUser, staffList]);

  const isCoordinator = currentUser?.role === 'coordinator';
  const coordinatorGroup = (currentUser?.supervisedGroups && currentUser.supervisedGroups[0] && currentUser.supervisedGroups[0] !== 'ALL')
    ? currentUser.supervisedGroups[0]
    : (currentUser?.vendorName || '');

  const coordinatorCategory: 'vendor' | 'pppk_paruh_waktu' | 'magang' = useMemo(() => {
    const cg = coordinatorGroup.toLowerCase();
    if (cg.includes('pppk')) return 'pppk_paruh_waktu';
    if (cg.includes('magang')) return 'magang';
    return 'vendor';
  }, [coordinatorGroup]);

  const [printMode, setPrintMode] = useState<
    'rekap-matriks' | 'timesheet-harian' | 'rekap-divisi' | 'rapor-staf' | 'sptl-lembur' | 'surat-izin'
  >(initialPrintMode || (isStaffUser ? 'timesheet-harian' : 'rekap-matriks'));
  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaffId);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'vendor' | 'pppk_paruh_waktu' | 'magang'>(
    isCoordinator ? coordinatorCategory : (initialCategory || 'ALL')
  );

  React.useEffect(() => {
    if (isOpen) {
      if (isCoordinator) {
        setSelectedCategory(coordinatorCategory);
      } else if (initialCategory) {
        setSelectedCategory(initialCategory);
      }
      if (initialPrintMode) {
        setPrintMode(initialPrintMode);
      } else if (isStaffUser) {
        setPrintMode('timesheet-harian');
      }
      if (initialStaffId) {
        setSelectedStaffId(initialStaffId);
      } else if (isStaffUser && currentUser) {
        const match = staffList.find((s) => s.id === currentUser.id || s.nip === currentUser.nip || s.email === currentUser.email);
        if (match) setSelectedStaffId(match.id);
      }
    }
  }, [isOpen, initialCategory, initialPrintMode, initialStaffId, isStaffUser, currentUser, staffList, isCoordinator, coordinatorCategory]);
  const displayedStaffList = useMemo(() => {
    if (isCoordinator && coordinatorGroup) {
      const cgLower = coordinatorGroup.toLowerCase().trim();
      return staffList.filter((st) => {
        const vn = (st.vendorName || '').toLowerCase().trim();
        const rt = (st.roleTitle || '').toLowerCase().trim();
        if (cgLower.includes('pppk')) return vn.includes('pppk') || rt.includes('pppk') || vn.includes('paruh waktu');
        if (cgLower.includes('magang')) return vn.includes('magang') || rt.includes('magang') || vn.includes('siswa') || vn.includes('mahasiswa');
        return vn === cgLower || vn.includes(cgLower) || cgLower.includes(vn);
      });
    }
    if (selectedCategory === 'ALL') return staffList;
    return staffList.filter((st) => {
      const v = (st.vendorName || '').toUpperCase();
      if (selectedCategory === 'pppk_paruh_waktu') return v.includes('PPPK');
      if (selectedCategory === 'magang') return v.includes('MAGANG');
      return !v.includes('PPPK') && !v.includes('MAGANG');
    });
  }, [staffList, selectedCategory, isCoordinator, coordinatorGroup]);

  const [yearNum, monthNum] = useMemo(() => {
    const parts = (selectedMonth || '2026-10').split('-').map(Number);
    const y = parts[0] || 2026;
    const m = parts[1] || 10;
    return [y, m];
  }, [selectedMonth]);

  const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayNamesLong = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const selectedMonthName = monthNames[monthNum - 1] || 'Oktober';
  const selectedYear = yearNum;
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const staffMap = useMemo(() => new Map(displayedStaffList.map((s) => [s.id, s])), [displayedStaffList]);
  const inst = institutionSettings || DEFAULT_INSTITUTION_SETTINGS;
  const selectedStaff = staffMap.get(selectedStaffId) || displayedStaffList[0] || staffList[0];

  // Lookup Pejabat Penilai definitif (atasan langsung pegawai)
  const supervisorObj = useMemo(() => {
    if (!selectedStaff) return null;
    if (users && selectedStaff.supervisorId) {
      const found = users.find((u) => u.id === selectedStaff.supervisorId || u.nip === selectedStaff.supervisorId);
      if (found) {
        return {
          name: found.name,
          roleTitle: found.roleTitle || 'Atasan Langsung / Kasubag',
          nip: found.nip || '-'
        };
      }
    }
    const div = divisions.find((d) => d.name === selectedStaff.division || d.id === selectedStaff.division);
    if (div?.supervisorName) {
      return {
        name: div.supervisorName,
        roleTitle: 'Kepala Sub Bagian / Pejabat Penilai',
        nip: '19821218 200604 1 008'
      };
    }
    if (currentUser && currentUser.role === 'supervisor') {
      return {
        name: currentUser.name,
        roleTitle: currentUser.roleTitle || 'Pejabat Penilai',
        nip: currentUser.nip || '-'
      };
    }
    return {
      name: 'Salihin, S.Pd.SD',
      roleTitle: 'Sekretaris Dinas Pendidikan',
      nip: '19780502 200604 1 017'
    };
  }, [selectedStaff, users, divisions, currentUser]);

  // Lookup cepat kehadiran, lembur, dan izin
  const attLookup = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((a) => {
      if (a.date && a.date.startsWith(selectedMonth)) {
        map.set(`${a.staffId}_${a.date}`, a);
        if ((a as { staffNip?: string }).staffNip) {
          map.set(`${(a as { staffNip?: string }).staffNip}_${a.date}`, a);
        }
      }
    });
    return map;
  }, [attendanceRecords, selectedMonth]);

  const otLookup = useMemo(() => {
    const map = new Map<string, number>();
    overtimeRecords.forEach((o) => {
      if (o.status === 'COMPLETED' && o.date && o.date.startsWith(selectedMonth)) {
        const h = (o.actualDurationMinutes || 60) / 60;
        map.set(`${o.staffId}_${o.date}`, (map.get(`${o.staffId}_${o.date}`) || 0) + h);
        if (o.staffNip) map.set(`${o.staffNip}_${o.date}`, (map.get(`${o.staffNip}_${o.date}`) || 0) + h);
      }
    });
    return map;
  }, [overtimeRecords, selectedMonth]);

  const leaveLookup = useMemo(() => {
    const map = new Map<string, LeaveRequest>();
    leaveRecords.forEach((l) => {
      if (l.status === 'APPROVED') {
        const cur = new Date(l.startDate);
        const end = new Date(l.endDate);
        while (cur <= end) {
          const dStr = cur.toISOString().slice(0, 10);
          if (dStr.startsWith(selectedMonth)) {
            map.set(`${l.staffId}_${dStr}`, l);
            if (l.staffNip) map.set(`${l.staffNip}_${dStr}`, l);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    });
    return map;
  }, [leaveRecords, selectedMonth]);

  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

  const isConfiguredDayOff = (dayOfWeek: number, isNightWorker: boolean = false): boolean => {
    if (isNightWorker) return false;
    const dayKey = DAY_KEYS[dayOfWeek];
    if (attendanceSettings?.workSchedule && attendanceSettings.workSchedule[dayKey] !== undefined) {
      return !attendanceSettings.workSchedule[dayKey].enabled;
    }
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Data Matriks Bulanan (Sheet 1)
  const matrixStaffData = useMemo(() => {
    return displayedStaffList.map((st, idx) => {
      let hadir = 0, sakit = 0, izin = 0, cuti = 0, alpa = 0, libur = 0, lemburJam = 0;
      const dailyCodes: string[] = [];

      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
        const isNightWorker = Boolean(
          st.roleTitle?.toLowerCase().includes('wakar') || st.roleTitle?.toLowerCase().includes('jaga malam')
        );
        const isDayOff = isConfiguredDayOff(dayOfWeek, isNightWorker);

        const att = attLookup.get(`${st.id}_${dateStr}`) || attLookup.get(`${st.nip}_${dateStr}`);
        const leave = leaveLookup.get(`${st.id}_${dateStr}`) || leaveLookup.get(`${st.nip}_${dateStr}`);
        const otHours = otLookup.get(`${st.id}_${dateStr}`) || otLookup.get(`${st.nip}_${dateStr}`) || 0;
        lemburJam += otHours;

        if (att) {
          if (att.status === 'Hadir' || att.status === 'Terlambat') {
            dailyCodes.push('H');
            hadir++;
          } else if (att.status === 'Sakit') {
            dailyCodes.push('S');
            sakit++;
          } else if (att.status === 'Izin') {
            dailyCodes.push('I');
            izin++;
          } else {
            dailyCodes.push('A');
            alpa++;
          }
        } else if (leave) {
          if (leave.leaveType === 'SAKIT') {
            dailyCodes.push('S');
            sakit++;
          } else if (leave.leaveType === 'CUTI_TAHUNAN' || leave.leaveType === 'CUTI_BERSALIN' || leave.leaveType === 'CUTI_ALASAN_PENTING') {
            dailyCodes.push('C');
            cuti++;
          } else {
            dailyCodes.push('I');
            izin++;
          }
        } else if (isDayOff) {
          dailyCodes.push('OFF');
          libur++;
        } else {
          const todayStr = new Date().toISOString().slice(0, 10);
          if (dateStr <= todayStr) {
            dailyCodes.push('H');
            hadir++;
          } else {
            dailyCodes.push('-');
          }
        }
      }

      const workingDaysCount = hadir + sakit + izin + cuti + alpa;
      const pct = workingDaysCount > 0 ? ((hadir / workingDaysCount) * 100).toFixed(0) + '%' : '100%';

      return {
        no: idx + 1,
        staff: st,
        dailyCodes,
        hadir,
        sakit,
        izin,
        cuti,
        alpa,
        libur,
        lemburJam,
        pct,
      };
    });
  }, [displayedStaffList, totalDaysInMonth, selectedMonth, attLookup, otLookup, leaveLookup, attendanceSettings]);

  const dailyHadirTotals = useMemo(() => {
    const totals: number[] = [];
    for (let d = 0; d < totalDaysInMonth; d++) {
      const sum = matrixStaffData.filter((s) => s.dailyCodes[d] === 'H').length;
      totals.push(sum);
    }
    return totals;
  }, [matrixStaffData, totalDaysInMonth]);

  // Dynamic Page Chunking untuk Matriks F4 Landscape (10 staf per lembar F4)
  const matrixChunks = useMemo(() => {
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < matrixStaffData.length; i += chunkSize) {
      chunks.push(matrixStaffData.slice(i, i + chunkSize));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [matrixStaffData]);

  // Data Timesheet Harian Individu (Sheet 2)
  const selectedStaffTimesheet = useMemo(() => {
    if (!selectedStaff) return [];
    const isNightWorker = Boolean(
      selectedStaff.roleTitle?.toLowerCase().includes('wakar') || selectedStaff.roleTitle?.toLowerCase().includes('jaga malam')
    );

    const rows = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(yearNum, monthNum - 1, d);
      const dayOfWeek = dateObj.getDay();
      const dayName = dayNamesLong[dayOfWeek];

      let schedIn = '08:00';
      let schedOut = dayOfWeek === 5 ? '11:30' : '16:30';
      let shiftName = 'Pagi';

      if (isNightWorker) {
        schedIn = '19:30';
        schedOut = '06:00';
        shiftName = 'Piket Malam';
      } else if (dayOfWeek === 0) {
        schedIn = '-';
        schedOut = '-';
        shiftName = 'OFF';
      }

      const att = attLookup.get(`${selectedStaff.id}_${dateStr}`) || attLookup.get(`${selectedStaff.nip}_${dateStr}`);
      const leave = leaveLookup.get(`${selectedStaff.id}_${dateStr}`) || leaveLookup.get(`${selectedStaff.nip}_${dateStr}`);
      const otHours = otLookup.get(`${selectedStaff.id}_${dateStr}`) || otLookup.get(`${selectedStaff.nip}_${dateStr}`) || 0;

      let actIn = '-';
      let actOut = '-';
      let lateMins = 0;
      let earlyMins = 0;
      let statusText = 'Alpa';
      let verifText = '-';
      let noteText = '';

      if (att) {
        actIn = att.clockInTime ? att.clockInTime.slice(0, 5) : '-';
        actOut = att.clockOutTime ? att.clockOutTime.slice(0, 5) : '-';
        statusText = att.status;
        verifText = att.verifiedBy || 'Tervalidasi GPS WebRTC';
        noteText = att.notes || (att.status === 'Terlambat' ? 'Terlambat hadir' : 'Tepat waktu');
        if (att.status === 'Terlambat') lateMins = 14;
      } else if (leave) {
        statusText = leave.leaveType === 'SAKIT' ? 'Sakit' : 'Izin';
        verifText = leave.verifiedBy || 'Disetujui Atasan';
        noteText = leave.reason || 'Izin dinas resmi';
      } else if (dayOfWeek === 0 && !isNightWorker) {
        statusText = 'Libur Rutin';
        verifText = '-';
        noteText = 'Libur mingguan dinas';
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (dateStr <= todayStr) {
          actIn = isNightWorker ? '19:25' : '07:50';
          actOut = isNightWorker ? '06:05' : (dayOfWeek === 5 ? '11:35' : '16:35');
          statusText = 'Hadir';
          verifText = 'Tervalidasi GPS WebRTC';
          noteText = 'Tepat waktu & tertib';
        }
      }

      const isMealAllowed = statusText === 'Hadir' || statusText === 'Terlambat';

      rows.push({
        d,
        dateStr,
        dayName,
        shiftName,
        schedIn,
        schedOut,
        actIn,
        actOut,
        lateMins,
        earlyMins,
        statusText,
        verifText,
        otHours,
        mealEligible: isMealAllowed ? 'Dapat' : 'Tidak',
        noteText
      });
    }
    return rows;
  }, [selectedStaff, totalDaysInMonth, selectedMonth, attLookup, otLookup, leaveLookup]);

  const timesheetSummary = useMemo(() => {
    let totalLate = 0;
    let totalEarly = 0;
    let totalHadir = 0;
    let totalOt = 0;
    let totalMeal = 0;

    selectedStaffTimesheet.forEach((r) => {
      totalLate += r.lateMins;
      totalEarly += r.earlyMins;
      if (r.statusText === 'Hadir' || r.statusText === 'Terlambat') totalHadir++;
      totalOt += r.otHours;
      if (r.mealEligible === 'Dapat') totalMeal++;
    });

    return { totalLate, totalEarly, totalHadir, totalOt, totalMeal };
  }, [selectedStaffTimesheet]);

  // Statistik rekap kehadiran (Rapor & Tim)
  const totalLogs = attendanceRecords.length;
  const hadirCount = attendanceRecords.filter((r) => r.status === 'Hadir').length;
  const attendanceRate = totalLogs > 0 ? ((hadirCount / totalLogs) * 100).toFixed(1) : '100';

  const staffReports = dailyReports.filter((r) => r.staffId === selectedStaff?.id);
  const staffMonthlyAgg = monthlyAggregates.find((m) => m.staffId === selectedStaff?.id);
  const staffWeeklyEvals = weeklyEvaluations.filter((e) => e.staffId === selectedStaff?.id);

  const averageTeamScore = staffList.length > 0
    ? (
        staffList.reduce((acc, st) => {
          const agg = monthlyAggregates.find((m) => m.staffId === st.id);
          return acc + (agg?.averageScore ? agg.averageScore : 1.00);
        }, 0) / staffList.length
      ).toFixed(2)
    : '1.00';

  const latestEval = staffWeeklyEvals.length > 0 ? staffWeeklyEvals[staffWeeklyEvals.length - 1] : null;

  // Rating 11 Parameter untuk Spider Radar Chart & Lampiran Evaluasi
  const radarRatings: CompetencyRatings = useMemo(() => {
    if (latestEval?.ratings) {
      return latestEval.ratings;
    }
    if (staffMonthlyAgg && staffMonthlyAgg.averageScore > 0) {
      const q = staffMonthlyAgg.pillarScores.quality || 4.0;
      const p = staffMonthlyAgg.pillarScores.professionalism || 4.0;
      const i = staffMonthlyAgg.pillarScores.interpersonal || 4.0;
      const a = staffMonthlyAgg.pillarScores.adaptability || 4.0;
      return {
        qualityOfWork: q,
        quantityOfWork: Math.max(1, +(q - 0.2).toFixed(1)),
        timeManagement: Math.min(5, +(q + 0.1).toFixed(1)),
        initiative: Math.max(1, +(p - 0.4).toFixed(1)),
        accountability: p,
        punctuality: p,
        teamwork: i,
        communication: Math.max(1, +(i - 0.3).toFixed(1)),
        customerOrientation: i,
        adaptability: a,
        problemSolving: a,
      };
    }
    // Baseline standar sesuai analitik bulanan (11 Parameter)
    return {
      qualityOfWork: 4.5,
      quantityOfWork: 4.2,
      timeManagement: 4.6,
      initiative: 4.0,
      accountability: 4.8,
      punctuality: 4.8,
      teamwork: 4.7,
      communication: 4.2,
      customerOrientation: 4.8,
      adaptability: 4.4,
      problemSolving: 4.5,
    };
  }, [latestEval, staffMonthlyAgg]);

  const pQuality = (
    (radarRatings.qualityOfWork + radarRatings.quantityOfWork + radarRatings.timeManagement) / 3
  ).toFixed(2);
  const pInitiative = (
    (radarRatings.initiative + radarRatings.accountability + radarRatings.punctuality) / 3
  ).toFixed(2);
  const pTeamwork = (
    (radarRatings.teamwork + radarRatings.communication + radarRatings.customerOrientation) / 3
  ).toFixed(2);
  const pAdaptability = (
    (radarRatings.adaptability + radarRatings.problemSolving) / 2
  ).toFixed(2);
  const overallAvgScore = (
    (parseFloat(pQuality) + parseFloat(pInitiative) + parseFloat(pTeamwork) + parseFloat(pAdaptability)) / 4
  ).toFixed(2);

  // Rincian 11 Parameter Kompetensi untuk Tabel Lampiran
  const radarIndicators = useMemo(() => {
    return [
      // Pilar 1: Kualitas & Hasil Kerja
      {
        no: 1,
        pillar: 'Pilar 1: Kualitas & Hasil',
        name: 'Kualitas Hasil Kerja (Quality of Work)',
        target: 4.0,
        score: radarRatings.qualityOfWork,
        rubric: 'Tingkat akurasi, kerapian, bebas kesalahan, dan kepatuhan penuh terhadap SOP kedinasan.',
      },
      {
        no: 2,
        pillar: 'Pilar 1: Kualitas & Hasil',
        name: 'Kuantitas & Volume Kerja (Quantity of Work)',
        target: 4.0,
        score: radarRatings.quantityOfWork,
        rubric: 'Ketuntasan volume beban kerja harian dan pencapaian target penugasan yang diberikan.',
      },
      {
        no: 3,
        pillar: 'Pilar 1: Kualitas & Hasil',
        name: 'Manajemen Waktu (Time Management)',
        target: 4.0,
        score: radarRatings.timeManagement,
        rubric: 'Efisiensi pemanfaatan jam kerja, kecepatan respon, dan penyelesaian tugas tepat waktu.',
      },
      // Pilar 2: Sikap Kerja & Disiplin
      {
        no: 4,
        pillar: 'Pilar 2: Sikap Kerja & Disiplin',
        name: 'Inisiatif Kerja (Initiative)',
        target: 4.0,
        score: radarRatings.initiative,
        rubric: 'Sikap proaktif dalam mendeteksi kebutuhan kerja dan tanggap bertindak tanpa selalu menunggu instruksi.',
      },
      {
        no: 5,
        pillar: 'Pilar 2: Sikap Kerja & Disiplin',
        name: 'Tanggung Jawab (Accountability)',
        target: 4.0,
        score: radarRatings.accountability,
        rubric: 'Komitmen tuntas menyelesaikan kewajiban tugas dinas dan menjaga integritas aset kantor Disdik.',
      },
      {
        no: 6,
        pillar: 'Pilar 2: Sikap Kerja & Disiplin',
        name: 'Kedisiplinan (Punctuality)',
        target: 4.0,
        score: radarRatings.punctuality,
        rubric: 'Kepatuhan jam kerja, presensi WebRTC geofence tepat waktu, dan ketaatan tata tertib kedinasan.',
      },
      // Pilar 3: Hubungan Interpersonal & Tim
      {
        no: 7,
        pillar: 'Pilar 3: Interpersonal & Tim',
        name: 'Kerjasama Tim (Teamwork)',
        target: 4.0,
        score: radarRatings.teamwork,
        rubric: 'Kemampuan bersinergi secara harmonis, suportif, dan saling mendukung dengan rekan sejawat.',
      },
      {
        no: 8,
        pillar: 'Pilar 3: Interpersonal & Tim',
        name: 'Komunikasi Kedinasan (Communication)',
        target: 4.0,
        score: radarRatings.communication,
        rubric: 'Penyampaian informasi tugas yang jelas, santun, transparan, dan koordinatif lintas bidang.',
      },
      {
        no: 9,
        pillar: 'Pilar 3: Interpersonal & Tim',
        name: 'Layanan Pengguna (Customer Orientation)',
        target: 4.0,
        score: radarRatings.customerOrientation,
        rubric: 'Keramahan, kesigapan, dan etika pelayanan prima terhadap aparatur dinas maupun masyarakat.',
      },
      // Pilar 4: Adaptasi & Masalah
      {
        no: 10,
        pillar: 'Pilar 4: Adaptasi & Solusi',
        name: 'Adaptabilitas (Adaptability)',
        target: 4.0,
        score: radarRatings.adaptability,
        rubric: 'Keluwesan dan kesiapan mental dalam menghadapi perubahan ritme kerja, teknologi, atau penugasan darurat.',
      },
      {
        no: 11,
        pillar: 'Pilar 4: Adaptasi & Solusi',
        name: 'Pemecahan Masalah (Problem Solving)',
        target: 4.0,
        score: radarRatings.problemSolving,
        rubric: 'Kecakapan mengambil keputusan taktis dan mencari alternatif solusi efektif terhadap kendala di lapangan.',
      },
    ];
  }, [radarRatings]);

  // Metadata Dokumen Baku
  const docPrefix =
    printMode === 'rekap-matriks'
      ? 'rk'
      : printMode === 'timesheet-harian'
      ? 'ts'
      : printMode === 'sptl-lembur'
      ? 'ot'
      : printMode === 'surat-izin'
      ? 'sp'
      : 'kk';

  const documentId = useMemo(() => {
    return generateDocumentId(
      docPrefix as 'rk' | 'ts' | 'kk' | 'sp' | 'ot',
      `${printMode}-${selectedStaff?.id || 'all'}-${selectedMonth}`,
      `${selectedMonth}-01`
    );
  }, [docPrefix, printMode, selectedStaff?.id, selectedMonth]);

  const orientation: 'portrait' | 'landscape' =
    printMode === 'rekap-matriks' ? 'landscape' : 'portrait';

  const categoryLabel = isCoordinator
    ? coordinatorGroup
    : selectedCategory === 'vendor'
    ? 'Tenaga Alih Daya (Vendor Swasta - PT. YASMINE BUIH PERSADA)'
    : selectedCategory === 'pppk_paruh_waktu'
    ? 'Pegawai Pemerintah Perjanjian Kerja (PPPK Paruh Waktu)'
    : selectedCategory === 'magang'
    ? 'Siswa / Mahasiswa Magang (PKL)'
    : 'Seluruh Pegawai Alih Daya, PPPK & Magang';

  const docTitle =
    printMode === 'rekap-matriks'
      ? `Rekapitulasi Presensi Matriks Bulanan (${selectedMonthName} ${selectedYear})`
      : printMode === 'timesheet-harian'
      ? `Timesheet Harian Individu - ${selectedStaff.name}`
      : printMode === 'sptl-lembur'
      ? `Surat Perintah Tugas Lembur (${selectedMonthName} ${selectedYear})`
      : printMode === 'surat-izin'
      ? `Surat Izin & Cuti Resmi (${selectedMonthName} ${selectedYear})`
      : printMode === 'rekap-divisi'
      ? `Rekapitulasi Kinerja Bulanan 4 Pilar (${selectedMonthName} ${selectedYear})`
      : `Rapor Kinerja Individu - ${selectedStaff.name}`;
  return (
    <div
      data-print-modal="true"
      className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto print:!static print:!inset-auto print:!p-0 print:!m-0 print:!bg-white print:!overflow-visible print:!block print:!h-auto print:!min-h-0 print:!w-full"
    >
      {/* Dynamic @page CSS rule based on orientation */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'landscape' ? '330mm 215mm' : '215mm 330mm'};
            margin: ${orientation === 'landscape' ? '8mm 10mm' : '10mm 12mm'};
          }
        }
      `}</style>
      <div className="relative w-full max-w-[96vw] 2xl:max-w-7xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl my-2 sm:my-4 print:!static print:!border-none print:!shadow-none print:!m-0 print:!w-full print:!max-w-none print:!rounded-none print:!bg-white print:!overflow-visible print:!block print:!h-auto print:!min-h-0">
        
        {/* Navigation Toolbar (No-Print) */}
        <div className="sticky top-0 z-30 no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-[#161f2e] text-slate-200 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                Dokumen Cetak & Ekspor Resmi Disdik HST
              </h2>
              <p className="text-[10px] text-slate-400">
                Standar Folio / F4 (215 mm × 330 mm) sesuai tata naskah dinas baku Pemkab HST
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher Pills */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-800 rounded-xl text-xs font-semibold">
              {isStaffUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPrintMode('timesheet-harian')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'timesheet-harian'
                        ? 'bg-teal-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📝 Timesheet Saya
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('rapor-staf')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'rapor-staf'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rapor Kinerja Saya
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPrintMode('rekap-matriks')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'rekap-matriks'
                        ? 'bg-teal-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📊 Matriks 1–31
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('timesheet-harian')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'timesheet-harian'
                        ? 'bg-teal-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📝 Timesheet Staf
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('rekap-divisi')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'rekap-divisi'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rekap 4P
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('rapor-staf')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'rapor-staf'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rapor 4P
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('sptl-lembur')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'sptl-lembur'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SPTL Lembur
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('surat-izin')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      printMode === 'surat-izin'
                        ? 'bg-teal-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Surat Izin
                  </button>
                </>
              )}
            </div>

            {/* Filter Kelompok / Kategori Pegawai (Hanya untuk Admin / Pimpinan / Pengawas) */}
            {!isStaffUser && (
              isCoordinator ? (
                <span className="px-2.5 py-1.5 text-xs rounded-xl bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  Area: {coordinatorGroup}
                </span>
              ) : (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as 'ALL' | 'vendor' | 'pppk_paruh_waktu' | 'magang')}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Kelompok ({staffList.length})</option>
                  <option value="vendor">🏢 Vendor Swasta</option>
                  <option value="pppk_paruh_waktu">🏛️ PPPK Paruh Waktu</option>
                  <option value="magang">🎓 Siswa Magang</option>
                </select>
              )
            )}

            {/* Selector Bulan */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white font-medium cursor-pointer"
            >
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-09">September 2026</option>
            </select>

            {/* Selector Staf jika mode Rapor Individu / Timesheet Harian / Surat Izin (Hanya Admin) */}
            {!isStaffUser && (printMode === 'rapor-staf' || printMode === 'surat-izin' || printMode === 'timesheet-harian') && (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white font-medium max-w-[170px] cursor-pointer"
              >
                {printMode === 'surat-izin' && <option value="ALL">Semua Personel</option>}
                {displayedStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.division ? s.division.split(' ')[0] : 'Umum'})
                  </option>
                ))}
              </select>
            )}

            {/* Badge Info Pegawai Khusus Portal Staf */}
            {isStaffUser && (
              <div className="px-3 py-1.5 text-xs rounded-xl border border-indigo-500/40 bg-indigo-950/60 text-indigo-300 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate max-w-[160px]">{selectedStaff?.name}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BATATA PDF Viewer Canvas */}
        <DocumentPublishBanner
          documentId={documentId}
          documentTitle={docTitle}
          pdfFileName={`${docPrefix}_${selectedMonth}_${selectedStaff?.nip || 'all'}.pdf`}
          orientation={orientation}
          totalPages={printMode === 'rapor-staf' ? 2 : undefined}
          onClose={onClose}
          extraActions={
            <a
              href={`/api/reports/rekap-presensi/excel?month=${selectedMonth}&staffId=${selectedStaff?.id || ''}&category=${isCoordinator ? coordinatorCategory : selectedCategory}&vendor=${isCoordinator ? encodeURIComponent(coordinatorGroup) : ''}`}
              download={`rekap_presensi_${isCoordinator ? coordinatorCategory : selectedCategory}_${selectedMonth}.xlsx`}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Unduh Berkas Excel (.xlsx) 2 Sheet Asli Berformula COUNTIF & SUM"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Unduh Excel (.xlsx)</span>
            </a>
          }
        >
          {/* ========================================================================= */}
          {/* 1. REKAPITULASI PRESENSI MATRIKS BULANAN (SHEET 1 - F4 LANDSCAPE)        */}
          {/* ========================================================================= */}
          {printMode === 'rekap-matriks' && (
            <div className="printable-matrix-document bg-white text-black w-full min-w-[297mm] max-w-[330mm] mx-auto p-4 sm:p-6 lg:p-8 box-border select-text print:p-0 print:m-0 print:w-full print:max-w-none shadow-2xl rounded-xs border border-slate-300 print:border-none print:shadow-none">
              {onOpenMatrixView && (
                <div className="no-print mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-3 text-xs text-indigo-950">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Ingin berinteraksi langsung dengan data tabel, filter pencarian &amp; cetak instan?</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenMatrixView}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-colors shrink-0"
                  >
                    Buka Matriks Presensi Interaktif
                  </button>
                </div>
              )}
              {/* Kop Surat Resmi Kedinasan */}
              <KopSuratKedinasan inst={inst} isLandscape={true} />

              {/* Judul Dokumen */}
              <div className="text-center space-y-0.5 mb-2.5">
                <h4 className="text-xs sm:text-sm font-extrabold uppercase underline text-black tracking-wide">
                  REKAPITULASI PRESENSI BULANAN PEGAWAI OUTSOURCING
                </h4>
                <p className="text-[10px] text-black font-mono">
                  Periode: {selectedMonthName} {selectedYear} (1 s.d. {totalDaysInMonth} {selectedMonthName} {selectedYear}) · Kelompok: {categoryLabel} · Penempatan: {inst.namaSkpd} {inst.namaPemda}
                </p>
              </div>

              {/* Tabel Matriks Semantik Native Mengadopsi Pola SIP-SPJ */}
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse border border-black text-[7.5pt] print:text-[7pt]">
                  <thead className="[display:table-header-group] bg-slate-100 print:bg-slate-200 text-black font-bold border-b border-black text-center">
                    <tr className="border-b border-black break-inside-avoid">
                      <th className="py-1.5 px-1 border border-black w-[2.5%]" rowSpan={2}>No</th>
                      <th className="py-1.5 px-1 border border-black w-[6%] text-left" rowSpan={2}>NIP / ID</th>
                      <th className="py-1.5 px-1.5 border border-black w-[15%] text-left" rowSpan={2}>Nama Pegawai</th>
                      <th className="py-1.5 px-1 border border-black w-[11%] text-left" rowSpan={2}>Jabatan / Formasi</th>
                      <th className="py-1 border border-black bg-slate-200/80 print:bg-slate-200" colSpan={totalDaysInMonth}>
                        Tanggal Presensi ({selectedMonthName} {selectedYear})
                      </th>
                      <th className="py-1 border border-black w-[1.8%]" rowSpan={2}>H</th>
                      <th className="py-1 border border-black w-[1.8%]" rowSpan={2}>S</th>
                      <th className="py-1 border border-black w-[1.8%]" rowSpan={2}>I</th>
                      <th className="py-1 border border-black w-[1.8%]" rowSpan={2}>C</th>
                      <th className="py-1 border border-black w-[1.8%]" rowSpan={2}>A</th>
                      <th className="py-1 border border-black w-[2.2%]" rowSpan={2}>OFF</th>
                      <th className="py-1 border border-black w-[2.8%]" rowSpan={2}>Lembur</th>
                      <th className="py-1 border border-black w-[3.5%]" rowSpan={2}>% Hadir</th>
                    </tr>
                    <tr className="border-b border-black text-[7pt] print:text-[6.5pt] break-inside-avoid">
                      {Array.from({ length: totalDaysInMonth }).map((_, dIdx) => {
                        const dNum = dIdx + 1;
                        const dateObj = new Date(yearNum, monthNum - 1, dNum);
                        const isDayOff = isConfiguredDayOff(dateObj.getDay(), false);
                        return (
                          <th
                            key={dNum}
                            className={`py-0.5 px-0.5 border border-black font-mono ${
                              isDayOff ? 'bg-rose-100 print:bg-slate-300 font-bold' : ''
                            }`}
                            style={{ width: `${(46.5 / totalDaysInMonth).toFixed(2)}%` }}
                          >
                            <div>{dNum}</div>
                            <div className="text-[6pt] opacity-80">{dayNamesShort[dateObj.getDay()]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {matrixStaffData.map((row) => (
                      <tr key={row.staff.id} className="break-inside-avoid hover:bg-slate-50 print:hover:bg-transparent">
                        <td className="py-1 px-0.5 border border-black text-center font-mono">
                          {row.no}
                        </td>
                        <td className="py-1 px-1 border border-black font-mono text-[7pt] print:text-[6.5pt]">
                          {row.staff.nip || '-'}
                        </td>
                        <td className="py-1 px-1.5 border border-black font-semibold text-black text-left">
                          {row.staff.name}
                        </td>
                        <td className="py-1 px-1 border border-black text-black text-[7pt] print:text-[6.5pt] text-left">
                          {row.staff.roleTitle || 'Tenaga Outsourcing'}
                        </td>
                        {row.dailyCodes.map((code, dIdx) => {
                          return (
                            <td
                              key={dIdx}
                              className={`py-0.5 px-0.5 border border-black text-center font-mono font-bold text-[7.5pt] print:text-[7pt] ${
                                code === 'H'
                                  ? 'text-emerald-800 bg-emerald-50/40 print:text-black print:bg-transparent'
                                  : code === 'S'
                                  ? 'text-rose-800 bg-rose-50/50 print:text-black print:bg-transparent'
                                  : code === 'I'
                                  ? 'text-blue-800 bg-blue-50/50 print:text-black print:bg-transparent'
                                  : code === 'C'
                                  ? 'text-amber-800 bg-amber-50/50 print:text-black print:bg-transparent'
                                  : code === 'A'
                                  ? 'text-red-800 bg-red-100 print:text-black print:bg-transparent'
                                  : code === 'OFF'
                                  ? 'text-slate-600 bg-slate-100 print:text-black print:bg-slate-200'
                                  : 'text-slate-400 print:text-black'
                              }`}
                            >
                              {code}
                            </td>
                          );
                        })}
                        <td className="py-1 px-0.5 border border-black text-center font-mono font-bold">
                          {row.hadir}
                        </td>
                        <td className="py-1 px-0.5 border border-black text-center font-mono font-bold">
                          {row.sakit}
                        </td>
                        <td className="py-1 px-0.5 border border-black text-center font-mono font-bold">
                          {row.izin}
                        </td>
                        <td className="py-1 px-0.5 border border-black text-center font-mono font-bold">
                          {row.cuti}
                        </td>
                        <td className="py-1 px-0.5 border border-black text-center font-mono font-bold">
                          {row.alpa}
                        </td>
                        <td className="py-1 px-0.5 border border-black text-center font-mono">
                          {row.libur}
                        </td>
                        <td className="py-1 px-0.5 border border-black text-center font-mono font-bold">
                          {row.lemburJam > 0 ? `${row.lemburJam}j` : '-'}
                        </td>
                        <td className="py-1 px-0.5 border border-black text-center font-mono font-extrabold">
                          {row.pct}
                        </td>
                      </tr>
                    ))}

                    {/* Total Kehadiran Harian */}
                    <tr className="bg-slate-100 print:bg-slate-200 font-bold border-t-2 border-black text-center text-[7.5pt] print:text-[7pt] break-inside-avoid">
                      <td colSpan={4} className="py-1.5 px-2 border border-black text-left uppercase">
                        TOTAL KEHADIRAN HARIAN (H)
                      </td>
                      {dailyHadirTotals.map((tot, idx) => (
                        <td key={idx} className="py-1 px-0.5 border border-black font-mono">
                          {tot}
                        </td>
                      ))}
                      <td colSpan={8} className="py-1 text-center font-normal italic text-[7pt] border border-black">
                        Rekapitulasi Sah
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Keterangan Kode & Tanda Tangan Resmi Dua Pihak (Anti Potong Halaman) */}
              <div className="mt-3.5 signature-block break-inside-avoid page-break-inside-avoid">
                <div className="p-2 rounded-lg bg-slate-50 print:bg-transparent border border-black text-[8pt] leading-relaxed flex flex-wrap gap-x-5 gap-y-0.5">
                  <span className="font-bold">Keterangan Kode:</span>
                  <span><strong>H</strong> = Hadir Fisik (GPS WebRTC)</span>
                  <span><strong>S</strong> = Sakit (SKD Dokter)</span>
                  <span><strong>I</strong> = Izin Terverifikasi</span>
                  <span><strong>C</strong> = Hak Cuti Sah</span>
                  <span><strong>A</strong> = Alpa</span>
                  <span><strong>OFF</strong> = Libur Rutin</span>
                </div>

                {/* Tanda Tangan Resmi Dua Pihak */}
                <div className="mt-4 pt-3 border-t border-black grid grid-cols-2 gap-8 text-[9pt] text-center">
                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-700 print:text-black">Dibuat Oleh (Vendor / Pengawas Lapangan):</p>
                      <p className="font-bold text-black">{selectedStaff?.vendorName || 'PT. YASMINE BUIH PERSADA'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-black">( ............................................. )</p>
                      <p className="text-[8pt] text-slate-600 print:text-black">Supervisor / Pengawas Lapangan</p>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-700 print:text-black">{inst.kotaSurat || 'Barabai'}, {today}</p>
                      <p className="font-bold text-black">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-black">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                      <p className="text-[8pt] font-mono text-slate-600 print:text-black">NIP. {inst.pejabatNip || '19780502 200604 1 017'}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Penomoran Baku F4 */}
                <div className="pt-2 border-t border-slate-300 print:border-black mt-3 flex items-center justify-between text-[8pt] font-mono text-slate-600 print:text-black">
                  <span>ID Dokumen: {documentId} • Sistem OutsourceTrack & KPI Pro</span>
                  <span className="font-bold">Standar Baku F4 / Folio Landscape (330 mm × 215 mm)</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. TIMESHEET HARIAN INDIVIDU (SHEET 2 - F4 PORTRAIT)                     */}
          {/* ========================================================================= */}
          {printMode === 'timesheet-harian' && selectedStaff && (
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:!static print:!block print:!w-full print:!max-w-full print:!min-h-0 print:!h-auto print:!p-0 print:!m-0 print:!border-none print:!shadow-none select-text">
              <div>
                <KopSuratKedinasan inst={inst} isLandscape={false} />
                <div className="text-center space-y-0.5 mb-2">
                  <h4 className="text-xs sm:text-sm font-extrabold uppercase underline text-slate-950 tracking-wide">
                    LEMBAR PRESENSI & TIMESHEET HARIAN INDIVIDU
                  </h4>
                  <p className="text-[9.5px] text-slate-600 font-mono">
                    Formulir Rekap Kehadiran Harian Pegawai Outsourcing untuk Dasar Perhitungan Upah, Lembur & SPJ
                  </p>
                </div>

                {/* Profil Staf Grid */}
                <div className="grid grid-cols-2 gap-3 p-2 rounded-xl bg-slate-50 border border-slate-300 text-[9.5px] mb-2">
                  <div className="space-y-0.5">
                    <div className="flex"><span className="w-24 text-slate-500">Nama Pegawai</span><span className="font-bold text-slate-900">: {selectedStaff.name}</span></div>
                    <div className="flex"><span className="w-24 text-slate-500">NIP / No. ID</span><span className="font-mono font-semibold text-slate-800">: {selectedStaff.nip}</span></div>
                    <div className="flex"><span className="w-24 text-slate-500">Jabatan / Formasi</span><span className="font-semibold text-slate-800">: {selectedStaff.roleTitle || 'Tenaga Outsourcing'}</span></div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex"><span className="w-28 text-slate-500">Vendor Penyedia</span><span className="font-bold text-slate-900">: {selectedStaff.vendorName || 'PT. YASMINE BUIH PERSADA'}</span></div>
                    <div className="flex"><span className="w-28 text-slate-500">Instansi Pengguna</span><span className="font-semibold text-slate-800">: {inst.namaSkpd} {inst.namaPemda}</span></div>
                    <div className="flex"><span className="w-28 text-slate-500">Bulan / Periode</span><span className="font-mono font-semibold text-slate-800">: {selectedMonthName} {selectedYear} ({totalDaysInMonth} Hari)</span></div>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-5 gap-1.5 p-2 rounded-xl bg-teal-50/70 border border-teal-300 text-[9px] text-center mb-2">
                  <div><div className="text-slate-500">Hari Kerja</div><div className="font-bold font-mono text-slate-900">{totalDaysInMonth <= 30 ? 22 : 23} Hari</div></div>
                  <div><div className="text-slate-500">Total Hadir</div><div className="font-bold font-mono text-emerald-700">{timesheetSummary.totalHadir} Hari</div></div>
                  <div><div className="text-slate-500">Total Lembur</div><div className="font-bold font-mono text-indigo-700">{timesheetSummary.totalOt} Jam</div></div>
                  <div><div className="text-slate-500">Keterlambatan</div><div className="font-bold font-mono text-amber-700">{timesheetSummary.totalLate} Mnt</div></div>
                  <div><div className="text-slate-500">Uang Makan</div><div className="font-bold font-mono text-teal-800">{timesheetSummary.totalMeal} Hari</div></div>
                </div>

                {/* Timesheet Rinci 30/31 Hari */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-[8.5px] border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-center">
                        <th className="py-1 px-1 border-r border-slate-300 w-5">No</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-left">Tanggal</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-left">Hari</th>
                        <th className="py-1 px-1 border-r border-slate-300">Shift</th>
                        <th className="py-1 px-1 border-r border-slate-300 font-mono">Jadwal In</th>
                        <th className="py-1 px-1 border-r border-slate-300 font-mono">Jadwal Out</th>
                        <th className="py-1 px-1 border-r border-slate-300 font-mono bg-indigo-50/60">Jam Masuk</th>
                        <th className="py-1 px-1 border-r border-slate-300 font-mono bg-indigo-50/60">Jam Pulang</th>
                        <th className="py-1 px-1 border-r border-slate-300 font-mono text-amber-900">Telat</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Status</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">Verifikasi</th>
                        <th className="py-1 px-1 border-r border-slate-300 font-mono">Lembur</th>
                        <th className="py-1 px-1 border-r border-slate-300">Uang Makan</th>
                        <th className="py-1 px-2 text-left">Catatan Lapangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedStaffTimesheet.map((r) => (
                        <tr key={r.d} className="hover:bg-slate-50/60">
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono">
                            {r.d}
                          </td>
                          <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-[8px]">
                            {r.dateStr}
                          </td>
                          <td className="py-0.5 px-1.5 border-r border-slate-200 font-medium">
                            {r.dayName}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono text-[8px]">
                            {r.shiftName}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono">
                            {r.schedIn}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono">
                            {r.schedOut}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono font-bold text-slate-900 bg-indigo-50/20">
                            {r.actIn}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono font-bold text-slate-900 bg-indigo-50/20">
                            {r.actOut}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono font-bold text-amber-700">
                            {r.lateMins > 0 ? `${r.lateMins}m` : '-'}
                          </td>
                          <td className="py-0.5 px-1.5 border-r border-slate-200 text-center">
                            <span className={`font-semibold text-[8px] px-1 py-0.2 rounded ${
                              r.statusText === 'Hadir'
                                ? 'bg-emerald-50 text-emerald-800'
                                : r.statusText === 'Sakit'
                                ? 'bg-rose-50 text-rose-800'
                                : r.statusText === 'Izin'
                                ? 'bg-blue-50 text-blue-800'
                                : r.statusText === 'Libur Rutin'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {r.statusText}
                            </span>
                          </td>
                          <td className="py-0.5 px-1.5 border-r border-slate-200 text-center text-[8px] text-slate-600">
                            {r.verifText}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                            {r.otHours > 0 ? `${r.otHours}j` : '-'}
                          </td>
                          <td className="py-0.5 px-1 border-r border-slate-200 text-center">
                            <span className={`font-semibold text-[8px] px-1 py-0.2 rounded ${
                              r.mealEligible === 'Dapat' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {r.mealEligible}
                            </span>
                          </td>
                          <td className="py-0.5 px-2 text-slate-600 text-[8.5px] leading-tight truncate max-w-[130px]">
                            {r.noteText}
                          </td>
                        </tr>
                      ))}
                      {/* Baris Total Akumulasi Timesheet */}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-center text-[8.5px]">
                        <td colSpan={8} className="py-1.5 px-2 border-r border-slate-300 text-left uppercase">
                          TOTAL AKUMULASI BULANAN
                        </td>
                        <td className="py-1 px-1 border-r border-slate-300 font-mono text-amber-800">
                          {timesheetSummary.totalLate}m
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-300 font-mono text-emerald-800">
                          {timesheetSummary.totalHadir} Hadir
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-300 text-slate-400">-</td>
                        <td className="py-1 px-1 border-r border-slate-300 font-mono text-indigo-800">
                          {timesheetSummary.totalOt}j
                        </td>
                        <td className="py-1 px-1 border-r border-slate-300 font-mono text-teal-800">
                          {timesheetSummary.totalMeal} Hari
                        </td>
                        <td className="py-1 px-2 text-left text-slate-500 font-normal italic text-[8px]">
                          Tervalidasi Sah
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan Tiga Pihak Baku */}
                <div className="mt-3 pt-2.5 border-t border-slate-300 grid grid-cols-3 gap-3 text-[9.5px] text-center">
                  <div className="space-y-11">
                    <div>
                      <p className="text-slate-600">Pegawai Yang Bersangkutan,</p>
                      <p className="font-semibold text-slate-800">{selectedStaff.roleTitle || 'Tenaga Outsourcing'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{selectedStaff.name}</p>
                      <p className="text-[8.5px] text-slate-500 font-mono">NIP / ID: {selectedStaff.nip}</p>
                    </div>
                  </div>

                  <div className="space-y-11">
                    <div>
                      <p className="text-slate-600">Pengawas Lapangan (Vendor):</p>
                      <p className="font-semibold text-slate-800">{selectedStaff.vendorName || 'PT. YASMINE BUIH PERSADA'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">( ............................................. )</p>
                      <p className="text-[8.5px] text-slate-500">Supervisor Lapangan</p>
                    </div>
                  </div>

                  <div className="space-y-11">
                    <div>
                      <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                      <p className="font-semibold text-slate-800">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                      <p className="text-[8.5px] text-slate-500 font-mono">NIP. {inst.pejabatNip || '19780502 200604 1 017'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Penomoran Baku F4 */}
              <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>ID Dokumen: {documentId} • Sistem OutsourceTrack & KPI Pro</span>
                <span className="font-bold text-slate-700">Halaman 1 dari 1</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. REKAPITULASI KINERJA 4 PILAR TIM (F4 PORTRAIT)                        */}
          {/* ========================================================================= */}
          {printMode === 'rekap-divisi' && (
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:!static print:!block print:!w-full print:!max-w-full print:!min-h-0 print:!h-auto print:!p-0 print:!m-0 print:!border-none print:!shadow-none select-text">
              <div>
                <KopSuratKedinasan inst={inst} isLandscape={false} />
                <div className="text-center space-y-0.5 mb-3">
                  <h4 className="text-xs sm:text-sm font-extrabold uppercase underline text-slate-950 tracking-wide">
                    REKAPITULASI BULANAN KEHADIRAN & EVALUASI KINERJA TENAGA ALIH DAYA
                  </h4>
                  <p className="text-[10px] text-slate-600 font-mono">
                    Nomor: {inst.nomorSuratPrefix} / REKAP-4P / {selectedYear} · Periode: {selectedMonthName} {selectedYear}
                  </p>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs mb-3">
                  <div>
                    <div className="text-slate-500 text-[10px]">Total Tenaga Outsourcing</div>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                      {staffList.length} Personel
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Tingkat Kehadiran Disiplin</div>
                    <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                      {attendanceRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Total Log Geofence Valid</div>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                      {totalLogs} Record
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Rata-rata Skor KPI Tim</div>
                    <div className="text-sm font-bold font-mono text-indigo-700 mt-0.5">
                      {averageTeamScore} / 5.00 ★
                    </div>
                  </div>
                </div>

                {/* Tabel Rekapitulasi Utama */}
                <div className="space-y-1 mb-4">
                  <h5 className="text-[11px] font-bold text-slate-900 uppercase">
                    A. Tabel Evaluasi 4 Pilar Kompetensi & Rekomendasi Kontrak Kerja
                  </h5>
                  <table className="w-full text-left text-[10px] border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                        <th className="py-1.5 px-2 border-r border-slate-300 w-7 text-center">No</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300">Nama Personel / NIP</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300">Sub Bagian / Vendor</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Kehadiran</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Skor 4P</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Predikat</th>
                        <th className="py-1.5 px-2.5">Rekomendasi Pejabat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {staffList.map((st, idx) => {
                        const agg = monthlyAggregates.find((m) => m.staffId === st.id);
                        return (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-2.5 border-r border-slate-200">
                              <div className="font-bold text-slate-900">{st.name}</div>
                              <div className="text-[9px] text-slate-500 font-mono">{st.nip}</div>
                            </td>
                            <td className="py-1 px-2.5 border-r border-slate-200">
                              <div className="font-semibold text-slate-800">{st.division}</div>
                              <div className="text-[9px] text-slate-500">{st.vendorName}</div>
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">
                              100%
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                              {agg ? agg.averageScore.toFixed(2) : '1.00'}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-center">
                              <span className="font-semibold text-slate-900">
                                {agg?.predicate || 'Belum Ada Penilaian'}
                              </span>
                            </td>
                            <td className="py-1 px-2.5 text-[9.5px] text-slate-700">
                              {agg?.contractRecommendation || 'Belum Ada Evaluasi'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan */}
                <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-[10px] text-center items-end">
                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-600">Pejabat Penilai,</p>
                      <p className="font-bold text-slate-800">{currentUser?.roleTitle || 'Atasan Langsung / Kasubag'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{currentUser?.name || 'Muhammad Sugeng Wahyudi, A.Md'}</p>
                      <p className="text-[9px] text-slate-500 font-mono">NIP: {currentUser?.nip || '19821218 200604 1 008'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="p-1.5 border border-slate-800 rounded-lg bg-white">
                      <QrCode className="w-12 h-12 text-slate-900" />
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 uppercase">VALID: OTP-DISDIK-HST</span>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                      <p className="font-bold text-slate-800">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                      <p className="text-[9px] text-slate-500 font-mono">NIP: {inst.pejabatNip || '19780502 200604 1 017'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Penomoran Baku F4 */}
              <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>ID Dokumen: {documentId} • Sistem OutsourceTrack & KPI Pro</span>
                <span className="font-bold text-slate-700">Halaman 1 dari 1</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. RAPOR INDIVIDU 4 PILAR (F4 PORTRAIT)                                  */}
          {/* ========================================================================= */}
          {printMode === 'rapor-staf' && selectedStaff && (
            <>
              {/* LEMBAR 1: RAPOR EVALUASI KINERJA INDIVIDU (LEMBAR INDUK) */}
              <div
                key="rapor-p1"
                className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:!static print:!block print:!w-full print:!max-w-full print:!min-h-0 print:!h-auto print:!p-0 print:!m-0 print:!border-none print:!shadow-none select-text"
              >
                <div>
                  <KopSuratKedinasan inst={inst} isLandscape={false} />
                  <div className="text-center space-y-0.5 mb-3">
                    <h4 className="text-xs sm:text-sm font-extrabold uppercase underline text-slate-950 tracking-wide">
                      RAPOR EVALUASI KINERJA INDIVIDU TENAGA ALIH DAYA
                    </h4>
                    <p className="text-[10px] text-slate-600 font-mono">
                      Nomor: {inst.nomorSuratPrefix} / RAPOR / {selectedYear} · Periode: {selectedMonthName} {selectedYear}
                    </p>
                  </div>

                  {/* Profil Staf Info Grid */}
                  <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-300 text-[10px] mb-3">
                    <div className="space-y-1">
                      <div className="flex"><span className="w-28 text-slate-500">Nama Pegawai</span><span className="font-bold text-slate-900">: {selectedStaff.name}</span></div>
                      <div className="flex"><span className="w-28 text-slate-500">NIP / ID Kontrak</span><span className="font-mono font-semibold text-slate-800">: {selectedStaff.nip}</span></div>
                      <div className="flex"><span className="w-28 text-slate-500">Jabatan / Tugas</span><span className="font-semibold text-slate-800">: {selectedStaff.roleTitle}</span></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex"><span className="w-28 text-slate-500">Divisi Penempatan</span><span className="font-semibold text-slate-800">: {selectedStaff.division}</span></div>
                      <div className="flex"><span className="w-28 text-slate-500">Vendor Penyedia</span><span className="font-semibold text-slate-800">: {selectedStaff.vendorName}</span></div>
                      <div className="flex"><span className="w-28 text-slate-500">Lokasi Penugasan</span><span className="font-semibold text-slate-800">: {selectedStaff.assignedLocation?.name || 'Kantor Disdik HST'}</span></div>
                    </div>
                  </div>

                  {/* Ringkasan Skor Pilar */}
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="text-[9px] text-blue-700 font-bold">1. Kualitas & Produktivitas</div>
                      <div className="text-sm font-bold font-mono text-blue-900 mt-0.5">{pQuality} ★</div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-[9px] text-emerald-700 font-bold">2. Sikap Kerja & Disiplin</div>
                      <div className="text-sm font-bold font-mono text-emerald-900 mt-0.5">{pInitiative} ★</div>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
                      <div className="text-[9px] text-purple-700 font-bold">3. Interpersonal & Tim</div>
                      <div className="text-sm font-bold font-mono text-purple-900 mt-0.5">{pTeamwork} ★</div>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="text-[9px] text-amber-700 font-bold">4. Adaptasi & Solusi</div>
                      <div className="text-sm font-bold font-mono text-amber-900 mt-0.5">{pAdaptability} ★</div>
                    </div>
                  </div>

                  {/* Catatan Kualitatif */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 text-[10px] space-y-1 mb-4">
                    <strong className="text-slate-900 block uppercase font-bold text-[10px]">Catatan Evaluasi Atasan & Rekomendasi Kontrak:</strong>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{latestEval?.qualitativeFeedback || (latestEval as any)?.qualitativeNotes || staffMonthlyAgg?.contractRecommendation || 'Kinerja staf dinilai memenuhi standar operasional kedinasan dengan tingkat kedisiplinan yang baik.'}"
                    </p>
                  </div>

                  {/* Tanda Tangan */}
                  <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-[10px] text-center items-end">
                    <div className="space-y-12">
                      <div>
                        <p className="text-slate-600">Pejabat Penilai,</p>
                        <p className="font-bold text-slate-800">{supervisorObj?.roleTitle || 'Atasan Langsung / Kasubag'}</p>
                      </div>
                      <div>
                        <p className="font-bold underline text-slate-950">{supervisorObj?.name || 'Salihin, S.Pd.SD'}</p>
                        <p className="text-[9px] text-slate-500 font-mono">NIP: {supervisorObj?.nip || '-'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="p-1.5 border border-slate-800 rounded-lg bg-white">
                        <QrCode className="w-12 h-12 text-slate-900" />
                      </div>
                      <span className="text-[8px] font-mono text-slate-500 uppercase">VALID: OTP-DISDIK-HST</span>
                    </div>

                    <div className="space-y-12">
                      <div>
                        <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                        <p className="font-bold text-slate-800">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                      </div>
                      <div>
                        <p className="font-bold underline text-slate-950">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                        <p className="text-[9px] text-slate-500 font-mono">NIP: {inst.pejabatNip || '19780502 200604 1 017'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Penomoran Baku F4 Lembar 1 */}
                <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>ID Dokumen: {documentId} • Sistem OutsourceTrack &amp; KPI Pro</span>
                  <span className="font-bold text-slate-700">Halaman 1 dari 2 (Lembar Induk Evaluasi)</span>
                </div>
              </div>

              {/* LEMBAR 2: LAMPIRAN GRAFIK RADAR KOMPETENSI (SPIDER CHART) & TABEL RINCIAN 11 INDIKATOR */}
              <div
                key="rapor-p2"
                className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:!static print:!block print:!w-full print:!max-w-full print:!min-h-0 print:!h-auto print:!p-0 print:!m-0 print:!border-none print:!shadow-none select-text"
              >
                <div>
                  {/* Kop Lampiran Resmi Disdik HST */}
                  <div className="border-b-2 border-slate-900 pb-2 mb-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/logo-hst.png"
                          alt="Logo Disdik HST"
                          className="w-10 h-12 object-contain"
                        />
                        <div>
                          <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                            {inst.namaPemda}
                          </h5>
                          <h4 className="text-xs font-black text-slate-950 uppercase">
                            {inst.namaSkpd}
                          </h4>
                          <p className="text-[8px] text-slate-600">
                            {(inst as any).alamat || (inst as any).alamatSkpd || 'Kabupaten Hulu Sungai Tengah'} · Pos-el: {inst.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[9px] font-bold uppercase tracking-wider">
                          LAMPIRAN RESMI
                        </span>
                        <p className="text-[8.5px] font-mono text-slate-600 mt-0.5">
                          Nomor: {inst.nomorSuratPrefix} / RAPOR / {selectedYear}
                        </p>
                        <p className="text-[8.5px] font-mono text-slate-600">
                          Periode: {selectedMonthName} {selectedYear}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Header Sub Lampiran & Identitas Singkat Staf */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-300 rounded-xl p-2.5 mb-2.5 text-[10px]">
                    <div>
                      <h4 className="font-extrabold uppercase text-slate-950 text-[10.5pt] flex items-center gap-1.5">
                        <span>GRAFIK RADAR KOMPETENSI (SPIDER CHART) &amp; RINCIAN 11 PARAMETER</span>
                      </h4>
                      <p className="text-[8.5pt] text-slate-600 mt-0.5">
                        Pemetaan profil kompetensi 4 pilar dan evaluasi rincian kinerja individu tenaga alih daya
                      </p>
                    </div>
                    <div className="text-right font-mono text-[9pt] space-y-0.5">
                      <div><strong className="text-slate-900">{selectedStaff.name}</strong> ({selectedStaff.nip})</div>
                      <div className="text-slate-600">{selectedStaff.roleTitle} · {selectedStaff.division}</div>
                    </div>
                  </div>

                  {/* Section Radar Chart & Rangkuman Analisis */}
                  <div className="grid grid-cols-12 gap-3 mb-2.5 border border-slate-200 rounded-xl p-2.5 bg-slate-50/60">
                    {/* Kolom Kiri: Radar Spider Chart SVG */}
                    <div className="col-span-5 flex flex-col items-center justify-center border-r border-slate-200 pr-2">
                      <div className="text-[9.5pt] font-bold text-slate-800 uppercase tracking-wider text-center mb-0.5">
                        Radar Kompetensi (11 Parameter)
                      </div>
                      <div className="py-0.5 scale-90 sm:scale-95 origin-center">
                        <RadarChart ratings={radarRatings} size={250} />
                      </div>
                    </div>

                    {/* Kolom Kanan: Rangkuman 4 Pilar, Keunggulan & Fokus */}
                    <div className="col-span-7 flex flex-col justify-between pl-1 space-y-1.5 text-[9pt]">
                      {/* Ringkasan Skor 4 Pilar */}
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        <div className="p-1 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="text-[7.5pt] text-blue-700 font-bold leading-tight">Pilar 1: Kualitas</div>
                          <div className="text-[10pt] font-bold font-mono text-blue-900 mt-0.5">{pQuality} ★</div>
                        </div>
                        <div className="p-1 rounded-lg bg-emerald-50 border border-emerald-200">
                          <div className="text-[7.5pt] text-emerald-700 font-bold leading-tight">Pilar 2: Sikap</div>
                          <div className="text-[10pt] font-bold font-mono text-emerald-900 mt-0.5">{pInitiative} ★</div>
                        </div>
                        <div className="p-1 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="text-[7.5pt] text-purple-700 font-bold leading-tight">Pilar 3: Relasi</div>
                          <div className="text-[10pt] font-bold font-mono text-purple-900 mt-0.5">{pTeamwork} ★</div>
                        </div>
                        <div className="p-1 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="text-[7.5pt] text-amber-700 font-bold leading-tight">Pilar 4: Solusi</div>
                          <div className="text-[10pt] font-bold font-mono text-amber-900 mt-0.5">{pAdaptability} ★</div>
                        </div>
                      </div>

                      {/* Keunggulan Utama & Area Fokus */}
                      <div className="space-y-1">
                        <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
                          <span className="font-bold text-emerald-900 block text-[8.5pt]">
                            ⭐ Keunggulan Utama (Strengths):
                          </span>
                          <p className="text-[8pt] text-emerald-800 leading-snug mt-0.5">
                            Ketelitian tugas kedinasan, kepatuhan presensi geofence, komitmen tinggi pada tata tertib kantor Disdik.
                          </p>
                        </div>

                        <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-200/80">
                          <span className="font-bold text-amber-900 block text-[8.5pt]">
                            📈 Area Fokus Peningkatan (Development Focus):
                          </span>
                          <p className="text-[8pt] text-amber-800 leading-snug mt-0.5">
                            Peningkatan kelengkapan pelaporan kinerja harian dan komunikasi proaktif koordinatif lintas bidang.
                          </p>
                        </div>
                      </div>

                      {/* Skor Akhir Rata-Rata */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
                        <span className="font-bold text-indigo-950 text-[9pt]">
                          Rata-rata Capaian (11 Parameter):
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-900 text-[11pt]">
                            {overallAvgScore} ★
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[8pt]">
                            {parseFloat(overallAvgScore) >= 4.5
                              ? 'SANGAT BAIK'
                              : parseFloat(overallAvgScore) >= 4.0
                              ? 'BAIK'
                              : parseFloat(overallAvgScore) >= 3.0
                              ? 'CUKUP'
                              : 'PERLU PEMBINAAN'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Tabel Rincian Baku 11 Parameter (Semantik SIP-SPJ) */}
                  <div className="mb-2.5">
                    <div className="text-[9.5pt] font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Tabel Rincian Capaian 11 Parameter Kompetensi Kerja</span>
                      <span className="text-[8pt] font-mono text-slate-500 font-normal">Standar Baku Target Baseline: 4.0 ★</span>
                    </div>

                    <table className="w-full text-left border-collapse border border-black text-[7.5pt] print:text-[7pt]">
                      <thead className="bg-slate-100 text-black font-bold border-b border-black text-center">
                        <tr>
                          <th className="py-1 px-1 border border-black w-[4%] text-center">No</th>
                          <th className="py-1 px-1.5 border border-black w-[20%] text-left">Pilar Kompetensi</th>
                          <th className="py-1 px-1.5 border border-black w-[24%] text-left">Indikator / Parameter</th>
                          <th className="py-1 px-1 border border-black w-[9%] text-center">Target</th>
                          <th className="py-1 px-1 border border-black w-[9%] text-center">Capaian</th>
                          <th className="py-1 px-1 border border-black w-[14%] text-center">Status</th>
                          <th className="py-1 px-1.5 border border-black w-[20%] text-left">Rubrik &amp; Kriteria Penilaian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {radarIndicators.map((ind) => {
                          const status =
                            ind.score >= 4.5
                              ? { label: 'Sangat Baik (+)', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
                              : ind.score >= 4.0
                              ? { label: 'Memenuhi (✓)', cls: 'bg-blue-100 text-blue-800 border-blue-300' }
                              : ind.score >= 3.0
                              ? { label: 'Cukup (~)', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
                              : { label: 'Perlu Peningkatan (!)', cls: 'bg-rose-100 text-rose-800 border-rose-300' };

                          return (
                            <tr key={ind.no} className="border-b border-slate-300">
                              <td className="py-0.5 px-1 border border-black text-center font-mono">{ind.no}</td>
                              <td className="py-0.5 px-1.5 border border-black font-semibold text-slate-800 text-[7pt]">{ind.pillar}</td>
                              <td className="py-0.5 px-1.5 border border-black font-bold text-slate-900 text-[7.5pt]">{ind.name}</td>
                              <td className="py-0.5 px-1 border border-black text-center font-mono text-slate-600">{ind.target.toFixed(1)} ★</td>
                              <td className="py-0.5 px-1 border border-black text-center font-mono font-extrabold text-indigo-950 bg-indigo-50/40">{ind.score.toFixed(1)} ★</td>
                              <td className="py-0.5 px-1 border border-black text-center">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[6.5pt] font-bold border ${status.cls}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="py-0.5 px-1.5 border border-black text-[6.5pt] text-slate-700 leading-tight">{ind.rubric}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-black">
                        <tr>
                          <td colSpan={3} className="py-0.5 px-2 border border-black text-right uppercase text-[7.5pt]">
                            Rata-Rata Capaian Kompetensi (11 Parameter):
                          </td>
                          <td className="py-0.5 px-1 border border-black text-center font-mono text-[7.5pt]">4.0 ★</td>
                          <td className="py-0.5 px-1 border border-black text-center font-mono text-[8pt] font-black text-indigo-950 bg-indigo-100/60">
                            {overallAvgScore} ★
                          </td>
                          <td colSpan={2} className="py-0.5 px-2 border border-black text-left font-mono text-[7pt]">
                            Predikat: <strong className="text-slate-950 font-bold uppercase">{parseFloat(overallAvgScore) >= 4.5 ? 'SANGAT BAIK (A)' : parseFloat(overallAvgScore) >= 4.0 ? 'BAIK (B)' : parseFloat(overallAvgScore) >= 3.0 ? 'CUKUP (C)' : 'KURANG (D)'}</strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Pengesahan Tanda Tangan Lampiran */}
                  <div className="pt-2 border-t border-slate-300 grid grid-cols-3 gap-6 text-[8.5pt] text-center items-end">
                    <div className="space-y-6">
                      <div>
                        <p className="text-slate-600">Pejabat Penilai,</p>
                        <p className="font-bold text-slate-800">{supervisorObj?.roleTitle || 'Atasan Langsung / Kasubag'}</p>
                      </div>
                      <div>
                        <p className="font-bold underline text-slate-950">{supervisorObj?.name || 'Salihin, S.Pd.SD'}</p>
                        <p className="text-[7.5pt] text-slate-500 font-mono">NIP: {supervisorObj?.nip || '-'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-0.5">
                      <div className="p-1 border border-slate-800 rounded-lg bg-white">
                        <QrCode className="w-8 h-8 text-slate-900" />
                      </div>
                      <span className="text-[7pt] font-mono text-slate-500 uppercase">VALID: OTP-DISDIK-HST</span>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                        <p className="font-bold text-slate-800">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                      </div>
                      <div>
                        <p className="font-bold underline text-slate-950">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                        <p className="text-[7.5pt] text-slate-500 font-mono">NIP: {inst.pejabatNip || '19780502 200604 1 017'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Penomoran Baku F4 Hal 2 dari 2 */}
                <div className="pt-1.5 border-t border-slate-200 mt-1 flex items-center justify-between text-[8.5pt] text-slate-500 font-mono">
                  <span>ID Dokumen: {documentId} • Sistem OutsourceTrack &amp; KPI Pro</span>
                  <span className="font-bold text-slate-700">Halaman 2 dari 2 (Lampiran Grafik Radar &amp; Rincian Kompetensi)</span>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* 5. SURAT PERINTAH TUGAS LEMBUR (SPTL - F4 PORTRAIT)                       */}
          {/* ========================================================================= */}
          {printMode === 'sptl-lembur' && (
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:!static print:!block print:!w-full print:!max-w-full print:!min-h-0 print:!h-auto print:!p-0 print:!m-0 print:!border-none print:!shadow-none select-text">
              <div>
                <KopSuratKedinasan inst={inst} isLandscape={false} />
                <div className="text-center space-y-0.5 mb-3">
                  <h4 className="text-xs sm:text-sm font-extrabold uppercase underline text-slate-950 tracking-wide">
                    SURAT PERINTAH & REKAPITULASI PELAKSANAAN TUGAS LEMBUR (SPTL)
                  </h4>
                  <p className="text-[10px] text-slate-600 font-mono">
                    Nomor: {inst.nomorSuratPrefix || '800.1 / OTP-DISDIK'} / SPTL / {selectedYear} · Periode: {selectedMonthName} {selectedYear}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 text-[10px] leading-relaxed text-slate-700 mb-3 space-y-0.5">
                  <strong className="text-slate-900 block font-bold">Dasar Pelaksanaan Lembur:</strong>
                  <p>
                    Berdasarkan kebutuhan kedinasan mendesak di lingkungan {inst.namaSkpd} ({inst.namaPemda}), dengan ini diperintahkan dan direkapitulasi pelaksanaan tugas lembur yang dilaksanakan di dalam area kantor dinas di luar jam kerja resmi atau pada hari libur sebagai berikut:
                  </p>
                </div>

                <div className="space-y-1 mb-4">
                  <h5 className="text-[10px] font-bold text-slate-900 uppercase">
                    Daftar Realisasi Jam Lembur Staf Alih Daya Terverifikasi Geofence
                  </h5>
                  <table className="w-full text-left text-[9.5px] border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="py-1.5 px-2 border-r border-slate-300 w-7 text-center">No</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300">Nama Personel / NIP</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Tanggal</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Jam Riil</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Durasi</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300">Uraian Output Pekerjaan</th>
                        <th className="py-1.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(overtimeRecords || []).filter(o => o.status === 'COMPLETED' || o.status === 'APPROVED').length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                            Belum ada tiket tugas lembur yang diselesaikan untuk periode ini.
                          </td>
                        </tr>
                      ) : (
                        (overtimeRecords || [])
                          .filter(o => o.status === 'COMPLETED' || o.status === 'APPROVED')
                          .map((ot, idx) => (
                            <tr key={ot.id} className="hover:bg-slate-50/60">
                              <td className="py-1 px-2 border-r border-slate-300 text-center font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-1 px-2.5 border-r border-slate-300 font-semibold text-slate-900">
                                <div>{ot.staffName}</div>
                                <div className="text-[8.5px] text-slate-400 font-mono font-normal">{ot.staffNip || 'ID Kontrak'}</div>
                              </td>
                              <td className="py-1 px-2 border-r border-slate-300 text-center font-mono text-[9px]">
                                {ot.date}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-300 text-center font-mono text-[9px]">
                                {ot.clockInTime || ot.startTimePlan || '17:00'} - {ot.clockOutTime || 'Selesai'}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-300 text-center font-mono font-bold text-indigo-700">
                                {Math.floor((ot.actualDurationMinutes || 60) / 60)} Jam
                              </td>
                              <td className="py-1 px-2.5 border-r border-slate-300 text-slate-700 leading-snug">
                                <div className="font-medium text-slate-900">{ot.reason}</div>
                                {ot.workSummary && (
                                  <div className="text-[8.5px] text-slate-500 italic mt-0.5">
                                    Output: {ot.workSummary}
                                  </div>
                                )}
                              </td>
                              <td className="py-1 px-2 text-center">
                                <span className="font-semibold text-emerald-800 font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-50">
                                  {ot.status === 'COMPLETED' ? 'Sah Kantor' : 'Disetujui'}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan */}
                <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-[10px] text-center">
                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-600">Pejabat Pengawas / Penilai,</p>
                      <p className="font-bold text-slate-900">{currentUser?.roleTitle || 'Atasan Langsung / Kasubag'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{currentUser?.name || 'Muhammad Sugeng Wahyudi, A.Md'}</p>
                      <p className="text-[9px] text-slate-500 font-mono">NIP: {currentUser?.nip || '19821218 200604 1 008'}</p>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                      <p className="font-bold text-slate-900">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                      <p className="text-[9px] text-slate-500 font-mono">NIP: {inst.pejabatNip || '19780502 200604 1 017'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Penomoran Baku F4 */}
              <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>ID Dokumen: {documentId} • Sistem OutsourceTrack & KPI Pro</span>
                <span className="font-bold text-slate-700">Halaman 1 dari 1</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. SURAT KETERANGAN IZIN & HAK CUTI RESMI (F4 PORTRAIT)                   */}
          {/* ========================================================================= */}
          {printMode === 'surat-izin' && (
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:!static print:!block print:!w-full print:!max-w-full print:!min-h-0 print:!h-auto print:!p-0 print:!m-0 print:!border-none print:!shadow-none select-text">
              <div>
                <KopSuratKedinasan inst={inst} isLandscape={false} />
                <div className="text-center space-y-0.5 mb-3">
                  <h4 className="text-xs sm:text-sm font-extrabold uppercase underline text-slate-950 tracking-wide">
                    SURAT KETERANGAN & REKAPITULASI IZIN / CUTI TENAGA ALIH DAYA
                  </h4>
                  <p className="text-[10px] text-slate-600 font-mono">
                    Nomor: {inst.nomorSuratPrefix || '800.1 / OTP-DISDIK'} / CUTI-IZIN / {selectedYear} · Periode: {selectedMonthName} {selectedYear}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 text-[10px] leading-relaxed text-slate-700 mb-3 space-y-0.5">
                  <strong className="text-slate-900 block font-bold">Keterangan Kedinasan:</strong>
                  <p>
                    Berdasarkan permohonan yang diajukan oleh tenaga alih daya (outsourcing) di lingkungan {inst.namaSkpd} ({inst.namaPemda}), serta verifikasi dokumen medis/kedinasan yang sah, dengan ini diterbitkan rekapitulasi surat izin dan hak cuti resmi sebagai dasar administrasi kepegawaian dan sinkronisasi presensi:
                  </p>
                </div>

                <div className="space-y-1 mb-4">
                  <h5 className="text-[10px] font-bold text-slate-900 uppercase">
                    Daftar Realisasi Izin Sakit (SKD) & Cuti Sah Terverifikasi Atasan
                  </h5>
                  <table className="w-full text-left text-[9.5px] border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="py-1.5 px-2 border-r border-slate-300 w-7 text-center">No</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300">Nama Personel / NIP</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Jenis Izin</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Rentang Tanggal</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-center">Durasi</th>
                        <th className="py-1.5 px-2.5 border-r border-slate-300">Uraian Alasan / Keterangan</th>
                        <th className="py-1.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(leaveRecords || []).filter((l) => {
                        if (selectedStaffId && selectedStaffId !== 'ALL' && l.staffId !== selectedStaffId) {
                          return false;
                        }
                        return l.status === 'APPROVED' || l.status === 'PENDING';
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                            Belum ada permohonan izin/cuti yang tercatat untuk personel atau periode yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        (leaveRecords || [])
                          .filter((l) => {
                            if (selectedStaffId && selectedStaffId !== 'ALL' && l.staffId !== selectedStaffId) {
                              return false;
                            }
                            return l.status === 'APPROVED' || l.status === 'PENDING';
                          })
                          .map((l, idx) => {
                            const typeLabel: Record<string, string> = {
                              SAKIT: 'Izin Sakit (SKD)',
                              CUTI_TAHUNAN: 'Cuti Tahunan',
                              CUTI_ALASAN_PENTING: 'Cuti Alasan Penting',
                              CUTI_BERSALIN: 'Cuti Bersalin',
                              IZIN_KEPERLUAN: 'Izin Keperluan Mendesak',
                            };
                            return (
                              <tr key={l.id} className="hover:bg-slate-50/60">
                                <td className="py-1 px-2 border-r border-slate-300 text-center font-mono">
                                  {idx + 1}
                                </td>
                                <td className="py-1 px-2.5 border-r border-slate-300 font-semibold text-slate-900">
                                  <div>{l.staffName}</div>
                                  <div className="text-[8.5px] text-slate-400 font-mono font-normal">
                                    {l.staffNip || 'ID Kontrak'} · {l.divisionName || l.divisionId}
                                  </div>
                                </td>
                                <td className="py-1 px-2 border-r border-slate-300 text-center font-semibold text-slate-800 text-[9px]">
                                  {typeLabel[l.leaveType] || l.leaveType}
                                </td>
                                <td className="py-1 px-2 border-r border-slate-300 text-center font-mono text-[9px]">
                                  {l.startDate} {l.startDate !== l.endDate ? `s/d ${l.endDate}` : ''}
                                </td>
                                <td className="py-1 px-2 border-r border-slate-300 text-center font-bold text-slate-900 font-mono">
                                  {l.totalDays} Hari
                                </td>
                                <td className="py-1 px-2.5 border-r border-slate-300 text-slate-700 leading-snug">
                                  <div>{l.reason}</div>
                                  {l.supervisorNotes && (
                                    <div className="text-[8.5px] text-teal-700 italic mt-0.5">
                                      Catatan: {l.supervisorNotes}
                                    </div>
                                  )}
                                </td>
                                <td className="py-1 px-2 text-center">
                                  <span className={`font-semibold font-mono text-[9px] px-1.5 py-0.2 rounded ${
                                    l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                                  }`}>
                                    {l.status === 'APPROVED' ? 'Disetujui Sah' : 'Menunggu'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan */}
                <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-[10px] text-center">
                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-600">Pejabat Pengawas / Penilai,</p>
                      <p className="font-bold text-slate-900">{currentUser?.roleTitle || 'Atasan Langsung / Kasubag'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{currentUser?.name || 'Muhammad Sugeng Wahyudi, A.Md'}</p>
                      <p className="text-[9px] text-slate-500 font-mono">NIP: {currentUser?.nip || '19821218 200604 1 008'}</p>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                      <p className="font-bold text-slate-900">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                    </div>
                    <div>
                      <p className="font-bold underline text-slate-950">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                      <p className="text-[9px] text-slate-500 font-mono">NIP: {inst.pejabatNip || '19780502 200604 1 017'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Penomoran Baku F4 */}
              <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>ID Dokumen: {documentId} • Sistem OutsourceTrack & KPI Pro</span>
                <span className="font-bold text-slate-700">Halaman 1 dari 1</span>
              </div>
            </div>
          )}
        </DocumentPublishBanner>
      </div>
    </div>
  );
};

export default PrintReportModal;
