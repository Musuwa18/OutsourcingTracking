import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserX,
  MapPin,
  Calendar,
} from 'lucide-react';
import { AttendanceRecord, StaffProfile, DailyWorkReport } from '../types';
import { exportAttendanceToCSV } from '../utils/export';
import { AttendanceInspectionModal } from '../components/AttendanceInspectionModal';
import { GeofenceBreachAlertBanner } from '../components/GeofenceBreachAlertBanner';

interface AdminAttendanceViewProps {
  staffList: StaffProfile[];
  attendanceRecords: AttendanceRecord[];
  dailyReports: DailyWorkReport[];
  onOpenPrintModal: () => void;
}

export const AdminAttendanceView: React.FC<AdminAttendanceViewProps> = ({
  staffList,
  attendanceRecords,
  dailyReports,
  onOpenPrintModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('2026-10-09');

  // Inspection modal state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);

  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  // Divisions list
  const divisions = ['ALL', ...Array.from(new Set(staffList.map((s) => s.division)))];

  // Filter attendance records by date, division, status, search
  const filteredRecords = attendanceRecords.filter((rec) => {
    if (selectedDate && rec.date !== selectedDate) return false;
    const staff = staffMap.get(rec.staffId);
    if (!staff) return false;

    if (selectedDivision !== 'ALL' && staff.division !== selectedDivision) return false;

    if (selectedStatus === 'BREACH') {
      if (rec.locationCoords.withinRadius) return false;
    } else if (selectedStatus !== 'ALL' && rec.status !== selectedStatus) {
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

  // KPI summary counters for the selected date
  const dayLogs = attendanceRecords.filter((r) => r.date === selectedDate);
  const hadirCount = dayLogs.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = dayLogs.filter((r) => r.status === 'Terlambat').length;
  const izinCount = dayLogs.filter((r) => r.status === 'Izin').length;
  const dayReports = dailyReports.filter((r) => r.date === selectedDate);
  const dayBreaches = dayLogs.filter((r) => !r.locationCoords.withinRadius);

  const handleRowClick = (rec: AttendanceRecord) => {
    const staff = staffMap.get(rec.staffId) || null;
    setSelectedRecord(rec);
    setSelectedStaff(staff);
  };

  const handleExportCSV = () => {
    exportAttendanceToCSV(attendanceRecords, staffMap);
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
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel/CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap / PDF</span>
          </button>
        </div>
      </div>

      {/* Geofence Breach Alert Banner (Auto-Notification for Supervisor/Admin) */}
      <GeofenceBreachAlertBanner
        breachRecords={dayBreaches}
        staffMap={staffMap}
        onInspectRecord={handleRowClick}
      />

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 glass-card">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hadir Tepat Waktu</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {hadirCount} <span className="text-xs font-normal text-slate-400">personel</span>
          </div>
        </div>

        <div className="p-4 glass-card">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Terlambat Masuk</div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {terlambatCount} <span className="text-xs font-normal text-slate-400">personel</span>
          </div>
        </div>

        <div className="p-4 glass-card">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Izin / Sakit</div>
          <div className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300 mt-1 tabular-nums">
            {izinCount} <span className="text-xs font-normal text-slate-400">personel</span>
          </div>
        </div>

        <div className="p-4 glass-card">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Laporan Tugas Hari Ini</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-cyan-400 mt-1 tabular-nums">
            {dayReports.length} <span className="text-xs font-normal text-slate-400">terkumpul</span>
          </div>
        </div>

        {/* Visual Geofence Alert Metric Card */}
        <div className={`p-4 glass-card transition-colors ${
          dayBreaches.length > 0
            ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
            : ''
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Alert Geofence</span>
            {dayBreaches.length > 0 && (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
            )}
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${
            dayBreaches.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
          }`}>
            {dayBreaches.length} <span className="text-xs font-normal opacity-80">di luar radius</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 glass-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
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

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Status Kehadiran</option>
              <option value="BREACH">⚠️ Hanya Pelanggaran Geofence (Luar Radius)</option>
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
                  const isOutsideRadius = !rec.locationCoords.withinRadius;

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
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            rec.status === 'Hadir'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : rec.status === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {rec.status === 'Hadir' && <CheckCircle2 className="w-3 h-3" />}
                          {rec.status === 'Terlambat' && <Clock className="w-3 h-3" />}
                          {rec.status === 'Izin' && <UserX className="w-3 h-3" />}
                          <span>{rec.status}</span>
                        </span>
                      </td>

                      {/* Location & Radius status with visual warning */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isOutsideRadius ? 'text-rose-500' : 'text-indigo-500'}`} />
                          <span className="truncate max-w-[140px]">
                            {rec.locationCoords.locationName}
                          </span>
                        </div>
                        {isOutsideRadius ? (
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Inspection Modal */}
      <AttendanceInspectionModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        staff={selectedStaff}
      />
    </div>
  );
};

