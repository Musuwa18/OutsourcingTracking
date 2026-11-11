import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MessageSquare,
  FileCheck,
  Calendar,
  Send,
  User,
  Users,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Filter,
  Building2,
  MapPin,
  Activity,
  HeartPulse,
  FileText,
  Paperclip,
  Lock,
  Briefcase,
  RefreshCw,
  Maximize2,
  ShieldCheck,
} from 'lucide-react';
import {
  StaffProfile,
  DailyWorkReport,
  WeeklyEvaluation,
  CompetencyRatings,
  AttendanceRecord,
  AuthUser,
  OvertimeRecord,
  LeaveRequest,
} from '../types';
import { getTodayDateStr } from '../utils/date';
import { StarRating } from '../components/StarRating';
import { GeofenceBreachAlertBanner } from '../components/GeofenceBreachAlertBanner';
import { AttendanceInspectionModal } from '../components/AttendanceInspectionModal';
import { AiDuplicateInspectionDrawer } from '../components/AiDuplicateInspectionDrawer';

import { RadarChart } from '../components/RadarChart';
interface SupervisorEvaluationViewProps {
  currentUser?: AuthUser | null;
  staffList: StaffProfile[];
  dailyReports: DailyWorkReport[];
  weeklyEvaluations: WeeklyEvaluation[];
  attendanceRecords?: AttendanceRecord[];
  onApproveReport: (reportId: string, notes?: string) => void;
  onRequestRevisionReport: (reportId: string, notes: string) => void;
  onSubmitEvaluation: (evalData: Omit<WeeklyEvaluation, 'id' | 'submittedAt'>) => void;
  overtimeRecords?: OvertimeRecord[];
  onApproveOvertime?: (id: string, payload: { approved: boolean; supervisorNotes?: string }) => void;
  leaveRecords?: LeaveRequest[];
  onApproveLeave?: (id: string, payload: { approved: boolean; supervisorNotes?: string; verifiedBy?: string }) => void;
  initialSubTab?: 'eval-form' | 'report-feed' | 'overtime-feed' | 'leave-feed';
}

export const DEFAULT_ONE_STAR_RATINGS: CompetencyRatings = {
  // Pillar A: Kualitas & Produktivitas Kerja
  qualityOfWork: 1,
  quantityOfWork: 1,
  timeManagement: 1,
  // Pillar B: Sikap Kerja & Profesionalisme
  initiative: 1,
  accountability: 1,
  punctuality: 1,
  // Pillar C: Kompetensi Interpersonal
  teamwork: 1,
  communication: 1,
  customerOrientation: 1,
  // Pillar D: Adaptabilitas & Pengembangan Diri
  adaptability: 1,
  problemSolving: 1,
};

