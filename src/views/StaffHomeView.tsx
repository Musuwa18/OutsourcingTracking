import React, { useState } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Calendar,
  Sparkles,
  Layers,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Briefcase,
  Coffee,
} from 'lucide-react';
import { StaffProfile, AttendanceRecord, DailyWorkReport, AttendanceGlobalSettings, DEFAULT_ATTENDANCE_SETTINGS, FieldCheckinRecord } from '../types';
import { PRIMARY_OFFICES } from '../utils/geo';
import { getDayOfWeekKey } from '../utils/date';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { WatermarkCameraModal } from '../components/WatermarkCameraModal';
import { AiDuplicateValidationModal } from '../components/AiDuplicateValidationModal';
import { validateReportPhotoAgainstHistory, computeImagePerceptualHash } from '../utils/imageHash';
import { createWorkPhotoThumbnail } from '../data/mockData';

interface StaffHomeViewProps {
  staff: StaffProfile;
  todayAttendance: AttendanceRecord | undefined;
  fieldCheckins?: FieldCheckinRecord[];
  todayReports: DailyWorkReport[];
  allReports?: DailyWorkReport[];
  staffList?: StaffProfile[];
  activeStaffId?: string;
  attendanceSettings?: AttendanceGlobalSettings;
  tabMode?: 'presensi' | 'laporan';
  onNavigateToReports?: () => void;
  onSwitchStaff?: (staffId: string) => void;
  onClockIn: (selfieBase64: string, locationData: any) => void;
  onFieldCheckin?: (selfieBase64: string, locationData: any) => void;
  onBreakOut?: (selfieBase64: string, locationData: any) => void;
  onBreakIn?: (selfieBase64: string, locationData: any) => void;
  onClockOut: (selfieBase64: string, locationData: any) => void;
  onSubmitReport: (newReport: Omit<DailyWorkReport, 'id' | 'createdAt'>) => void;
}
export const StaffHomeView: React.FC<StaffHomeViewProps> = ({
  staff,
  todayAttendance,
  fieldCheckins = [],
  todayReports,
  allReports = [],
  staffList = [],
  activeStaffId,
  attendanceSettings,
  tabMode,
  onNavigateToReports,
  onSwitchStaff,
  onClockIn,
  onFieldCheckin,
  onBreakOut,
  onBreakIn,
  onClockOut,
  onSubmitReport,
}) => {
  const safeOffice = staff?.assignedLocation || PRIMARY_OFFICES[0];
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'clock-in' | 'clock-out' | 'break-out' | 'break-in' | 'field-checkin'>('clock-in');

  const isNightShiftWorker = Boolean(
    staff?.roleTitle?.toLowerCase().includes('jaga malam') ||
    staff?.roleTitle?.toLowerCase().includes('wakar')
  );

  const todayDayKey = getDayOfWeekKey();
  const regularSchedule =
    attendanceSettings?.workSchedule?.[todayDayKey] ||
    DEFAULT_ATTENDANCE_SETTINGS.workSchedule[todayDayKey];

  const wakarConfig =
    attendanceSettings?.wakarSchedule ||
    DEFAULT_ATTENDANCE_SETTINGS.wakarSchedule || {
      enabled: true,
      dayName: 'Jaga Malam / Wakar',
      clockInStart: '19:30',
      clockInEnd: '21:00',
      clockOutStart: '05:30',
      clockOutEnd: '07:00',
    };

  const todaySchedule: DayWorkSchedule = isNightShiftWorker
    ? {
        enabled: wakarConfig.enabled,
        dayName: wakarConfig.dayName || 'Jaga Malam / Wakar',
        clockInStart: wakarConfig.clockInStart,
        clockInEnd: wakarConfig.clockInEnd,
        clockOutStart: wakarConfig.clockOutStart,
        clockOutEnd: wakarConfig.clockOutEnd,
        enableBreak: false,
        breakStart: '00:00',
        breakEnd: '01:00',
      }
    : regularSchedule;

  // Report modal state
  const [watermarkModalOpen, setWatermarkModalOpen] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState<DailyWorkReport['category']>('Pemeliharaan');
  const [reportStartTime, setReportStartTime] = useState('09:00');
  const [reportEndTime, setReportEndTime] = useState('12:00');
  const [reportSummary, setReportSummary] = useState('');
  const [reportStatus, setReportStatus] = useState<'Selesai' | 'On-Progress'>('Selesai');
  const [documentationPhoto, setDocumentationPhoto] = useState<string | null>(null);
  const [reportLocationData, setReportLocationData] = useState<AttendanceRecord['locationCoords'] | null>(null);

  // AI Validation Step State
  const [isValidatingAi, setIsValidatingAi] = useState(false);
  const [aiValidationStep, setAiValidationStep] = useState<string>('');
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateMatchInfo, setDuplicateMatchInfo] = useState<{
    matchedReport: DailyWorkReport;
    similarityScore: number;
    flagSeverity: 'high' | 'medium';
    reason: string;
    currentHash: string;
    currentShortHash: string;
  } | null>(null);

  const hasClockedIn = !!todayAttendance && todayAttendance.status !== 'Izin';
  const hasBrokenOut = !!todayAttendance?.breakOutTime && todayAttendance.breakOutTime !== '-';
  const hasBrokenIn = !!todayAttendance?.breakInTime && todayAttendance.breakInTime !== '-';
  const hasClockedOut = !!todayAttendance?.clockOutTime && todayAttendance.clockOutTime !== '-';

  const isPresensiMode = tabMode === 'presensi';
  const isLaporanMode = tabMode === 'laporan';
  const isHybridMode = !tabMode;

  const computeActiveWorkDuration = () => {
    if (!todayAttendance?.clockInTime) return 'Belum Dimulai';
    
    const [inH, inM] = todayAttendance.clockInTime.replace(/\./g, ':').split(':').map(Number);
    if (isNaN(inH) || isNaN(inM)) return 'Aktif';

    let endH: number;
    let endM: number;
    if (todayAttendance.clockOutTime && todayAttendance.clockOutTime !== '-') {
      const [oH, oM] = todayAttendance.clockOutTime.replace(/\./g, ':').split(':').map(Number);
      endH = isNaN(oH) ? inH : oH;
      endM = isNaN(oM) ? inM : oM;
    } else {
      const now = new Date();
      const witaStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now).replace(/\./g, ':');
      const [nH, nM] = witaStr.split(':').map(Number);
      endH = isNaN(nH) ? inH : nH;
      endM = isNaN(nM) ? inM : nM;
    }

    let diffMinutes = (endH * 60 + endM) - (inH * 60 + inM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;

    if (todayAttendance.breakOutTime && todayAttendance.breakInTime) {
      const [bOutH, bOutM] = todayAttendance.breakOutTime.replace(/\./g, ':').split(':').map(Number);
      const [bInH, bInM] = todayAttendance.breakInTime.replace(/\./g, ':').split(':').map(Number);
      if (!isNaN(bOutH) && !isNaN(bInH)) {
        const breakMins = (bInH * 60 + bInM) - (bOutH * 60 + bOutM);
        if (breakMins > 0) diffMinutes = Math.max(0, diffMinutes - breakMins);
      }
    }

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}j ${mins}m`;
  };

  const handleOpenAttendance = (type: 'clock-in' | 'clock-out' | 'break-out' | 'break-in' | 'field-checkin') => {
    setActionType(type);
    setCameraModalOpen(true);
  };

  const handleAttendanceCapture = (selfieBase64: string, locationData: any) => {
    if (actionType === 'clock-in') {
      onClockIn(selfieBase64, locationData);
    } else if (actionType === 'field-checkin') {
      if (onFieldCheckin) onFieldCheckin(selfieBase64, locationData);
    } else if (actionType === 'break-out') {
      if (onBreakOut) onBreakOut(selfieBase64, locationData);
      else onClockOut(selfieBase64, locationData);
    } else if (actionType === 'break-in') {
      if (onBreakIn) onBreakIn(selfieBase64, locationData);
      else onClockIn(selfieBase64, locationData);
    } else {
      onClockOut(selfieBase64, locationData);
    }
  };

  const handleWatermarkPhotoCaptured = (photoUrl: string, locData: any) => {
    setDocumentationPhoto(photoUrl);
    setReportLocationData(locData);
  };



  // Initiate Submission with AI Validation Step
  const handleSubmitReportForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportSummary.trim()) return;

    if (!documentationPhoto) {
      alert('Harap ambil foto dokumentasi tugas terlebih dahulu via kamera.');
      return;
    }

    // Run AI Perceptual Hash & Duplicate Detection Step
    setIsValidatingAi(true);
    setAiValidationStep('Mengekstraksi sidik jari visual & menghitung Perceptual Hash (dHash)...');

    // Combine all reports for history check
    const reportPool = allReports.length > 0 ? allReports : todayReports;

    // Small delay to provide noticeable responsive AI feedback
    await new Promise((r) => setTimeout(r, 450));
    setAiValidationStep(`Membandingkan hash citra terhadap ${reportPool.length} laporan di database...`);
    await new Promise((r) => setTimeout(r, 350));

    const validation = await validateReportPhotoAgainstHistory(documentationPhoto, reportPool);

    setIsValidatingAi(false);

    if (validation.isDuplicate && validation.match) {
      // Flagged as Duplicate: Open AI Warning Dialog with Side-by-Side Comparison
      setDuplicateMatchInfo({
        matchedReport: validation.match.report,
        similarityScore: validation.match.similarityScore,
        flagSeverity: validation.match.flagSeverity,
        reason: validation.match.reason,
        currentHash: validation.currentHash,
        currentShortHash: validation.currentShortHash,
      });
      setDuplicateModalOpen(true);
    } else {
      // Clean: Proceed with submission
      executeReportSubmission({
        isDuplicate: false,
        similarityScore: 10.5,
        flagSeverity: 'clean',
        analyzedAt: new Date().toISOString(),
      }, validation.currentHash);
    }
  };

  const executeReportSubmission = (
    aiDuplicateFlag: any,
    imageHash: string
  ) => {
    onSubmitReport({
      staffId: staff?.id || activeStaffId || 'usr-os-default',
      date: new Date().toISOString().slice(0, 10),
      title: reportTitle,
      category: reportCategory,
      startTime: reportStartTime,
      endTime: reportEndTime,
      summary: reportSummary,
      status: reportStatus,
      documentationPhotoUrl: documentationPhoto || '',
      imageHash,
      aiDuplicateFlag,
      locationCoords: reportLocationData || {
        latitude: typeof safeOffice.latitude === 'number' ? safeOffice.latitude : PRIMARY_OFFICES[0].latitude,
        longitude: typeof safeOffice.longitude === 'number' ? safeOffice.longitude : PRIMARY_OFFICES[0].longitude,
        accuracy: 10,
        locationName: safeOffice.name || PRIMARY_OFFICES[0].name,
      },
      supervisorApproval: 'Pending',
    });

    // Reset form
    setReportTitle('');
    setReportSummary('');
    setDocumentationPhoto(null);
    setShowReportForm(false);
    setDuplicateModalOpen(false);
    setDuplicateMatchInfo(null);
  };

  const handleRetakeFromModal = () => {
    setDuplicateModalOpen(false);
    setWatermarkModalOpen(true);
  };

  const handleSubmitWithFlagFromModal = (justificationNote: string) => {
    if (!duplicateMatchInfo) return;

    executeReportSubmission(
      {
        isDuplicate: true,
        similarityScore: duplicateMatchInfo.similarityScore,
        matchedReportId: duplicateMatchInfo.matchedReport.id,
        matchedReportTitle: duplicateMatchInfo.matchedReport.title,
        matchedReportDate: duplicateMatchInfo.matchedReport.date,
        matchedStaffName: staff?.name || 'Staf',
        flagSeverity: duplicateMatchInfo.flagSeverity,
        reason: duplicateMatchInfo.reason,
        justificationNote: justificationNote || 'Justifikasi diserahkan staf untuk peninjauan supervisor.',
        analyzedAt: new Date().toISOString(),
      },
      duplicateMatchInfo.currentHash
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 md:pb-8">
      
      {/* Active Staff Identity Banner */}
      <div className="p-3.5 glass-card border border-white/60 dark:border-white/10 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-md shadow-indigo-500/20 shrink-0"
            style={{ backgroundColor: staff?.avatarColor || '#4f46e5' }}
          >
            {staff?.initials || 'OS'}
          </span>
          <div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
              {staff?.name || 'Staf Alih Daya'}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {staff?.roleTitle || 'Tenaga Outsourcing'} · <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{staff?.nip || '-'}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {staff?.division ? staff.division.split(' ')[0] : 'Umum'}
          </span>
        </div>
      </div>

      {/* Friendly Schedule & Operational Reminder Banner (Sembunyi di Tab Laporan) */}
      {!isLaporanMode && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-900/60 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 dark:text-amber-200 space-y-1 w-full">
            <div className="flex items-center justify-between">
              <span className="font-bold">
                Jadwal Tugas Hari Ini ({isNightShiftWorker ? '🌙 Shift Jaga Malam' : todaySchedule?.dayName || 'Hari Kerja'}):
              </span>
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                Pulang: {todaySchedule?.clockOutStart || (isNightShiftWorker ? '06:00' : '16:30')} WITA
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-300 font-medium">
              {isNightShiftWorker
                ? `Shift Khusus Wakar: Masuk pukul ${todaySchedule.clockInStart} - ${todaySchedule.clockInEnd} WITA (Target 20:00) · Pulang pukul ${todaySchedule.clockOutStart} - ${todaySchedule.clockOutEnd} WITA (Target 06:00 Pagi).`
                : !todaySchedule?.enabled
                ? 'Hari ini dijadwalkan libur / non-operasional resmi dinas.'
                : todaySchedule?.enableBreak
                ? `Masuk: ${todaySchedule.clockInStart} - ${todaySchedule.clockInEnd} WITA · Istirahat: ${todaySchedule.breakStart} - ${todaySchedule.breakEnd} WITA · Pulang: ${todaySchedule.clockOutStart} WITA.`
                : `Hari Jumat: Masuk ${todaySchedule.clockInStart} - ${todaySchedule.clockInEnd} WITA · Pulang pukul ${todaySchedule.clockOutStart} WITA (Langsung pulang tanpa sesi istirahat siang).`}
            </p>
            {!hasClockedIn && (
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold pt-0.5">
                👉 Anda belum Clock In masuk hari ini. Silakan lakukan selfie WebRTC di lokasi penugasan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Profile & Shift Status Header Card (Sembunyi di Tab Laporan) */}
      {!isLaporanMode && (
        <div className="p-5 glass-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-md shadow-indigo-500/20 border border-white/30 shrink-0"
              style={{ backgroundColor: staff?.avatarColor || '#4f46e5' }}
            >
              {staff?.initials || 'OS'}
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {staff?.name || 'Staf Alih Daya'}
              </h1>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {staff?.roleTitle || 'Tenaga Outsourcing'} · <span className="font-mono">{staff?.nip || '-'}</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full glass-pill text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            {staff?.vendorName || 'Mitra Disdik'}
          </span>
        </div>

        {/* Assigned Location Badge or Field Duty Badge */}
        {todayAttendance?.isFieldDuty ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-medium">
            <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Penugasan Lapangan: <strong className="text-amber-950 dark:text-amber-100">{todayAttendance.fieldDutyNotes || 'Dinas Luar Resmi'}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur-md text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-medium">
            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">Lokasi Tugas: <strong className="text-slate-900 dark:text-white">{safeOffice.name || PRIMARY_OFFICES[0].name}</strong></span>
          </div>
        )}

        {/* Sesi Istirahat (Clock Out Istirahat & Clock In Kembali) */}
        {todaySchedule?.enableBreak && hasClockedIn && !hasClockedOut && (
          <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  Sesi Istirahat ({todaySchedule.breakStart} - {todaySchedule.breakEnd} WITA)
                </span>
                <p className="text-[10px] text-slate-500">
                  {hasBrokenOut && !hasBrokenIn
                    ? `Sedang istirahat keluar sejak ${todayAttendance?.breakOutTime} WITA`
                    : hasBrokenIn
                    ? `Istirahat selesai (${todayAttendance?.breakOutTime} - ${todayAttendance?.breakInTime} WITA)`
                    : 'Lakukan clock-out saat keluar istirahat dan clock-in saat kembali'}
                </p>
              </div>
            </div>
            {!hasBrokenOut ? (
              <button
                type="button"
                onClick={() => handleOpenAttendance('break-out')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all shrink-0"
              >
                Clock Out Istirahat
              </button>
            ) : !hasBrokenIn ? (
              <button
                type="button"
                onClick={() => handleOpenAttendance('break-in')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all shrink-0"
              >
                Clock In Istirahat
              </button>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                Sesi Istirahat Tuntas
              </span>
            )}
          </div>
        )}

        {/* Daftar Singkat Kunjungan Tugas Lapangan Hari Ini */}
        {fieldCheckins.filter(fc => fc.staffId === staff?.id && fc.date === (todayAttendance?.date || new Date().toISOString().slice(0, 10))).length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="font-bold flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Riwayat Kunjungan Lapangan Hari Ini ({fieldCheckins.filter(fc => fc.staffId === staff?.id && fc.date === (todayAttendance?.date || new Date().toISOString().slice(0, 10))).length} Titik)
              </span>
              <span className="text-[10px] font-mono">Tersimpan di Server</span>
            </div>
            <div className="space-y-1">
              {fieldCheckins
                .filter(fc => fc.staffId === staff?.id && fc.date === (todayAttendance?.date || new Date().toISOString().slice(0, 10)))
                .map((fc, idx) => (
                  <div key={fc.id} className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 font-mono pl-5">
                    <span>{idx + 1}. {fc.locationCoords.locationName}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{fc.time} WITA</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Menu Utama: 3 Tombol Aksi Presensi (Masuk, Tugas Lapangan Multi-Titik, Pulang) */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Clock In Button */}
          <button
            type="button"
            onClick={() => handleOpenAttendance('clock-in')}
            disabled={hasClockedIn}
            className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              hasClockedIn
                ? 'bg-emerald-100/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-bold backdrop-blur-md'
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white border-indigo-700/50 shadow-lg shadow-indigo-500/25 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              <span className="text-xs font-bold">
                {hasClockedIn ? 'Sudah Clock In' : 'Clock In Masuk'}
              </span>
            </div>
            <span className="text-[11px] font-mono tabular-nums opacity-95 font-semibold">
              {hasClockedIn ? `${todayAttendance?.clockInTime} WITA` : 'Live Selfie + GPS'}
            </span>
          </button>

          {/* 2. Tombol Tugas Lapangan (Multi-Titik, Bisa Berkali-kali) */}
          <button
            type="button"
            onClick={() => handleOpenAttendance('field-checkin')}
            className="p-3.5 rounded-xl border border-amber-600/60 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/25 active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs font-bold">Presensi Lapangan</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums opacity-95 font-semibold">
              {fieldCheckins.filter(fc => fc.staffId === staff?.id && fc.date === (todayAttendance?.date || new Date().toISOString().slice(0, 10))).length > 0
                ? `${fieldCheckins.filter(fc => fc.staffId === staff?.id && fc.date === (todayAttendance?.date || new Date().toISOString().slice(0, 10))).length} Titik Tercatat`
                : 'Multi-Titik (Bebas)'}
            </span>
          </button>

          {/* 3. Clock Out Button */}
          <button
            type="button"
            onClick={() => handleOpenAttendance('clock-out')}
            disabled={!hasClockedIn || hasClockedOut}
            className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              hasClockedOut
                ? 'bg-slate-100 border-slate-300 dark:bg-slate-800/60 dark:border-slate-700 text-slate-800 dark:text-slate-300 font-bold backdrop-blur-md'
                : hasClockedIn
                ? 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 border-slate-700 shadow-md active:scale-[0.98]'
                : 'bg-slate-100/60 dark:bg-slate-800/20 border-slate-200 dark:border-white/5 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold">
                {hasClockedOut ? 'Sudah Clock Out' : `Clock Out (${todaySchedule?.clockOutStart || '16:30'})`}
              </span>
            </div>
            <span className="text-[11px] font-mono tabular-nums opacity-95 font-semibold">
              {hasClockedOut ? `${todayAttendance?.clockOutTime} WITA` : 'Kunci Jam Kerja'}
            </span>
          </button>
        </div>
      </div>
    )}

      {/* Tab Presensi: Durasi Kerja Aktif & Ringkasan Laporan dengan Tombol Navigasi Cepat */}
      {isPresensiMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 glass-card">
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">Durasi Kerja Aktif Hari Ini</div>
            <div className="text-xl font-bold font-mono text-indigo-700 dark:text-cyan-400 mt-1">
              {computeActiveWorkDuration()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {hasClockedIn
                ? hasClockedOut
                  ? 'Jam kerja telah dikunci (Clock Out)'
                  : 'Sedang bertugas aktif di lokasi'
                : 'Belum memulai jam kerja'}
            </div>
          </div>

          <div className="p-4 glass-card flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">Status Pelaporan Kinerja</div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {todayReports.length} <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">/ target 1 selesai</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {todayReports.length === 0
                  ? 'Belum ada laporan aktivitas hari ini'
                  : `${todayReports.filter((r) => r.supervisorApproval === 'Disetujui').length} Disetujui · ${todayReports.filter((r) => r.supervisorApproval === 'Pending').length} Menunggu`}
              </div>
            </div>
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="mt-3 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>{todayReports.length > 0 ? 'Buka Tab Laporan' : 'Tulis Laporan Tugas Baru'}</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Laporan: Header Kinerja Harian & Ringkasan Verifikasi */}
      {isLaporanMode && (
        <div className="p-5 glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-cyan-400 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Pelaporan Kinerja Harian
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Dokumentasi tugas ber-watermark GPS WebRTC & verifikasi integritas AI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReportForm(!showReportForm)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showReportForm ? 'Tutup Formulir' : 'Buat Laporan'}</span>
            </button>
          </div>

          {/* Report Verification Stats Pills */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] text-slate-500 font-medium">Total Dikirim</div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {todayReports.length} <span className="text-[10px] text-slate-400">/ 1</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Disetujui</div>
              <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                {todayReports.filter((r) => r.supervisorApproval === 'Disetujui').length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Menunggu</div>
              <div className="text-base font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                {todayReports.filter((r) => r.supervisorApproval === 'Pending').length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Desktop / Default: Target Counter & Work Hour Stats */}
      {isHybridMode && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 glass-card">
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">Laporan Hari Ini</div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {todayReports.length} <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">/ target 1 selesai</span>
            </div>
          </div>
          <div className="p-4 glass-card">
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">Durasi Kerja Aktif</div>
            <div className="text-xl font-bold font-mono text-indigo-700 dark:text-cyan-400 mt-1">
              {computeActiveWorkDuration()}
            </div>
          </div>
        </div>
      )}

      {/* Daily Work Reports Section (Hanya tampil di Tab Laporan & Desktop Mode) */}
      {!isPresensiMode && (
        <div className="space-y-3">
          {isHybridMode && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Laporan Kinerja Hari Ini</span>
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                  ({todayReports.length})
                </span>
              </h2>

              <button
                type="button"
                onClick={() => setShowReportForm(!showReportForm)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Laporan</span>
              </button>
            </div>
          )}

        {/* Collapsible Structured Form for Submitting Report */}
        {showReportForm && (
          <form
            onSubmit={handleSubmitReportForm}
            className="p-5 glass-card space-y-4 animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Formulir Laporan Kinerja Baru
              </span>
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium cursor-pointer"
              >
                Batal
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Judul Tugas / Pekerjaan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Perbaikan Jaringan LAN Lantai 4"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                    Kategori
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Pemeliharaan">Pemeliharaan</option>
                    <option value="Inspeksi & Monitoring">Inspeksi & Monitoring</option>
                    <option value="Penanganan Insiden">Penanganan Insiden</option>
                    <option value="Pelayanan Pengguna">Pelayanan Pengguna</option>
                    <option value="Laporan Administrasi">Laporan Administrasi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                    Status Pekerjaan
                  </label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="On-Progress">On-Progress</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={reportStartTime}
                    onChange={(e) => setReportStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={reportEndTime}
                    onChange={(e) => setReportEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                  Ringkasan Hasil Kerja
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Uraikan tindakan yang dilakukan, perangkat yang diperbaiki, atau kendala lapangan..."
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Watermark Camera Documentation Trigger */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Dokumentasi Foto Bukti (Kamera Langsung & AI Hash)
                  </span>
                  {documentationPhoto && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Watermark GPS Siap
                    </span>
                  )}
                </div>

                {documentationPhoto ? (
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                      <img src={documentationPhoto} alt="Bukti Foto" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setWatermarkModalOpen(true)}
                        className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-950/80 hover:bg-slate-950 text-white rounded-md text-[10px] font-mono cursor-pointer"
                      >
                        Ambil Ulang Foto
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[11px] text-indigo-950 dark:text-indigo-200">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Validasi AI Perceptual Hash siap dijalankan saat submit.</span>
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                        Anti-Duplikasi Aktif
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWatermarkModalOpen(true)}
                    className="w-full py-3 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-xl text-slate-700 dark:text-slate-200 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Nyalakan Kamera Langsung & Stempel Watermark</span>
                  </button>
                )}

                <p className="text-[10px] text-slate-400">
                  Foto wajib diambil langsung. Sistem AI akan mengekstrak hash sidik jari visual untuk mendeteksi penipuan foto lama atau duplikat.
                </p>
              </div>
            </div>

            {/* AI Scanning Visualizer */}
            {isValidatingAi && (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/70 text-xs text-indigo-950 dark:text-indigo-200 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Sedang Menjalankan Validasi Citra AI (Perceptual Hash)...</span>
                </div>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-mono">
                  {aiValidationStep}
                </p>
                <div className="w-full h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isValidatingAi}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${
                  isValidatingAi
                    ? 'bg-slate-400 text-white cursor-wait'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isValidatingAi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validasi Integritas AI Sedang Berjalan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Laporan (Validasi AI & Kunci Koordinat)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Today's Reports Feed */}
          {todayReports.length === 0 ? (
            isLaporanMode ? (
              <div className="p-8 text-center glass-card space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 mx-auto flex items-center justify-center text-indigo-600 dark:text-cyan-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Belum Ada Laporan Dikirim Hari Ini</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    Silakan ambil foto dokumentasi tugas Anda dengan kamera watermark WebRTC dan lengkapi deskripsi pekerjaan.
                  </p>
                </div>
                {!showReportForm && (
                  <button
                    type="button"
                    onClick={() => setShowReportForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tulis Laporan Kerja Baru</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-8 text-center glass-card text-xs text-slate-600 dark:text-slate-400 font-medium">
                Belum ada laporan kerja yang dikirim hari ini. Tekan tombol "Buat Laporan" di atas untuk menambahkan aktivitas.
              </div>
            )
          ) : (
          <div className="space-y-3">
            {todayReports.map((report) => (
              <div
                key={report.id}
                className="p-4 glass-card space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      {report.category}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {report.title}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      report.supervisorApproval === 'Disetujui'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : report.supervisorApproval === 'Revisi'
                        ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {report.supervisorApproval === 'Disetujui'
                        ? 'Disetujui Atasan'
                        : report.supervisorApproval === 'Revisi'
                        ? 'Perlu Revisi'
                        : 'Menunggu Review'}
                    </span>

                    {/* AI Integrity Pill */}
                    {report.aiDuplicateFlag?.isDuplicate ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 font-bold flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        AI Flag: Duplikat {report.aiDuplicateFlag.similarityScore}%
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-400" />
                        AI: Foto Unik
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                  {report.summary}
                </p>

                {/* Documentation thumbnail */}
                {report.documentationPhotoUrl && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800">
                    <img
                      src={report.documentationPhotoUrl}
                      alt={report.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                  <span className="font-mono tabular-nums font-semibold">
                    {report.startTime} - {report.endTime} WIB
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-300">{report.locationCoords.locationName}</span>
                </div>

                {report.supervisorNotes && (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    <strong className="text-slate-900 dark:text-white">Catatan Atasan:</strong> {report.supervisorNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Modals */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleAttendanceCapture}
        assignedLocation={safeOffice}
        actionType={actionType}
      />

      <WatermarkCameraModal
        isOpen={watermarkModalOpen}
        onClose={() => setWatermarkModalOpen(false)}
        onCaptured={handleWatermarkPhotoCaptured}
        currentStaff={staff}
        taskTitle={reportTitle}
      />

      {/* AI Duplicate Detection Warning Modal */}
      {duplicateMatchInfo && (
        <AiDuplicateValidationModal
          isOpen={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          currentPhotoUrl={documentationPhoto || ''}
          currentHash={duplicateMatchInfo.currentHash}
          currentShortHash={duplicateMatchInfo.currentShortHash}
          matchedReport={duplicateMatchInfo.matchedReport}
          similarityScore={duplicateMatchInfo.similarityScore}
          flagSeverity={duplicateMatchInfo.flagSeverity}
          reason={duplicateMatchInfo.reason}
          onRetakePhoto={handleRetakeFromModal}
          onSubmitWithFlag={handleSubmitWithFlagFromModal}
        />
      )}
    </div>
  );
};
