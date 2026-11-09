import React, { useState, useEffect } from 'react';
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
  Moon,
  X,
  HeartPulse,
  FileText,
  Paperclip,
  UploadCloud,
  CheckCircle,
  CalendarRange,
  ExternalLink,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { StaffProfile, AttendanceRecord, DailyWorkReport, AttendanceGlobalSettings, DEFAULT_ATTENDANCE_SETTINGS, DayWorkSchedule, FieldCheckinRecord, OvertimeRecord, LeaveRequest, LeaveQuota, LeaveType } from '../types';
import { PRIMARY_OFFICES } from '../utils/geo';
import { getDayOfWeekKey, getTodayDateStr, getCurrentWitaTimeStr } from '../utils/date';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { WatermarkCameraModal } from '../components/WatermarkCameraModal';
import { AiDuplicateValidationModal } from '../components/AiDuplicateValidationModal';
import { validateReportPhotoAgainstHistory, computeImagePerceptualHash } from '../utils/imageHash';
import { IndonesianDatePicker } from '../components/IndonesianDatePicker';
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
  overtimeRecords?: OvertimeRecord[];
  onSubmitOvertimeRequest?: (data: {
    staffId: string;
    staffName?: string;
    staffNip?: string;
    divisionId?: string;
    divisionName?: string;
    supervisorId?: string;
    supervisorName?: string;
    date: string;
    startTimePlan?: string;
    estimatedHours: number;
    reason: string;
  }) => Promise<void> | void;
  onStartOvertime?: (id: string, payload: {
    clockInTime: string;
    selfieUrl: string;
    coords?: Partial<OvertimeRecord['clockInCoords']>;
  }) => Promise<void> | void;
  onFinishOvertime?: (id: string, payload: {
    clockOutTime: string;
    selfieUrl: string;
    coords?: Partial<OvertimeRecord['clockOutCoords']>;
    workSummary: string;
    durationMinutes: number;
  }) => Promise<void> | void;
  leaveRecords?: LeaveRequest[];
  leaveQuota?: LeaveQuota | null;
  onSubmitLeaveRequest?: (data: {
    staffId: string;
    staffName?: string;
    staffNip?: string;
    divisionId?: string;
    divisionName?: string;
    supervisorId?: string;
    supervisorName?: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    attachmentUrl?: string;
  }) => Promise<void> | void;
  onOpenTimesheet?: () => void;
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
  overtimeRecords = [],
  onSubmitOvertimeRequest,
  onStartOvertime,
  onFinishOvertime,
  leaveRecords = [],
  leaveQuota = null,
  onSubmitLeaveRequest,
  onOpenTimesheet,
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
  const [reportStartTime, setReportStartTime] = useState(isNightShiftWorker ? '20:00' : '09:00');
  const [reportEndTime, setReportEndTime] = useState(isNightShiftWorker ? '06:00' : '12:00');

  useEffect(() => {
    if (isNightShiftWorker) {
      setReportStartTime('20:00');
      setReportEndTime('06:00');
    } else {
      setReportStartTime('09:00');
      setReportEndTime('12:00');
    }
  }, [isNightShiftWorker, staff?.id]);
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

  const breakOutValue = todayAttendance?.breakOutTime || todayAttendance?.break_out_time;
  const breakInValue = todayAttendance?.breakInTime || todayAttendance?.break_in_time;
  const hasClockedIn = !!todayAttendance && todayAttendance.status !== 'Izin';
  const hasBrokenOut = !!breakOutValue && breakOutValue !== '-';
  const hasBrokenIn = !!breakInValue && breakInValue !== '-';
  const hasClockedOut = !!todayAttendance?.clockOutTime && todayAttendance.clockOutTime !== '-';
  const isOvernightShift = Boolean(
    todayAttendance &&
    todayAttendance.clockInTime &&
    todayAttendance.clockInTime >= '18:00' &&
    todayAttendance.date !== getTodayDateStr()
  );
  // Overtime Engine State
  const [overtimeModalOpen, setOvertimeModalOpen] = useState(false);
  const [overtimeDate, setOvertimeDate] = useState(getTodayDateStr());
  const [overtimeStartTime, setOvertimeStartTime] = useState('17:00');
  const [overtimeEstimatedHours, setOvertimeEstimatedHours] = useState<number>(2);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [isSubmittingOvertime, setIsSubmittingOvertime] = useState(false);

  // Overtime Camera & Finish Modals
  const [overtimeCameraOpen, setOvertimeCameraOpen] = useState(false);
  const [activeOvertimeAction, setActiveOvertimeAction] = useState<{
    id: string;
    type: 'start' | 'finish';
  } | null>(null);

  const [overtimeFinishModalOpen, setOvertimeFinishModalOpen] = useState(false);
  const [overtimeWorkSummary, setOvertimeWorkSummary] = useState('');
  const [overtimeFinishSelfie, setOvertimeFinishSelfie] = useState('');
  const [overtimeFinishCoords, setOvertimeFinishCoords] = useState<unknown>(null);
  const [overtimeCalculatedMins, setOvertimeCalculatedMins] = useState(60);

  const myOvertimeRecords = (overtimeRecords || []).filter((o) => o.staffId === staff.id);

  // Sub-menu Switcher for Tab Laporan: 'harian' | 'lembur' | 'izin'
  const [laporanSubTab, setLaporanSubTab] = useState<'harian' | 'lembur' | 'izin'>('harian');

  // Leave Engine State (Smart Leave Pro)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveCameraOpen, setLeaveCameraOpen] = useState(false);
  const [leavePreviewDoc, setLeavePreviewDoc] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>('SAKIT');
  const [leaveStartDate, setLeaveStartDate] = useState(getTodayDateStr());
  const [leaveEndDate, setLeaveEndDate] = useState(getTodayDateStr());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachmentUrl, setLeaveAttachmentUrl] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const myLeaveRecords = (leaveRecords || []).filter((l) => l.staffId === staff.id);
  const activeAnnualRemaining = leaveQuota?.annualRemaining ?? 12;

  const calculateLeaveWorkDays = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 1;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  };

  const calculatedLeaveDays = calculateLeaveWorkDays(leaveStartDate, leaveEndDate);

  const handleLeaveFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas melebihi 5MB. Silakan pilih berkas yang lebih kecil.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLeaveAttachmentUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      alert('Harap isi alasan permohonan izin/cuti.');
      return;
    }
    if (leaveType === 'SAKIT' && !leaveAttachmentUrl) {
      const proceed = window.confirm('Anda belum melampirkan Surat Keterangan Dokter (SKD). Pengajuan izin sakit tanpa SKD dapat memicu konfirmasi lanjutan dari atasan. Tetap kirim pengajuan?');
      if (!proceed) return;
    }
    if (leaveType === 'CUTI_TAHUNAN' && calculatedLeaveDays > activeAnnualRemaining) {
      alert(`Permohonan cuti (${calculatedLeaveDays} hari kerja) melebihi sisa kuota cuti tahunan Anda (${activeAnnualRemaining} hari).`);
      return;
    }

    setIsSubmittingLeave(true);
    try {
      if (onSubmitLeaveRequest) {
        await onSubmitLeaveRequest({
          staffId: staff.id,
          staffName: staff.name,
          staffNip: staff.nip,
          divisionId: staff.division,
          divisionName: staff.division,
          supervisorId: staff.supervisorId || 'usr-spv-renlap',
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          totalDays: calculatedLeaveDays,
          reason: leaveReason.trim(),
          attachmentUrl: leaveAttachmentUrl || undefined,
        });
      }
      setLeaveModalOpen(false);
      setLeaveReason('');
      setLeaveAttachmentUrl('');
    } catch (err) {
      console.error('Submit leave error:', err);
    } finally {
       setIsSubmittingLeave(false);
     }
   };

  const handleCreateOvertimeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overtimeReason.trim()) return;
    setIsSubmittingOvertime(true);
    try {
      if (onSubmitOvertimeRequest) {
        await onSubmitOvertimeRequest({
          staffId: staff.id,
          staffName: staff.name,
          staffNip: staff.nip,
          divisionId: staff.division,
          divisionName: staff.division,
          supervisorId: staff.supervisorId || 'usr-spv-renlap',
          date: overtimeDate,
          startTimePlan: overtimeStartTime,
          estimatedHours: overtimeEstimatedHours,
          reason: overtimeReason.trim(),
        });
      }
      setOvertimeModalOpen(false);
      setOvertimeReason('');
    } catch (err) {
      console.error('Submit overtime error:', err);
    } finally {
      setIsSubmittingOvertime(false);
    }
  };

  const handleOpenOvertimeCamera = (type: 'start' | 'finish', otId: string) => {
    setActiveOvertimeAction({ id: otId, type });
    setOvertimeCameraOpen(true);
  };

  const handleOvertimeCapture = async (selfieBase64: string, locationData: unknown) => {
    if (!activeOvertimeAction) return;
    const loc = locationData as { withinRadius?: boolean; distanceMeters?: number } | null;

    if (activeOvertimeAction.type === 'start') {
      if (loc && loc.withinRadius === false) {
        alert(`Presensi Mulai Lembur Ditolak: Lembur wajib dilaksanakan di dalam area kantor dinas (Radius Aman). Lokasi GPS Anda terdeteksi berjarak ${loc.distanceMeters || 0} meter dari kantor.`);
        return;
      }
      if (onStartOvertime) {
        await onStartOvertime(activeOvertimeAction.id, {
          clockInTime: getCurrentWitaTimeStr(),
          selfieUrl: selfieBase64,
          coords: locationData as Partial<OvertimeRecord['clockInCoords']>,
        });
      }
      setOvertimeCameraOpen(false);
      setActiveOvertimeAction(null);
    } else if (activeOvertimeAction.type === 'finish') {
      const ot = (overtimeRecords || []).find((o) => o.id === activeOvertimeAction.id);
      let diffMins = 60;
      if (ot?.clockInTime) {
        const [inH, inM] = ot.clockInTime.replace(/\./g, ':').split(':').map(Number);
        const now = new Date();
        const nowStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now).replace(/\./g, ':');
        const [nowH, nowM] = nowStr.split(':').map(Number);
        diffMins = (nowH * 60 + nowM) - (inH * 60 + inM);
        if (diffMins < 0) diffMins += 24 * 60;
      }
      if (diffMins < 60) {
        alert(`Peringatan Aturan Kedinasan: Durasi lembur Anda baru berjalan ${diffMins} menit. Sesuai aturan keuangan, batas durasi lembur minimal yang sah adalah 60 menit (1 Jam). Harap tuntaskan pekerjaan Anda.`);
        return;
      }
      setOvertimeFinishSelfie(selfieBase64);
      setOvertimeFinishCoords(locationData);
      setOvertimeCalculatedMins(Math.max(60, diffMins));
      setOvertimeCameraOpen(false);
      setOvertimeFinishModalOpen(true);
    }
  };

  const handleConfirmFinishOvertime = async () => {
    if (!activeOvertimeAction) return;
    if (!overtimeWorkSummary.trim()) {
      alert('Harap isi ringkasan hasil pekerjaan yang telah diselesaikan selama lembur.');
      return;
    }
    if (onFinishOvertime) {
      await onFinishOvertime(activeOvertimeAction.id, {
        clockOutTime: getCurrentWitaTimeStr(),
        selfieUrl: overtimeFinishSelfie,
        coords: overtimeFinishCoords as Partial<OvertimeRecord['clockOutCoords']>,
        workSummary: overtimeWorkSummary.trim(),
        durationMinutes: overtimeCalculatedMins,
      });
    }
    setOvertimeFinishModalOpen(false);
    setActiveOvertimeAction(null);
    setOvertimeWorkSummary('');
  };

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

    const effectiveBreakOut = todayAttendance.breakOutTime || todayAttendance.break_out_time;
    const effectiveBreakIn = todayAttendance.breakInTime || todayAttendance.break_in_time;
    if (effectiveBreakOut && effectiveBreakIn) {
      const [bOutH, bOutM] = effectiveBreakOut.replace(/\./g, ':').split(':').map(Number);
      const [bInH, bInM] = effectiveBreakIn.replace(/\./g, ':').split(':').map(Number);
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
    setReportStartTime(isNightShiftWorker ? '20:00' : '09:00');
    setReportEndTime(isNightShiftWorker ? '06:00' : '12:00');
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

        {/* Overnight Shift Active Banner */}
        {isOvernightShift && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/50 text-xs text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/80 font-medium shadow-xs">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 leading-snug">
              <span className="font-bold text-slate-900 dark:text-white">Shift Jaga Malam (Lintas Hari) Aktif</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Clock In tercatat sejak kemarin pukul <strong className="text-indigo-600 dark:text-cyan-400">{todayAttendance?.clockInTime} WITA</strong> ({todayAttendance?.date}). Silakan tekan tombol <strong>Clock Out</strong> di bawah untuk menyelesaikan piket malam.
              </p>
            </div>
          </div>
        )}

        {/* Sesi Istirahat (Clock Out Istirahat & Clock In Kembali) */}
        {hasClockedIn && (attendanceSettings?.breakSettings?.enabled !== false) && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                  <span>Sesi Istirahat Kerja</span>
                  <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    ({todaySchedule?.enableBreak ? `${todaySchedule.breakStart} - 15:00 WITA (Fleksibel)` : '11:30 - 15:00 WITA (Fleksibel)'})
                  </span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {hasBrokenOut && !hasBrokenIn
                    ? `Sedang istirahat keluar sejak ${breakOutValue} WITA`
                    : hasBrokenIn
                    ? `Istirahat selesai (${breakOutValue} - ${breakInValue} WITA)`
                    : hasClockedOut
                    ? 'Jam kerja telah dikunci (Clock Out).'
                    : 'Klik "Clock Out Istirahat" saat keluar & "Clock In Istirahat" saat kembali (Toleransi Fleksibel s.d. 15:00 WITA).'}
                </p>
              </div>
            </div>
            {hasClockedOut ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shrink-0 whitespace-nowrap">
                {hasBrokenIn ? 'Sesi Istirahat Tuntas' : 'Sesi Selesai (Clock Out)'}
              </span>
            ) : !hasBrokenOut ? (
              <button
                type="button"
                onClick={() => handleOpenAttendance('break-out')}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all shrink-0 active:scale-95 whitespace-nowrap"
              >
                Clock Out Istirahat
              </button>
            ) : !hasBrokenIn ? (
              <button
                type="button"
                onClick={() => handleOpenAttendance('break-in')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all shrink-0 active:scale-95 whitespace-nowrap"
              >
                Clock In Istirahat
              </button>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                Istirahat Selesai ({breakOutValue} - {breakInValue} WITA)
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
                {hasClockedIn
                  ? isOvernightShift
                    ? 'Piket Malam Aktif'
                    : 'Sudah Clock In'
                  : 'Clock In Masuk'}
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
                {hasClockedOut
                  ? 'Sudah Clock Out'
                  : isOvernightShift
                  ? 'Clock Out (Selesai Jaga Malam)'
                  : `Clock Out (${todaySchedule?.clockOutStart || '16:30'})`}
              </span>
            </div>
            <span className="text-[11px] font-mono tabular-nums opacity-95 font-semibold">
              {hasClockedOut ? `${todayAttendance?.clockOutTime} WITA` : 'Kunci Jam Kerja'}
            </span>
          </button>
        </div>

        {/* Quick Action: Permohonan Izin / Sakit / Cuti */}
        <div className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-teal-500/10 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-xs">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block leading-tight">
                  Berhalangan Hadir Hari Ini?
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ajukan izin sakit (SKD) atau cuti tahunan resmi (Sisa: <strong className="text-teal-600 dark:text-teal-400 font-mono">{activeAnnualRemaining} Hari</strong>)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLeaveStartDate(getTodayDateStr());
                setLeaveEndDate(getTodayDateStr());
                setLeaveReason('');
                setLeaveAttachmentUrl('');
                setLeaveModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajukan Izin / Cuti</span>
            </button>
          </div>
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

      {/* Tab Laporan: Sub-Menu Switcher & Content */}
      {isLaporanMode && (
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <button
            type="button"
            onClick={() => setLaporanSubTab('harian')}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 text-center ${
              laporanSubTab === 'harian'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Laporan Harian</span>
          </button>

          <button
            type="button"
            onClick={() => setLaporanSubTab('lembur')}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 text-center ${
              laporanSubTab === 'lembur'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-cyan-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Tugas Lembur</span>
            {myOvertimeRecords.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-mono">
                {myOvertimeRecords.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLaporanSubTab('izin')}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 text-center ${
              laporanSubTab === 'izin'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate">Izin & Cuti</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-mono font-bold">
              {activeAnnualRemaining}h
            </span>
          </button>
        </div>
      )}

      {isLaporanMode && laporanSubTab === 'harian' && (
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

          {onOpenTimesheet && (
            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                Lembar Presensi & Timesheet Bulanan
              </span>
              <button
                type="button"
                onClick={onOpenTimesheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-cyan-400 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                title="Buka Lembar Presensi & Timesheet Harian F4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Pratinjau Timesheet (F4)</span>
              </button>
            </div>
          )}
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
      {(!isPresensiMode && (isHybridMode || laporanSubTab === 'harian')) && (
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

        {/* ============================================================== */}
        {/* TUGAS LEMBUR KEDINASAN (OVERTIME ENGINE PRO)                   */}
        {/* ============================================================== */}
        {(!isPresensiMode && (isHybridMode || laporanSubTab === 'lembur')) && (
          <div className="p-5 glass-card space-y-4 border border-indigo-200/60 dark:border-indigo-900/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                  <span>Tugas Lembur Kedinasan (Overtime)</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {myOvertimeRecords.length} Tiket
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lembur resmi kantor di luar jam kerja / hari libur dengan verifikasi geofence & approval atasan
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOvertimeModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajukan Izin Lembur</span>
            </button>
          </div>

          {/* Daftar Tiket Lembur Staf */}
          {myOvertimeRecords.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Belum Ada Pengajuan Tugas Lembur
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                Jika ada pekerjaan mendesak yang harus diselesaikan di kantor di luar jam kerja resmi, klik tombol <strong>"Ajukan Izin Lembur"</strong> di atas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOvertimeRecords.map((ot) => {
                const isPending = ot.status === 'PENDING';
                const isApproved = ot.status === 'APPROVED';
                const isInProgress = ot.status === 'IN_PROGRESS';
                const isCompleted = ot.status === 'COMPLETED';

                return (
                  <div
                    key={ot.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Lembur Tanggal: {ot.date}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2 font-mono">
                          (Rencana Mulai: {ot.startTimePlan || '17:00'} WITA · Est: {ot.estimatedHours} Jam)
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full self-start sm:self-auto font-mono ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : isApproved
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : isInProgress
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {isPending
                          ? '⏳ Menunggu ACC Atasan'
                          : isApproved
                          ? '✅ Disetujui (Siap Mulai)'
                          : isInProgress
                          ? '⚡ Lembur Berjalan'
                          : isCompleted
                          ? '🏆 Selesai & Terkunci'
                          : '❌ Ditolak'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Uraian Tugas Lembur:</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {ot.reason}
                      </p>
                    </div>

                    {/* Catatan Atasan jika ada */}
                    {ot.supervisorNotes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                        <strong className="text-slate-900 dark:text-white">Catatan Atasan ({ot.supervisorName}):</strong> {ot.supervisorNotes}
                      </div>
                    )}

                    {/* Informasi Jam Realisasi & Hasil Lembur jika Selesai */}
                    {isCompleted && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-200">
                          <span className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Realisasi Lembur Sah:</span>
                            <span className="font-mono text-indigo-700 dark:text-cyan-400">
                              {ot.clockInTime} - {ot.clockOutTime} WITA
                            </span>
                          </span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100">
                            {Math.floor(ot.actualDurationMinutes / 60)}j {ot.actualDurationMinutes % 60}m
                          </span>
                        </div>

                        {ot.workSummary && (
                          <div className="pt-1 text-[11px] text-slate-700 dark:text-slate-300 border-t border-emerald-200/60 dark:border-emerald-900/40">
                            <strong>Output Kerja:</strong> {ot.workSummary}
                          </div>
                        )}

                        {ot.clockOutSelfieUrl && (
                          <div className="pt-1">
                            <span className="text-[10px] text-slate-500 block mb-1">Bukti Foto Dokumentasi:</span>
                            <img
                              src={ot.clockOutSelfieUrl}
                              alt="Bukti Lembur"
                              className="w-28 h-20 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tombol Aksi Sesuai Tahapan */}
                    {isApproved && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenOvertimeCamera('start', ot.id)}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Mulai Lembur (Presensi GPS Kantor)</span>
                        </button>
                      </div>
                    )}

                    {isInProgress && (
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 text-xs">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                          </span>
                          <span>Mulai sejak: <strong>{ot.clockInTime} WITA</strong> (Geofence Kantor Aman)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenOvertimeCamera('finish', ot.id)}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Selesaikan Lembur (Upload Bukti)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PUSAT PERIZINAN & HAK CUTI STAF (SMART LEAVE PRO)              */}
        {/* ============================================================== */}
        {(!isPresensiMode && (isHybridMode || laporanSubTab === 'izin')) && (
          <div className="p-5 glass-card space-y-4 border border-teal-200/60 dark:border-teal-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-xs">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                  <span>Pusat Perizinan & Hak Cuti Staf</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300">
                    {myLeaveRecords.length} Permohonan
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Izin sakit (SKD dokter), cuti tahunan, dan izin dinas resmi dengan sinkronisasi presensi otomatis
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setLeaveStartDate(getTodayDateStr());
                setLeaveEndDate(getTodayDateStr());
                setLeaveReason('');
                setLeaveAttachmentUrl('');
                setLeaveModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajukan Izin / Cuti</span>
            </button>
          </div>

          {/* Kuota Meter Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-800/40 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Sisa Cuti Tahunan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                  {activeAnnualRemaining}
                </span>
                <span className="text-[10px] text-slate-400">/ 12 Hari</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Cuti Terpakai</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {leaveQuota?.annualUsed ?? 0}
                </span>
                <span className="text-[10px] text-slate-400">Hari</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Izin Sakit (SKD)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {leaveQuota?.sickUsed ?? 0}
                </span>
                <span className="text-[10px] text-slate-400">Hari</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Izin Penting/Lain</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {leaveQuota?.specialUsed ?? 0}
                </span>
                <span className="text-[10px] text-slate-400">Hari</span>
              </div>
            </div>
          </div>

          {/* Daftar Tiket Izin / Cuti */}
          {myLeaveRecords.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarRange className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Belum Ada Pengajuan Izin / Cuti
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                Jika Anda berhalangan hadir karena sakit atau perlu mengajukan cuti tahunan, klik tombol <strong>"Ajukan Izin / Cuti"</strong> di atas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myLeaveRecords.map((l) => {
                const isPending = l.status === 'PENDING';
                const isApproved = l.status === 'APPROVED';
                const isRejected = l.status === 'REJECTED';

                const leaveTypeLabel: Record<string, string> = {
                  SAKIT: 'Izin Sakit',
                  CUTI_TAHUNAN: 'Cuti Tahunan',
                  CUTI_ALASAN_PENTING: 'Cuti Alasan Penting',
                  CUTI_BERSALIN: 'Cuti Bersalin / Melahirkan',
                  IZIN_KEPERLUAN: 'Izin Keperluan Mendesak',
                };

                const leaveTypeColor: Record<string, string> = {
                  SAKIT: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
                  CUTI_TAHUNAN: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-900',
                  CUTI_ALASAN_PENTING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900',
                  CUTI_BERSALIN: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900',
                  IZIN_KEPERLUAN: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900',
                };

                return (
                  <div
                    key={l.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${leaveTypeColor[l.leaveType] || 'bg-slate-100 text-slate-700'}`}>
                          {leaveTypeLabel[l.leaveType] || l.leaveType}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {l.startDate} {l.startDate !== l.endDate ? `s/d ${l.endDate}` : ''}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          ({l.totalDays} Hari Kerja)
                        </span>
                      </div>

                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Menunggu Persetujuan Atasan</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3" />
                            <span>Disetujui · Presensi Terisi Otomatis</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <AlertCircle className="w-3 h-3" />
                            <span>Permohonan Ditolak</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Alasan / Uraian Permohonan:</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {l.reason}
                      </p>
                    </div>

                    {Boolean(l.attachmentUrl) && (
                      <div className="pt-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Paperclip className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span className="text-[11px] font-medium">Lampiran Dokumen / Surat Dokter</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLeavePreviewDoc(l.attachmentUrl || null)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Lihat Berkas</span>
                        </button>
                      </div>
                    )}

                    {Boolean(l.supervisorNotes) && (
                      <div className="text-xs p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 leading-relaxed">
                        <span className="font-bold">Arahan Atasan ({l.verifiedBy || l.supervisorName || 'Supervisor'}):</span> {l.supervisorNotes}
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* Modal 1: Formulir Pengajuan Izin Lembur */}
      {overtimeModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[78vh] sm:max-h-[88vh] flex flex-col mb-16 sm:mb-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Formulir Pengajuan Izin Lembur
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOvertimeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="overtime-request-form" onSubmit={handleCreateOvertimeRequest} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                <span className="font-bold block">Ketentuan Lembur Kedinasan Disdik HST:</span>
                <p>1. Lembur wajib dilaksanakan di <strong>dalam kantor dinas</strong> (geofence radius terverifikasi).</p>
                <p>2. Durasi lembur sah minimal <strong>60 menit (1 Jam)</strong>.</p>
                <p>3. Wajib disetujui atasan langsung ({staff?.supervisorId ? 'Kasubag / Kasi' : 'Atasan'}) sebelum presensi mulai lembur dapat dibuka.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Pelaksanaan Lembur
                </label>
                <IndonesianDatePicker
                  required
                  value={overtimeDate}
                  onChange={(val) => setOvertimeDate(val)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  accentColor="indigo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai Rencana
                  </label>
                  <input
                    type="time"
                    required
                    value={overtimeStartTime}
                    onChange={(e) => setOvertimeStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimasi Durasi (Jam)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    step={0.5}
                    required
                    value={overtimeEstimatedHours}
                    onChange={(e) => setOvertimeEstimatedHours(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Uraian Pekerjaan / Alasan Lembur Mendalam
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan secara spesifik berkas atau tugas kedinasan yang mendesak untuk diselesaikan..."
                  value={overtimeReason}
                  onChange={(e) => setOvertimeReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed placeholder:text-slate-400"
                />
              </div>

            </form>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOvertimeModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="overtime-request-form"
                disabled={isSubmittingOvertime}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingOvertime ? 'Mengirim...' : 'Kirim Pengajuan Izin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Formulir Selesai Lembur & Ringkasan Output */}
      {overtimeFinishModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[78vh] sm:max-h-[88vh] flex flex-col mb-16 sm:mb-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Selesaikan Tugas Lembur
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOvertimeFinishModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium block">Total Durasi Lembur Riil:</span>
                  <span className="text-base font-extrabold font-mono text-emerald-900 dark:text-emerald-100">
                    {Math.floor(overtimeCalculatedMins / 60)} Jam {overtimeCalculatedMins % 60} Menit
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-bold">
                  Sah ({overtimeCalculatedMins} Mins)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ringkasan Hasil Output Lembur
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Sebutkan hasil tugas yang diselesaikan (contoh: 25 berkas SPJ selesai diarsip, verifikasi data aset rampung)..."
                  value={overtimeWorkSummary}
                  onChange={(e) => setOvertimeWorkSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed placeholder:text-slate-400"
                />
              </div>

              {Boolean(overtimeFinishSelfie) && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Foto Bukti Dokumentasi di Kantor:
                  </span>
                  <img
                    src={overtimeFinishSelfie}
                    alt="Bukti Lembur"
                    className="w-full aspect-video object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOvertimeFinishModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmFinishOvertime}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Kunci & Selesaikan Lembur</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Kamera Presensi Mulai / Selesai Lembur */}
      {overtimeCameraOpen && (
        <CameraCaptureModal
          isOpen={overtimeCameraOpen}
          onClose={() => setOvertimeCameraOpen(false)}
          onCapture={handleOvertimeCapture}
          assignedLocation={safeOffice}
          actionType={activeOvertimeAction?.type === 'start' ? 'overtime-start' : 'overtime-finish'}
        />
      )}

      {/* Modal 4: Formulir Pengajuan Izin & Cuti Terpadu */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[78vh] sm:max-h-[88vh] flex flex-col mb-16 sm:mb-0">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Formulir Permohonan Izin & Cuti
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sisa Cuti Tahunan: <strong className="text-teal-600 dark:text-teal-400 font-mono">{activeAnnualRemaining} Hari</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="leave-request-form" onSubmit={handleCreateLeaveRequest} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Pilihan Jenis Izin */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Jenis Izin / Cuti:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'SAKIT', label: 'Izin Sakit', desc: 'Disertai Surat Keterangan Dokter (SKD)' },
                    { id: 'CUTI_TAHUNAN', label: 'Cuti Tahunan', desc: `Mengurangi kuota tahunan (Sisa: ${activeAnnualRemaining} hr)` },
                    { id: 'CUTI_ALASAN_PENTING', label: 'Cuti Alasan Penting', desc: 'Keluarga sakit/duka/pernikahan/darurat' },
                    { id: 'CUTI_BERSALIN', label: 'Cuti Bersalin', desc: 'Melahirkan / Istri Melahirkan' },
                    { id: 'IZIN_KEPERLUAN', label: 'Izin Keperluan Mendesak', desc: 'Urusan pribadi mendesak' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLeaveType(t.id as LeaveType)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        leaveType === t.id
                          ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 text-teal-950 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{t.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rentang Tanggal */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Tanggal Mulai:
                  </label>
                  <IndonesianDatePicker
                    required
                    value={leaveStartDate}
                    onChange={(val) => {
                      setLeaveStartDate(val);
                      if (val > leaveEndDate) {
                        setLeaveEndDate(val);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    accentColor="teal"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Tanggal Selesai:
                  </label>
                  <IndonesianDatePicker
                    required
                    min={leaveStartDate}
                    value={leaveEndDate}
                    onChange={(val) => setLeaveEndDate(val)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    accentColor="teal"
                    align="right"
                  />
                </div>
                <div className="col-span-2 pt-1 flex items-center justify-between text-[11px] border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Estimasi Durasi Sah (Senin–Sabtu):</span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                    {calculatedLeaveDays} Hari Kerja
                  </span>
                </div>
              </div>

              {/* Alasan Permohonan */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alasan / Keterangan Permohonan:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan kondisi sakit (gejala/diagnosa faskes), keperluan cuti dinas, atau kepentingan darurat keluarga..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed placeholder:text-slate-400"
                />
              </div>

              {/* Hybrid Lampiran: Kamera WebRTC ATAU Upload Berkas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Lampiran Surat Dokter (SKD) / Bukti:
                  </label>
                  {leaveType === 'SAKIT' && (
                    <span className="text-[10px] text-rose-500 font-semibold">*Disarankan untuk izin sakit</span>
                  )}
                </div>

                {leaveAttachmentUrl ? (
                  <div className="relative p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-teal-300 dark:border-teal-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      {leaveAttachmentUrl.startsWith('data:image') || leaveAttachmentUrl.startsWith('/uploads/') ? (
                        <img
                          src={leaveAttachmentUrl}
                          alt="Lampiran"
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block truncate">
                          Dokumen Telah Terlampir
                        </span>
                        <span className="text-[10px] text-slate-400">Siap dikirim ke atasan penilai</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeaveAttachmentUrl('')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 rounded-lg border border-rose-200 dark:border-rose-900 cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Opsi 1: Kamera WebRTC */}
                    <button
                      type="button"
                      onClick={() => setLeaveCameraOpen(true)}
                      className="p-3 rounded-xl border border-dashed border-teal-300 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <span className="font-bold text-[11px]">Foto Fisik Surat</span>
                      <span className="text-[9px] text-slate-400">Kamera WebRTC Live</span>
                    </button>

                    {/* Opsi 2: Upload File / PDF */}
                    <label className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                      <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-[11px]">Unggah Berkas</span>
                      <span className="text-[9px] text-slate-400">Foto / PDF maks 5MB</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleLeaveFileUpload}
                      />
                    </label>
                  </div>
                )}
              </div>

            </form>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/95 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="leave-request-form"
                disabled={isSubmittingLeave}
                className="px-5 py-2 text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingLeave ? 'Mengirim...' : 'Kirim Permohonan Izin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Preview Dokumen / Surat Izin */}
      {Boolean(leavePreviewDoc) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Pratinjau Dokumen / Bukti Surat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLeavePreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/10 dark:bg-black/40">
              {leavePreviewDoc?.startsWith('data:application/pdf') ? (
                <iframe
                  src={leavePreviewDoc}
                  title="Dokumen PDF"
                  className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <img
                  src={leavePreviewDoc || ''}
                  alt="Pratinjau Berkas"
                  className="max-h-[70vh] w-auto object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Kamera Watermark Foto Surat Izin */}
      <WatermarkCameraModal
        isOpen={leaveCameraOpen}
        onClose={() => setLeaveCameraOpen(false)}
        onCaptured={(photoUrl) => {
          setLeaveAttachmentUrl(photoUrl);
          setLeaveCameraOpen(false);
        }}
        currentStaff={staff}
        taskTitle="Lampiran Surat Dokter / Bukti Izin"
      />
    </div>
  );
};
