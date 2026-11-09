import React, { useState } from 'react';
import { Calendar, Clock, FileText, Briefcase, Coffee, Printer } from 'lucide-react';
import { AttendanceRecord, DailyWorkReport, StaffProfile, FieldCheckinRecord } from '../types';
import { DetailRiwayatModal } from '../components/DetailRiwayatModal';

interface StaffHistoryViewProps {
  staff: StaffProfile;
  attendanceRecords: AttendanceRecord[];
  fieldCheckins?: FieldCheckinRecord[];
  workReports: DailyWorkReport[];
  onOpenTimesheet?: () => void;
}

export const StaffHistoryView: React.FC<StaffHistoryViewProps> = ({
  staff,
  attendanceRecords,
  fieldCheckins = [],
  workReports,
  onOpenTimesheet,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'attendance' | 'field' | 'reports'>('all');
  const [selectedItem, setSelectedItem] = useState<AttendanceRecord | DailyWorkReport | FieldCheckinRecord | null>(null);
  const [modalMode, setModalMode] = useState<'default' | 'break'>('default');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenDetail = (
    item: AttendanceRecord | DailyWorkReport | FieldCheckinRecord,
    mode: 'default' | 'break' = 'default'
  ) => {
    setSelectedItem(item);
    setModalMode(mode);
    setIsModalOpen(true);
  };
  // Filter records belonging to this staff
  const staffAttendance = attendanceRecords.filter((r) => r.staffId === staff.id);
  const staffFieldCheckins = fieldCheckins.filter((fc) => fc.staffId === staff.id);
  const staffReports = workReports.filter((r) => r.staffId === staff.id);

  // Group by date
  const dateSet = new Set<string>();
  staffAttendance.forEach((a) => dateSet.add(a.date));
  staffFieldCheckins.forEach((fc) => dateSet.add(fc.date));
  staffReports.forEach((r) => dateSet.add(r.date));
  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Header & Filter Controls */}
      <div className="p-5 glass-card space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              Linimasa Aktivitas 30 Hari Terakhir
            </h1>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Riwayat presensi geofence dan laporan kinerja harian terlacak
            </p>
          </div>
          {onOpenTimesheet && (
            <button
              type="button"
              onClick={onOpenTimesheet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              title="Buka / Cetak Lembar Presensi & Timesheet Harian F4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Pratinjau Timesheet (F4)</span>
            </button>
          )}
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 glass-pill rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium'
            }`}
          >
            Semua ({staffAttendance.length + staffFieldCheckins.length + staffReports.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('attendance')}
            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
              filterType === 'attendance'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium'
            }`}
          >
            Presensi ({staffAttendance.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('field')}
            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
              filterType === 'field'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium'
            }`}
          >
            Tugas Lapangan ({staffFieldCheckins.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('reports')}
            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
              filterType === 'reports'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium'
            }`}
          >
            Laporan Tugas ({staffReports.length})
          </button>
        </div>
      </div>

      {/* Timeline Days */}
      <div className="space-y-4">
        {sortedDates.map((dateStr) => {
          const dayAttendance = staffAttendance.find((a) => a.date === dateStr);
          const dayFieldCheckins = staffFieldCheckins.filter((fc) => fc.date === dateStr);
          const dayReports = staffReports.filter((r) => r.date === dateStr);

          if (filterType === 'attendance' && !dayAttendance) return null;
          if (filterType === 'field' && dayFieldCheckins.length === 0) return null;
          if (filterType === 'reports' && dayReports.length === 0) return null;

          const dateObj = new Date(dateStr);
          const formattedDate = dateObj.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          return (
            <div key={dateStr} className="space-y-2">
              {/* Date Header */}
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  {formattedDate}
                </span>
              </div>

              {/* Day Cards Container */}
              <div className="space-y-2.5">
                {/* Attendance Record Card */}
                {dayAttendance && filterType !== 'reports' && (
                  <div
                    onClick={() => handleOpenDetail(dayAttendance, 'default')}
                    className="p-4 glass-card flex items-center justify-between text-xs cursor-pointer transition-all active:scale-[0.99] hover:border-blue-500/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        dayAttendance.status === 'Hadir'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : dayAttendance.status === 'Terlambat'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Presensi Harian</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            dayAttendance.status === 'Hadir'
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {dayAttendance.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono mt-0.5 font-semibold">
                          Masuk: {dayAttendance.clockInTime} · Pulang: {dayAttendance.clockOutTime || 'Belum'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                      <div className="font-semibold text-slate-800 dark:text-slate-300">{dayAttendance.locationCoords.locationName}</div>
                      <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400">Akurasi ±{Math.round(dayAttendance.locationCoords.accuracy)}m</div>
                    </div>
                  </div>
                )}

                {/* Break Session Card (Sesi Istirahat Kerja) */}
                {Boolean(dayAttendance?.breakOutTime || dayAttendance?.break_out_time) && filterType !== 'reports' && filterType !== 'field' && (() => {
                  const bOut = dayAttendance?.breakOutTime || dayAttendance?.break_out_time;
                  const bIn = dayAttendance?.breakInTime || dayAttendance?.break_in_time;
                  return (
                    <div
                      onClick={() => handleOpenDetail(dayAttendance!, 'break')}
                    className="p-4 glass-card flex items-center justify-between text-xs cursor-pointer transition-all active:scale-[0.99] hover:border-amber-500/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Sesi Istirahat Kerja</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {bIn ? 'Sesi Istirahat Tuntas' : 'Sedang Istirahat'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono mt-0.5 font-semibold">
                          {bIn
                            ? `Istirahat selesai (${bOut} - ${bIn} WITA)`
                            : `Sedang istirahat keluar sejak ${bOut} WITA`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                      <div className="font-semibold text-slate-800 dark:text-slate-300">
                        {bIn ? 'Status Sesi' : 'Status'}
                      </div>
                      <div className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        {bIn ? 'Tuntas Tercatat' : 'Keluar Istirahat'}
                      </div>
                    </div>
                  </div>
                  );
                })()}
                {/* Field Duty Check-in Cards */}
                {filterType !== 'attendance' && filterType !== 'reports' &&
                  dayFieldCheckins.map((fc) => (
                    <div
                      key={fc.id}
                      onClick={() => handleOpenDetail(fc, 'default')}
                      className="p-4 glass-card flex items-center justify-between text-xs cursor-pointer transition-all active:scale-[0.99] hover:border-amber-500/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Presensi Tugas Lapangan</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                              Titik Lapangan
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono mt-0.5 font-semibold">
                            Jam: {fc.time} WITA · {fc.activityNotes || 'Tugas Luar'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                        <div className="font-semibold text-slate-800 dark:text-slate-300 truncate max-w-[150px]">
                          {fc.locationCoords.locationName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                          Akurasi ±{Math.round(fc.locationCoords.accuracy)}m
                        </div>
                      </div>
                    </div>
                  ))}


                {/* Day Reports Cards */}
                {filterType !== 'attendance' &&
                  dayReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => handleOpenDetail(report, 'default')}
                      className="p-4 glass-card text-xs space-y-2 cursor-pointer transition-all active:scale-[0.99] hover:border-blue-500/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {report.title}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                          report.supervisorApproval === 'Disetujui'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {report.supervisorApproval}
                        </span>
                      </div>

                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-[11px] font-normal">
                        {report.summary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 font-mono font-medium">
                        <span>{report.startTime} - {report.endTime} WIB</span>
                        <span className="font-semibold text-indigo-700 dark:text-indigo-400">{report.category}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Riwayat Modal */}
      <DetailRiwayatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        staff={staff}
        initialMode={modalMode}
      />
    </div>
  );
};
