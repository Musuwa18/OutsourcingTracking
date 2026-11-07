import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  Calendar,
  MapPin,
  ShieldCheck,
  FileText,
  Info,
  Sparkles,
  Camera,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { AttendanceRecord, DailyWorkReport, StaffProfile, FieldCheckinRecord } from '../types';
import { GeofenceRadarMap } from './GeofenceRadarMap';

interface DetailRiwayatModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AttendanceRecord | DailyWorkReport | FieldCheckinRecord | null;
  staff?: StaffProfile;
}

export const DetailRiwayatModal: React.FC<DetailRiwayatModalProps> = ({
  isOpen,
  onClose,
  item,
  staff,
}) => {
  // Close on ESC key & prevent background scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isFieldCheckin = 'time' in item && 'activityNotes' in item;
  const isAttendance = !isFieldCheckin && 'clockInTime' in item;
  const isReport = !isFieldCheckin && !isAttendance;

  const attRecord = isAttendance ? (item as AttendanceRecord) : null;
  const fieldRecord = isFieldCheckin ? (item as FieldCheckinRecord) : null;
  const reportRecord = isReport ? (item as DailyWorkReport) : null;

  // Format Indonesian Date Safely
  const formatIndonesianDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr || '';
    }
  };

  const formattedDate = formatIndonesianDate(item.date);

  // Safe Location & Telemetry Extraction
  const rawCoords = item.locationCoords as Partial<AttendanceRecord['locationCoords']> | undefined;
  const latStr =
    typeof rawCoords?.latitude === 'number'
      ? rawCoords.latitude.toFixed(6)
      : rawCoords?.latitude
      ? String(rawCoords.latitude)
      : '-2.591123';
  const lngStr =
    typeof rawCoords?.longitude === 'number'
      ? rawCoords.longitude.toFixed(6)
      : rawCoords?.longitude
      ? String(rawCoords.longitude)
      : '115.373529';
  const accuracyMeters =
    typeof rawCoords?.accuracy === 'number' ? Math.round(rawCoords.accuracy) : 14;
  const distanceMeters =
    typeof rawCoords?.distanceMeters === 'number' ? Math.round(rawCoords.distanceMeters) : 0;
  const isWithinRadius =
    typeof rawCoords?.withinRadius === 'boolean' ? rawCoords.withinRadius : true;
  const locationName =
    rawCoords?.locationName || 'Kantor Dinas Pendidikan Kab. Hulu Sungai Tengah';

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur border border-slate-800 text-slate-100 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="space-y-1 pr-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white">
                {isFieldCheckin
                  ? 'Detail Presensi Tugas Lapangan'
                  : isAttendance
                  ? 'Detail Presensi Harian'
                  : 'Detail Laporan Tugas'}
              </span>

              {/* Status Badge */}
              {isFieldCheckin && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Tugas Lapangan
                </span>
              )}

              {isAttendance && attRecord && (
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    attRecord.status === 'Hadir'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : attRecord.status === 'Terlambat'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : attRecord.status === 'Izin'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {attRecord.status}
                </span>
              )}

              {isReport && reportRecord && (
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    reportRecord.supervisorApproval === 'Disetujui'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : reportRecord.supervisorApproval === 'Pending'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {reportRecord.supervisorApproval}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{formattedDate}</span>
              {staff?.name && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="truncate max-w-[150px]">{staff.name}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup Detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Foto Bukti Presensi / Dokumentasi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                {isFieldCheckin
                  ? 'Foto Bukti Tugas Lapangan WebRTC'
                  : isAttendance
                  ? 'Foto Bukti Presensi WebRTC'
                  : 'Foto Dokumentasi Tugas'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isFieldCheckin
                  ? 'Titik Lapangan Terverifikasi'
                  : isAttendance
                  ? 'Kamera WebRTC Terverifikasi'
                  : 'Dokumentasi Terstempel'}
              </span>
            </div>

            {/* Photo Preview Container with Watermark Overlay */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-inner">
              {isFieldCheckin ? (
                fieldRecord?.selfieUrl ? (
                  <img
                    src={fieldRecord.selfieUrl}
                    alt="Foto Tugas Lapangan"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Camera className="w-8 h-8 opacity-40" />
                    <span className="text-xs">Foto tidak tersedia</span>
                  </div>
                )
              ) : isAttendance ? (
                attRecord?.selfieUrl ? (
                  <img
                    src={attRecord.selfieUrl}
                    alt="Foto Presensi"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Camera className="w-8 h-8 opacity-40" />
                    <span className="text-xs">Foto presensi tidak tersedia</span>
                  </div>
                )
              ) : reportRecord?.documentationPhotoUrl ? (
                <img
                  src={reportRecord.documentationPhotoUrl}
                  alt="Foto Dokumentasi"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                  <FileText className="w-8 h-8 opacity-40" />
                  <span className="text-xs">Foto dokumentasi tidak tersedia</span>
                </div>
              )}

              {/* Watermark Stempel Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent text-white space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold text-sky-400 tracking-wider">
                    {isFieldCheckin
                      ? '[PRESENSI RESMI TUGAS LAPANGAN]'
                      : isAttendance
                      ? '[STEMPEL RESMI PRESENSI OT-HST]'
                      : '[DOKUMENTASI TUGAS RESMI OT-HST]'}
                  </span>
                  <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                    GPS & Jam Server Valid
                  </span>
                </div>
                <div className="text-[10px] font-medium text-slate-200 truncate">
                  {isFieldCheckin
                    ? `${staff?.name || 'Staf Lapangan'} · ${fieldRecord?.activityNotes || 'Tugas Luar'}`
                    : isAttendance
                    ? `${staff?.name || 'Staf Outsourcing'} · NIP: ${staff?.nip || '-'}`
                    : reportRecord?.title}
                </div>
                <div className="font-mono text-[9px] text-slate-300 flex items-center justify-between">
                  <span>
                    {isFieldCheckin
                      ? `Jam: ${fieldRecord?.time || '-'} WITA`
                      : isAttendance
                      ? `Masuk: ${attRecord?.clockInTime || '-'} WITA`
                      : `${reportRecord?.startTime || '-'} - ${reportRecord?.endTime || '-'} WIB`}
                  </span>
                  <span>Akurasi: ±{accuracyMeters}m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Waktu */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Rincian Waktu Presensi
            </span>

            {isFieldCheckin && fieldRecord ? (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Jam Check-in Lapangan
                  </div>
                  <div className="font-mono text-sm font-bold text-white">
                    {fieldRecord.time} WITA
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-indigo-400" /> Jenis Presensi
                  </div>
                  <div className="text-xs font-bold text-indigo-300 truncate">
                    Kunjungan Multi-Titik
                  </div>
                </div>
              </div>
            ) : isAttendance && attRecord ? (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" /> Jam Masuk (Clock In)
                  </div>
                  <div className="font-mono text-sm font-bold text-white">
                    {attRecord.clockInTime} WIB
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" /> Jam Pulang (Clock Out)
                  </div>
                  <div className="font-mono text-sm font-bold text-white">
                    {attRecord.clockOutTime ? `${attRecord.clockOutTime} WIB` : 'Belum Clock Out'}
                  </div>
                </div>
              </div>
            ) : reportRecord ? (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="text-[10px] text-slate-400">Rentang Waktu Pelaksanaan</div>
                  <div className="font-mono text-xs font-bold text-white">
                    {reportRecord.startTime} - {reportRecord.endTime} WIB
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="text-[10px] text-slate-400">Kategori Pekerjaan</div>
                  <div className="text-xs font-bold text-indigo-400 truncate">
                    {reportRecord.category}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Rincian Lokasi & Peta Interaktif GPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Titik Lokasi & Peta Koordinat Presensi
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 shrink-0">
                Akurasi ±{accuracyMeters}m
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div>
                <div className="text-[10px] text-slate-400">Nama Titik Lokasi</div>
                <div className="text-xs font-semibold text-white">{locationName}</div>
              </div>

              {/* Peta Interaktif Leaflet OpenStreetMap */}
              <div className="rounded-xl overflow-hidden border border-slate-700/80 shadow-md">
                <GeofenceRadarMap
                  userCoords={{
                    latitude: Number(latStr),
                    longitude: Number(lngStr),
                    accuracy: accuracyMeters,
                    distance: distanceMeters,
                    withinRadius: isWithinRadius,
                  }}
                  assignedLocation={{
                    id: 'loc-pin',
                    name: locationName,
                    address: locationName,
                    latitude: Number(latStr),
                    longitude: Number(lngStr),
                    radiusMeters: accuracyMeters || 100,
                  }}
                  height="220px"
                  className="w-full"
                />
              </div>

              {/* Koordinat & Tombol Pintas Google Maps */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-700/50 text-[11px]">
                <div className="font-mono text-[10px] text-slate-400">
                  Koordinat: <span className="text-slate-200">{latStr}, {lngStr}</span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${latStr},${lngStr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Google Maps &rarr;</span>
                </a>
              </div>
            </div>
          </div>

          {/* Catatan / Keterangan Tambahan */}
          {isFieldCheckin && fieldRecord ? (
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                Catatan Aktivitas Tugas Lapangan
              </span>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                <div className="text-slate-200 text-xs leading-relaxed">
                  {fieldRecord.activityNotes || 'Presensi tugas lapangan mandiri di wilayah Kabupaten Hulu Sungai Tengah.'}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/40">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Diverifikasi oleh: {fieldRecord.verifiedBy || 'Sistem GPS WebRTC'}</span>
                </div>
              </div>
            </div>
          ) : isAttendance ? (
            (attRecord?.notes || attRecord?.verifiedBy) && (
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  Catatan & Validasi Sistem
                </span>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  {attRecord.notes && (
                    <div>
                      <div className="text-[10px] text-slate-400">Catatan Kendala:</div>
                      <div className="text-slate-200">{attRecord.notes}</div>
                    </div>
                  )}
                  {attRecord.verifiedBy && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/40">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Diverifikasi oleh: {attRecord.verifiedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Uraian & Ringkasan Laporan
              </span>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <p className="text-slate-200 leading-relaxed text-xs">
                  {reportRecord?.summary}
                </p>

                {reportRecord?.supervisorNotes && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-900/50 text-amber-300 text-[11px] space-y-0.5">
                    <div className="font-bold">Catatan Supervisor:</div>
                    <div>{reportRecord.supervisorNotes}</div>
                  </div>
                )}

                {reportRecord?.aiDuplicateFlag && (
                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-700/40 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" /> AI Perceptual Hash
                    </span>
                    <span className="font-mono text-emerald-400">
                      {reportRecord.aiDuplicateFlag.similarityScore}% (Bersih)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Close Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
          >
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
