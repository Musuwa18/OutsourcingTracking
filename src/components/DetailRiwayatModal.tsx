import React, { useEffect, useState } from 'react';
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
  Coffee,
} from 'lucide-react';
import { AttendanceRecord, DailyWorkReport, StaffProfile, FieldCheckinRecord } from '../types';
import { GeofenceRadarMap } from './GeofenceRadarMap';

interface DetailRiwayatModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AttendanceRecord | DailyWorkReport | FieldCheckinRecord | null;
  staff?: StaffProfile;
  initialMode?: 'default' | 'break';
  dayFieldCheckins?: FieldCheckinRecord[];
}

export const DetailRiwayatModal: React.FC<DetailRiwayatModalProps> = ({
  isOpen,
  onClose,
  item,
  staff,
  initialMode = 'default',
  dayFieldCheckins = [],
}) => {
  // Tab switcher khusus presensi harian (Clock In Masuk vs Clock Out Pulang)
  const [attendanceSubTab, setAttendanceSubTab] = useState<'clock-in' | 'clock-out'>('clock-in');

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

    // Reset sub tab ke clock-in saat modal dibuka
    setAttendanceSubTab('clock-in');

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isFieldCheckin = 'time' in item && 'activityNotes' in item;
  const isAttendance = !isFieldCheckin && 'clockInTime' in item;
  const isReport = !isFieldCheckin && !isAttendance;
  const isBreakDetail = isAttendance && initialMode === 'break';

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

  // Safe Location & Telemetry Extraction berdasarkan Sub Tab aktif (Masuk vs Pulang)
  const isViewingClockOut = isAttendance && !isBreakDetail && attendanceSubTab === 'clock-out';

  const rawCoords = isViewingClockOut && attRecord?.clockOutLocationCoords
    ? attRecord.clockOutLocationCoords
    : (item.locationCoords as Partial<AttendanceRecord['locationCoords']> | undefined);

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
    typeof (rawCoords as any)?.distanceMeters === 'number' ? Math.round((rawCoords as any).distanceMeters) : 0;
  const isWithinRadius =
    typeof (rawCoords as any)?.withinRadius === 'boolean' ? (rawCoords as any).withinRadius : true;
  const locationName =
    rawCoords?.locationName || (isViewingClockOut ? 'Titik Lokasi Presensi Pulang' : 'Kantor Dinas Pendidikan Kab. Hulu Sungai Tengah');

  // Foto dan teks watermark berdasarkan sub-tab aktif
  const currentSelfieUrl = isViewingClockOut
    ? (attRecord?.clockOutSelfieUrl || attRecord?.selfieUrl)
    : isAttendance
    ? attRecord?.selfieUrl
    : isFieldCheckin
    ? fieldRecord?.selfieUrl
    : reportRecord?.documentationPhotoUrl;

  const currentWatermarkLabel = isFieldCheckin
    ? '[PRESENSI RESMI TUGAS LAPANGAN]'
    : isViewingClockOut
    ? '[PRESENSI RESMI CLOCK OUT PULANG]'
    : isAttendance
    ? '[STEMPEL RESMI PRESENSI OT-HST]'
    : '[DOKUMENTASI TUGAS RESMI OT-HST]';

  const currentWatermarkTime = isFieldCheckin
    ? `Jam: ${fieldRecord?.time || '-'} WITA`
    : isViewingClockOut
    ? `Pulang: ${attRecord?.clockOutTime || 'Belum'} WITA`
    : isAttendance
    ? `Masuk: ${attRecord?.clockInTime || '-'} WITA`
    : `${reportRecord?.startTime || '-'} - ${reportRecord?.endTime || '-'} WIB`;

  // Hitung durasi istirahat jika ada
  const calculateBreakDuration = () => {
    if (!attRecord?.breakOutTime || !attRecord?.breakInTime) return 'Sedang berlangsung';
    try {
      const [h1, m1, s1] = attRecord.breakOutTime.split(':').map(Number);
      const [h2, m2, s2] = attRecord.breakInTime.split(':').map(Number);
      const diffSec = (h2 * 3600 + m2 * 60 + (s2 || 0)) - (h1 * 3600 + m1 * 60 + (s1 || 0));
      if (diffSec <= 0) return 'Tuntas tercatat';
      if (diffSec < 60) return `${diffSec} detik`;
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      return `${mins} menit ${secs > 0 ? `${secs} detik` : ''}`;
    } catch {
      return 'Tuntas';
    }
  };

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
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="space-y-1 pr-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white flex items-center gap-1.5">
                {isBreakDetail && <Coffee className="w-4 h-4 text-amber-500" />}
                <span>
                  {isBreakDetail
                    ? 'Detail Sesi Istirahat Kerja'
                    : isFieldCheckin
                    ? 'Detail Presensi Tugas Lapangan'
                    : isAttendance
                    ? 'Detail Presensi Harian'
                    : 'Detail Laporan Tugas'}
                </span>
              </span>

              {/* Status Badge */}
              {isBreakDetail ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {attRecord?.breakInTime ? 'Sesi Istirahat Tuntas' : 'Sedang Istirahat'}
                </span>
              ) : isFieldCheckin ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Tugas Lapangan
                </span>
              ) : isAttendance && attRecord ? (
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
              ) : isReport && reportRecord ? (
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
              ) : null}
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
          {/* ========================================================================= */}
          {/* KONDISI 1: JIKA MODAL MEMBUKA DETAIL SESI ISTIRAHAT MANDIRI               */}
          {/* ========================================================================= */}
          {isBreakDetail && attRecord ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between text-amber-400">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Coffee className="w-5 h-5 text-amber-500" />
                    <span>Rekap Sesi Istirahat Harian</span>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Durasi: {calculateBreakDuration()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-500/20">
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700/60 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3 text-amber-400" /> Clock Out Istirahat
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      {attRecord.breakOutTime ? `${attRecord.breakOutTime} WITA` : '-'}
                    </div>
                    <div className="text-[10px] text-slate-500">Mulai istirahat keluar</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700/60 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3 text-emerald-400" /> Clock In Kembali
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      {attRecord.breakInTime ? `${attRecord.breakInTime} WITA` : 'Sedang Istirahat'}
                    </div>
                    <div className="text-[10px] text-slate-500">Selesai & kembali kerja</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                  💡 Catatan: Sesi istirahat resmi ini tidak dihitung sebagai pelanggaran geofence. Staf berhak menggunakan alokasi istirahat sesuai jadwal kedinasan resmi.
                </p>
              </div>

              {/* Info Titik Kantor Penugasan */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-400" /> Lokasi Penugasan Staf
                </div>
                <div className="text-xs font-semibold text-white">
                  {attRecord.locationCoords?.locationName || 'Kantor Dinas Pendidikan Kab. Hulu Sungai Tengah'}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* KONDISI 2: PRESENSI HARIAN DENGAN TAB SWITCHER (CLOCK IN vs CLOCK OUT)    */}
              {/* ========================================================================= */}
              {isAttendance && attRecord && (
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-xs shadow-inner">
                  <button
                    type="button"
                    onClick={() => setAttendanceSubTab('clock-in')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                      attendanceSubTab === 'clock-in'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Presensi Masuk ({attRecord.clockInTime || '-'})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceSubTab('clock-out')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                      attendanceSubTab === 'clock-out'
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Presensi Pulang ({attRecord.clockOutTime || 'Belum'})</span>
                  </button>
                </div>
              )}

              {/* Foto Bukti WebRTC / Dokumentasi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                    {isFieldCheckin
                      ? 'Foto Bukti Tugas Lapangan WebRTC'
                      : isViewingClockOut
                      ? 'Foto Bukti Presensi Pulang (Clock Out)'
                      : isAttendance
                      ? 'Foto Bukti Presensi Masuk (Clock In)'
                      : 'Foto Dokumentasi Tugas'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isFieldCheckin
                      ? 'Titik Lapangan Terverifikasi'
                      : 'Kamera WebRTC Terverifikasi'}
                  </span>
                </div>

                {isViewingClockOut && attRecord?.clockOutTime && !attRecord?.clockOutSelfieUrl && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Sesi pulang ini tercatat sebelum fitur foto ganda diaktifkan (menampilkan foto sesi masuk sebagai arsip). Simulasi/presensi berikutnya otomatis menyimpan 2 foto selfie berbeda.
                    </span>
                  </div>
                )}

                {/* Photo Preview Container with Watermark Overlay */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-inner">
                  {currentSelfieUrl ? (
                    <img
                      src={currentSelfieUrl}
                      alt="Foto Bukti Presensi"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Camera className="w-8 h-8 opacity-40" />
                      <span className="text-xs">
                        {isViewingClockOut ? 'Staf belum melakukan Clock Out pulang' : 'Foto presensi tidak tersedia'}
                      </span>
                    </div>
                  )}

                  {/* Watermark Stempel Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent text-white space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold text-sky-400 tracking-wider">
                        {currentWatermarkLabel}
                      </span>
                      <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        GPS & Jam Server Valid
                      </span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-200 truncate">
                      {isFieldCheckin
                        ? `${staff?.name || 'Staf Lapangan'} · ${fieldRecord?.activityNotes || 'Tugas Luar'}`
                        : `${staff?.name || 'Staf Outsourcing'} · NIP: ${staff?.nip || '-'}`}
                    </div>
                    <div className="font-mono text-[9px] text-slate-300 flex items-center justify-between">
                      <span>{currentWatermarkTime}</span>
                      <span>Akurasi: ±{accuracyMeters}m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rincian Waktu Sesuai Sub Tab Aktif */}
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
                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {isViewingClockOut ? 'Log Presensi Pulang' : 'Log Presensi Masuk'}
                      </span>
                      <span className="font-mono text-sm font-bold text-white">
                        {isViewingClockOut
                          ? attRecord.clockOutTime
                            ? `${attRecord.clockOutTime} WITA`
                            : 'Belum Melakukan Clock Out'
                          : `${attRecord.clockInTime} WITA`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-700/50">
                      <span>Status: {isViewingClockOut ? (attRecord.clockOutTime ? 'Pulang Terkunci' : 'Aktif Bekerja') : 'Masuk Tervalidasi'}</span>
                      <span className="text-indigo-400 font-mono">
                        {isViewingClockOut ? 'Jam Kerja Selesai' : 'Awal Hari Kerja'}
                      </span>
                    </div>
                  </div>
                {/* Informasi Sesi Istirahat Jika Ada */}
                {isAttendance && attRecord?.breakOutTime && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-amber-500 dark:text-amber-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5" />
                        <span>Sesi Istirahat Kerja</span>
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        {attRecord.breakInTime ? 'Sesi Istirahat Tuntas' : 'Sedang Istirahat'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-500/20 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 font-sans">Clock Out Istirahat:</div>
                        <div className="font-bold text-white">{attRecord.breakOutTime} WITA</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-sans">Clock In Kembali:</div>
                        <div className="font-bold text-white">{attRecord.breakInTime ? `${attRecord.breakInTime} WITA` : 'Belum Kembali'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informasi Kunjungan Tugas Lapangan Jika Ada */}
                {isAttendance && dayFieldCheckins && dayFieldCheckins.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-indigo-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Kunjungan Tugas Lapangan Hari Ini ({dayFieldCheckins.length} Titik)</span>
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">Multi-Titik Terverifikasi</span>
                    </div>
                    <div className="space-y-1.5 divide-y divide-indigo-500/20">
                      {dayFieldCheckins.map((fc, idx) => (
                        <div key={fc.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-200 truncate">
                              {idx + 1}. {fc.locationCoords.locationName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {fc.activityNotes || 'Tugas Luar'} · Akurasi ±{Math.round(fc.locationCoords.accuracy)}m
                            </div>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-indigo-400 shrink-0">
                            {fc.time} WITA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                    )}
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
                    {isViewingClockOut ? 'Peta Titik Presensi Pulang' : 'Peta Titik Presensi Masuk'}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 shrink-0">
                    Akurasi ±{accuracyMeters}m
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
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

              {/* Catatan Tambahan */}
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
            </>
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
