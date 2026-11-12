import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserX,
  MapPin,
  Calendar,
  Sparkles,
  Settings,
  HeartPulse,
  Briefcase,
} from 'lucide-react';
import { AttendanceRecord, StaffProfile, DailyWorkReport, FieldCheckinRecord, LeaveRequest, AuthUser, Vendor } from '../types';
import { exportAttendanceToCSV } from '../utils/export';
import { getTodayDateStr } from '../utils/date';
import { DetailRiwayatModal } from '../components/DetailRiwayatModal';

interface AdminAttendanceViewProps {
  currentUser?: AuthUser | null;
  vendors?: Vendor[];
  staffList: StaffProfile[];
  attendanceRecords: AttendanceRecord[];
  dailyReports: DailyWorkReport[];
  fieldCheckins?: FieldCheckinRecord[];
  onOpenPrintModal: () => void;
  onOpenMatrix?: () => void;
  onConfigureLocation?: (staff: StaffProfile) => void;
  onOpenAiChat?: () => void;
  leaveRecords?: LeaveRequest[];
  onNavigateToLeaves?: () => void;
  onNavigateToReports?: () => void;
}
export const AdminAttendanceView: React.FC<AdminAttendanceViewProps> = ({
  currentUser,
  vendors,
  staffList,
  attendanceRecords,
  dailyReports,
  fieldCheckins = [],
  onOpenPrintModal,
  onOpenMatrix,
  onConfigureLocation,
  onOpenAiChat,
  leaveRecords = [],
  onNavigateToLeaves,
  onNavigateToReports,
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [selectedVendorGroup, setSelectedVendorGroup] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());

  const isCoordinator = currentUser?.role === 'coordinator';
  const supervisedGroups = useMemo(() => {
    if (!currentUser || currentUser.role !== 'coordinator') return [];
    if (currentUser.supervisedGroups && currentUser.supervisedGroups.length > 0) {
      return currentUser.supervisedGroups;
    }
    return currentUser.vendorName ? [currentUser.vendorName] : [];
  }, [currentUser]);

  const availableVendorNames = useMemo(() => {
    if (isCoordinator && !supervisedGroups.includes('ALL') && supervisedGroups.length > 0) {
      return supervisedGroups;
    }
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.vendorName) set.add(s.vendorName);
    });
    if (vendors) {
      vendors.forEach((v) => {
        if (v.status === 'Aktif' || !v.status) set.add(v.name);
      });
    }
    return Array.from(set);
  }, [staffList, vendors, isCoordinator, supervisedGroups]);

  // Inspection modal state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);


  const activeDayFieldCheckins = useMemo(() => {
    if (!selectedRecord) return [];
    return fieldCheckins.filter(
      (fc) => fc.staffId === selectedRecord.staffId && fc.date === selectedRecord.date
    );
  }, [fieldCheckins, selectedRecord]);
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  const pendingLeavesForStaff = useMemo(() => {
    return (leaveRecords || []).filter((l) => {
      const isMyStaff = staffList.some((s) => s.id === l.staffId);
      return isMyStaff && l.status === 'PENDING';
    });
  }, [leaveRecords, staffList]);

  // Divisions list
  const divisions = ['ALL', ...Array.from(new Set(staffList.map((s) => s.division)))];

  // Filter attendance records by date, division, status, search
  const filteredRecords = attendanceRecords.filter((rec) => {
    if (selectedDate && rec.date !== selectedDate) return false;
    const staff = staffMap.get(rec.staffId);
    if (!staff) return false;
    if (selectedDivision !== 'ALL' && staff.division !== selectedDivision) return false;
    if (selectedVendorGroup !== 'ALL' && staff.vendorName !== selectedVendorGroup) return false;
    if (selectedStatus !== 'ALL' && rec.status !== selectedStatus) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = staff.name.toLowerCase().includes(q);
      const matchNip = staff.nip.toLowerCase().includes(q);
      const matchVendor = staff.vendorName.toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchVendor) return false;
    }

    return true;
  });

  // KPI summary counters for the selected date (strictly scoped to staffMap)
  const dayLogs = attendanceRecords.filter((r) => r.date === selectedDate && staffMap.has(r.staffId));
  const hadirCount = dayLogs.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = dayLogs.filter((r) => r.status === 'Terlambat').length;
  const izinCount = dayLogs.filter((r) => r.status === 'Izin').length;
  const dayReports = dailyReports.filter((r) => r.date === selectedDate && staffMap.has(r.staffId));
  const handleRowClick = (rec: AttendanceRecord) => {
    const staff = staffMap.get(rec.staffId) || null;
    setSelectedRecord(rec);
    setSelectedStaff(staff);
  };

  const handleExportCSV = () => {
    const relevantRecords = attendanceRecords.filter((r) => staffMap.has(r.staffId));
    exportAttendanceToCSV(relevantRecords, staffMap);
  };

  const handleFilterHadir = () => {
    setSelectedStatus((prev) => (prev === 'Hadir' ? 'ALL' : 'Hadir'));
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFilterTerlambat = () => {
    setSelectedStatus((prev) => (prev === 'Terlambat' ? 'ALL' : 'Terlambat'));
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNavigateIzin = () => {
    if (onNavigateToLeaves) {
      onNavigateToLeaves();
    } else {
      setSelectedStatus((prev) => (prev === 'Izin' ? 'ALL' : 'Izin'));
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavigateReports = () => {
    if (onNavigateToReports) {
      onNavigateToReports();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Section: Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Monitoring & Administrasi Presensi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verifikasi kehadiran cerdas WebRTC, anti-fake GPS, dan radius geofence
          </p>
        </div>

        {/* Export & Print Buttons */}
        <div className="flex items-center gap-2">
          {onOpenAiChat && (
            <button
              type="button"
              onClick={onOpenAiChat}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Tanya Gemini AI</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel/CSV</span>
          </button>

          {onOpenMatrix && (
            <button
              type="button"
              onClick={onOpenMatrix}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-indigo-600/25"
              title="Buka Data Matriks Presensi Interaktif 1 - 31 (Standar SIP-SPJ)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Matriks Presensi (1-31)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen F4</span>
          </button>
        </div>
      </div>

      {/* Pending Leave Requests Alert Banner for Supervisor/Admin */}
      {pendingLeavesForStaff.length > 0 && (
        <div className="p-4 rounded-2xl bg-teal-500/10 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                Permohonan Izin / Cuti Menunggu Persetujuan ({pendingLeavesForStaff.length} Staf)
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {pendingLeavesForStaff.map((l) => `${l.staffName} (${l.leaveType === 'SAKIT' ? 'Izin Sakit' : 'Izin/Cuti'}: ${l.startDate} s/d ${l.endDate})`).join(', ')}
              </p>
            </div>
          </div>
          {onNavigateToLeaves && (
            <button
              type="button"
              onClick={onNavigateToLeaves}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <span>Verifikasi Izin & Cuti</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}
      {/* Coordinator Supervisory Scope Banner */}
      {isCoordinator && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-amber-950 dark:text-amber-200">
                Area Supervisi Pengawas: {supervisedGroups.includes('ALL') || supervisedGroups.length === 0 ? 'Semua Kelompok Pegawai' : supervisedGroups.join(', ')}
              </div>
              <div className="text-[11px] text-amber-800/90 dark:text-amber-300 font-semibold truncate">
                Monitoring presensi dibatasi hanya pada staf dalam kelompok penugasan binaan Anda.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold shrink-0 border border-amber-300/60 dark:border-amber-800/60">
            {filteredRecords.length} Personel Terpantau
          </span>
        </div>
      )}

      {/* Metric Counters Strip (4 Kolom Interaktif) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={handleFilterHadir}
          className={`p-4 glass-card cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-400/60 dark:hover:border-emerald-500/60 group relative overflow-hidden ${
            selectedStatus === 'Hadir'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : ''
          }`}
          title="Klik untuk memfilter daftar hadir tepat waktu"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Hadir Tepat Waktu
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>{selectedStatus === 'Hadir' ? 'Reset' : 'Filter'}</span>
              <span>↓</span>
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {hadirCount} <span className="text-xs font-normal text-slate-400">personel</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>{selectedStatus === 'Hadir' ? '✓ Memfilter tabel hadir' : 'Klik untuk rincian data'}</span>
          </div>
        </div>

        <div
          onClick={handleFilterTerlambat}
          className={`p-4 glass-card cursor-pointer transition-all duration-200 hover:shadow-md hover:border-amber-400/60 dark:hover:border-amber-500/60 group relative overflow-hidden ${
            selectedStatus === 'Terlambat'
              ? 'ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
              : ''
          }`}
          title="Klik untuk memfilter daftar terlambat masuk"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Terlambat Masuk
            </span>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>{selectedStatus === 'Terlambat' ? 'Reset' : 'Filter'}</span>
              <span>↓</span>
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {terlambatCount} <span className="text-xs font-normal text-slate-400">personel</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>{selectedStatus === 'Terlambat' ? '✓ Memfilter tabel terlambat' : 'Klik untuk rincian data'}</span>
          </div>
        </div>

        <div
          onClick={handleNavigateIzin}
          className="p-4 glass-card cursor-pointer transition-all duration-200 hover:shadow-md hover:border-teal-400/60 dark:hover:border-teal-500/60 group relative overflow-hidden"
          title="Klik untuk membuka verifikasi izin & cuti staf"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Izin / Sakit
            </span>
            <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>Buka Tiket</span>
              <span>→</span>
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
            {izinCount} <span className="text-xs font-normal text-slate-400">personel</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>Buka tiket & berkas izin</span>
          </div>
        </div>

        <div
          onClick={handleNavigateReports}
          className="p-4 glass-card cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-400/60 dark:hover:border-indigo-500/60 group relative overflow-hidden"
          title="Klik untuk mereview feed laporan tugas harian"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
              Laporan Tugas Hari Ini
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              <span>Review Feed</span>
              <span>→</span>
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-cyan-400 mt-1 tabular-nums">
            {dayReports.length} <span className="text-xs font-normal text-slate-400">terkumpul</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>Periksa bukti & uraian kerja</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div ref={tableRef} className="p-4 glass-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama staf, NIP, atau mitra vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Division Filter */}
          <div>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {div === 'ALL' ? 'Semua Divisi' : div}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor / Kelompok Filter */}
          {isCoordinator ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              <span>Supervisi: {supervisedGroups[0] || currentUser?.vendorName}</span>
            </div>
          ) : (
            <div>
              <select
                value={selectedVendorGroup}
                onChange={(e) => setSelectedVendorGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Kelompok / Vendor</option>
                {availableVendorNames.map((vName) => (
                  <option key={vName} value={vName}>
                    {vName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Status Kehadiran</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Alpha">Alpha</option>
            </select>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Tanggal Operasional:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-200 text-xs font-semibold"
            />
          </div>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            Ditemukan {filteredRecords.length} catatan kehadiran
          </span>
        </div>
      </div>

      {/* High-Density Clean Data Table */}
      <div className="rounded-2xl glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-800/60 backdrop-blur-md text-slate-900 dark:text-slate-200 font-bold">
                <th className="py-3.5 px-4">Tenaga Outsourcing</th>
                <th className="py-3.5 px-4">Divisi & Vendor</th>
                <th className="py-3.5 px-4">Jam Masuk</th>
                <th className="py-3.5 px-4">Jam Pulang</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Lokasi & Geofence</th>
                <th className="py-3.5 px-4">Laporan Harian</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    Tidak ditemukan data presensi yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const staff = staffMap.get(rec.staffId);
                  const staffReportToday = dailyReports.find(
                    (r) => r.staffId === rec.staffId && r.date === rec.date
                  );
                  const isOutsideRadius = !rec.locationCoords.withinRadius && !rec.isFieldDuty;

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => handleRowClick(rec)}
                      className={`hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                        isOutsideRadius ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Staff Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                            style={{ backgroundColor: staff?.avatarColor || '#6366f1' }}
                          >
                            {staff?.initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                              <span>{staff?.name}</span>
                              {isOutsideRadius && (
                                <span title="Presensi di Luar Radius!">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-medium">
                              {staff?.nip}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Division & Vendor */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {staff?.division}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate max-w-[140px]">
                          {staff?.vendorName}
                        </div>
                      </td>

                      {/* Clock In */}
                      <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                        {rec.clockInTime}
                      </td>

                      {/* Clock Out */}
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                        {rec.clockOutTime || '-'}
                      </td>

                      {/* Attendance Status Badge */}
                      <td className="py-3 px-4">
                        {(() => {
                          const lateMins = rec.lateMinutes ?? rec.late_minutes ?? 0;
                          const earlyLeaveMins = rec.earlyLeaveMinutes ?? rec.early_leave_minutes ?? 0;
                          const isTerlambat = rec.status === 'Terlambat' || lateMins > 0;
                          const isPulangCepat = earlyLeaveMins > 0;

                          return (
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                  rec.status === 'Hadir' && !isTerlambat
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : isTerlambat
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                {rec.status === 'Hadir' && !isTerlambat && <CheckCircle2 className="w-3 h-3" />}
                                {isTerlambat && <Clock className="w-3 h-3" />}
                                {rec.status === 'Izin' && <UserX className="w-3 h-3" />}
                                <span>
                                  {isTerlambat
                                    ? `Terlambat${lateMins > 0 ? ` (+${lateMins} mnt)` : ''}`
                                    : rec.status}
                                </span>
                              </span>
                              {isPulangCepat && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                                  <Clock className="w-3 h-3" />
                                  <span>Pulang Cepat (-{earlyLeaveMins} mnt)</span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Location & Radius status with visual warning */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isOutsideRadius ? 'text-rose-500' : 'text-indigo-500'}`} />
                          <span className="truncate max-w-[140px]">
                            {rec.locationCoords.locationName}
                          </span>
                        </div>
                        {rec.isFieldDuty ? (
                          <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Tugas Lapangan: {rec.fieldDutyNotes || 'Dinas Luar'}</span>
                          </div>
                        ) : isOutsideRadius ? (
                          <div className="text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{rec.locationCoords.distanceMeters}m (Luar Radius!)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {rec.locationCoords.distanceMeters}m · Radius Aman
                          </div>
                        )}
                      </td>

                      {/* Daily Report status */}
                      <td className="py-3 px-4">
                        {staffReportToday ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>1 Laporan Dikirim</span>
                            </span>
                            {staffReportToday.aiDuplicateFlag?.isDuplicate && (
                              <span className="text-[9px] font-mono text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                <span>AI Duplikat {staffReportToday.aiDuplicateFlag.similarityScore}%</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Belum Melapor</span>
                          </span>
                        )}
                      </td>

                      {/* Quick Inspect Button */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(rec);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail Selfie & Koordinat GPS"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Riwayat & Inspeksi Presensi Lengkap (Identik dengan Tampilan Staf) */}
      <DetailRiwayatModal
        isOpen={!!selectedRecord}
        onClose={() => {
          setSelectedRecord(null);
          setSelectedStaff(null);
        }}
        item={selectedRecord}
        staff={selectedStaff || undefined}
        dayFieldCheckins={activeDayFieldCheckins}
        initialMode="default"
      />
    </div>
  );
};

