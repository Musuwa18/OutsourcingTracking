import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Award,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Calendar,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { StaffProfile, MonthlyAggregate, WeeklyEvaluation, AttendanceRecord } from '../types';
import { RadarChart } from '../components/RadarChart';
import { exportMonthlyKpiToCSV } from '../utils/export';

interface AnalyticsMonthlyViewProps {
  staffList: StaffProfile[];
  monthlyAggregates: MonthlyAggregate[];
  weeklyEvaluations: WeeklyEvaluation[];
  attendanceRecords: AttendanceRecord[];
  onOpenPrintModal: () => void;
}

export const AnalyticsMonthlyView: React.FC<AnalyticsMonthlyViewProps> = ({
  staffList,
  monthlyAggregates,
  weeklyEvaluations,
  attendanceRecords,
  onOpenPrintModal,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');

  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const currentStaff = staffMap.get(selectedStaffId) || staffList[0];
  const currentAggregate = monthlyAggregates.find((m) => m.staffId === selectedStaffId) || monthlyAggregates[0];

  // Evaluations for this staff
  const staffEvals = weeklyEvaluations.filter(
    (e) => e.staffId === selectedStaffId && e.month === selectedMonth
  );

  // Latest evaluation ratings for Radar Chart
  const latestEval = staffEvals[staffEvals.length - 1];
  const radarRatings = latestEval?.ratings || {
    qualityOfWork: 4.5,
    quantityOfWork: 4.2,
    timeManagement: 4.6,
    initiative: 4.0,
    accountability: 4.8,
    punctuality: 4.8,
    teamwork: 4.7,
    communication: 4.2,
    customerOrientation: 4.8,
    adaptability: 4.4,
    problemSolving: 4.5,
  };

  // Predicate color scheme
  const getPredicateStyle = (predicate: string) => {
    switch (predicate) {
      case 'Sangat Baik / Unggul':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'Baik / Memenuhi Harapan':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'Cukup / Perlu Peningkatan':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
  };

  const handleExportCSV = () => {
    exportMonthlyKpiToCSV(monthlyAggregates, staffMap);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Rekapitulasi & Analitik Kinerja Bulanan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Agregasi rata-rata W1-W4, radar kompetensi 11 parameter, dan acuan perpanjangan kontrak
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor KPI Excel/CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Staff Selector Pills / Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {staffList.map((st) => {
          const isSelected = st.id === selectedStaffId;
          const agg = monthlyAggregates.find((m) => m.staffId === st.id);

          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStaffId(st.id)}
              className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-indigo-400 font-semibold'
              }`}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                style={{ backgroundColor: st.avatarColor }}
              >
                {st.initials}
              </div>
              <span>{st.name}</span>
              <span className="font-mono text-[11px] opacity-90 tabular-nums font-bold">
                ({agg?.averageScore.toFixed(2)}★)
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid: Radar Chart & Monthly Scoreboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Spider Radar Chart */}
        <div className="lg:col-span-7 p-6 glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Grafik Radar Kompetensi (Spider Chart)</span>
                <span className="text-xs font-mono font-normal text-slate-400">11 Parameter</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemetaan visual kelebihan & area perbaikan untuk {currentStaff?.name}
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full glass-pill text-slate-600 dark:text-slate-300">
              Oktober 2026
            </span>
          </div>

          {/* SVG Radar Chart */}
          <div className="py-2 flex items-center justify-center">
            <RadarChart ratings={radarRatings} size={360} />
          </div>

          {/* Strengths & Growth Areas Guidance */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Keunggulan Utama:
              </span>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                Ketelitian penanganan insiden, kedisiplinan jam kerja, dan respon pelayanan pengguna sangat tinggi.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
              <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Fokus Peningkatan:
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                Peningkatan kecepatan pelaporan administrasi dan komunikasi proaktif lintas departemen.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Aggregation Summary & Contract Decision */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Final Score Card */}
          <div className="p-5 glass-card space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Nilai Akhir Bulanan
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {currentAggregate?.averageScore.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">/ 5.00★</span>
                </div>
              </div>

              {/* Predicate Badge */}
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${getPredicateStyle(
                  currentAggregate?.predicate || ''
                )}`}
              >
                {currentAggregate?.predicate}
              </div>
            </div>

            {/* Weekly Progression W1 -> W4 */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Perkembangan Nilai Mingguan:
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[1, 2, 3, 4].map((w, idx) => {
                  const score = currentAggregate?.weekScores[idx];
                  return (
                    <div
                      key={w}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="text-[10px] text-slate-400">Minggu {w}</div>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
                        {score !== null && score !== undefined ? `${score.toFixed(2)}★` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Pillars Breakdown */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Rata-rata 4 Pilar Kompetensi:
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Pilar 1: Kualitas & Produktivitas</span>
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                    {currentAggregate?.pillarScores.quality.toFixed(2)}★
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Pilar 2: Sikap & Profesionalisme</span>
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                    {currentAggregate?.pillarScores.professionalism.toFixed(2)}★
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Pilar 3: Kompetensi Interpersonal</span>
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                    {currentAggregate?.pillarScores.interpersonal.toFixed(2)}★
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Pilar 4: Adaptabilitas & Masalah</span>
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                    {currentAggregate?.pillarScores.adaptability.toFixed(2)}★
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Renewal Advisory Card */}
          <div className="p-5 glass-card space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Rekomendasi Perpanjangan Kontrak
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                {currentAggregate?.contractRecommendation}
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                Berdasarkan capaian KPI bulanan ({currentAggregate?.averageScore.toFixed(2)}★) dan kepatuhan presensi geofence, tenaga alih daya ini dinilai layak melanjutkan masa kontrak pada periode berikutnya.
              </p>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed">
              *Evaluasi ini menjadi dokumen bukti akuntabilitas resmi dalam rapat koordinasi vendor tahunan PT Mitra Daya Pratama.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
