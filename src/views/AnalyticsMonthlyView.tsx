import React, { useState, useMemo } from 'react';
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
  Search,
  Filter,
  X,
  Users,
  RotateCcw,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ChevronDown,
  Briefcase,
  Star,
  SlidersHorizontal,
} from 'lucide-react';
import { StaffProfile, MonthlyAggregate, WeeklyEvaluation, AttendanceRecord } from '../types';
import { RadarChart } from '../components/RadarChart';
import { exportMonthlyKpiToCSV } from '../utils/export';

interface AnalyticsMonthlyViewProps {
  staffList: StaffProfile[];
  monthlyAggregates: MonthlyAggregate[];
  weeklyEvaluations: WeeklyEvaluation[];
  attendanceRecords: AttendanceRecord[];
  onOpenPrintModal: (category?: 'ALL' | 'vendor' | 'pppk_paruh_waktu' | 'magang') => void;
  onOpenAiChat?: () => void;
}

const DEFAULT_AGGREGATE: MonthlyAggregate = {
  staffId: '',
  month: '2026-10',
  weekScores: [null, null, null, null],
  averageScore: 0,
  predicate: 'Belum Ada Penilaian',
  contractRecommendation: 'Belum Ada Evaluasi',
  pillarScores: {
    quality: 0,
    professionalism: 0,
    interpersonal: 0,
    adaptability: 0,
  },
};

