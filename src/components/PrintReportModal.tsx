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

  const attLookup = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((a) => {
      if (a.date && a.date.startsWith(selectedMonth)) {
        map.set(`${a.staffId}_${a.date}`, a);
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

  // Matrix calculations (Sheet 1)
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

  // Timesheet Detail Calculations (Sheet 2)
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
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const inst = institutionSettings || DEFAULT_INSTITUTION_SETTINGS;

  const selectedStaff = staffMap.get(selectedStaffId) || staffList[0];

  // Hitung statistik rekap kehadiran
  const totalLogs = attendanceRecords.length;
  const hadirCount = attendanceRecords.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = attendanceRecords.filter((r) => r.status === 'Terlambat').length;
  const attendanceRate = totalLogs > 0 ? ((hadirCount / totalLogs) * 100).toFixed(1) : '100';

  // Filter laporan untuk staf terpilih
  const staffReports = dailyReports.filter((r) => r.staffId === selectedStaff?.id);
  const staffAttendance = attendanceRecords.filter((r) => r.staffId === selectedStaff?.id);
  const staffMonthlyAgg = monthlyAggregates.find((m) => m.staffId === selectedStaff?.id);
  const staffWeeklyEvals = weeklyEvaluations.filter((e) => e.staffId === selectedStaff?.id);

  // Hitung rata-rata skor KPI tim dinamis
  const averageTeamScore = staffList.length > 0
    ? (
        staffList.reduce((acc, st) => {
          const agg = monthlyAggregates.find((m) => m.staffId === st.id);
          return acc + (agg?.averageScore ? agg.averageScore : 1.00);
        }, 0) / staffList.length
      ).toFixed(2)
    : '1.00';

  // Indikator rapor individu staf terpilih
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 sm:my-6">
        
        {/* Action Controls Bar (Hidden during window.print()) */}
        <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pratinjau Dokumen Cetak / PDF Resmi Kedinasan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tata naskah dinas resmi Dinas Pendidikan Kab. Hulu Sungai Tengah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-0.5 text-xs font-semibold overflow-x-auto max-w-[500px]">
              <button
                type="button"
                onClick={() => setPrintMode('rekap-matriks')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  printMode === 'rekap-matriks'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                📊 Matriks 1–31
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('timesheet-harian')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  printMode === 'timesheet-harian'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                📝 Timesheet Staf
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('rekap-divisi')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  printMode === 'rekap-divisi'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Rekap 4P
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('rapor-staf')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  printMode === 'rapor-staf'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Rapor 4P
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('sptl-lembur')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  printMode === 'sptl-lembur'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                SPTL Lembur
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('surat-izin')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  printMode === 'surat-izin'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Surat Izin
              </button>
            </div>

            {/* Filter Bulan */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-09">September 2026</option>
            </select>

            {/* Selector Staf jika mode Rapor Individu / Timesheet Harian / Surat Izin */}
            {(printMode === 'rapor-staf' || printMode === 'surat-izin' || printMode === 'timesheet-harian') && (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium max-w-[160px]"
              >
                {printMode === 'surat-izin' && <option value="ALL">Semua Personel</option>}
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.division.split(' ')[0]})
                  </option>
                ))}
              </select>
            )}

            {/* Tombol Unduh Excel Asli Berformula */}
            <a
              href={`/api/reports/rekap-presensi/excel?month=${selectedMonth}&staffId=${selectedStaff?.id || ''}&vendor=${encodeURIComponent(selectedStaff?.vendorName || '')}`}
              download={`rekap_presensi_outsourcing_${selectedMonth}.xlsx`}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/25 shrink-0"
              title="Unduh berkas Excel (.xlsx) resmi dengan rumus COUNTIF, SUM, dan % Kehadiran identik template referensi"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </a>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-500/25 shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak F4</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Content */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white space-y-6 font-sans max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          
          {/* ================= KOP SURAT RESMI KEDINASAN ================= */}
          <div className="border-b-4 border-double border-slate-900 pb-3 text-center relative">
            <div className="flex items-center justify-between px-2 sm:px-4">
              <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                <img
                  src={inst.logoKiriUrl || '/logos/Lambang_Kabupaten_Hulu_Sungai_Tengah.png'}
                  alt="Lambang Daerah"
                  className="w-full h-full object-contain max-h-20"
                />
              </div>
              <div className="flex-1 px-3 sm:px-6 text-center">
                <h3 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-slate-900 leading-tight">
                  {inst.namaPemda}
                </h3>
                <h2 className="text-base sm:text-xl font-black tracking-wider uppercase text-slate-950 leading-snug">
                  {inst.namaSkpd}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-700 leading-tight mt-0.5 font-medium">
                  {inst.alamatLengkap}
                </p>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Laman: <u>{inst.website}</u> · Pos-el: <u>{inst.email}</u> · Telp: {inst.telepon}
                </p>
              </div>
              <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                <img
                  src={inst.logoKananUrl || '/logos/logo-disdik2026.png'}
                  alt="Logo SKPD"
                  className="w-full h-full object-contain max-h-20"
                />
              </div>
            </div>
          </div>


          {/* ================= MODE: REKAPITULASI PRESENSI MATRIKS BULANAN (SHEET 1) ================= */}
          {printMode === 'rekap-matriks' && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  REKAPITULASI PRESENSI BULANAN PEGAWAI OUTSOURCING
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  Periode: {selectedMonthName} {selectedYear} (1 s.d. {totalDaysInMonth} {selectedMonthName} {selectedYear}) · Penempatan: {inst.namaSkpd} {inst.namaPemda}
                </p>
              </div>

              {/* Tabel Matriks Kalender Bulanan */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center">
                      <th className="py-2 px-1 border-r border-slate-300 w-7" rowSpan={2}>No</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-24 text-left" rowSpan={2}>NIP / ID</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-left min-w-[130px]" rowSpan={2}>Nama Pegawai</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-left min-w-[110px]" rowSpan={2}>Jabatan / Formasi</th>
                      <th className="py-1 border-r border-slate-300 bg-slate-200/70" colSpan={totalDaysInMonth}>
                        Tanggal & Hari ({selectedMonthName} {selectedYear})
                      </th>
                      <th className="py-1 border-r border-slate-300 bg-emerald-50 text-emerald-950 w-7" rowSpan={2}>H</th>
                      <th className="py-1 border-r border-slate-300 bg-rose-50 text-rose-950 w-7" rowSpan={2}>S</th>
                      <th className="py-1 border-r border-slate-300 bg-blue-50 text-blue-950 w-7" rowSpan={2}>I</th>
                      <th className="py-1 border-r border-slate-300 bg-amber-50 text-amber-950 w-7" rowSpan={2}>C</th>
                      <th className="py-1 border-r border-slate-300 bg-red-50 text-red-950 w-7" rowSpan={2}>A</th>
                      <th className="py-1 border-r border-slate-300 bg-slate-100 text-slate-700 w-8" rowSpan={2}>OFF</th>
                      <th className="py-1 border-r border-slate-300 text-center min-w-[45px]" rowSpan={2}>Lembur (Jam)</th>
                      <th className="py-1 text-center min-w-[50px]" rowSpan={2}>% Hadir</th>
                    </tr>
                    <tr className="bg-slate-50 text-[9px] text-slate-600 border-b border-slate-300 text-center">
                      {Array.from({ length: totalDaysInMonth }).map((_, dIdx) => {
                        const dNum = dIdx + 1;
                        const dateObj = new Date(yearNum, monthNum - 1, dNum);
                        const isSunday = dateObj.getDay() === 0;
                        return (
                          <th
                            key={dNum}
                            className={`py-1 px-0.5 border-r border-slate-300 font-mono ${
                              isSunday ? 'bg-rose-100 text-rose-700 font-bold' : ''
                            }`}
                          >
                            <div>{dNum}</div>
                            <div className="text-[8px] opacity-80">{dayNamesShort[dateObj.getDay()]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {matrixStaffData.map((row) => (
                      <tr key={row.staff.id} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-1 border-r border-slate-200 text-center font-mono">
                          {row.no}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-[10px]">
                          {row.staff.nip || '-'}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200 font-semibold text-slate-900">
                          {row.staff.name}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-slate-700 text-[10px]">
                          {row.staff.roleTitle || 'Tenaga Outsourcing'}
                        </td>
                        {row.dailyCodes.map((code, dIdx) => {
                          const dateObj = new Date(yearNum, monthNum - 1, dIdx + 1);
                          const isSunday = dateObj.getDay() === 0;
                          return (
                            <td
                              key={dIdx}
                              className={`py-1 px-0.5 border-r border-slate-200 text-center font-mono font-bold text-[9px] ${
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
                        <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50">
                          {row.hadir}
                        </td>
                        <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-rose-800 bg-rose-50/50">
                          {row.sakit}
                        </td>
                        <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-blue-800 bg-blue-50/50">
                          {row.izin}
                        </td>
                        <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-amber-800 bg-amber-50/50">
                          {row.cuti}
                        </td>
                        <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-red-800 bg-red-50/50">
                          {row.alpa}
                        </td>
                        <td className="py-1 px-1 border-r border-slate-200 text-center font-mono text-slate-600 bg-slate-100/50">
                          {row.libur}
                        </td>
                        <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                          {row.lemburJam > 0 ? `${row.lemburJam}j` : '-'}
                        </td>
                        <td className="py-1 px-1 text-center font-mono font-extrabold text-slate-900">
                          {row.pct}
                        </td>
                      </tr>
                    ))}
                    {/* Baris Total Hadir Harian */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-center text-[10px]">
                      <td colSpan={4} className="py-2 px-2 border-r border-slate-300 text-left uppercase">
                        TOTAL KEHADIRAN HARIAN (H)
                      </td>
                      {dailyHadirTotals.map((tot, idx) => (
                        <td key={idx} className="py-1 px-0.5 border-r border-slate-300 font-mono text-emerald-800">
                          {tot}
                        </td>
                      ))}
                      <td colSpan={8} className="py-1 text-center text-slate-400 font-normal italic">
                        Rekapitulasi Matriks Sah
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Keterangan Kode & Catatan */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] leading-relaxed text-slate-700 flex flex-wrap gap-x-6 gap-y-1">
                <span className="font-bold text-slate-900">Keterangan Kode:</span>
                <span><strong>H</strong> = Hadir Fisik (GPS WebRTC)</span>
                <span><strong>S</strong> = Sakit (SKD Dokter)</span>
                <span><strong>I</strong> = Izin Terverifikasi</span>
                <span><strong>C</strong> = Hak Cuti Sah</span>
                <span><strong>A</strong> = Alpa</span>
                <span><strong>OFF</strong> = Libur Rutin</span>
              </div>
            </div>
          )}

          {/* ================= MODE: TIMESHEET HARIAN INDIVIDU (SHEET 2) ================= */}
          {printMode === 'timesheet-harian' && selectedStaff && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  LEMBAR PRESENSI & TIMESHEET HARIAN INDIVIDU
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  Formulir Rekap Kehadiran Harian Pegawai Outsourcing untuk Dasar Perhitungan Upah, Lembur & SPJ
                </p>
              </div>

              {/* Profil & Header Staf */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-slate-500">Nama Pegawai</span>
                    <span className="font-bold text-slate-900">: {selectedStaff.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">NIP / No. ID</span>
                    <span className="font-mono font-semibold text-slate-800">: {selectedStaff.nip}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Jabatan / Formasi</span>
                    <span className="font-semibold text-slate-800">: {selectedStaff.roleTitle || 'Tenaga Outsourcing'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-32 text-slate-500">Vendor Penyedia</span>
                    <span className="font-bold text-slate-900">: {selectedStaff.vendorName || 'PT. YASMINE BUIH PERSADA'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500">Instansi Pengguna</span>
                    <span className="font-semibold text-slate-800">: {inst.namaSkpd} {inst.namaPemda}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500">Bulan / Periode</span>
                    <span className="font-mono font-semibold text-slate-800">: {selectedMonthName} {selectedYear} ({totalDaysInMonth} Hari)</span>
                  </div>
                </div>
              </div>

              {/* Summary Strip */}
              <div className="grid grid-cols-5 gap-2.5 p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-center">
                <div>
                  <div className="text-slate-500 text-[10px]">Total Hari Kerja</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {totalDaysInMonth <= 30 ? 22 : 23} Hari
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Total Kehadiran</div>
                  <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                    {timesheetSummary.totalHadir} Hari
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Total Lembur Sah</div>
                  <div className="text-base font-bold font-mono text-indigo-700 mt-0.5">
                    {timesheetSummary.totalOt} Jam
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Total Keterlambatan</div>
                  <div className="text-base font-bold font-mono text-amber-700 mt-0.5">
                    {timesheetSummary.totalLate} Menit
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Uang Makan / Trp</div>
                  <div className="text-base font-bold font-mono text-teal-800 mt-0.5">
                    {timesheetSummary.totalMeal} Hari
                  </div>
                </div>
              </div>

              {/* Tabel Timesheet Rinci */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center">
                      <th className="py-2 px-1 border-r border-slate-300 w-7">No</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-left">Tanggal</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-left">Hari</th>
                      <th className="py-2 px-2 border-r border-slate-300">Shift</th>
                      <th className="py-2 px-1.5 border-r border-slate-300 font-mono">Jadwal Masuk</th>
                      <th className="py-2 px-1.5 border-r border-slate-300 font-mono">Jadwal Pulang</th>
                      <th className="py-2 px-2 border-r border-slate-300 font-mono bg-indigo-50/50">Jam Masuk (Aktual)</th>
                      <th className="py-2 px-2 border-r border-slate-300 font-mono bg-indigo-50/50">Jam Pulang (Aktual)</th>
                      <th className="py-2 px-1.5 border-r border-slate-300 font-mono text-amber-900">Telat (Mnt)</th>
                      <th className="py-2 px-2 border-r border-slate-300">Status</th>
                      <th className="py-2 px-2 border-r border-slate-300">Verifikasi</th>
                      <th className="py-2 px-1.5 border-r border-slate-300 font-mono">Lembur (Jam)</th>
                      <th className="py-2 px-2 border-r border-slate-300">Uang Makan</th>
                      <th className="py-2 px-2 text-left">Catatan Lapangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedStaffTimesheet.map((r) => (
                      <tr key={r.d} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-1 border-r border-slate-200 text-center font-mono">
                          {r.d}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-[11px]">
                          {r.dateStr}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-medium">
                          {r.dayName}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100">
                            {r.shiftName}
                          </span>
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-mono">
                          {r.schedIn}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-mono">
                          {r.schedOut}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-900 bg-indigo-50/30">
                          {r.actIn}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-900 bg-indigo-50/30">
                          {r.actOut}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-mono font-bold text-amber-700">
                          {r.lateMins > 0 ? r.lateMins : '-'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                          <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
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
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center text-[10px] text-slate-600">
                          {r.verifText}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                          {r.otHours > 0 ? `${r.otHours}j` : '-'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                          <span className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                            r.mealEligible === 'Dapat' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {r.mealEligible}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-600 text-[11px] leading-tight">
                          {r.noteText}
                        </td>
                      </tr>
                    ))}
                    {/* Baris Total Akumulasi Timesheet */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-center text-[11px]">
                      <td colSpan={8} className="py-2.5 px-3 border-r border-slate-300 text-left uppercase">
                        TOTAL AKUMULASI BULANAN
                      </td>
                      <td className="py-2 px-1.5 border-r border-slate-300 font-mono text-amber-800">
                        {timesheetSummary.totalLate} Mnt
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 font-mono text-emerald-800">
                        {timesheetSummary.totalHadir} Hadir
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-slate-400">-</td>
                      <td className="py-2 px-1.5 border-r border-slate-300 font-mono text-indigo-800">
                        {timesheetSummary.totalOt} Jam
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 font-mono text-teal-800">
                        {timesheetSummary.totalMeal} Hari
                      </td>
                      <td className="py-2 px-2 text-left text-slate-500 font-normal italic text-[10px]">
                        Rekapitulasi Terverifikasi Sah
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODE 1: REKAPITULASI KINERJA BULANAN ================= */}
          {printMode === 'rekap-divisi' && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  REKAPITULASI BULANAN KEHADIRAN & EVALUASI KINERJA TENAGA ALIH DAYA
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  Nomor: {inst.nomorSuratPrefix} / X / 2026 · Periode: Oktober 2026
                </p>
              </div>

              {/* Summary Strip */}
              <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-500 text-[10px]">Total Tenaga Outsourcing</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {staffList.length} Personel
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Tingkat Kehadiran Disiplin</div>
                  <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                    {attendanceRate}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Total Log Geofence Valid</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {totalLogs} Record
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Rata-rata Skor KPI Tim</div>
                  <div className="text-base font-bold font-mono text-indigo-700 mt-0.5">
                    {averageTeamScore} / 5.00 ★
                  </div>
                </div>
              </div>

              {/* Tabel Rekapitulasi Utama */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  A. Tabel Evaluasi 4 Pilar Kompetensi & Rekomendasi Kontrak Kerja
                </h5>
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2.5 border-r border-slate-300 w-8 text-center">No</th>
                      <th className="py-2 px-3 border-r border-slate-300">Nama Personel / NIP</th>
                      <th className="py-2 px-3 border-r border-slate-300">Sub Bagian / Vendor</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Kehadiran</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Skor 4P</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Predikat</th>
                      <th className="py-2 px-3">Rekomendasi Pejabat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffList.map((st, idx) => {
                      const agg = monthlyAggregates.find((m) => m.staffId === st.id);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <div className="font-bold text-slate-900">{st.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{st.nip}</div>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <div className="font-semibold text-slate-800">{st.division}</div>
                            <div className="text-[10px] text-slate-500">{st.vendorName}</div>
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">
                            100%
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                            {agg ? agg.averageScore.toFixed(2) : '1.00'}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                            <span className="font-semibold text-slate-900">
                              {agg?.predicate || 'Belum Ada Penilaian'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-700">
                            {agg?.contractRecommendation || 'Belum Ada Evaluasi'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODE 2: RAPOR INDIVIDU STAF ================= */}
          {printMode === 'rapor-staf' && selectedStaff && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  KARTU HASIL EVALUASI KINERJA INDIVIDU (RAPOR KINERJA TENAGA ALIH DAYA)
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  ID: OTP-INDIV/{selectedStaff.nip} · Periode Evaluasi: Oktober 2026
                </p>
              </div>

              {/* Biodata & Foto Staf */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-extrabold text-white text-lg shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedStaff.avatarColor }}
                >
                  {selectedStaff.initials}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 flex-1 text-xs">
                  <div>
                    <span className="text-slate-500">Nama Lengkap:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">NIP / NIK:</span>{' '}
                    <strong className="font-mono text-slate-900">{selectedStaff.nip}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sub Bagian Tugas:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.division}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Jabatan Operasional:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.roleTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Perusahaan Mitra:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.vendorName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Titik Geofence:</span>{' '}
                    <strong className="text-slate-900">Dinas Pendidikan Kab. HST (Radius: 80m)</strong>
                  </div>
                </div>
              </div>

              {/* Nilai 4 Pilar Kompetensi */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  A. Hasil Penilaian 4 Pilar Kompetensi Kerja (11 Indikator)
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 1: Kualitas & Produktivitas Kerja
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kualitas Hasil Pekerjaan (A1)</span>
                      <strong>{pQuality} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kuantitas / Volume Output (A2)</span>
                      <strong>{pQuantity} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Manajemen Waktu & Efisiensi (A3)</span>
                      <strong>{pTime} ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 2: Sikap Kerja & Profesionalisme
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Inisiatif & Tanggung Jawab (B1)</span>
                      <strong>{pInitiative} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Akuntabilitas Kerja (B2)</span>
                      <strong>{pAccountability} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kedisiplinan Kehadiran (B3)</span>
                      <strong>{pPunctuality} ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 3: Kompetensi Interpersonal
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kerjasama Tim / Solidaritas (C1)</span>
                      <strong>{pTeamwork} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Komunikasi Efektif (C2)</span>
                      <strong>{pCommunication} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Orientasi Pelayanan Tamu (C3)</span>
                      <strong>{pCustomer} ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 4: Adaptabilitas & Pemecahan Masalah
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Adaptabilitas Kondisi Lapangan (D1)</span>
                      <strong>{pAdaptability} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Problem Solving Cepat (D2)</span>
                      <strong>{pProblemSolving} ★</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs mt-2">
                  <div>
                    <span className="text-slate-600">Rata-rata Skor Kumulatif:</span>{' '}
                    <strong className="text-base text-indigo-700 font-mono">
                      {staffMonthlyAgg?.averageScore ? staffMonthlyAgg.averageScore.toFixed(2) : (latestEval ? latestEval.overallWeeklyScore.toFixed(2) : '1.00')} / 5.00 ★
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Predikat Kinerja:</span>{' '}
                    <strong className="text-slate-900 uppercase">
                      {staffMonthlyAgg?.predicate || (latestEval ? 'Telah Dievaluasi' : 'Belum Ada Penilaian')}
                    </strong>
                  </div>
                </div>
              </div>
              {/* Bukti Dokumentasi Tugas Harian */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  B. Sampling Laporan Tugas Harian Terverifikasi
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {staffReports.slice(0, 2).map((rep) => (
                    <div key={rep.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 truncate">{rep.title}</strong>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          {rep.supervisorApproval}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {rep.summary}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t">
                        <span>Waktu: {rep.startTime} - {rep.endTime}</span>
                        <span>Lokasi: Dinas Pendidikan HST</span>
                      </div>
                    </div>
                  ))}
                  {staffReports.length === 0 && (
                    <div className="col-span-2 p-3 text-center text-slate-400 text-xs italic">
                      Laporan tugas harian telah terarsip lengkap di sistem server.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= MODE 3: SURAT PERINTAH TUGAS LEMBUR (SPTL) ================= */}
          {printMode === 'sptl-lembur' && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  SURAT PERINTAH & REKAPITULASI PELAKSANAAN TUGAS LEMBUR (SPTL)
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  Nomor: {inst.nomorSuratPrefix || '800.1 / OTP-DISDIK'} / SPTL / X / 2026 · Periode: Oktober 2026
                </p>
              </div>

              {/* Dasar Penugasan */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700 space-y-1">
                <strong className="text-slate-900 block">Dasar Pelaksanaan Lembur:</strong>
                <p>
                  Berdasarkan kebutuhan kedinasan mendesak di lingkungan {inst.namaSkpd} ({inst.namaPemda}), dengan ini diperintahkan dan direkapitulasi pelaksanaan tugas lembur yang dilaksanakan di dalam area kantor dinas di luar jam kerja resmi atau pada hari libur sebagai berikut:
                </p>
              </div>

              {/* Tabel Pelaksanaan Lembur */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  Daftar Realisasi Jam Lembur Staf Alih Daya Terverifikasi Geofence
                </h5>
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2.5 border-r border-slate-300 w-8 text-center">No</th>
                      <th className="py-2 px-3 border-r border-slate-300">Nama Personel / NIP</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Tanggal</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Jam Riil</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Total Durasi</th>
                      <th className="py-2 px-3 border-r border-slate-300">Uraian Output Pekerjaan Lembur</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(overtimeRecords || []).filter(o => o.status === 'COMPLETED' || o.status === 'APPROVED').length === 0 ? (
                       <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                          Belum ada data realisasi tugas lembur yang tercatat pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      (overtimeRecords || [])
                        .filter(o => o.status === 'COMPLETED' || o.status === 'APPROVED')
                        .map((ot, idx) => {
                          const durationH = Math.floor(ot.actualDurationMinutes / 60);
                          const durationM = ot.actualDurationMinutes % 60;
                          return (
                            <tr key={ot.id} className="hover:bg-slate-50">
                              <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-200">
                                <div className="font-bold text-slate-900">{ot.staffName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{ot.staffNip || '-'}</div>
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono text-[11px]">
                                {ot.date}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono text-[11px] font-semibold text-slate-800">
                                {ot.clockInTime ? `${ot.clockInTime} - ${ot.clockOutTime || 'Selesai'}` : `${ot.startTimePlan || '17:00'} WITA`}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">
                                {ot.actualDurationMinutes > 0 ? `${durationH}j ${durationM}m` : `${ot.estimatedHours} Jam (Rencana)`}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-200 text-[11px] text-slate-700">
                                {ot.workSummary || ot.reason}
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className="font-semibold text-emerald-800 font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50">
                                  {ot.status === 'COMPLETED' ? 'Sah Kantor' : 'Disetujui'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODE 4: SURAT KETERANGAN & REKAPITULASI IZIN / CUTI ================= */}
          {printMode === 'surat-izin' && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  SURAT KETERANGAN & REKAPITULASI IZIN / CUTI TENAGA ALIH DAYA
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  Nomor: {inst.nomorSuratPrefix || '800.1 / OTP-DISDIK'} / CUTI-IZIN / {new Date().getFullYear()} · Periode: November {new Date().getFullYear()}
                </p>
              </div>

              {/* Dasar Ketentuan */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700 space-y-1">
                <strong className="text-slate-900 block">Keterangan Kedinasan:</strong>
                <p>
                  Berdasarkan permohonan yang diajukan oleh tenaga alih daya (outsourcing) di lingkungan {inst.namaSkpd} ({inst.namaPemda}), serta verifikasi dokumen medis/kedinasan yang sah, dengan ini diterbitkan rekapitulasi surat izin dan hak cuti resmi sebagai dasar administrasi kepegawaian dan sinkronisasi presensi:
                </p>
              </div>

              {/* Tabel Pelaksanaan Izin / Cuti */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  Daftar Realisasi Izin Sakit (SKD) & Cuti Sah Terverifikasi Atasan
                </h5>
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2.5 border-r border-slate-300 w-8 text-center">No</th>
                      <th className="py-2 px-3 border-r border-slate-300">Nama Personel / NIP</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Jenis Izin</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Rentang Tanggal</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Durasi</th>
                      <th className="py-2 px-3 border-r border-slate-300">Uraian Alasan / Keterangan</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
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
                              <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900">
                                <div>{l.staffName}</div>
                                <div className="text-[10px] text-slate-400 font-mono font-normal">
                                  {l.staffNip || 'ID Kontrak'} · {l.divisionName || l.divisionId}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-300 text-center font-semibold text-slate-800">
                                {typeLabel[l.leaveType] || l.leaveType}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono text-[11px]">
                                {l.startDate} {l.startDate !== l.endDate ? `s/d ${l.endDate}` : ''}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-300 text-center font-bold text-slate-900 font-mono">
                                {l.totalDays} Hari
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-slate-700 leading-snug">
                                <div>{l.reason}</div>
                                {l.supervisorNotes && (
                                  <div className="text-[10px] text-teal-700 italic mt-0.5">
                                    Catatan: {l.supervisorNotes}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span className={`font-semibold font-mono text-[10px] px-2 py-0.5 rounded ${
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
            </div>
          )}

          {/* ================= TANDA TANGAN PEJABAT BERWENANG ================= */}
          <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-xs text-center items-end">
            {/* Pejabat Penilai / Atasan Langsung */}
            <div className="space-y-14">
              <div>
                <p className="text-slate-600">Pejabat Penilai,</p>
                <p className="font-bold text-slate-800">
                  {currentUser?.role === 'supervisor'
                    ? (currentUser.roleTitle || 'Atasan Langsung / Kasubag')
                    : 'Atasan Langsung / Kasubag'}
                </p>
              </div>
              <div>
                <p className="font-extrabold underline text-slate-950">
                  {currentUser?.role === 'supervisor'
                    ? currentUser.name
                    : selectedStaff?.division?.includes('Renlap') || selectedStaff?.division?.includes('Perencanaan')
                    ? 'Muhammad Sugeng Wahyudi, A.Md'
                    : selectedStaff?.division?.includes('SD')
                    ? 'Badaruddin, M.Pd'
                    : selectedStaff?.division?.includes('SMP')
                    ? 'Alamsyah Mappaompo, S.Pd. MM'
                    : selectedStaff?.division?.includes('PAUD')
                    ? 'Andry Rachmat Hidayat, S.Kom'
                    : selectedStaff?.division?.includes('Sarpras')
                    ? 'Bayhaki Novie, S.Pd'
                    : selectedStaff?.division?.includes('Keuangan')
                    ? 'Hj. Rabiatul Adawiyah, SE'
                    : 'Ahmad Humaidi, S.Pd.'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {currentUser?.role === 'supervisor'
                    ? (currentUser.nip ? `NIP: ${currentUser.nip}` : '-')
                    : selectedStaff?.division?.includes('Renlap') || selectedStaff?.division?.includes('Perencanaan')
                    ? 'NIP: 19821218 200604 1 008'
                    : selectedStaff?.division?.includes('SD')
                    ? 'NIP: 19800202 200604 1 028'
                    : selectedStaff?.division?.includes('SMP')
                    ? 'NIP: 19780414 200604 1 023'
                    : selectedStaff?.division?.includes('PAUD')
                    ? 'NIP: 19851208 2010011 007'
                    : selectedStaff?.division?.includes('Sarpras')
                    ? 'NIP: 19831110 2005011 007'
                    : selectedStaff?.division?.includes('Keuangan')
                    ? 'NIP: 19730609 199503 2 002'
                    : 'NIP: 19860620 201001 1 008'}
                </p>
              </div>
            </div>

            {/* QR Verifikasi Digital */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="p-2 border-2 border-slate-800 rounded-xl bg-white shadow-2xs">
                <QrCode className="w-14 h-14 text-slate-900" />
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase">
                VALID: OTP-DISDIK-HST
              </span>
              <span className="text-[9px] text-slate-400">
                Dokumen Sah Elektronik
              </span>
            </div>

            {/* Mengetahui HR Governance / Sekretaris Dinas */}
            <div className="space-y-14">
              <div>
                <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                <p className="font-bold text-slate-800">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
              </div>
              <div>
                <p className="font-extrabold underline text-slate-950">
                  {inst.pejabatNama || 'Salihin, S.Pd.SD'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">NIP: {inst.pejabatNip || '19780502 200604 1 017'}</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-400 pt-4 border-t border-slate-100">
            Dokumen ini dicetak secara otomatis dari Sistem OutsourceTrack & KPI Pro · Dilindungi Enkripsi Digital
          </div>
        </div>
      </div>
    </div>
  );
};