export const SupervisorEvaluationView: React.FC<SupervisorEvaluationViewProps> = ({
  currentUser,
  staffList,
  dailyReports,
  weeklyEvaluations,
  attendanceRecords = [],
  onApproveReport,
  onRequestRevisionReport,
  onSubmitEvaluation,
  overtimeRecords = [],
  onApproveOvertime,
  leaveRecords = [],
  onApproveLeave,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'eval-form' | 'report-feed' | 'overtime-feed' | 'leave-feed'>(
    initialSubTab || 'eval-form'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [overtimeNotesInputs, setOvertimeNotesInputs] = useState<Record<string, string>>({});
  const [leaveNotesInputs, setLeaveNotesInputs] = useState<Record<string, string>>({});
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [reportFilterStatus, setReportFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REVISED'>('ALL');
  const [isProcessingReport, setIsProcessingReport] = useState<Record<string, boolean>>({});
  const [inspectingLeaveDoc, setInspectingLeaveDoc] = useState<string | null>(null);
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<LeaveRequest | null>(null);

  // Sinkronisasi data real-time saat status izin diperbarui
  const activeSelectedLeave = useMemo(() => {
    if (!selectedLeaveDetail) return null;
    return (leaveRecords || []).find((l) => l.id === selectedLeaveDetail.id) || selectedLeaveDetail;
  }, [selectedLeaveDetail, leaveRecords]);

  // Inspection modal state for geofence alerts
  const [inspectedRecord, setInspectedRecord] = useState<AttendanceRecord | null>(null);

  // AI Duplicate Inspection Drawer state
  const [duplicateInspectionOpen, setDuplicateInspectionOpen] = useState(false);
  const [inspectingReport, setInspectingReport] = useState<DailyWorkReport | null>(null);
  const [inspectingMatchedReport, setInspectingMatchedReport] = useState<DailyWorkReport | null>(null);

  const handleOpenAiDuplicateDrawer = (rep: DailyWorkReport) => {
    setInspectingReport(rep);
    const matched = dailyReports.find((r) => r.id === rep.aiDuplicateFlag?.matchedReportId) || null;
    setInspectingMatchedReport(matched);
    setDuplicateInspectionOpen(true);
  };

  // Evaluation Form State
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');
  const [selectedWeek, setSelectedWeek] = useState<number>(2);
  const [evaluationDate, setEvaluationDate] = useState(getTodayDateStr());
  const isCoordinator = currentUser?.role === 'coordinator';

  // Searchable Staff Picker State (Scalable for hundreds of staff)
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedStaffDivisionFilter, setSelectedStaffDivisionFilter] = useState('ALL');
  const [selectedStaffVendorFilter, setSelectedStaffVendorFilter] = useState('ALL');
  const staffPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (staffPickerRef.current && !staffPickerRef.current.contains(event.target as Node)) {
        setIsStaffPickerOpen(false);
      }
    };
    if (isStaffPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStaffPickerOpen]);

  const staffDivisions = useMemo(() => {
    return ['ALL', ...Array.from(new Set(staffList.map((s) => s.division).filter(Boolean)))];
  }, [staffList]);

  const staffVendors = useMemo(() => {
    return ['ALL', ...Array.from(new Set(staffList.map((s) => s.vendorName).filter(Boolean)))];
  }, [staffList]);

  const filteredStaffForPicker = useMemo(() => {
    return staffList.filter((st) => {
      const matchDivision =
        selectedStaffDivisionFilter === 'ALL' || st.division === selectedStaffDivisionFilter;
      if (!matchDivision) return false;

      const matchVendor =
        selectedStaffVendorFilter === 'ALL' || st.vendorName === selectedStaffVendorFilter;
      if (!matchVendor) return false;

      if (!staffSearchQuery.trim()) return true;
      const q = staffSearchQuery.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        (st.nip && st.nip.toLowerCase().includes(q)) ||
        (st.division && st.division.toLowerCase().includes(q)) ||
        (st.roleTitle && st.roleTitle.toLowerCase().includes(q)) ||
        (st.vendorName && st.vendorName.toLowerCase().includes(q))
      );
    });
  }, [staffList, selectedStaffDivisionFilter, selectedStaffVendorFilter, staffSearchQuery]);

  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  // Geofence breaches today
  const todayBreaches = attendanceRecords.filter(
    (r) => r.date === evaluationDate && !r.locationCoords.withinRadius && !r.isFieldDuty
  );

  // 4 Pillars & 11 Competencies - Default 1-star (1.00) for objective evaluation
  const [ratings, setRatings] = useState<CompetencyRatings>(DEFAULT_ONE_STAR_RATINGS);

  const [qualitativeNotes, setQualitativeNotes] = useState('');
  const [evalSubmittedSuccess, setEvalSubmittedSuccess] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);
  // Reviewing single daily report notes
  const [reportNoteInputs, setReportNoteInputs] = useState<Record<string, string>>({});


  // Keep selectedStaffId valid when staffList updates
  useEffect(() => {
    if (staffList.length > 0 && !staffList.some((s) => s.id === selectedStaffId)) {
      setSelectedStaffId(staffList[0].id);
    }
  }, [staffList, selectedStaffId]);

  // Synchronize ratings & notes with saved evaluation or reset to 1-star default
  useEffect(() => {
    if (!selectedStaffId) return;
    const existingEval = weeklyEvaluations.find(
      (ev) => ev.staffId === selectedStaffId && ev.weekNumber === selectedWeek
    );
    if (existingEval) {
      setRatings(existingEval.ratings);
      let feedback = existingEval.qualitativeFeedback || '';
      if (!feedback && 'notes' in existingEval) {
        const possibleNotes = existingEval.notes;
        if (typeof possibleNotes === 'string') {
          feedback = possibleNotes;
        }
      }
      setQualitativeNotes(feedback);
    } else {
      setRatings(DEFAULT_ONE_STAR_RATINGS);
      setQualitativeNotes('');
    }
  }, [selectedStaffId, selectedWeek, weeklyEvaluations]);
  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  // Filter daily reports to subordinate staff when logged in as supervisor
  const displayedDailyReports = useMemo(() => {
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'coordinator') {
      return dailyReports.filter((rep) => staffList.some((s) => s.id === rep.staffId));
    }
    return dailyReports;
  }, [dailyReports, staffList, currentUser]);

  const filteredReportFeed = useMemo(() => {
    return displayedDailyReports.filter((r) => {
      if (reportFilterStatus === 'ALL') return true;
      if (reportFilterStatus === 'PENDING') return r.supervisorApproval === 'Pending' || !r.supervisorApproval;
      if (reportFilterStatus === 'APPROVED') return r.supervisorApproval === 'Disetujui';
      if (reportFilterStatus === 'REVISED') return r.supervisorApproval === 'Revisi';
      return true;
    });
  }, [displayedDailyReports, reportFilterStatus]);

  const pendingReportCount = useMemo(
    () => displayedDailyReports.filter((r) => r.supervisorApproval === 'Pending' || !r.supervisorApproval).length,
    [displayedDailyReports]
  );
  const approvedReportCount = useMemo(
    () => displayedDailyReports.filter((r) => r.supervisorApproval === 'Disetujui').length,
    [displayedDailyReports]
  );
  const revisedReportCount = useMemo(
    () => displayedDailyReports.filter((r) => r.supervisorApproval === 'Revisi').length,
    [displayedDailyReports]
  );

  // Calculate live overall weekly score
  const totalPoints =
    ratings.qualityOfWork +
    ratings.quantityOfWork +
    ratings.timeManagement +
    ratings.initiative +
    ratings.accountability +
    ratings.punctuality +
    ratings.teamwork +
    ratings.communication +
    ratings.customerOrientation +
    ratings.adaptability +
    ratings.problemSolving;
  const currentAverage = Number((totalPoints / 11).toFixed(2));
  const p1Score = (ratings.qualityOfWork + ratings.quantityOfWork + ratings.timeManagement) / 3;
  const p2Score = (ratings.initiative + ratings.accountability + ratings.punctuality) / 3;
  const p3Score = (ratings.teamwork + ratings.communication + ratings.customerOrientation) / 3;
  const p4Score = (ratings.adaptability + ratings.problemSolving) / 2;

  const handleRatingChange = (key: keyof CompetencyRatings, val: number) => {
    setRatings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  // Filter overtime requests for supervisor
  const displayedOvertime = useMemo(() => {
    return (overtimeRecords || []).filter((ot) => {
      if (currentUser?.role === 'supervisor' || currentUser?.role === 'coordinator') {
        const isMyStaff = staffList.some((s) => s.id === ot.staffId);
        const isMySpvId = ot.supervisorId === currentUser.id || ot.supervisorId === currentUser.nip;
        return isMyStaff || isMySpvId;
      }
      return true;
    });
  }, [overtimeRecords, staffList, currentUser]);

  const pendingOvertimeCount = displayedOvertime.filter((o) => o.status === 'PENDING').length;

  const handleApproveOvertimeAction = (id: string, approved: boolean) => {
    const notes = overtimeNotesInputs[id] || (approved ? 'Disetujui untuk dilaksanakan di kantor dinas.' : 'Permohonan lembur belum dapat disetujui.');
    if (onApproveOvertime) {
      onApproveOvertime(id, { approved, supervisorNotes: notes });
    }
  };

  // Filter leave requests for supervisor
  const displayedLeaves = useMemo(() => {
    return (leaveRecords || []).filter((l) => {
      if (currentUser?.role === 'supervisor' || currentUser?.role === 'coordinator') {
        const isMyStaff = staffList.some((s) => s.id === l.staffId);
        const isMySpvId = l.supervisorId === currentUser.id || l.supervisorId === currentUser.nip;
        if (!isMyStaff && !isMySpvId) return false;
      }
      if (leaveFilterStatus !== 'ALL' && l.status !== leaveFilterStatus) {
        return false;
      }
      return true;
    });
  }, [leaveRecords, staffList, currentUser, leaveFilterStatus]);

  const pendingLeaveCount = useMemo(() => {
    return (leaveRecords || []).filter((l) => {
      if (currentUser?.role === 'supervisor' || currentUser?.role === 'coordinator') {
        const isMyStaff = staffList.some((s) => s.id === l.staffId);
        const isMySpvId = l.supervisorId === currentUser.id || l.supervisorId === currentUser.nip;
        if (!isMyStaff && !isMySpvId) return false;
      }
      return l.status === 'PENDING';
    }).length;
  }, [leaveRecords, staffList, currentUser]);

  const handleApproveLeaveAction = (id: string, approved: boolean) => {
    const defaultNote = approved
      ? 'Permohonan izin/cuti telah disetujui atasan.'
      : 'Permohonan izin belum dapat disetujui.';
    const notes = leaveNotesInputs[id] || defaultNote;
    if (onApproveLeave) {
      onApproveLeave(id, {
        approved,
        supervisorNotes: notes,
        verifiedBy: currentUser?.name || 'Atasan Penilai',
      });
    }
  };

  if (staffList.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-12 text-center glass-card rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Belum Ada Staf Outsourcing untuk Dievaluasi
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {currentUser?.role === 'coordinator' ? (
              <>Belum ada pegawai alih daya atau peserta magang pada kelompok binaan yang diawasi. Pastikan staf sudah didaftarkan pada kelompok vendor/instansi Anda.</>
            ) : currentUser?.role === 'supervisor' ? (
              <>Belum ada staf yang memilih Anda sebagai atasan penilai. Staf dapat memilih atasan langsung melalui profil mereka atau melalui pemetaan administrator.</>
            ) : (
              <>Silakan daftarkan tenaga alih daya resmi di unit kerja Anda melalui menu <strong>Pusat Pengaturan Sistem</strong> untuk memulai siklus penilaian kinerja mingguan.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || isCoordinator) return;

    onSubmitEvaluation({
      staffId: selectedStaffId,
      supervisorId: currentUser?.id || selectedStaff?.supervisorId || 'sup-disdik',
      supervisorName: currentUser?.name || (currentUser?.role === 'coordinator' ? 'Pengawas Lapangan Mitra' : 'Atasan Langsung Disdik HST'),
      weekNumber: selectedWeek,
      month: '2026-10',
      date: evaluationDate,
      ratings,
      qualitativeFeedback: qualitativeNotes || 'Performa kerja konsisten dan memenuhi standar operasional.',
      overallWeeklyScore: currentAverage,
    });

    setEvalSubmittedSuccess(true);
    setTimeout(() => setEvalSubmittedSuccess(false), 4000);
  };

  const handleApproveWithNote = async (reportId: string) => {
    setIsProcessingReport((prev) => ({ ...prev, [reportId]: true }));
    const note = reportNoteInputs[reportId] || 'Pekerjaan telah diverifikasi dan disetujui sesuai standar.';
    try {
      await onApproveReport(reportId, note);
      setReportNoteInputs((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
    } finally {
      setIsProcessingReport((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const handleRevisionWithNote = async (reportId: string) => {
    setIsProcessingReport((prev) => ({ ...prev, [reportId]: true }));
    const note = reportNoteInputs[reportId] || 'Harap lengkapi dokumentasi foto dan rincian hasil kerja.';
    try {
      await onRequestRevisionReport(reportId, note);
      setReportNoteInputs((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
    } finally {
      setIsProcessingReport((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Evaluasi Kinerja Berkala (Jumat) & Review Laporan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem penilaian 4 pilar (11 kompetensi) dan approval hasil kerja harian staf alih daya
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('eval-form')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
              activeSubTab === 'eval-form'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isCoordinator ? 'Pantau Evaluasi 4 Pilar' : 'Form Evaluasi 4 Pilar'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('report-feed')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
              activeSubTab === 'report-feed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Feed Laporan Kerja</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('overtime-feed')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
              activeSubTab === 'overtime-feed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isCoordinator ? 'Riwayat Lembur (Beban Vendor)' : 'Verifikasi Lembur'}</span>
            {pendingOvertimeCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white">
                {pendingOvertimeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('leave-feed')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
              activeSubTab === 'leave-feed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-teal-500" />
            <span>{isCoordinator ? 'Riwayat Izin & Cuti' : 'Verifikasi Izin & Cuti'}</span>
            {pendingLeaveCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
                {pendingLeaveCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Geofence Breach Alert Banner (Automatic Notification for Supervisor) */}
      <GeofenceBreachAlertBanner
        breachRecords={todayBreaches}
        staffMap={staffMap}
        onInspectRecord={(rec) => setInspectedRecord(rec)}
      />

      {activeSubTab === 'eval-form' ? (
        /* ================= 4-PILLAR WEEKLY EVALUATION FORM ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmitEvaluation} className="space-y-6">
              {/* Banner Lock untuk Pengawas Lapangan */}
              {isCoordinator && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-sm">Mode Pantau Evaluasi KPI 4 Pilar (Read-Only)</div>
                    <p className="leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
                      Pemberian skor nilai 11 kompetensi dan rekomendasi perpanjangan kontrak merupakan kewenangan sah <strong>Pejabat Penilai / Atasan Langsung Disdik HST</strong>. Akun Pengawas Lapangan berstatus pantau untuk melihat capaian skor dan Spider Radar Chart staf binaan.
                    </p>
                  </div>
                </div>
              )}

              {/* Staff & Week Selection */}
              <div className="p-5 glass-card space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Searchable Staff Combobox (Scalable for 100+ Staff) */}
                  <div className="relative" ref={staffPickerRef}>
                    <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                      Pilih Staf Outsourcing ({staffList.length} Staf)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsStaffPickerOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-left transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {selectedStaff ? selectedStaff.name.slice(0, 2).toUpperCase() : '--'}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {selectedStaff?.name || 'Pilih Pegawai...'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {selectedStaff?.nip || '-'} • {selectedStaff?.division || '-'}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isStaffPickerOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Combobox Popover */}
                    {isStaffPickerOpen && (
                      <div className="absolute z-40 left-0 right-0 sm:w-88 mt-1.5 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                        {/* Search Input */}
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cari nama, NIP, divisi..."
                            value={staffSearchQuery}
                            onChange={(e) => setStaffSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          {staffSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setStaffSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Division & Vendor Filters */}
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          <div>
                            <select
                              value={selectedStaffDivisionFilter}
                              onChange={(e) => setSelectedStaffDivisionFilter(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                            >
                              <option value="ALL">Semua Bidang</option>
                              {staffDivisions
                                .filter((d) => d !== 'ALL')
                                .map((div) => (
                                  <option key={div} value={div}>
                                    {div}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <select
                              value={selectedStaffVendorFilter}
                              onChange={(e) => setSelectedStaffVendorFilter(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                            >
                              <option value="ALL">Semua Kelompok</option>
                              {staffVendors
                                .filter((v) => v !== 'ALL')
                                .map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                        {/* Staff Options List */}
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                          {filteredStaffForPicker.length === 0 ? (
                            <p className="text-[11px] text-center text-slate-400 py-3">
                              Tidak ada pegawai ditemukan
                            </p>
                          ) : (
                            filteredStaffForPicker.map((st) => {
                              const isSelected = st.id === selectedStaffId;
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedStaffId(st.id);
                                    setIsStaffPickerOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      {st.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p
                                        className={`text-xs font-semibold truncate ${
                                          isSelected
                                            ? 'text-indigo-700 dark:text-indigo-300'
                                            : 'text-slate-800 dark:text-slate-200'
                                        }`}
                                      >
                                        {st.name}
                                      </p>
                                      <p className="text-[10px] text-slate-500 truncate">
                                        {st.nip} • {st.division}
                                      </p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                      Siklus Penilaian
                    </label>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                    >
                      <option value={1}>Minggu ke-1 (Jumat, 02 Okt 2026)</option>
                      <option value={2}>Minggu ke-2 (Jumat, 09 Okt 2026)</option>
                      <option value={3}>Minggu ke-3 (Jumat, 16 Okt 2026)</option>
                      <option value={4}>Minggu ke-4 (Jumat, 23 Okt 2026)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                      Tanggal Evaluasi
                    </label>
                    <input
                      type="date"
                      value={evaluationDate}
                      onChange={(e) => setEvaluationDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium"
                    />
                  </div>
                </div>

                {selectedStaff && (
                  <div className="pt-3 flex flex-wrap items-center gap-2 text-xs border-t border-slate-100 dark:border-slate-800">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Vendor: <strong className="text-slate-900 dark:text-white font-semibold">{selectedStaff.vendorName}</strong></span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Lokasi Penugasan: <strong className="text-slate-900 dark:text-white font-semibold">{selectedStaff.customLocation?.name || selectedStaff.assignedLocation?.name || 'Kantor Disdik HST'}</strong></span>
                    </span>
                    {selectedStaff.workspaceNote && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-[11px]">
                        {selectedStaff.workspaceNote}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Pillar A: Kualitas & Produktivitas Kerja */}
              <div className="p-5 glass-card space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    A
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pilar 1: Kualitas & Produktivitas Kerja
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Evaluasi mutu teknis, ketepatan volume target kerja, dan efisiensi waktu
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <StarRating
                    label="1. Kualitas Kerja (Quality of Work) - Ketelitian, kerapian, dan kepatuhan SOP"
                    value={ratings.qualityOfWork}
                    onChange={(v) => handleRatingChange('qualityOfWork', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                  <StarRating
                    label="2. Kuantitas Kerja (Quantity of Work) - Volume hasil kerja dan pemenuhan target harian"
                    value={ratings.quantityOfWork}
                    onChange={(v) => handleRatingChange('quantityOfWork', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                  <StarRating
                    label="3. Manajemen Waktu (Time Management) - Ketepatan jadwal pengerjaan dan efisiensi durasi"
                    value={ratings.timeManagement}
                    onChange={(v) => handleRatingChange('timeManagement', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                </div>
              </div>

              {/* Pillar B: Sikap Kerja & Profesionalisme */}
              <div className="p-5 glass-card space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    B
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pilar 2: Sikap Kerja & Profesionalisme
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Evaluasi proaktif, tanggung jawab tugas, kedisiplinan, dan integritas kerja
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <StarRating
                    label="4. Inisiatif (Initiative) - Tanggap melihat kendala tanpa harus selalu diperintah"
                    value={ratings.initiative}
                    onChange={(v) => handleRatingChange('initiative', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                  <StarRating
                    label="5. Tanggung Jawab (Accountability) - Menuntaskan tugas tuntas dan berani bertanggung jawab"
                    value={ratings.accountability}
                    onChange={(v) => handleRatingChange('accountability', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                  <StarRating
                    label="6. Kehadiran & Ketepatan Waktu (Punctuality) - Kedisiplinan jam masuk dan presensi geofence"
                    value={ratings.punctuality}
                    onChange={(v) => handleRatingChange('punctuality', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                </div>
              </div>

              {/* Pillar C: Kompetensi Interpersonal */}
              <div className="p-5 glass-card space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    C
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pilar 3: Kompetensi Interpersonal
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Evaluasi kerja sama lintas tim, komunikasi santun, dan orientasi pelayanan
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <StarRating
                    label="7. Kerja Sama Tim (Teamwork) - Kolaborasi harmonis dan saling mendukung sesama rekan kerja"
                    value={ratings.teamwork}
                    onChange={(v) => handleRatingChange('teamwork', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                  <StarRating
                    label="8. Komunikasi (Communication) - Kejelasan dalam menyampaikan laporan atau kendala teknis"
                    value={ratings.communication}
                    onChange={(v) => handleRatingChange('communication', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                  <StarRating
                    label="9. Pelayanan Pelanggan (Customer Orientation) - Keramahan dan kesigapan melayani staf internal/eksternal"
                    value={ratings.customerOrientation}
                    onChange={(v) => handleRatingChange('customerOrientation', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                </div>
              </div>

              {/* Pillar D: Adaptabilitas & Pemecahan Masalah */}
              <div className="p-5 glass-card space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                    D
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pilar 4: Adaptabilitas & Pemecahan Masalah
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Kelincahan menghadapi perubahan instruksi dan pemecahan kendala lapangan
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <StarRating
                    label="10. Kemampuan Adaptasi (Adaptability) - Fleksibel terhadap rotasi tugas dan perubahan situasi"
                    value={ratings.adaptability}
                    onChange={(v) => handleRatingChange('adaptability', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                  <StarRating
                    label="11. Pemecahan Masalah (Problem Solving) - Menemukan solusi efektif saat menghadapi kendala pekerjaan"
                    value={ratings.problemSolving}
                    onChange={(v) => handleRatingChange('problemSolving', v)}
                    showDescriptor
                    readOnly={isCoordinator}
                  />
                </div>
              </div>

              {/* Qualitative Feedback Box */}
              <div className="p-5 glass-card space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Catatan Masukan Kualitatif & Rekomendasi Atasan
                </label>
                <textarea
                  rows={3}
                  required={!isCoordinator}
                  disabled={isCoordinator}
                  placeholder={
                    isCoordinator
                      ? 'Catatan evaluasi kualitatif resmi dari Pejabat Penilai Disdik HST...'
                      : 'Berikan apresiasi pencapaian dan rekomendasi hal yang perlu ditingkatkan minggu berikutnya...'
                  }
                  value={qualitativeNotes}
                  onChange={(e) => setQualitativeNotes(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    isCoordinator ? 'bg-slate-50 dark:bg-slate-800/60 cursor-not-allowed opacity-90' : ''
                  }`}
                />
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-between gap-4">
                {evalSubmittedSuccess && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Evaluasi mingguan berhasil disimpan dan diagregasi!</span>
                  </span>
                )}
                {isCoordinator ? (
                  <div className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Mode Pantau: Nilai KPI resmi diinput oleh Pejabat Penilai Disdik HST.</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Simpan & Kunci Evaluasi Mingguan</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: Score Summary Card */}
          <div className="space-y-4">
            <div className="p-5 glass-card space-y-5 sticky top-20">
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Ringkasan Skor Mingguan
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold font-mono text-indigo-700 dark:text-cyan-400 tabular-nums">
                    {currentAverage}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ 5.00 Bintang</span>
                </div>
              </div>

              {/* Predicate status */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                currentAverage >= 4.5
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : currentAverage >= 3.5
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                  : currentAverage >= 2.5
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold opacity-75">Predikat Kinerja</div>
                  <div className="font-bold text-xs mt-0.5">
                    {currentAverage >= 4.5
                      ? 'Sangat Baik / Unggul'
                      : currentAverage >= 3.5
                      ? 'Baik / Memenuhi Harapan'
                      : currentAverage >= 2.5
                      ? 'Cukup / Perlu Peningkatan'
                      : 'Kurang / Evaluasi Khusus'}
                  </div>
                </div>
                <span className="text-sm font-extrabold font-mono">
                  {((currentAverage / 5) * 100).toFixed(0)}%
                </span>
              </div>

              {/* Visual Progress Bar per Pilar */}
              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Pencapaian Per Pilar
                </div>

                {/* Pilar 1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">1. Kualitas & Produktivitas</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{p1Score.toFixed(2)}★</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${(p1Score / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pilar 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">2. Sikap & Profesionalisme</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{p2Score.toFixed(2)}★</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${(p2Score / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pilar 3 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">3. Kompetensi Interpersonal</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{p3Score.toFixed(2)}★</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all duration-300"
                      style={{ width: `${(p3Score / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pilar 4 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">4. Adaptabilitas & Solusi</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{p4Score.toFixed(2)}★</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all duration-300"
                      style={{ width: `${(p4Score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Trigger Radar Chart Modal */}
              <button
                type="button"
                onClick={() => setShowRadarModal(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>Lihat Radar Chart 11 Kompetensi</span>
              </button>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3 leading-relaxed font-normal">
                Skor mingguan akan digabungkan secara otomatis dari Minggu 1 s.d. Minggu 4 menjadi Nilai Akhir Bulanan untuk dasar rekomendasi perpanjangan kontrak.
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'report-feed' ? (
        /* ================= SUBORDINATE WORK REPORT FEED ================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Daftar verifikasi laporan pekerjaan harian staf tenaga alih daya dan PPPK Paruh Waktu
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Total: {displayedDailyReports.length} Laporan ({pendingReportCount} Menunggu Verifikasi)
            </span>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setReportFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  reportFilterStatus === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Semua Laporan</span>
                <span className="font-mono text-[10px] opacity-75">({displayedDailyReports.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilterStatus('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  reportFilterStatus === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <span>⏳ Menunggu Review</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${reportFilterStatus === 'PENDING' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300'}`}>
                  {pendingReportCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilterStatus('APPROVED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  reportFilterStatus === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <span>✅ Telah Disetujui</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${reportFilterStatus === 'APPROVED' ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300'}`}>
                  {approvedReportCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilterStatus('REVISED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  reportFilterStatus === 'REVISED'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <span>⚠️ Perlu Revisi</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${reportFilterStatus === 'REVISED' ? 'bg-white/20' : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300'}`}>
                  {revisedReportCount}
                </span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Menampilkan {filteredReportFeed.length} dari {displayedDailyReports.length} laporan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReportFeed.length === 0 ? (
              <div className="col-span-full p-12 text-center glass-card rounded-2xl text-xs text-slate-500">
                Tidak ada laporan dengan status yang dipilih.
              </div>
            ) : (
              filteredReportFeed.map((report) => {
                const staff = staffList.find((s) => s.id === report.staffId);
                const noteText = reportNoteInputs[report.id] || '';
                const isApproved = report.supervisorApproval === 'Disetujui';
                const isRevised = report.supervisorApproval === 'Revisi';
                const isBusy = !!isProcessingReport[report.id];
              return (
                <div
                  key={report.id}
                  className="p-5 glass-card space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                          style={{ backgroundColor: staff?.avatarColor || '#6366f1' }}
                        >
                          {staff?.initials}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {staff?.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {report.date} · {report.startTime}-{report.endTime} WIB
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            report.supervisorApproval === 'Disetujui'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : report.supervisorApproval === 'Revisi'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {report.supervisorApproval}
                        </span>

                        {/* AI Integrity Pill */}
                        {report.aiDuplicateFlag?.isDuplicate ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAiDuplicateDrawer(report)}
                            className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer animate-pulse"
                            title="Klik untuk membuka perbandingan foto AI"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            <span>AI: Duplikat {report.aiDuplicateFlag.similarityScore}%</span>
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>AI: Foto Unik</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Summary */}
                    <div>
                      <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                        {report.category}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {report.title}
                      </h4>
                      <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed font-normal">
                        {report.summary}
                      </p>
                    </div>

                    {/* Photo with Watermark */}
                    {report.documentationPhotoUrl && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-black">
                        <img
                          src={report.documentationPhotoUrl}
                          alt={report.title}
                          className="w-full h-full object-cover"
                        />
                        {report.aiDuplicateFlag?.isDuplicate && (
                          <button
                            type="button"
                            onClick={() => handleOpenAiDuplicateDrawer(report)}
                            className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-rose-950/90 text-white border border-rose-600 text-[10px] font-mono font-bold flex items-center gap-1 hover:bg-rose-900 cursor-pointer"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Bandingkan Foto Asli vs Duplikat ({report.aiDuplicateFlag.similarityScore}%)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Justification Note from Staff if Duplicate */}
                    {report.aiDuplicateFlag?.justificationNote && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 text-[11px] text-amber-950 dark:text-amber-200 space-y-0.5">
                        <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1 text-[10px]">
                          <Sparkles className="w-3 h-3" /> Justifikasi Duplikasi Staf:
                        </div>
                        <p className="italic text-slate-800 dark:text-slate-200 font-medium">
                          "{report.aiDuplicateFlag.justificationNote}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Supervisor Action Bar */}
                  {isApproved ? (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="text-xs text-emerald-900 dark:text-emerald-200 min-w-0">
                            <span className="font-bold">Laporan Telah Disetujui</span>
                            {report.supervisorNotes && (
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 italic truncate mt-0.5">
                                "{report.supervisorNotes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRevisionWithNote(report.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          title="Batalkan persetujuan dan minta staf melakukan revisi"
                        >
                          Ubah ke Revisi
                        </button>
                      </div>
                    </div>
                  ) : isRevised ? (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <div className="text-xs text-rose-900 dark:text-rose-200 min-w-0">
                            <span className="font-bold">Menunggu Revisi Staf</span>
                            {report.supervisorNotes && (
                              <p className="text-[11px] text-rose-700 dark:text-rose-300 italic truncate mt-0.5">
                                Catatan: "{report.supervisorNotes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApproveWithNote(report.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1 shadow-xs"
                          title="Setujui laporan ini sekarang"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          <span>Setujui</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <input
                        type="text"
                        placeholder="Tulis catatan masukan / instruksi perbaikan..."
                        value={noteText}
                        onChange={(e) =>
                          setReportNoteInputs((prev) => ({ ...prev, [report.id]: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRevisionWithNote(report.id)}
                          className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer font-medium disabled:opacity-50"
                        >
                          Minta Revisi
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApproveWithNote(report.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-semibold disabled:opacity-50 shadow-xs"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isBusy ? 'Menyimpan...' : 'Setujui Laporan'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
              })
            )}
          </div>
        </div>
      ) : activeSubTab === 'overtime-feed' ? (
        /* ================= OVERTIME REQUESTS VERIFICATION FEED ================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Daftar permohonan dan realisasi tugas lembur staf alih daya di kantor dinas
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Total: {displayedOvertime.length} Tiket ({pendingOvertimeCount} Menunggu Persetujuan)
            </span>
          </div>

          {/* Informational Banner for Coordinator */}
          {isCoordinator && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Briefcase className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950 dark:text-amber-100 mb-0.5">
                  Pemantauan Riwayat Lembur Tenaga Alih Daya (Kompensasi Dibayarkan Vendor)
                </strong>
                <span>
                  Kompensasi lembur dibayarkan langsung oleh pihak vendor mitra. Panel ini menyajikan rincian tanggal, jam pelaksanaan, durasi riil, bukti foto kerja, dan persetujuan resmi Atasan Langsung Disdik HST sebagai dasar rekapitulasi pembayaran lembur staf binaan Anda.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedOvertime.length === 0 ? (
              <div className="col-span-full p-12 text-center glass-card rounded-2xl text-xs text-slate-500 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300">Belum Ada Permohonan Lembur</p>
                <p className="text-[11px] text-slate-400">Permohonan lembur dari staf binaan Anda akan muncul di panel ini untuk disetujui.</p>
              </div>
            ) : (
              displayedOvertime.map((ot) => {
                const staff = staffList.find((s) => s.id === ot.staffId);
                const isPending = ot.status === 'PENDING';
                const isApproved = ot.status === 'APPROVED';
                const isInProgress = ot.status === 'IN_PROGRESS';
                const isCompleted = ot.status === 'COMPLETED';
                const noteInput = overtimeNotesInputs[ot.id] || '';

                return (
                  <div
                    key={ot.id}
                    className="p-5 glass-card space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                            style={{ backgroundColor: staff?.avatarColor || '#6366f1' }}
                          >
                            {staff?.initials || ot.staffName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {ot.staffName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {ot.date} · Rencana Mulai: {ot.startTimePlan || '17:00'} WITA (Est: {ot.estimatedHours} Jam)
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ${
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
                            ? 'Menunggu ACC'
                            : isApproved
                            ? 'Disetujui'
                            : isInProgress
                            ? 'Lembur Aktif'
                            : isCompleted
                            ? 'Selesai & Sah'
                            : 'Ditolak'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="space-y-1.5 text-xs">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Tugas yang Diajukan:</span>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {ot.reason}
                        </p>
                      </div>

                      {/* Completed Details */}
                      {isCompleted && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-200">
                            <span className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Realisasi Jam:</span>
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
                              <span className="text-[10px] text-slate-500 block mb-1">Bukti Foto Dokumentasi Watermark:</span>
                              <img
                                src={ot.clockOutSelfieUrl}
                                alt="Bukti Lembur"
                                className="w-28 h-20 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Supervisor Notes display */}
                      {ot.supervisorNotes && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <strong>Catatan Anda:</strong> {ot.supervisorNotes}
                        </div>
                      )}
                    </div>

                    {/* Action Bar for Pending Overtime */}
                    {isPending && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                        {isCoordinator ? (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span>Menunggu persetujuan instruksi lembur dari Pejabat Penilai Disdik HST</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">MENUNGGU ACC DINAS</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Catatan arahan / instruksi lembur..."
                              value={noteInput}
                              onChange={(e) =>
                                setOvertimeNotesInputs((prev) => ({ ...prev, [ot.id]: e.target.value }))
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                 onClick={() => handleApproveOvertimeAction(ot.id, false)}
                                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer font-medium"
                              >
                                Tolak Lembur
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveOvertimeAction(ot.id, true)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Setujui Lembur (ACC)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : activeSubTab === 'leave-feed' ? (
        /* ================= LEAVE REQUESTS VERIFICATION FEED ================= */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Verifikasi Permohonan Izin & Cuti Staf Binaan
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Persetujuan izin sakit (SKD) dan cuti otomatis mengunci status presensi harian agar staf tidak terkena Alpha
              </p>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
              {([
                { id: 'ALL', label: 'Semua' },
                { id: 'PENDING', label: `Menunggu (${pendingLeaveCount})` },
                { id: 'APPROVED', label: 'Disetujui' },
                { id: 'REJECTED', label: 'Ditolak' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLeaveFilterStatus(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    leaveFilterStatus === f.id
                      ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Daftar Tiket Izin */}
          <div className="space-y-3">
            {displayedLeaves.length === 0 ? (
              <div className="p-10 text-center glass-card rounded-2xl space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Tidak Ada Permohonan Izin / Cuti
                </p>
                <p className="text-[11px] text-slate-400">
                  Seluruh pengajuan izin sakit dan cuti tahunan staf telah diproses.
                </p>
              </div>
            ) : (
              displayedLeaves.map((l) => {
                const isPending = l.status === 'PENDING';
                const isApproved = l.status === 'APPROVED';
                const isRejected = l.status === 'REJECTED';

                const leaveTypeLabel: Record<string, string> = {
                  TUGAS_LUAR: 'Tugas Luar / Perjalanan Dinas',
                  DINAS_LUAR: 'Tugas Luar / Perjalanan Dinas',
                  SAKIT: 'Izin Sakit',
                  CUTI_TAHUNAN: 'Cuti Tahunan',
                  CUTI_ALASAN_PENTING: 'Cuti Alasan Penting',
                  CUTI_BERSALIN: 'Cuti Bersalin',
                  IZIN_KEPERLUAN: 'Izin Keperluan Mendesak',
                };

                const leaveTypeColor: Record<string, string> = {
                  TUGAS_LUAR: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
                  DINAS_LUAR: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
                  SAKIT: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
                  CUTI_TAHUNAN: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-900',
                  CUTI_ALASAN_PENTING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900',
                  CUTI_BERSALIN: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900',
                  IZIN_KEPERLUAN: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900',
                };

                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLeaveDetail(l)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3.5 shadow-xs hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                          {l.staffName?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            {l.staffName}
                          </span>
                          <span className="text-slate-400 ml-1.5 font-mono text-[11px]">
                            ({l.staffNip || 'NIP -'} · {l.divisionName || l.divisionId})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${leaveTypeColor[l.leaveType] || 'bg-slate-100'}`}>
                          {leaveTypeLabel[l.leaveType] || l.leaveType}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                          {l.startDate} {l.startDate !== l.endDate ? `s/d ${l.endDate}` : ''}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                          {l.totalDays} Hari Kerja
                        </span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-0.5 group-hover:underline ml-1">
                          <span>Detail</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Alasan / Uraian Permohonan:</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {l.reason}
                      </p>
                    </div>

                    {/* Lampiran Dokumen / Surat Dokter */}
                    {Boolean(l.attachmentUrl) && (
                      <div className="p-3 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="font-semibold text-teal-950 dark:text-teal-200 text-[11px]">
                            {l.leaveType === 'TUGAS_LUAR' || l.leaveType === 'DINAS_LUAR'
                              ? 'Surat Tugas / SPPD Resmi Kedinasan'
                              : 'Surat Keterangan Dokter (SKD) / Berkas Bukti Resmi'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingLeaveDoc(l.attachmentUrl || null);
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Berkas</span>
                        </button>
                      </div>
                    )}

                    {/* Aksi Persetujuan Atasan */}
                    {isPending ? (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                        {isCoordinator ? (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span>Menunggu keputusan persetujuan dari Pejabat Penilai Disdik HST</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">MENUNGGU ACC DINAS</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Catatan / arahan atasan langsung (opsional)..."
                              value={leaveNotesInputs[l.id] || ''}
                              onChange={(e) =>
                                setLeaveNotesInputs((prev) => ({ ...prev, [l.id]: e.target.value }))
                              }
                              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveLeaveAction(l.id, false);
                                }}
                                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer font-medium"
                              >
                                Tolak Permohonan
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveLeaveAction(l.id, true);
                                }}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-semibold shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Setujui (Auto-Sinkron Presensi)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Disetujui · Presensi Diperbarui</span>
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Ditolak Atasan</span>
                            </span>
                          ) : null}
                          {l.supervisorNotes && (
                            <span className="text-[11px] text-slate-500 italic">
                              "{l.supervisorNotes}"
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Diverifikasi oleh: <strong>{l.verifiedBy || l.supervisorName || 'Atasan'}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {/* Geofence Breach Inspection Modal */}
      <AttendanceInspectionModal
        isOpen={!!inspectedRecord}
        onClose={() => setInspectedRecord(null)}
        record={inspectedRecord}
        staff={inspectedRecord ? staffMap.get(inspectedRecord.staffId) || null : null}
      />

      {/* AI Duplicate Inspection Drawer */}
      <AiDuplicateInspectionDrawer
        isOpen={duplicateInspectionOpen}
        onClose={() => {
          setDuplicateInspectionOpen(false);
          setInspectingReport(null);
          setInspectingMatchedReport(null);
        }}
        report={inspectingReport}
        matchedReport={inspectingMatchedReport}
        staff={inspectingReport ? staffMap.get(inspectingReport.staffId) : undefined}
        onRequestRevision={onRequestRevisionReport}
      />
      {/* Interactive Radar Chart Modal */}
      {showRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Radar 11 Kompetensi Staf
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedStaff?.name} · Minggu ke-{selectedWeek} ({currentAverage}★)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRadarModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center py-2 overflow-hidden">
              <RadarChart ratings={ratings} size={320} showLabels={true} />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRadarModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Informasi Permohonan Izin / Cuti */}
      {Boolean(activeSelectedLeave) && (
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedLeaveDetail(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Detail Permohonan Izin & Cuti
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-semibold">
                      #{activeSelectedLeave!.id.slice(0, 8)}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Diajukan pada {activeSelectedLeave!.createdAt || 'Tanggal tidak tercatat'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeaveDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Profil Pemohon */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                    {activeSelectedLeave!.staffName?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeSelectedLeave!.staffName}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono mt-0.5">
                      NIP: {activeSelectedLeave!.staffNip || '-'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{activeSelectedLeave!.divisionName || activeSelectedLeave!.divisionId || 'Dinas Pendidikan'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Atasan Penilai</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {activeSelectedLeave!.supervisorName || 'Pengawas Bidang'}
                  </span>
                </div>
              </div>

              {/* Rincian Permohonan (Grid 3 Kolom) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Jenis Dispensasi</span>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                    {activeSelectedLeave!.leaveType === 'SAKIT'
                      ? 'Izin Sakit (SKD)'
                      : activeSelectedLeave!.leaveType === 'TUGAS_LUAR' || activeSelectedLeave!.leaveType === 'DINAS_LUAR'
                      ? 'Tugas Luar / SPPD'
                      : activeSelectedLeave!.leaveType === 'CUTI_TAHUNAN'
                      ? 'Cuti Tahunan'
                      : activeSelectedLeave!.leaveType === 'CUTI_ALASAN_PENTING'
                      ? 'Cuti Alasan Penting'
                      : activeSelectedLeave!.leaveType === 'CUTI_BERSALIN'
                      ? 'Cuti Bersalin'
                      : activeSelectedLeave!.leaveType === 'IZIN_KEPERLUAN'
                      ? 'Izin Keperluan Mendesak'
                      : activeSelectedLeave!.leaveType}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Rentang Tanggal</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{activeSelectedLeave!.startDate}</span>
                    {activeSelectedLeave!.startDate !== activeSelectedLeave!.endDate && (
                      <>
                        <span className="text-slate-400 font-normal">s/d</span>
                        <span>{activeSelectedLeave!.endDate}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Durasi Izin</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{activeSelectedLeave!.totalDays} Hari Kerja</span>
                  </span>
                </div>
              </div>

              {/* Uraian / Alasan Permohonan */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Alasan & Uraian Keperluan Lengkap:
                </span>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {activeSelectedLeave!.reason || 'Tidak ada uraian alasan yang dilampirkan.'}
                </div>
              </div>

              {/* Berkas Bukti / Surat Dokter Preview */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Berkas / Dokumen Lampiran Resmi:
                </span>
                {activeSelectedLeave!.attachmentUrl ? (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-teal-900 dark:text-teal-200">
                          {activeSelectedLeave!.attachmentUrl.startsWith('data:application/pdf')
                            ? 'Dokumen Surat Keterangan / SPPD (Format PDF)'
                            : 'Foto Surat Keterangan Dokter (SKD) / Bukti Fisik'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectingLeaveDoc(activeSelectedLeave!.attachmentUrl || null)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-teal-200 dark:border-teal-800"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Perbesar Layar Penuh</span>
                      </button>
                    </div>

                    {/* Quick Preview Area */}
                    <div
                      className="max-h-56 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
                      onClick={() => setInspectingLeaveDoc(activeSelectedLeave!.attachmentUrl || null)}
                    >
                      {activeSelectedLeave!.attachmentUrl.startsWith('data:application/pdf') ? (
                        <div className="py-8 flex flex-col items-center gap-2 text-slate-500">
                          <FileText className="w-10 h-10 text-teal-600" />
                          <span className="text-xs font-semibold">Klik untuk membaca dokumen PDF secara lengkap</span>
                        </div>
                      ) : (
                        <img
                          src={activeSelectedLeave!.attachmentUrl}
                          alt="Lampiran Berkas"
                          className="max-h-56 w-auto object-contain hover:scale-105 transition-transform duration-200"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400">
                    Tidak ada dokumen fisik atau surat dokter yang dilampirkan pada permohonan ini.
                  </div>
                )}
              </div>

              {/* Status & Catatan Verifikasi */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Status Verifikasi</span>
                  <div>
                    {activeSelectedLeave!.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Disetujui · Presensi Diperbarui</span>
                      </span>
                    ) : activeSelectedLeave!.status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Ditolak Atasan Langsung</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu Persetujuan Atasan</span>
                      </span>
                    )}
                  </div>
                </div>

                {activeSelectedLeave!.supervisorNotes && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Catatan Verifikator:</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium italic">
                      "{activeSelectedLeave!.supervisorNotes}"
                    </p>
                  </div>
                )}

                {activeSelectedLeave!.verifiedBy && (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Diverifikasi oleh: <strong>{activeSelectedLeave!.verifiedBy}</strong></span>
                    {activeSelectedLeave!.approvedAt && (
                      <span>Waktu ACC: <strong>{activeSelectedLeave!.approvedAt}</strong></span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Form if PENDING */}
              {activeSelectedLeave!.status === 'PENDING' && (
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h5 className="font-bold text-xs text-amber-950 dark:text-amber-200">
                      Tindakan Penilaian Atasan Langsung
                    </h5>
                  </div>
                  {isCoordinator ? (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 border border-amber-200/80">
                      Akun Koordinator hanya memiliki hak pantau. Persetujuan izin/cuti resmi diputuskan oleh Pejabat Penilai Disdik HST.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                          Catatan Arahan / Pertimbangan Atasan:
                        </label>
                        <input
                          type="text"
                          placeholder="Tuliskan catatan disposisi atau arahan (opsional)..."
                          value={leaveNotesInputs[activeSelectedLeave!.id] || ''}
                          onChange={(e) =>
                            setLeaveNotesInputs((prev) => ({
                              ...prev,
                              [activeSelectedLeave!.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleApproveLeaveAction(activeSelectedLeave!.id, false);
                            setSelectedLeaveDetail(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
                        >
                          Tolak Permohonan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleApproveLeaveAction(activeSelectedLeave!.id, true);
                            setSelectedLeaveDetail(null);
                          }}
                          className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Setujui Permohonan (ACC)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeaveDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Berkas / Surat Dokter (Supervisor View) */}
      {Boolean(inspectingLeaveDoc) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Verifikasi Surat Keterangan Dokter (SKD) / Bukti Resmi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLeaveDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/10 dark:bg-black/40">
              {inspectingLeaveDoc?.startsWith('data:application/pdf') ? (
                <iframe
                  src={inspectingLeaveDoc}
                  title="Dokumen PDF"
                  className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <img
                  src={inspectingLeaveDoc || ''}
                  alt="Surat Dokter / Bukti"
                  className="max-h-[75vh] w-auto object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
