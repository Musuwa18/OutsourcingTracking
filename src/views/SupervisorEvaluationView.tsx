import React, { useState } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import {
  StaffProfile,
  DailyWorkReport,
  WeeklyEvaluation,
  CompetencyRatings,
  AttendanceRecord,
} from '../types';
import { StarRating } from '../components/StarRating';
import { GeofenceBreachAlertBanner } from '../components/GeofenceBreachAlertBanner';
import { AttendanceInspectionModal } from '../components/AttendanceInspectionModal';
import { AiDuplicateInspectionDrawer } from '../components/AiDuplicateInspectionDrawer';

interface SupervisorEvaluationViewProps {
  staffList: StaffProfile[];
  dailyReports: DailyWorkReport[];
  weeklyEvaluations: WeeklyEvaluation[];
  attendanceRecords?: AttendanceRecord[];
  onApproveReport: (reportId: string, notes?: string) => void;
  onRequestRevisionReport: (reportId: string, notes: string) => void;
  onSubmitEvaluation: (evalData: Omit<WeeklyEvaluation, 'id' | 'submittedAt'>) => void;
}

export const SupervisorEvaluationView: React.FC<SupervisorEvaluationViewProps> = ({
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
  const [evaluationDate, setEvaluationDate] = useState('2026-10-09'); // Friday

  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  // Geofence breaches today
  const todayBreaches = attendanceRecords.filter(
    (r) => r.date === '2026-10-09' && !r.locationCoords.withinRadius
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

  const handleRatingChange = (key: keyof CompetencyRatings, val: number) => {
    setRatings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    onSubmitEvaluation({
      staffId: selectedStaffId,
      supervisorId: 'sup-1',
      supervisorName: 'Hendra Wijaya, S.T.',
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
        <div className="flex items-center gap-1.5 p-1 glass-pill rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('eval-form')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'eval-form'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Form Evaluasi 4 Pilar
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('report-feed')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'report-feed'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Feed Laporan Kerja</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
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
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pilih Staf Outsourcing
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                    >
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.nip}) - {st.division}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Siklus Penilaian
                    </label>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                    >
                      <option value={1}>Minggu ke-1 (Jumat, 02 Okt 2026)</option>
                      <option value={2}>Minggu ke-2 (Jumat, 09 Okt 2026)</option>
                      <option value={3}>Minggu ke-3 (Jumat, 16 Okt 2026)</option>
                      <option value={4}>Minggu ke-4 (Jumat, 23 Okt 2026)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Evaluasi
                    </label>
                    <input
                      type="date"
                      value={evaluationDate}
                      onChange={(e) => setEvaluationDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {selectedStaff && (
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
                    <span>Vendor: <strong>{selectedStaff.vendorName}</strong></span>
                    <span>Lokasi Penugasan: <strong>{selectedStaff.assignedLocation.name}</strong></span>
                  </div>
                )}
              </div>

              {/* Pillar A: Kualitas & Produktivitas Kerja */}
              <div className="p-5 glass-card space-y-4">
                <div className="border-b border-white/40 dark:border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-cyan-300 flex items-center justify-center text-xs font-mono font-bold">A</span>
                    <span>Pilar 1: Kualitas & Produktivitas Kerja</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Evaluasi mutu teknis, ketepatan volume target kerja, dan efisiensi waktu
                  </p>
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
                <div className="border-b border-white/40 dark:border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-cyan-300 flex items-center justify-center text-xs font-mono font-bold">B</span>
                    <span>Pilar 2: Sikap Kerja & Profesionalisme</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Evaluasi proaktif, tanggung jawab tugas, kedisiplinan, dan integritas kerja
                  </p>
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
                <div className="border-b border-white/40 dark:border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-cyan-300 flex items-center justify-center text-xs font-mono font-bold">C</span>
                    <span>Pilar 3: Kompetensi Interpersonal</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Evaluasi kerja sama lintas tim, komunikasi santun, dan orientasi pelayanan
                  </p>
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

              {/* Pillar D: Adaptabilitas & Pengembangan Diri */}
              <div className="p-5 glass-card space-y-4">
                <div className="border-b border-white/40 dark:border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-cyan-300 flex items-center justify-center text-xs font-mono font-bold">D</span>
                    <span>Pilar 4: Adaptabilitas & Pemecahan Masalah</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Kelincahan menghadapi perubahan instruksi dan pemecahan kendala lapangan
                  </p>
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-between">
                {evalSubmittedSuccess && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Evaluasi berhasil disimpan dan diagregasi ke nilai bulanan!
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
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
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Ringkasan Skor Mingguan
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold font-mono text-indigo-600 dark:text-cyan-400 tabular-nums">
                    {currentAverage}
                  </span>
                  <span className="text-xs text-slate-400">/ 5.00 Bintang</span>
                </div>
              </div>

              {/* Predicate status */}
              <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 text-xs space-y-1">
                <div className="text-slate-500">Predikat Kinerja Minggu Ini:</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {currentAverage >= 4.5
                    ? 'Sangat Baik / Unggul'
                    : currentAverage >= 3.5
                    ? 'Baik / Memenuhi Harapan'
                    : currentAverage >= 2.5
                    ? 'Cukup / Perlu Peningkatan'
                    : 'Kurang / Evaluasi Khusus'}
                </div>
              </div>

              {/* Pillar Score Breakdown */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Pilar Kualitas & Produktivitas:</span>
                  <strong className="font-mono tabular-nums">
                    {((ratings.qualityOfWork + ratings.quantityOfWork + ratings.timeManagement) / 3).toFixed(2)}★
                  </strong>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Pilar Sikap & Profesionalisme:</span>
                  <strong className="font-mono tabular-nums">
                    {((ratings.initiative + ratings.accountability + ratings.punctuality) / 3).toFixed(2)}★
                  </strong>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Pilar Kompetensi Interpersonal:</span>
                  <strong className="font-mono tabular-nums">
                    {((ratings.teamwork + ratings.communication + ratings.customerOrientation) / 3).toFixed(2)}★
                  </strong>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Pilar Adaptabilitas:</span>
                  <strong className="font-mono tabular-nums">
                    {((ratings.adaptability + ratings.problemSolving) / 2).toFixed(2)}★
                  </strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 leading-relaxed">
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
                      <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                        {report.category}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {report.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {report.summary}
                      </p>
                    </div>

                    {/* Photo with Watermark */}
                    {report.documentationPhotoUrl && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
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
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                        <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 text-[10px]">
                          <Sparkles className="w-3 h-3" /> Justifikasi Duplikasi Staf:
                        </div>
                        <p className="italic text-slate-700 dark:text-slate-300">
                          "{report.aiDuplicateFlag.justificationNote}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Supervisor Action Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Tulis catatan masukan / instruksi perbaikan..."
                      value={noteText}
                      onChange={(e) =>
                        setReportNoteInputs((prev) => ({ ...prev, [report.id]: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none"
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
    </div>
  );
};
