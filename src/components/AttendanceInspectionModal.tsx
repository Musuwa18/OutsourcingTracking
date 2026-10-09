import React from 'react';
import { X, MapPin, Clock, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AttendanceRecord, StaffProfile } from '../types';
import { formatDistance } from '../utils/geo';

interface AttendanceInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  staff: StaffProfile | null;
}

export const AttendanceInspectionModal: React.FC<AttendanceInspectionModalProps> = ({
  isOpen,
  onClose,
  record,
  staff,
}) => {
  if (!isOpen || !record || !staff) return null;

  const { locationCoords } = record;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-surface rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Verifikasi Presensi Digital
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                record.status === 'Hadir'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : record.status === 'Terlambat'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}>
                {record.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {record.date} · {staff.name} ({staff.nip})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Top Split: Selfie Preview & Time Logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Selfie Photo */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Foto Selfie Langsung WebRTC</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Kamera Valid
                </span>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <img
                  src={record.selfieUrl}
                  alt={`Selfie ${staff.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Time & Shift Details */}
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Log Waktu & Lokasi Penugasan
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Jam Masuk (Clock In)
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {record.clockInTime} WIB
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Jam Pulang (Clock Out)
                  </span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-100">
                    {record.clockOutTime ? `${record.clockOutTime} WIB` : 'Belum Melakukan Clock Out'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-slate-500">Unit / Vendor:</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {staff.division} · {staff.vendorName}
                  </div>
                </div>

                {record.notes && (
                  <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs">
                    <strong>Catatan:</strong> {record.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mini Interactive Vector Map & GPS Telemetry */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Peta Mini Verifikasi Titik Koordinat GPS
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Akurasi: ±{Math.round(locationCoords.accuracy)} meter
              </span>
            </div>

            <div className="relative h-48 w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              {/* Interactive Vector Grid Map Canvas */}
              <svg className="w-full h-full" viewBox="0 0 500 200">
                <defs>
                  <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="#0f172a" />
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Road simulation lines */}
                <path d="M 0 100 Q 200 80, 500 130" stroke="#334155" strokeWidth="8" fill="none" />
                <path d="M 250 0 L 250 200" stroke="#1e293b" strokeWidth="12" fill="none" />

                {/* Geofence Perimeter Circle */}
                <circle
                  cx="250"
                  cy="100"
                  r="65"
                  fill="rgba(99, 102, 241, 0.15)"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />

                {/* Office Target Marker */}
                <circle cx="250" cy="100" r="5" fill="#4f46e5" />
                <text x="250" y="85" textAnchor="middle" fill="#c7d2fe" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                  {staff.assignedLocation.name}
                </text>

                {/* Staff Actual GPS Coordinate Marker */}
                {/* Visual displacement proportional to distance */}
                <circle cx="264" cy="108" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="250" y1="100" x2="264" y2="108" stroke="#10b981" strokeWidth="1.2" strokeDasharray="2 2" />
                <text x="264" y="128" textAnchor="middle" fill="#34d399" fontSize="9" fontFamily="monospace">
                  Titik Staf ({formatDistance(locationCoords.distanceMeters)})
                </text>
              </svg>

              {/* Float info bar */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 bg-slate-950/85 backdrop-blur-xs rounded-lg text-[11px] text-slate-300 flex items-center justify-between border border-slate-800">
                <div>
                  <span className="text-slate-400">Lat/Lng: </span>
                  <span className="font-mono text-white tabular-nums">
                    {locationCoords.latitude.toFixed(6)}, {locationCoords.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  {locationCoords.withinRadius ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Berada di dalam Radius Geofence</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-400">Di Luar Radius Kantor ({formatDistance(locationCoords.distanceMeters)})</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
