import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle2, AlertTriangle, FileText, Filter } from 'lucide-react';
import { AttendanceRecord, DailyWorkReport, StaffProfile } from '../types';

interface StaffHistoryViewProps {
  staff: StaffProfile;
  attendanceRecords: AttendanceRecord[];
  workReports: DailyWorkReport[];
}

export const StaffHistoryView: React.FC<StaffHistoryViewProps> = ({
  staff,
  attendanceRecords,
  workReports,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'attendance' | 'reports'>('all');

  // Filter records belonging to this staff
  const staffAttendance = attendanceRecords.filter((r) => r.staffId === staff.id);
  const staffReports = workReports.filter((r) => r.staffId === staff.id);

  // Group by date
  const dateSet = new Set<string>();
  staffAttendance.forEach((a) => dateSet.add(a.date));
  staffReports.forEach((r) => dateSet.add(r.date));
  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Header & Filter Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            Linimasa Aktivitas 30 Hari Terakhir
          </h1>
          <p className="text-xs text-slate-500">
            Riwayat presensi geofence dan laporan kinerja harian terlacak
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 glass-pill rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua ({staffAttendance.length + staffReports.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('attendance')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center ${
              filterType === 'attendance'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Presensi ({staffAttendance.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('reports')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center ${
              filterType === 'reports'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
          const dayReports = staffReports.filter((r) => r.date === dateStr);

          if (filterType === 'attendance' && !dayAttendance) return null;
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
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formattedDate}
                </span>
              </div>

              {/* Day Cards Container */}
              <div className="space-y-2.5">
                {/* Attendance Record Card */}
                {dayAttendance && filterType !== 'reports' && (
                  <div className="p-4 glass-card flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        dayAttendance.status === 'Hadir'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : dayAttendance.status === 'Terlambat'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Presensi Harian</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            dayAttendance.status === 'Hadir'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {dayAttendance.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Masuk: {dayAttendance.clockInTime} · Pulang: {dayAttendance.clockOutTime || 'Belum'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      <div>{dayAttendance.locationCoords.locationName}</div>
                      <div className="font-mono text-[10px]">Akurasi ±{Math.round(dayAttendance.locationCoords.accuracy)}m</div>
                    </div>
                  </div>
                )}

                {/* Day Reports Cards */}
                {filterType !== 'attendance' &&
                  dayReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 glass-card text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {report.title}
                          </span>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          report.supervisorApproval === 'Disetujui'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {report.supervisorApproval}
                        </span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                        {report.summary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono">
                        <span>{report.startTime} - {report.endTime} WIB</span>
                        <span>{report.category}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
