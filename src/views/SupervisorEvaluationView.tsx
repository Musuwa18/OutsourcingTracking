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
  Check,
  X,
  Filter,
  Building2,
  MapPin,
  Activity,
} from 'lucide-react';
import {
  StaffProfile,
  DailyWorkReport,
  WeeklyEvaluation,
  CompetencyRatings,
  AttendanceRecord,
  AuthUser,
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
}

export const SupervisorEvaluationView: React.FC<SupervisorEvaluationViewProps> = ({
  currentUser,
  staffList,
  dailyReports,
  weeklyEvaluations,
  attendanceRecords = [],
  onApproveReport,
  onRequestRevisionReport,
  onSubmitEvaluation,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'eval-form' | 'report-feed'>('eval-form');

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

  // Searchable Staff Picker State (Scalable for hundreds of staff)
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [selectedStaffDivisionFilter, setSelectedStaffDivisionFilter] = useState('ALL');
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

  const filteredStaffForPicker = useMemo(() => {
    return staffList.filter((st) => {
      const matchDivision =
        selectedStaffDivisionFilter === 'ALL' || st.division === selectedStaffDivisionFilter;
      if (!matchDivision) return false;
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
  }, [staffList, selectedStaffDivisionFilter, staffSearchQuery]);

  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  // Geofence breaches today
  const todayBreaches = attendanceRecords.filter(
    (r) => r.date === evaluationDate && !r.locationCoords.withinRadius && !r.isFieldDuty
  );

  // 4 Pillars & 11 Competencies
  const [ratings, setRatings] = useState<CompetencyRatings>({
    // Pillar A
    qualityOfWork: 5,
    quantityOfWork: 4,
    timeManagement: 5,
    // Pillar B
    initiative: 4,
    accountability: 5,
    punctuality: 5,
    // Pillar C
    teamwork: 5,
    communication: 4,
    customerOrientation: 5,
    // Pillar D
    adaptability: 4,
    problemSolving: 5,
  });

  const [qualitativeNotes, setQualitativeNotes] = useState('');
  const [evalSubmittedSuccess, setEvalSubmittedSuccess] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);
  // Reviewing single daily report notes
  const [reportNoteInputs, setReportNoteInputs] = useState<Record<string, string>>({});

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

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
            Silakan daftarkan tenaga alih daya resmi di unit kerja Anda melalui menu <strong>Pusat Pengaturan Sistem</strong> untuk memulai siklus penilaian kinerja mingguan.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    onSubmitEvaluation({
      staffId: selectedStaffId,
      supervisorId: currentUser?.id || selectedStaff?.supervisorId || 'sup-disdik',
      supervisorName: currentUser?.name || 'Atasan Langsung Disdik HST',
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

  const handleApproveWithNote = (reportId: string) => {
    const note = reportNoteInputs[reportId] || 'Pekerjaan telah diverifikasi dan disetujui sesuai standar.';
    onApproveReport(reportId, note);
  };

  const handleRevisionWithNote = (reportId: string) => {
    const note = reportNoteInputs[reportId] || 'Harap lengkapi dokumentasi foto dan rincian hasil kerja.';
    onRequestRevisionReport(reportId, note);
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
            Form Evaluasi 4 Pilar
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

                        {/* Division Filter */}
                        {staffDivisions.length > 2 && (
                          <div className="mb-2">
                            <select
                              value={selectedStaffDivisionFilter}
                              onChange={(e) => setSelectedStaffDivisionFilter(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                            >
                              <option value="ALL">Semua Bidang ({staffList.length})</option>
                              {staffDivisions
                                .filter((d) => d !== 'ALL')
                                .map((div) => (
                                  <option key={div} value={div}>
                                    {div}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

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
                  />
                  <StarRating
                    label="2. Kuantitas Kerja (Quantity of Work) - Volume hasil kerja dan pemenuhan target harian"
                    value={ratings.quantityOfWork}
                    onChange={(v) => handleRatingChange('quantityOfWork', v)}
                    showDescriptor
                  />
                  <StarRating
                    label="3. Manajemen Waktu (Time Management) - Ketepatan jadwal pengerjaan dan efisiensi durasi"
                    value={ratings.timeManagement}
                    onChange={(v) => handleRatingChange('timeManagement', v)}
                    showDescriptor
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
                  />
                  <StarRating
                    label="5. Tanggung Jawab (Accountability) - Menuntaskan tugas tuntas dan berani bertanggung jawab"
                    value={ratings.accountability}
                    onChange={(v) => handleRatingChange('accountability', v)}
                    showDescriptor
                  />
                  <StarRating
                    label="6. Kehadiran & Ketepatan Waktu (Punctuality) - Kedisiplinan jam masuk dan presensi geofence"
                    value={ratings.punctuality}
                    onChange={(v) => handleRatingChange('punctuality', v)}
                    showDescriptor
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
                  />
                  <StarRating
                    label="8. Komunikasi (Communication) - Kejelasan dalam menyampaikan laporan atau kendala teknis"
                    value={ratings.communication}
                    onChange={(v) => handleRatingChange('communication', v)}
                    showDescriptor
                  />
                  <StarRating
                    label="9. Pelayanan Pelanggan (Customer Orientation) - Keramahan dan kesigapan melayani staf internal/eksternal"
                    value={ratings.customerOrientation}
                    onChange={(v) => handleRatingChange('customerOrientation', v)}
                    showDescriptor
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
                  />
                  <StarRating
                    label="11. Pemecahan Masalah (Problem Solving) - Menemukan solusi efektif saat menghadapi kendala pekerjaan"
                    value={ratings.problemSolving}
                    onChange={(v) => handleRatingChange('problemSolving', v)}
                    showDescriptor
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
                  required
                  placeholder="Berikan apresiasi pencapaian dan rekomendasi hal yang perlu ditingkatkan minggu berikutnya..."
                  value={qualitativeNotes}
                  onChange={(e) => setQualitativeNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
                <button
                  type="submit"
                  className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Simpan & Kunci Evaluasi Mingguan</span>
                </button>
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
      ) : (
        /* ================= SUBORDINATE WORK REPORT FEED ================= */
        <div className="space-y-4">
          <div className="text-xs text-slate-500">
            Daftar laporan pekerjaan harian staf outsourcing yang menunggu review atau persetujuan supervisor
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyReports.map((report) => {
              const staff = staffList.find((s) => s.id === report.staffId);
              const noteText = reportNoteInputs[report.id] || '';

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
                        onClick={() => handleRevisionWithNote(report.id)}
                        className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        Minta Revisi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveWithNote(report.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Setujui Laporan</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
    </div>
  );
};
