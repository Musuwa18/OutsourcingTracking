import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  AlertCircle,
} from 'lucide-react';
import {
  StaffProfile,
  AttendanceRecord,
  MonthlyAggregate,
  OvertimeRecord,
  LeaveRequest,
  InstitutionSettings,
  AuthUser,
} from '../types';

interface MonthlyMatrixViewProps {
  staffList: StaffProfile[];
  attendanceRecords: AttendanceRecord[];
  monthlyAggregates: MonthlyAggregate[];
  overtimeRecords?: OvertimeRecord[];
  leaveRecords?: LeaveRequest[];
  institutionSettings: InstitutionSettings;
  currentUser: AuthUser | null;
  onSelectStaff?: (staff: StaffProfile) => void;
}

export const MonthlyMatrixView: React.FC<MonthlyMatrixViewProps> = ({
  staffList,
  attendanceRecords,
  monthlyAggregates,
  overtimeRecords = [],
  leaveRecords = [],
  institutionSettings,
  currentUser,
  onSelectStaff,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'vendor' | 'pppk_paruh_waktu' | 'magang'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const selectedMonthName = monthNames[monthNum - 1] || 'Bulan';
  const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Filter Staf berdasarkan Kategori dan Search Query
  const filteredStaffList = useMemo(() => {
    return staffList.filter((st) => {
      // Filter Kategori
      if (selectedCategory !== 'ALL') {
        const cat = st.employmentCategory || (st.vendorName ? 'vendor' : 'vendor');
        if (cat !== selectedCategory) return false;
      }
      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchNip = (st.nip || '').toLowerCase().includes(q);
        const matchRole = (st.roleTitle || '').toLowerCase().includes(q);
        const matchDiv = (st.division || '').toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchRole && !matchDiv) return false;
      }
      return true;
    });
  }, [staffList, selectedCategory, searchQuery]);

  // Lookup Absensi untuk Bulan Terpilih
  const attLookup = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((att) => {
      if (att.date && att.date.startsWith(selectedMonth)) {
        map.set(`${att.staffId}_${att.date}`, att);
        if (att.staffNip) map.set(`${att.staffNip}_${att.date}`, att);
      }
    });
    return map;
  }, [attendanceRecords, selectedMonth]);

  // Lookup Lembur
  const otLookup = useMemo(() => {
    const map = new Map<string, number>();
    overtimeRecords.forEach((ot) => {
      if (ot.date && ot.date.startsWith(selectedMonth) && ot.status === 'Disetujui') {
        const hrs = ot.durationHours || ot.estimatedHours || 0;
        const key = `${ot.staffId}_${ot.date}`;
        map.set(key, (map.get(key) || 0) + hrs);
      }
    });
    return map;
  }, [overtimeRecords, selectedMonth]);

  // Lookup Cuti / Izin
  const leaveLookup = useMemo(() => {
    const map = new Map<string, LeaveRequest>();
    leaveRecords.forEach((l) => {
      if (l.status === 'Disetujui') {
        let cur = new Date(l.startDate);
        const end = new Date(l.endDate);
        while (cur <= end) {
          const dStr = cur.toISOString().slice(0, 10);
          if (dStr.startsWith(selectedMonth)) {
            map.set(`${l.staffId}_${dStr}`, l);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    });
    return map;
  }, [leaveRecords, selectedMonth]);

  // Kompilasi Data Matriks Staf 1 - 31
  const matrixData = useMemo(() => {
    return filteredStaffList.map((st, idx) => {
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
          } else if (
            leave.leaveType === 'CUTI_TAHUNAN' ||
            leave.leaveType === 'CUTI_BERSALIN' ||
            leave.leaveType === 'CUTI_ALASAN_PENTING'
          ) {
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
  }, [filteredStaffList, totalDaysInMonth, selectedMonth, attLookup, otLookup, leaveLookup]);

  // Total Kehadiran Harian (H) per Tanggal
  const dailyHadirTotals = useMemo(() => {
    const totals: number[] = [];
    for (let d = 0; d < totalDaysInMonth; d++) {
      const sum = matrixData.filter((s) => s.dailyCodes[d] === 'H').length;
      totals.push(sum);
    }
    return totals;
  }, [matrixData, totalDaysInMonth]);

  // Agregat Statistik untuk Summary Metric Cards
  const totalPersonel = matrixData.length;
  const totalHadirSemua = matrixData.reduce((acc, m) => acc + m.hadir, 0);
  const totalLemburSemua = matrixData.reduce((acc, m) => acc + m.lemburJam, 0);
  const avgAttendancePct = useMemo(() => {
    if (matrixData.length === 0) return '0%';
    const totalPcts = matrixData.reduce((acc, m) => acc + parseFloat(m.pct.replace('%', '')), 0);
    return (totalPcts / matrixData.length).toFixed(1) + '%';
  }, [matrixData]);

  const categoryLabel =
    selectedCategory === 'vendor'
      ? 'Vendor Swasta (PT. YASMINE BUIH PERSADA)'
      : selectedCategory === 'pppk_paruh_waktu'
      ? 'PPPK Paruh Waktu Disdik HST'
      : selectedCategory === 'magang'
      ? 'Siswa / Mahasiswa Magang'
      : `Seluruh Kelompok (${staffList.length} Personel)`;

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6 print:bg-white print:p-0">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER SECTION (Hidden when printing - Identik SIP-SPJ)            */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 no-print">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-cyan-400">
            <FileSpreadsheet className="w-6 h-6 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Matriks Presensi Bulanan Pegawai (1 - 31)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data rekapitulasi kehadiran presensi harian tenaga alih daya (Outsourcing, PPPK Paruh Waktu &amp; Magang) Dinas Pendidikan Kab. HST.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tombol Ekspor Excel (.xlsx) */}
          <a
            href={`/api/reports/rekap-presensi/excel?month=${selectedMonth}&category=${selectedCategory}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Unduh seluruh rekapitulasi presensi matriks 1-31 ke dalam format Microsoft Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </a>

          {/* Tombol Cetak PDF F4 Landscape Langsung */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Cetak matriks langsung ke format kertas Folio / F4 Landscape Baku (330 mm × 215 mm)"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF (F4 Landscape)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRIC CARDS (Hidden when printing - Identik SIP-SPJ)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white dark:bg-[#1a2232] p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Personel Terdaftar
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalPersonel} <span className="text-xs font-semibold text-slate-500">Pegawai</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {categoryLabel}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a2232] p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Rata-Rata Kehadiran
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {avgAttendancePct}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Persentase kehadiran fisik &amp; tugas sah
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a2232] p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Kehadiran Fisik (H)
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-cyan-400 mt-1 font-mono">
            {totalHadirSemua} <span className="text-xs font-semibold text-slate-500">Sesi</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Terverifikasi GPS Haversine &amp; WebRTC
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a2232] p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Jam Lembur Disetujui
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {totalLemburSemua} <span className="text-xs font-semibold text-slate-500">Jam</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Berdasarkan Surat Perintah Tugas Lembur
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTERS SECTION (Hidden when printing - Identik SIP-SPJ)      */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#1a2232] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 no-print transition-colors">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pegawai, NIP / ID kontrak, atau jabatan formasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
            />
          </div>

          {/* Filter Kategori / Kelompok Pegawai */}
          <div className="w-full lg:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as 'ALL' | 'vendor' | 'pppk_paruh_waktu' | 'magang')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer transition-all"
            >
              <option value="ALL">Semua Kelompok ({staffList.length})</option>
              <option value="vendor">🏢 Vendor Swasta (PT. YASMINE)</option>
              <option value="pppk_paruh_waktu">🏛️ PPPK Paruh Waktu Disdik</option>
              <option value="magang">🎓 Siswa / Mahasiswa Magang</option>
            </select>
          </div>

          {/* Filter Periode Bulan */}
          <div className="w-full lg:w-48">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer transition-all"
            >
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">Agustus 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. KOP RESMI LAPORAN CETAK (HANYA MUNCUL SAAT PRINT - Identik SIP-SPJ)     */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-center pb-2.5 mb-3 border-b-4 border-double border-black">
        <div className="flex items-center justify-between px-4">
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            <img
              src={institutionSettings.logoKiriUrl || '/logos/Lambang_Kabupaten_Hulu_Sungai_Tengah.png'}
              alt="Lambang Daerah"
              className="w-full h-full object-contain max-h-16"
            />
          </div>
          <div className="flex-1 px-4 text-center">
            <h3 className="text-xs font-bold uppercase tracking-wide text-black">
              {institutionSettings.namaPemda || 'PEMERINTAH KABUPATEN HULU SUNGAI TENGAH'}
            </h3>
            <h2 className="text-base font-black uppercase tracking-wider text-black leading-snug">
              {institutionSettings.namaSkpd || 'DINAS PENDIDIKAN'}
            </h2>
            <p className="text-[9pt] text-black leading-tight mt-0.5">
              {institutionSettings.alamatLengkap || 'Jalan H. Sibli Imansyah No. 1 Barabai, Kab. HST'}
            </p>
            <p className="text-[8pt] text-black leading-tight">
              Laman: {institutionSettings.website || 'disdik.barabai.go.id'} · Pos-el: {institutionSettings.email || 'disdik@barabai.go.id'} · Telp: {institutionSettings.telepon || '(0517) 41254'}
            </p>
          </div>
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            <img
              src={institutionSettings.logoKananUrl || '/logos/logo-disdik2026.png'}
              alt="Logo SKPD"
              className="w-full h-full object-contain max-h-16"
            />
          </div>
        </div>

        <div className="mt-2 text-center">
          <h3 className="text-[10pt] font-black uppercase underline tracking-wide text-black">
            REKAPITULASI PRESENSI BULANAN PEGAWAI OUTSOURCING
          </h3>
          <p className="text-[8pt] font-mono text-black mt-0.5">
            Periode: {selectedMonthName} {selectedYear} (1 s.d. {totalDaysInMonth} {selectedMonthName} {selectedYear}) · Kelompok: {categoryLabel} · Lokasi: {institutionSettings.namaSkpd}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. LIVE INTERACTIVE MATRIX TABLE (Identik Matriks DPA SIP-SPJ)            */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#1a2232] rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none transition-colors">
        {/* Header Bar on Web (Hidden on print) */}
        <div className="p-4 bg-slate-50 dark:bg-[#141b27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {institutionSettings.namaPemda} &mdash; {institutionSettings.namaSkpd}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Matriks Presensi 1 - 31 ({selectedMonthName} {selectedYear}) &bull; Menampilkan {matrixData.length} dari {staffList.length} Staf
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Live Data Interaktif</span>
          </div>
        </div>

        {/* Tabel Data Responsif dengan Sticky Columns */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse print:text-[6.5pt] print:border print:border-black">
            {/* THEAD - DISPLAY: TABLE-HEADER-GROUP UNTUK MULTI-PAGE PRINT OTOMATIS */}
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 print:bg-slate-200 print:text-black print:border-black text-[11px] print:text-[6.5pt] [display:table-header-group]">
              {/* BARIS 1: Header Utama */}
              <tr className="border-b border-slate-300 dark:border-slate-700 print:border-black break-inside-avoid">
                <th
                  rowSpan={2}
                  className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-10 print:w-7 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-transparent"
                >
                  No
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-2.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-left align-middle w-24 print:w-20 font-mono"
                >
                  NIP / ID
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-left align-middle min-w-[170px] print:min-w-[130px]"
                >
                  Nama Pegawai
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-2.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-left align-middle min-w-[130px] print:min-w-[95px]"
                >
                  Jabatan / Formasi
                </th>
                <th
                  colSpan={totalDaysInMonth}
                  className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle bg-indigo-50/50 dark:bg-indigo-950/20 print:bg-slate-200"
                >
                  Tanggal Presensi ({selectedMonthName} {selectedYear})
                </th>
                <th rowSpan={2} className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-8 print:w-6 bg-emerald-50/70 dark:bg-emerald-950/30 print:bg-slate-200" title="Hadir Fisik (GPS WebRTC)">H</th>
                <th rowSpan={2} className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-8 print:w-6 bg-rose-50/70 dark:bg-rose-950/30 print:bg-slate-200" title="Sakit (SKD Dokter)">S</th>
                <th rowSpan={2} className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-8 print:w-6 bg-blue-50/70 dark:bg-blue-950/30 print:bg-slate-200" title="Izin Sah">I</th>
                <th rowSpan={2} className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-8 print:w-6 bg-amber-50/70 dark:bg-amber-950/30 print:bg-slate-200" title="Hak Cuti">C</th>
                <th rowSpan={2} className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-8 print:w-6 bg-red-50/70 dark:bg-red-950/30 print:bg-slate-200" title="Alpa / Tanpa Keterangan">A</th>
                <th rowSpan={2} className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-9 print:w-7 bg-slate-100 dark:bg-slate-800 print:bg-slate-200" title="Libur Rutin">OFF</th>
                <th rowSpan={2} className="py-2 px-1.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle w-14 print:w-10" title="Total Jam Lembur">Lembur</th>
                <th rowSpan={2} className="py-2 px-1.5 text-center align-middle w-16 print:w-12 bg-indigo-50/70 dark:bg-indigo-950/30 print:bg-slate-200 font-extrabold" title="Persentase Kehadiran">% Hadir</th>
              </tr>

              {/* BARIS 2: Nomor Tanggal 1 s.d. 31 */}
              <tr className="border-b border-slate-300 dark:border-slate-700 print:border-black text-[10px] print:text-[6pt] break-inside-avoid">
                {Array.from({ length: totalDaysInMonth }).map((_, dIdx) => {
                  const dNum = dIdx + 1;
                  const dateObj = new Date(yearNum, monthNum - 1, dNum);
                  const isSunday = dateObj.getDay() === 0;
                  return (
                    <th
                      key={dNum}
                      className={`py-1 px-0.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center align-middle min-w-[24px] print:min-w-0 font-mono ${
                        isSunday
                          ? 'bg-rose-100/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 print:bg-slate-300 print:text-black font-extrabold'
                          : ''
                      }`}
                    >
                      <div>{dNum}</div>
                      <div className="text-[7.5px] print:text-[5.5pt] opacity-75">
                        {dayNamesShort[dateObj.getDay()]}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* TBODY - DATA PEGAWAI DENGAN HOVER & KLIK DETAIL */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-black">
              {matrixData.map((row) => (
                <tr
                  key={row.staff.id}
                  onClick={() => onSelectStaff && onSelectStaff(row.staff)}
                  className={`hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-300 print:hover:bg-transparent print:text-black transition-colors break-inside-avoid ${
                    onSelectStaff ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono text-[10px] print:text-[6.5pt] sticky left-0 bg-white dark:bg-[#1a2232] print:bg-transparent">
                    {row.no}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 print:border-black font-mono text-[10px] print:text-[6.5pt] text-slate-600 dark:text-slate-400 print:text-black">
                    {row.staff.nip || '-'}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 print:border-black font-semibold text-slate-900 dark:text-white print:text-black text-left">
                    {row.staff.name}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 print:border-black text-[10px] print:text-[6.5pt] text-slate-600 dark:text-slate-400 print:text-black text-left truncate max-w-[140px]">
                    {row.staff.roleTitle || 'Tenaga Outsourcing'}
                  </td>

                  {/* 31 Hari Presensi */}
                  {row.dailyCodes.map((code, dIdx) => {
                    const dateObj = new Date(yearNum, monthNum - 1, dIdx + 1);
                    const isSunday = dateObj.getDay() === 0;
                    return (
                      <td
                        key={dIdx}
                        className={`py-1 px-0.5 border-r border-slate-200 dark:border-slate-800 print:border-black text-center font-mono font-bold text-[9px] print:text-[6.5pt] ${
                          code === 'H'
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 print:text-black print:bg-transparent'
                            : code === 'S'
                            ? 'text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 print:text-black print:bg-transparent'
                            : code === 'I'
                            ? 'text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 print:text-black print:bg-transparent'
                            : code === 'C'
                            ? 'text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30 print:text-black print:bg-transparent'
                            : code === 'A'
                            ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 print:text-black print:bg-transparent'
                            : isSunday
                            ? 'text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40 print:text-black print:bg-slate-200'
                            : 'text-slate-300 dark:text-slate-600 print:text-black'
                        }`}
                      >
                        {code}
                      </td>
                    );
                  })}

                  {/* Rekap Kolom Kanan */}
                  <td className="py-1.5 px-0.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10 print:text-black print:bg-transparent">
                    {row.hadir}
                  </td>
                  <td className="py-1.5 px-0.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/10 print:text-black print:bg-transparent">
                    {row.sakit}
                  </td>
                  <td className="py-1.5 px-0.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10 print:text-black print:bg-transparent">
                    {row.izin}
                  </td>
                  <td className="py-1.5 px-0.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10 print:text-black print:bg-transparent">
                    {row.cuti}
                  </td>
                  <td className="py-1.5 px-0.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold text-red-700 dark:text-red-400 bg-red-50/30 dark:bg-red-950/10 print:text-black print:bg-transparent">
                    {row.alpa}
                  </td>
                  <td className="py-1.5 px-0.5 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 print:text-black print:bg-transparent">
                    {row.libur}
                  </td>
                  <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 print:border-black text-center font-mono font-bold text-indigo-700 dark:text-indigo-400 print:text-black">
                    {row.lemburJam > 0 ? `${row.lemburJam}j` : '-'}
                  </td>
                  <td className="py-1.5 px-1 text-center font-mono font-black text-slate-900 dark:text-white print:text-black">
                    {row.pct}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* TFOOT - TOTAL KEHADIRAN HARIAN */}
            <tfoot className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-900 dark:text-white print:bg-slate-200 print:text-black border-t-2 border-slate-400 dark:border-slate-600 print:border-black text-xs print:text-[6.5pt] [display:table-footer-group]">
              <tr className="break-inside-avoid">
                <td colSpan={4} className="py-2.5 px-3 text-left uppercase tracking-wider border-r border-slate-300 dark:border-slate-700 print:border-black font-bold">
                  Total Kehadiran Harian (H) :
                </td>
                {dailyHadirTotals.map((tot, idx) => (
                  <td
                    key={idx}
                    className="py-2 px-0.5 text-center font-mono tabular-nums border-r border-slate-300 dark:border-slate-700 print:border-black text-emerald-800 dark:text-emerald-300 print:text-black font-extrabold"
                  >
                    {tot}
                  </td>
                ))}
                <td colSpan={8} className="py-2 px-2 text-center font-mono text-slate-500 dark:text-slate-400 print:text-black font-normal italic text-[10px] print:text-[6pt]">
                  Rekapitulasi Absensi Sah Disdik HST
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Tanda Tangan & Keterangan (Muncul di layar & di cetak) */}
        <div className="p-4 sm:p-6 bg-slate-50/60 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 print:bg-white print:p-0 print:border-none signature-block page-break-inside-avoid">
          {/* Legenda Kode */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 print:border-black print:bg-transparent text-[11px] print:text-[7pt] text-slate-700 dark:text-slate-300 print:text-black flex flex-wrap gap-x-6 gap-y-1 items-center">
            <span className="font-bold text-slate-900 dark:text-white print:text-black">Keterangan Status:</span>
            <span><strong className="text-emerald-600 dark:text-emerald-400 print:text-black">H</strong> = Hadir Fisik (GPS WebRTC)</span>
            <span><strong className="text-rose-600 dark:text-rose-400 print:text-black">S</strong> = Sakit (SKD Dokter)</span>
            <span><strong className="text-blue-600 dark:text-blue-400 print:text-black">I</strong> = Izin Terverifikasi</span>
            <span><strong className="text-amber-600 dark:text-amber-400 print:text-black">C</strong> = Hak Cuti Sah</span>
            <span><strong className="text-red-600 dark:text-red-400 print:text-black">A</strong> = Alpa</span>
            <span><strong className="text-slate-600 dark:text-slate-400 print:text-black">OFF</strong> = Libur Rutin</span>
          </div>

          {/* Blok Tanda Tangan Resmi Dua Pihak (Hanya Print & Pratinjau Bawah) */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 print:border-black grid grid-cols-2 gap-8 text-xs print:text-[8pt] text-center text-slate-800 dark:text-slate-200 print:text-black">
            <div className="space-y-12">
              <div>
                <p className="text-slate-500 dark:text-slate-400 print:text-black">Dibuat Oleh (Vendor / Pengawas Lapangan):</p>
                <p className="font-bold text-slate-900 dark:text-white print:text-black mt-0.5">PT. YASMINE BUIH PERSADA</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 dark:text-white print:text-black">( .................................................... )</p>
                <p className="text-[10px] print:text-[7pt] text-slate-500 dark:text-slate-400 print:text-black mt-0.5">Supervisor / Pengawas Lapangan</p>
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <p className="text-slate-500 dark:text-slate-400 print:text-black">{institutionSettings.kotaSurat || 'Barabai'}, {todayFormatted}</p>
                <p className="font-bold text-slate-900 dark:text-white print:text-black mt-0.5">{institutionSettings.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 dark:text-white print:text-black">{institutionSettings.pejabatNama || 'Salihin, S.Pd.SD'}</p>
                <p className="text-[10px] print:text-[7pt] font-mono text-slate-500 dark:text-slate-400 print:text-black mt-0.5">NIP. {institutionSettings.pejabatNip || '19780502 200604 1 017'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. STYLE CSS PRINT KHUSUS F4 LANDSCAPE (IDENTIK SIP-SPJ KEUANGAN)         */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: 330mm 215mm;
            margin: 6mm 6mm 6mm 6mm;
          }
          *, *::before, *::after {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            text-shadow: none !important;
          }
          body, html, main, #root {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .no-print, header, aside, footer, nav, button, input, select {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #000000 !important;
            font-size: 6.5pt !important;
          }
          table, table *, table th, table td, table span, table div, table p, table strong {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            border-color: #000000 !important;
            padding: 2px 2px !important;
            background: #ffffff !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          .signature-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MonthlyMatrixView;
