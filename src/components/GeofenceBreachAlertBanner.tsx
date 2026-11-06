import React, { useState } from 'react';
import { AlertTriangle, MapPin, Eye, ChevronRight, X, ShieldAlert } from 'lucide-react';
import { AttendanceRecord, StaffProfile } from '../types';
import { formatDistance } from '../utils/geo';

interface GeofenceBreachAlertBannerProps {
  breachRecords: AttendanceRecord[];
  staffMap: Map<string, StaffProfile>;
  onInspectRecord: (record: AttendanceRecord) => void;
}

export const GeofenceBreachAlertBanner: React.FC<GeofenceBreachAlertBannerProps> = ({
  breachRecords,
  staffMap,
  onInspectRecord,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || breachRecords.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 backdrop-blur-md p-4 shadow-xs animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        {/* Warning Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 shrink-0 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-950 dark:text-rose-200">
                Peringatan Geofence Presensi
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                {breachRecords.length} Pelanggaran Terdeteksi
              </span>
            </div>
            <p className="text-xs text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
              Sistem mendeteksi clock-in staf di luar batas radius aman. Tinjau koordinat GPS dan foto selfie untuk verifikasi kedisiplinan atau konfirmasi penugasan khusus.
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Tutup banner peringatan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List of Breach Cards */}
      <div className="mt-3.5 space-y-2">
        {breachRecords.map((rec) => {
          const staff = staffMap.get(rec.staffId);
          const allowedRadius = staff?.assignedLocation.radiusMeters || 80;
          const actualDistance = rec.locationCoords.distanceMeters;
          const delta = actualDistance - allowedRadius;

          return (
            <div
              key={rec.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-rose-100 dark:border-rose-950/60 shadow-xs text-xs min-w-0"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-[10px] shrink-0 mt-0.5 sm:mt-0"
                  style={{ backgroundColor: staff?.avatarColor || '#e11d48' }}
                >
                  {staff?.initials || 'ST'}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                    <span>{staff?.name || 'Staf Outsourcing'}</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">({staff?.nip || '-'})</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">· {staff?.division || '-'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 shrink-0">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{staff?.assignedLocation.name || 'Lokasi Tugas'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-semibold border border-rose-200/60 dark:border-rose-900/50">
                      Jarak {formatDistance(actualDistance)} ({delta > 0 ? `+${delta}m` : '0m'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {rec.clockInTime} WIB
                </span>
                <button
                  type="button"
                  onClick={() => onInspectRecord(rec)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Periksa Lokasi & Selfie</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
