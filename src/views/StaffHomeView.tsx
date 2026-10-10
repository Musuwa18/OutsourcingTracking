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
} from 'lucide-react';
import { StaffProfile, AttendanceRecord, DailyWorkReport } from '../types';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { WatermarkCameraModal } from '../components/WatermarkCameraModal';
import { AiDuplicateValidationModal } from '../components/AiDuplicateValidationModal';
import { validateReportPhotoAgainstHistory, computeImagePerceptualHash } from '../utils/imageHash';
import { createWorkPhotoThumbnail } from '../data/mockData';

interface StaffHomeViewProps {
  staff: StaffProfile;
  todayAttendance: AttendanceRecord | undefined;
  todayReports: DailyWorkReport[];
  allReports?: DailyWorkReport[];
  staffList?: StaffProfile[];
  activeStaffId?: string;
  onSwitchStaff?: (staffId: string) => void;
  onClockIn: (selfieBase64: string, locationData: any) => void;
  onClockOut: (selfieBase64: string, locationData: any) => void;
  onSubmitReport: (newReport: Omit<DailyWorkReport, 'id' | 'createdAt'>) => void;
}

export const StaffHomeView: React.FC<StaffHomeViewProps> = ({
  staff,
  todayAttendance,
  todayReports,
  allReports = [],
  staffList = [],
  activeStaffId,
  onSwitchStaff,
  onClockIn,
  onClockOut,
  onSubmitReport,
}) => {
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'clock-in' | 'clock-out'>('clock-in');

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
  const [reportLocationData, setReportLocationData] = useState<any>(null);

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
  const hasClockedOut = !!todayAttendance?.clockOutTime && todayAttendance.clockOutTime !== '-';

  const handleOpenAttendance = (type: 'clock-in' | 'clock-out') => {
    setActionType(type);
    setCameraModalOpen(true);
  };

  const handleAttendanceCapture = (selfieBase64: string, locationData: any) => {
    if (actionType === 'clock-in') {
      onClockIn(selfieBase64, locationData);
    } else {
      onClockOut(selfieBase64, locationData);
    }
  };

  const handleWatermarkPhotoCaptured = (photoUrl: string, locData: any) => {
    setDocumentationPhoto(photoUrl);
    setReportLocationData(locData);
  };

  // Helper to load sample test photo for quick demonstration
  const handleLoadSimulatedPhoto = (type: 'unique' | 'duplicate') => {
    if (type === 'duplicate') {
      // Load identical photo from rep-107 (Finance Onboarding PC)
      const samplePrev = createWorkPhotoThumbnail('Deploy 4 Unit PC Onboarding', 'Pelayanan Pengguna');
      setDocumentationPhoto(samplePrev);
      setReportTitle('Pemeriksaan Lanjutan Kabel Port LAN Unit Finance');
      setReportSummary('Pengecekan port switch dan penataan kabel workstation finance.');
    } else {
      // Fresh new unique task photo
      const sampleNew = createWorkPhotoThumbnail('Pembersihan Filter Udara Ruang Server Baru', 'Pemeliharaan');
      setDocumentationPhoto(sampleNew);
      setReportTitle('Pembersihan Filter Chiller & Sirkulasi Udara Lt 8');
      setReportSummary('Membersihkan filter debu AHU dan cek temperatur ruangan stabil 19°C.');
    }
    setReportLocationData({
      latitude: staff.assignedLocation.latitude,
      longitude: staff.assignedLocation.longitude,
      accuracy: 10,
      locationName: staff.assignedLocation.name,
    });
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
      staffId: staff.id,
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
        latitude: staff.assignedLocation.latitude,
        longitude: staff.assignedLocation.longitude,
        accuracy: 10,
        locationName: staff.assignedLocation.name,
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
        matchedStaffName: staff.name,
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
            style={{ backgroundColor: staff.avatarColor }}
          >
            {staff.initials}
          </span>
          <div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
              {staff.name}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {staff.roleTitle} · <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{staff.nip}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {staff.division.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Friendly Reminder Banner before 17:00 */}
      {(!hasClockedIn || todayReports.length === 0) && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 dark:text-amber-200 space-y-0.5">
            <span className="font-bold">Pengingat Operasional Hari Ini:</span>
            <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-300 font-medium">
              {!hasClockedIn
                ? 'Anda belum melakukan Clock In masuk. Harap lakukan presensi selfie WebRTC di lokasi tugas.'
                : 'Harap selesaikan dan kirim minimal 1 Laporan Kinerja Harian sebelum pukul 17:00 WIB.'}
            </p>
          </div>
        </div>
      )}

      {/* Profile & Shift Status Header Card */}
      <div className="p-5 glass-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-md shadow-indigo-500/20 border border-white/30 shrink-0"
              style={{ backgroundColor: staff.avatarColor }}
            >
              {staff.initials}
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {staff.name}
              </h1>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {staff.roleTitle} · <span className="font-mono">{staff.nip}</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full glass-pill text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            {staff.vendorName}
          </span>
        </div>

        {/* Assigned Location Badge */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur-md text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-medium">
          <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">Lokasi Tugas: <strong className="text-slate-900 dark:text-white">{staff.assignedLocation.name}</strong></span>
        </div>

        {/* Floating Action Card for Smart Attendance */}
        <div className="pt-2 grid grid-cols-2 gap-3">
          {/* Clock In Button */}
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
              {hasClockedIn ? `${todayAttendance?.clockInTime} WIB` : 'Live Selfie + GPS'}
            </span>
          </button>

          {/* Clock Out Button */}
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
                {hasClockedOut ? 'Sudah Clock Out' : 'Clock Out Pulang'}
              </span>
            </div>
            <span className="text-[11px] font-mono tabular-nums opacity-95 font-semibold">
              {hasClockedOut ? `${todayAttendance?.clockOutTime} WIB` : 'Kunci Jam Kerja'}
            </span>
          </button>
        </div>
      </div>

      {/* Target Counter & Work Hour Stats */}
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
            {hasClockedIn ? '7j 35m' : 'Belum Dimulai'}
          </div>
        </div>
      </div>

      {/* Daily Work Reports Section */}
      <div className="space-y-3">
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

                {/* Quick Simulation Options for Testing the AI Hash Detection */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Uji Coba Cepat AI (Demo Simulasi):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSimulatedPhoto('unique')}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-700 text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Uji Foto Baru (Unik)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSimulatedPhoto('duplicate')}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-700 text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span>Uji Foto Duplikat (96%)</span>
                    </button>
                  </div>
                </div>

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
          <div className="p-8 text-center glass-card text-xs text-slate-600 dark:text-slate-400 font-medium">
            Belum ada laporan kerja yang dikirim hari ini. Tekan tombol "Buat Laporan" di atas untuk menambahkan aktivitas.
          </div>
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

      {/* Modals */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleAttendanceCapture}
        assignedLocation={staff.assignedLocation}
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
