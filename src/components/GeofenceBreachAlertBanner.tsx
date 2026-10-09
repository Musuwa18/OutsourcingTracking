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
    <div className="rounded-2xl border border-rose-400/35 dark:border-rose-900/60 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 dark:from-rose-950/40 dark:via-rose-950/30 dark:to-amber-950/20 backdrop-blur-xl p-4 shadow-lg shadow-rose-950/5 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        {/* Warning Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-500/30 border border-white/20 shrink-0 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
                Peringatan Otomatis Geofence
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                {breachRecords.length} Pelanggaran Terdeteksi
              </span>
            </div>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              Sistem mendeteksi ada staf outsourcing yang melakukan Clock-In di luar radius aman yang ditentukan. Tinjau koordinat GPS untuk evaluasi kedisiplinan atau konfirmasi tugas lapangan khusus.
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
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
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white/75 dark:bg-slate-900/70 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-xs text-xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                  style={{ backgroundColor: staff?.avatarColor || '#e11d48' }}
                >
                  {staff?.initials}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{staff?.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({staff?.nip})</span>
                    <span className="text-[10px] text-slate-500 font-normal">· {staff?.division}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>Titik Tugas: <strong>{staff?.assignedLocation.name}</strong></span>
                    <span className="text-rose-600 dark:text-rose-400 font-mono font-semibold">
                      (Jarak: {formatDistance(actualDistance)}, melebihi radius +{delta > 0 ? `${delta}m` : '0m'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  {rec.clockInTime} WIB
                </span>
                <button
                  type="button"
                  onClick={() => onInspectRecord(rec)}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Periksa Peta & Selfie</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
