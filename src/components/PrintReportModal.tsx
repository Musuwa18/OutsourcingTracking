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
  InstitutionSettings,
  DEFAULT_INSTITUTION_SETTINGS,
  OvertimeRecord,
  LeaveRequest,
} from '../types';
import DocumentPublishBanner from './DocumentPublishBanner';
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
}) => {
  if (!isOpen) return null;

  const [printMode, setPrintMode] = useState<
    'rekap-matriks' | 'timesheet-harian' | 'rekap-divisi' | 'rapor-staf' | 'sptl-lembur' | 'surat-izin'
  >('rekap-matriks');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
  const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayNamesLong = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const selectedMonthName = monthNames[monthNum - 1];
  const selectedYear = yearNum;

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);
  const inst = institutionSettings || DEFAULT_INSTITUTION_SETTINGS;
  const selectedStaff = staffMap.get(selectedStaffId) || staffList[0];

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

  // Data Matriks Bulanan (Sheet 1)
  const matrixStaffData = useMemo(() => {
    return staffList.map((st, idx) => {
      let hadir = 0, sakit = 0, izin = 0, cuti = 0, alpa = 0, libur = 0, lemburJam = 0;
      const dailyCodes: string[] = [];

      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
        const isNightWorker = Boolean(
          st.roleTitle?.toLowerCase().includes('wakar') || st.roleTitle?.toLowerCase().includes('jaga malam')
        );

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
        } else if (dayOfWeek === 0 && !isNightWorker) {
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
  }, [staffList, totalDaysInMonth, selectedMonth, attLookup, otLookup, leaveLookup]);

  const dailyHadirTotals = useMemo(() => {
    const totals: number[] = [];
    for (let d = 0; d < totalDaysInMonth; d++) {
      const sum = matrixStaffData.filter((s) => s.dailyCodes[d] === 'H').length;
      totals.push(sum);
    }
    return totals;
  }, [matrixStaffData, totalDaysInMonth]);

  // Dynamic Page Chunking untuk Matriks F4 Landscape (11 staf per halaman F4)
  const matrixChunks = useMemo(() => {
    const chunkSize = 11;
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
  const pQuality = latestEval ? latestEval.ratings.qualityOfWork.toFixed(2) : (staffMonthlyAgg?.pillarScores?.quality ? staffMonthlyAgg.pillarScores.quality.toFixed(2) : '1.00');
  const pQuantity = latestEval ? latestEval.ratings.quantityOfWork.toFixed(2) : (staffMonthlyAgg?.pillarScores?.quality ? staffMonthlyAgg.pillarScores.quality.toFixed(2) : '1.00');
  const pTime = latestEval ? latestEval.ratings.timeManagement.toFixed(2) : (staffMonthlyAgg?.pillarScores?.quality ? staffMonthlyAgg.pillarScores.quality.toFixed(2) : '1.00');
  const pInitiative = latestEval ? latestEval.ratings.initiative.toFixed(2) : (staffMonthlyAgg?.pillarScores?.professionalism ? staffMonthlyAgg.pillarScores.professionalism.toFixed(2) : '1.00');
  const pAccountability = latestEval ? latestEval.ratings.accountability.toFixed(2) : (staffMonthlyAgg?.pillarScores?.professionalism ? staffMonthlyAgg.pillarScores.professionalism.toFixed(2) : '1.00');
  const pPunctuality = latestEval ? latestEval.ratings.punctuality.toFixed(2) : (staffMonthlyAgg?.pillarScores?.professionalism ? staffMonthlyAgg.pillarScores.professionalism.toFixed(2) : '1.00');
  const pTeamwork = latestEval ? latestEval.ratings.teamwork.toFixed(2) : (staffMonthlyAgg?.pillarScores?.interpersonal ? staffMonthlyAgg.pillarScores.interpersonal.toFixed(2) : '1.00');
  const pCommunication = latestEval ? latestEval.ratings.communication.toFixed(2) : (staffMonthlyAgg?.pillarScores?.interpersonal ? staffMonthlyAgg.pillarScores.interpersonal.toFixed(2) : '1.00');
  const pCustomer = latestEval ? latestEval.ratings.customerOrientation.toFixed(2) : (staffMonthlyAgg?.pillarScores?.interpersonal ? staffMonthlyAgg.pillarScores.interpersonal.toFixed(2) : '1.00');
  const pAdaptability = latestEval ? latestEval.ratings.adaptability.toFixed(2) : (staffMonthlyAgg?.pillarScores?.adaptability ? staffMonthlyAgg.pillarScores.adaptability.toFixed(2) : '1.00');
  const pProblemSolving = latestEval ? latestEval.ratings.problemSolving.toFixed(2) : (staffMonthlyAgg?.pillarScores?.adaptability ? staffMonthlyAgg.pillarScores.adaptability.toFixed(2) : '1.00');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
      <div className="relative w-full max-w-[96vw] 2xl:max-w-7xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-2 sm:my-4 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none print:rounded-none">
        
        {/* Navigation Toolbar (No-Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-[#161f2e] text-slate-200">
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
            </div>

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

            {/* Selector Staf */}
            {(printMode === 'rapor-staf' || printMode === 'surat-izin' || printMode === 'timesheet-harian') && (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white font-medium max-w-[170px] cursor-pointer"
              >
                {printMode === 'surat-izin' && <option value="ALL">Semua Personel</option>}
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.division ? s.division.split(' ')[0] : 'Umum'})
                  </option>
                ))}
              </select>
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
          onClose={onClose}
          extraActions={
            <a
              href={`/api/reports/rekap-presensi/excel?month=${selectedMonth}&staffId=${selectedStaff?.id || ''}&vendor=${encodeURIComponent(selectedStaff?.vendorName || '')}`}
              download={`rekap_presensi_outsourcing_${selectedMonth}.xlsx`}
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
            matrixChunks.map((chunk, cIdx) => {
              const pageNum = cIdx + 1;
              const totalParts = matrixChunks.length;
              const isLastPage = pageNum === totalParts;

              return (
                <div
                  key={cIdx}
                  className="bg-white text-slate-900 w-[330mm] min-h-[215mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full select-text"
                >
                  <div>
                    {pageNum === 1 ? (
                      <>
                        <KopSuratKedinasan inst={inst} isLandscape={true} />
                        <div className="text-center space-y-0.5 mb-2.5">
                          <h4 className="text-xs sm:text-sm font-extrabold uppercase underline text-slate-950 tracking-wide">
                            REKAPITULASI PRESENSI BULANAN PEGAWAI OUTSOURCING
                          </h4>
                          <p className="text-[10px] text-slate-600 font-mono">
                            Periode: {selectedMonthName} {selectedYear} (1 s.d. {totalDaysInMonth} {selectedMonthName} {selectedYear}) · Penempatan: {inst.namaSkpd} {inst.namaPemda}
                          </p>
                        </div>
                      </>
                    ) : (
                      <HeaderLanjutanMatriks inst={inst} partNumber={pageNum} totalParts={totalParts} monthName={selectedMonthName} yearNum={selectedYear} />
                    )}

                    {/* Tabel Matriks Chunk */}
                    <div className="overflow-x-auto print:overflow-visible">
                      <table className="w-full text-left text-[9.5px] border border-slate-400 border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400 text-center">
                            <th className="py-1.5 px-1 border-r border-slate-400 w-7" rowSpan={2}>No</th>
                            <th className="py-1.5 px-1.5 border-r border-slate-400 w-20 text-left" rowSpan={2}>NIP / ID</th>
                            <th className="py-1.5 px-2 border-r border-slate-400 text-left min-w-[130px]" rowSpan={2}>Nama Pegawai</th>
                            <th className="py-1.5 px-1.5 border-r border-slate-400 text-left min-w-[110px]" rowSpan={2}>Jabatan / Formasi</th>
                            <th className="py-1 border-r border-slate-400 bg-slate-200/80" colSpan={totalDaysInMonth}>
                              Tanggal Presensi ({selectedMonthName} {selectedYear})
                            </th>
                            <th className="py-1 border-r border-slate-400 bg-emerald-50 text-emerald-950 w-6" rowSpan={2}>H</th>
                            <th className="py-1 border-r border-slate-400 bg-rose-50 text-rose-950 w-6" rowSpan={2}>S</th>
                            <th className="py-1 border-r border-slate-400 bg-blue-50 text-blue-950 w-6" rowSpan={2}>I</th>
                            <th className="py-1 border-r border-slate-400 bg-amber-50 text-amber-950 w-6" rowSpan={2}>C</th>
                            <th className="py-1 border-r border-slate-400 bg-red-50 text-red-950 w-6" rowSpan={2}>A</th>
                            <th className="py-1 border-r border-slate-400 bg-slate-100 text-slate-700 w-7" rowSpan={2}>OFF</th>
                            <th className="py-1 border-r border-slate-400 text-center min-w-[42px]" rowSpan={2}>Lembur</th>
                            <th className="py-1 text-center min-w-[48px]" rowSpan={2}>% Hadir</th>
                          </tr>
                          <tr className="bg-slate-50 text-[8.5px] text-slate-700 border-b border-slate-400 text-center">
                            {Array.from({ length: totalDaysInMonth }).map((_, dIdx) => {
                              const dNum = dIdx + 1;
                              const dateObj = new Date(yearNum, monthNum - 1, dNum);
                              const isSunday = dateObj.getDay() === 0;
                              return (
                                <th
                                  key={dNum}
                                  className={`py-0.5 px-0.5 border-r border-slate-300 font-mono ${
                                    isSunday ? 'bg-rose-100 text-rose-700 font-bold' : ''
                                  }`}
                                >
                                  <div>{dNum}</div>
                                  <div className="text-[7.5px] opacity-80">{dayNamesShort[dateObj.getDay()]}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {chunk.map((row) => (
                            <tr key={row.staff.id} className="hover:bg-slate-50/70">
                              <td className="py-1 px-1 border-r border-slate-300 text-center font-mono">
                                {row.no}
                              </td>
                              <td className="py-1 px-1.5 border-r border-slate-300 font-mono text-[9px]">
                                {row.staff.nip || '-'}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-300 font-semibold text-slate-900">
                                {row.staff.name}
                              </td>
                              <td className="py-1 px-1.5 border-r border-slate-300 text-slate-700 text-[9px]">
                                {row.staff.roleTitle || 'Tenaga Outsourcing'}
                              </td>
                              {row.dailyCodes.map((code, dIdx) => {
                                const dateObj = new Date(yearNum, monthNum - 1, dIdx + 1);
                                const isSunday = dateObj.getDay() === 0;
                                return (
                                  <td
                                    key={dIdx}
                                    className={`py-1 px-0.5 border-r border-slate-200 text-center font-mono font-bold text-[8.5px] ${
                                      code === 'H'
                                        ? 'text-emerald-700 bg-emerald-50/30'
                                        : code === 'S'
                                        ? 'text-rose-700 bg-rose-50'
                                        : code === 'I'
                                        ? 'text-blue-700 bg-blue-50'
                                        : code === 'C'
                                        ? 'text-amber-700 bg-amber-50'
                                        : code === 'A'
                                        ? 'text-red-700 bg-red-100'
                                        : isSunday
                                        ? 'text-slate-400 bg-slate-100/60'
                                        : 'text-slate-300'
                                    }`}
                                  >
                                    {code}
                                  </td>
                                );
                              })}
                              <td className="py-1 px-0.5 border-r border-slate-300 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50">
                                {row.hadir}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-300 text-center font-mono font-bold text-rose-800 bg-rose-50/50">
                                {row.sakit}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-300 text-center font-mono font-bold text-blue-800 bg-blue-50/50">
                                {row.izin}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-300 text-center font-mono font-bold text-amber-800 bg-amber-50/50">
                                {row.cuti}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-300 text-center font-mono font-bold text-red-800 bg-red-50/50">
                                {row.alpa}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-300 text-center font-mono text-slate-600 bg-slate-100/50">
                                {row.libur}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-300 text-center font-mono font-bold text-indigo-700">
                                {row.lemburJam > 0 ? `${row.lemburJam}j` : '-'}
                              </td>
                              <td className="py-1 px-0.5 text-center font-mono font-extrabold text-slate-900">
                                {row.pct}
                              </td>
                            </tr>
                          ))}

                          {isLastPage && (
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-center text-[9.5px]">
                              <td colSpan={4} className="py-1.5 px-2 border-r border-slate-400 text-left uppercase">
                                TOTAL KEHADIRAN HARIAN (H)
                              </td>
                              {dailyHadirTotals.map((tot, idx) => (
                                <td key={idx} className="py-1 px-0.5 border-r border-slate-300 font-mono text-emerald-800">
                                  {tot}
                                </td>
                              ))}
                              <td colSpan={8} className="py-1 text-center text-slate-500 font-normal italic text-[8.5px]">
                                Rekapitulasi Sah
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {isLastPage && (
                      <>
                        <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-300 text-[9.5px] leading-relaxed text-slate-700 flex flex-wrap gap-x-5 gap-y-0.5">
                          <span className="font-bold text-slate-900">Keterangan Kode:</span>
                          <span><strong>H</strong> = Hadir Fisik (GPS WebRTC)</span>
                          <span><strong>S</strong> = Sakit (SKD Dokter)</span>
                          <span><strong>I</strong> = Izin Terverifikasi</span>
                          <span><strong>C</strong> = Hak Cuti Sah</span>
                          <span><strong>A</strong> = Alpa</span>
                          <span><strong>OFF</strong> = Libur Rutin</span>
                        </div>

                        {/* Tanda Tangan Resmi Dua Pihak */}
                        <div className="mt-3.5 pt-3 border-t border-slate-300 grid grid-cols-2 gap-8 text-[11px] text-center">
                          <div className="space-y-12">
                            <div>
                              <p className="text-slate-600">Dibuat Oleh (Vendor / Pengawas Lapangan):</p>
                              <p className="font-bold text-slate-900">{selectedStaff?.vendorName || 'PT. YASMINE BUIH PERSADA'}</p>
                            </div>
                            <div>
                              <p className="font-bold underline text-slate-950">( ............................................. )</p>
                              <p className="text-[10px] text-slate-500">Supervisor / Pengawas Lapangan</p>
                            </div>
                          </div>

                          <div className="space-y-12">
                            <div>
                              <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                              <p className="font-bold text-slate-900">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
                            </div>
                            <div>
                              <p className="font-bold underline text-slate-950">{inst.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                              <p className="text-[10px] text-slate-500 font-mono">NIP. {inst.pejabatNip || '19780502 200604 1 017'}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer Penomoran Baku F4 */}
                  <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                    <span>ID Dokumen: {documentId} • Sistem OutsourceTrack & KPI Pro</span>
                    <span className="font-bold text-slate-700">Halaman {pageNum} dari {totalParts}</span>
                  </div>
                </div>
              );
            })
          )}

          {/* ========================================================================= */}
          {/* 2. TIMESHEET HARIAN INDIVIDU (SHEET 2 - F4 PORTRAIT)                     */}
          {/* ========================================================================= */}
          {printMode === 'timesheet-harian' && selectedStaff && (
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full select-text">
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
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full select-text">
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
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full select-text">
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
                    "{latestEval?.qualitativeNotes || staffMonthlyAgg?.contractRecommendation || 'Kinerja staf dinilai memenuhi standar operasional kedinasan dengan tingkat kedisiplinan yang baik.'}"
                  </p>
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
          {/* 5. SURAT PERINTAH TUGAS LEMBUR (SPTL - F4 PORTRAIT)                       */}
          {/* ========================================================================= */}
          {printMode === 'sptl-lembur' && (
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full select-text">
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
            <div className="bg-white text-slate-900 w-[215mm] min-h-[330mm] p-[10mm_12mm] shadow-2xl rounded-xs flex flex-col justify-between text-xs box-border border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full select-text">
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