export const AnalyticsMonthlyView: React.FC<AnalyticsMonthlyViewProps> = ({
  staffList,
  monthlyAggregates,
  weeklyEvaluations,
  attendanceRecords,
  onOpenPrintModal,
  onOpenAiChat,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'vendor' | 'pppk_paruh_waktu' | 'magang'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [sortBy, setSortBy] = useState<'kpi_desc' | 'kpi_asc' | 'name_asc' | 'name_desc'>('kpi_desc');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const categoryCounts = useMemo(() => {
    let vendorCount = 0;
    let pppkCount = 0;
    let magangCount = 0;
    staffList.forEach((s) => {
      const v = (s.vendorName || '').toUpperCase();
      if (v.includes('PPPK')) pppkCount++;
      else if (v.includes('MAGANG')) magangCount++;
      else vendorCount++;
    });
    return { vendorCount, pppkCount, magangCount };
  }, [staffList]);

  // Daftar unik divisi untuk filter
  const divisions = useMemo(() => {
    return ['ALL', ...Array.from(new Set(staffList.map((s) => s.division).filter(Boolean)))];
  }, [staffList]);

  // Map agregat KPI per staffId untuk lookup cepat
  const aggMap = useMemo(() => {
    const map = new Map<string, MonthlyAggregate>();
    monthlyAggregates.forEach((m) => map.set(m.staffId, m));
    return map;
  }, [monthlyAggregates]);

  // Filter & Urutkan daftar pegawai (untuk ratusan data)
  const filteredAndSortedStaff = useMemo(() => {
    let list = staffList.filter((st) => {
      const v = (st.vendorName || '').toUpperCase();
      const stCat = v.includes('PPPK')
        ? 'pppk_paruh_waktu'
        : v.includes('MAGANG')
        ? 'magang'
        : 'vendor';

      if (selectedCategory !== 'ALL' && stCat !== selectedCategory) {
        return false;
      }

      const matchDivision = selectedDivision === 'ALL' || st.division === selectedDivision;
      if (!matchDivision) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        st.name.toLowerCase().includes(q) ||
        (st.nip && st.nip.toLowerCase().includes(q)) ||
        (st.division && st.division.toLowerCase().includes(q)) ||
        (st.roleTitle && st.roleTitle.toLowerCase().includes(q)) ||
        (st.vendorName && st.vendorName.toLowerCase().includes(q))
      );
    });

    // Pengurutan dinamis
    return list.sort((a, b) => {
      const scoreA = aggMap.get(a.id)?.averageScore ?? 0;
      const scoreB = aggMap.get(b.id)?.averageScore ?? 0;

      if (sortBy === 'kpi_desc') return scoreB - scoreA;
      if (sortBy === 'kpi_asc') return scoreA - scoreB;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      return 0;
    });
  }, [staffList, selectedCategory, selectedDivision, searchQuery, sortBy, aggMap]);

  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);
  const currentStaff = (selectedStaffId ? staffMap.get(selectedStaffId) : null) || filteredAndSortedStaff[0] || staffList[0];
  const currentAggregate = (currentStaff?.id ? aggMap.get(currentStaff.id) : null) || monthlyAggregates[0] || DEFAULT_AGGREGATE;

  // Evaluasi mingguan untuk staf terpilih
  const staffEvals = weeklyEvaluations.filter(
    (e) => e.staffId === currentStaff?.id && e.month === selectedMonth
  );

  // Rating 11 parameter untuk Spider Radar Chart
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

  // Predicate color scheme badge
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

  if (staffList.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-12 text-center glass-card rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Belum Ada Data Tenaga Outsourcing Terdaftar
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Data analitik dan rekapitulasi KPI akan muncul secara otomatis setelah staf alih daya resmi memilih Anda sebagai atasan penilai atau setelah didaftarkan oleh Administrator.
          </p>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    const relevantAggregates = monthlyAggregates.filter((agg) => staffMap.has(agg.staffId));
    exportMonthlyKpiToCSV(relevantAggregates.length > 0 ? relevantAggregates : monthlyAggregates, staffMap);
  };

  // Komponen Reusable Daftar Vertikal Pegawai
  const renderStaffVerticalList = (onSelectCallback?: () => void) => (
    <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
      {filteredAndSortedStaff.length > 0 ? (
        filteredAndSortedStaff.map((st) => {
          const isSelected = st.id === currentStaff?.id;
          const agg = aggMap.get(st.id);
          const score = agg?.averageScore !== undefined ? agg.averageScore.toFixed(2) : '-';

          return (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setSelectedStaffId(st.id);
                if (onSelectCallback) onSelectCallback();
              }}
              className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between gap-3 group ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs"
                  style={{ backgroundColor: st.avatarColor || '#6366f1' }}
                >
                  {st.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate leading-tight">
                    {st.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] truncate ${
                        isSelected
                          ? 'text-slate-300 dark:text-slate-600'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {st.division || 'Disdik HST'}
                    </span>
                    <span
                      className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        (st.vendorName || '').toUpperCase().includes('PPPK')
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                          : (st.vendorName || '').toUpperCase().includes('MAGANG')
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300/40'
                          : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40'
                      }`}
                    >
                      {(st.vendorName || '').toUpperCase().includes('PPPK')
                        ? 'PPPK'
                        : (st.vendorName || '').toUpperCase().includes('MAGANG')
                        ? 'Magang'
                        : 'Vendor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nilai KPI & Predikat Ringkas */}
              <div className="flex flex-col items-end shrink-0">
                <div
                  className={`flex items-center gap-1 font-mono text-xs font-extrabold tabular-nums ${
                    isSelected
                      ? 'text-amber-300 dark:text-amber-500'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>{score}</span>
                </div>
                {agg?.predicate && (
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 truncate max-w-[85px] ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {agg.predicate.split(' / ')[0]}
                  </span>
                )}
              </div>
            </button>
          );
        })
      ) : (
        <div className="p-6 rounded-xl text-center bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <p>Tidak ada pegawai yang cocok dengan kata kunci atau filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedDivision('ALL');
            }}
            className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Reset Pencarian
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
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

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAiChat && (
            <button
              type="button"
              onClick={onOpenAiChat}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Analisis Gemini AI</span>
            </button>
          )}

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
            onClick={() => onOpenPrintModal(selectedCategory)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekapitulasi</span>
          </button>
        </div>
      </div>

      {/* MOBILE ADAPTIVE BAR: Muncul di Layar Ponsel & Tablet (< lg) */}
      <div className="block lg:hidden">
        <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
              style={{ backgroundColor: currentStaff?.avatarColor || '#6366f1' }}
            >
              {currentStaff?.initials}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Pegawai Terpilih:</div>
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {currentStaff?.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {currentStaff?.division} · {currentAggregate?.averageScore.toFixed(2)}★
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pilih Pegawai ({staffList.length})</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* MAIN SPLIT-VIEW (MASTER - DETAIL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* PANEL KIRI (MASTER LIST): TAMPIL VERTICAL DI DESKTOP                       */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-4 flex-col glass-card p-4 rounded-2xl space-y-3 sticky top-4 max-h-[calc(100vh-6rem)]">
          {/* Header Panel Kiri */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Daftar Pegawai
              </h2>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {filteredAndSortedStaff.length} / {staffList.length}
            </span>
          </div>
          {/* Segmented Category Filter Pills (Pemilahan Pegawai Vendor vs PPPK vs Magang) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10.5px]">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Semua ({staffList.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('vendor')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer truncate ${
                selectedCategory === 'vendor'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🏢 Vendor ({categoryCounts.vendorCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('pppk_paruh_waktu')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer truncate ${
                selectedCategory === 'pppk_paruh_waktu'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🏛️ PPPK ({categoryCounts.pppkCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('magang')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer truncate ${
                selectedCategory === 'magang'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🎓 Magang ({categoryCounts.magangCount})
            </button>
          </div>

          {/* Header Panel Kiri */}
          {/* Pencarian Cepat Nama / NIP */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, NIP, atau divisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Kontrol Filter & Urutan */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Filter Bidang */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Bidang / Unit:</label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Bidang</option>
                {divisions
                  .filter((d) => d !== 'ALL')
                  .map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
              </select>
            </div>

            {/* Urutkan */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Urutkan Berdasarkan:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="kpi_desc">KPI Tertinggi (★)</option>
                <option value="kpi_asc">KPI Terendah (★)</option>
                <option value="name_asc">Nama A → Z</option>
                <option value="name_desc">Nama Z → A</option>
              </select>
            </div>
          </div>

          {/* Reset Filter Jika Aktif */}
          {(searchQuery || selectedDivision !== 'ALL' || sortBy !== 'kpi_desc' || selectedCategory !== 'ALL') && (
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
              <span>Filter diterapkan</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDivision('ALL');
                  setSortBy('kpi_desc');
                  setSelectedCategory('ALL');
                }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>
          )}

          {/* Daftar Vertikal Scrollable */}
          {renderStaffVerticalList()}
        </div>

        {/* ========================================================================= */}
        {/* PANEL KANAN (DETAIL): GRAFIK SPIDER CHART & SKOR KINERJA                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Banner Staf Terpilih */}
          <div className="p-5 rounded-2xl glass-card border border-white/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shrink-0 shadow-md"
                style={{ backgroundColor: currentStaff?.avatarColor || '#6366f1' }}
              >
                {currentStaff?.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {currentStaff?.name}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {currentStaff?.nip}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      (currentStaff?.vendorName || '').toUpperCase().includes('PPPK')
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300/60'
                        : (currentStaff?.vendorName || '').toUpperCase().includes('MAGANG')
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300/60'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60'
                    }`}
                  >
                    {(currentStaff?.vendorName || '').toUpperCase().includes('PPPK')
                      ? '🏛️ PPPK Paruh Waktu'
                      : (currentStaff?.vendorName || '').toUpperCase().includes('MAGANG')
                      ? '🎓 Siswa / Mahasiswa Magang'
                      : '🏢 Tenaga Alih Daya (Vendor)'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{currentStaff?.division}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentStaff?.vendorName || 'PT. YASMINE BUIH PERSADA'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Skor Cepat */}
            <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-4">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Capaian Bulanan</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {currentAggregate ? currentAggregate.averageScore.toFixed(2) : '0.00'}
                  </span>
                  <span className="text-xs text-slate-400">/ 5.00★</span>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-xl border text-xs font-bold ${getPredicateStyle(
                  currentAggregate?.predicate || ''
                )}`}
              >
                {currentAggregate?.predicate}
              </div>
            </div>
          </div>

          {/* Grid: Radar Spider Chart & Detail Pilar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Spider Radar Chart */}
            <div className="lg:col-span-7 p-6 glass-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                    <span>Grafik Radar Kompetensi (Spider Chart)</span>
                    <span className="text-[10px] font-mono font-normal text-slate-400">(11 Parameter)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visualisasi kekuatan & area pengembangan kerja
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full glass-pill text-slate-600 dark:text-slate-300">
                  Oktober 2026
                </span>
              </div>

              {/* SVG Radar Chart */}
              <div className="py-2 flex items-center justify-center">
                <RadarChart ratings={radarRatings} size={340} />
              </div>

              {/* Strengths & Growth Areas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Keunggulan Utama:
                  </span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                    Ketelitian penanganan tugas, kedisiplinan jam kerja, dan respon pelayanan kedinasan sangat tinggi.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Fokus Peningkatan:
                  </span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Peningkatan kecepatan pelaporan administrasi harian dan komunikasi proaktif lintas bidang.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Pilar & Evaluasi Keputusan */}
            <div className="lg:col-span-5 space-y-4">
              {/* Perkembangan Mingguan & Rata-rata 4 Pilar */}
              <div className="p-5 glass-card space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Perkembangan Nilai Mingguan:
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {[1, 2, 3, 4].map((w, idx) => {
                      const score = currentAggregate?.weekScores ? currentAggregate.weekScores[idx] : null;
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
                <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Rata-rata 4 Pilar Kompetensi:
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Pilar 1: Kualitas & Hasil</span>
                      <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                        {currentAggregate?.pillarScores ? currentAggregate.pillarScores.quality.toFixed(2) : '0.00'}★
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Pilar 2: Sikap & Profesionalisme</span>
                      <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                        {currentAggregate?.pillarScores ? currentAggregate.pillarScores.professionalism.toFixed(2) : '0.00'}★
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Pilar 3: Hubungan Interpersonal</span>
                      <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                        {currentAggregate?.pillarScores ? currentAggregate.pillarScores.interpersonal.toFixed(2) : '0.00'}★
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Pilar 4: Adaptabilitas Masalah</span>
                      <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                        {currentAggregate?.pillarScores ? currentAggregate.pillarScores.adaptability.toFixed(2) : '0.00'}★
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rekomendasi Perpanjangan Kontrak */}
              <div className="p-5 glass-card space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Rekomendasi Kontrak
                  </h3>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                  <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    {currentAggregate?.contractRecommendation || 'Belum Ada Evaluasi'}
                  </div>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    Berdasarkan capaian KPI bulanan ({currentAggregate ? currentAggregate.averageScore.toFixed(2) : '0.00'}★) dan kepatuhan presensi, personel alih daya ini dinilai layak melanjutkan masa penugasan.
                  </p>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed">
                  *Dokumen akuntabilitas resmi dalam rapat monitoring evaluasi tahunan dengan pihak penyedia jasa alih daya.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM SHEET / DRAWER PEMILIH PEGAWAI                              */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 lg:hidden">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Sheet Handle & Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pilih Pegawai Outsourcing
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Menampilkan {filteredAndSortedStaff.length} dari {staffList.length} pegawai
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pencarian di Mobile Sheet */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, NIP, atau divisi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Filter Bidang & Urutkan di Mobile Sheet */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ALL">Semua Bidang</option>
                  {divisions
                    .filter((d) => d !== 'ALL')
                    .map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="kpi_desc">KPI Tertinggi</option>
                  <option value="kpi_asc">KPI Terendah</option>
                  <option value="name_asc">Nama A-Z</option>
                  <option value="name_desc">Nama Z-A</option>
                </select>
              </div>
            </div>

            {/* List Item Vertikal di Mobile Sheet */}
            <div className="p-4 overflow-y-auto flex-1">
              {renderStaffVerticalList(() => setMobileDrawerOpen(false))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
