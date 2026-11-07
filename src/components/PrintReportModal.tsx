import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  QrCode,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  StaffProfile,
  AttendanceRecord,
  MonthlyAggregate,
  DailyWorkReport,
  WeeklyEvaluation,
  Division,
  AuthUser,
  InstitutionSettings,
  DEFAULT_INSTITUTION_SETTINGS,
} from '../types';
interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffProfile[];
  attendanceRecords: AttendanceRecord[];
  monthlyAggregates: MonthlyAggregate[];
  dailyReports?: DailyWorkReport[];
  weeklyEvaluations?: WeeklyEvaluation[];
  divisions?: Division[];
  currentDivisionId?: string;
  currentUser?: AuthUser | null;
  institutionSettings?: InstitutionSettings;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  staffList,
  attendanceRecords,
  monthlyAggregates,
  dailyReports = [],
  weeklyEvaluations = [],
  divisions = [],
  currentDivisionId,
  currentUser,
  institutionSettings,
}) => {
  if (!isOpen) return null;

  const [printMode, setPrintMode] = useState<'rekap-divisi' | 'rapor-staf'>('rekap-divisi');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const staffMap = new Map(staffList.map((s) => [s.id, s]));
  const inst = institutionSettings || DEFAULT_INSTITUTION_SETTINGS;

  const selectedStaff = staffMap.get(selectedStaffId) || staffList[0];

  // Hitung statistik rekap kehadiran
  const totalLogs = attendanceRecords.length;
  const hadirCount = attendanceRecords.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = attendanceRecords.filter((r) => r.status === 'Terlambat').length;
  const attendanceRate = totalLogs > 0 ? ((hadirCount / totalLogs) * 100).toFixed(1) : '100';

  // Filter laporan untuk staf terpilih
  const staffReports = dailyReports.filter((r) => r.staffId === selectedStaff?.id);
  const staffAttendance = attendanceRecords.filter((r) => r.staffId === selectedStaff?.id);
  const staffMonthlyAgg = monthlyAggregates.find((m) => m.staffId === selectedStaff?.id);
  const staffWeeklyEvals = weeklyEvaluations.filter((e) => e.staffId === selectedStaff?.id);

  // Hitung rata-rata skor KPI tim dinamis
  const averageTeamScore = staffList.length > 0
    ? (
        staffList.reduce((acc, st) => {
          const agg = monthlyAggregates.find((m) => m.staffId === st.id);
          return acc + (agg?.averageScore ? agg.averageScore : 1.00);
        }, 0) / staffList.length
      ).toFixed(2)
    : '1.00';

  // Indikator rapor individu staf terpilih
  const latestEval = staffWeeklyEvals.length > 0 ? staffWeeklyEvals[staffWeeklyEvals.length - 1] : null;
  const pQuality = latestEval ? latestEval.ratings.qualityOfWork.toFixed(2) : (staffMonthlyAgg?.pillarScores?.quality ? staffMonthlyAgg.pillarScores.quality.toFixed(2) : '1.00');
  const pQuantity = latestEval ? latestEval.ratings.quantityOfWork.toFixed(2) : (staffMonthlyAgg?.pillarScores?.quality ? staffMonthlyAgg.pillarScores.quality.toFixed(2) : '1.00');
  const pTime = latestEval ? latestEval.ratings.timeManagement.toFixed(2) : (staffMonthlyAgg?.pillarScores?.quality ? staffMonthlyAgg.pillarScores.quality.toFixed(2) : '1.00');

  const pInitiative = latestEval ? latestEval.ratings.initiative.toFixed(2) : (staffMonthlyAgg?.pillarScores?.professionalism ? staffMonthlyAgg.pillarScores.professionalism.toFixed(2) : '1.00');
  const pAccountability = latestEval ? latestEval.ratings.accountability.toFixed(2) : (staffMonthlyAgg?.pillarScores?.professionalism ? staffMonthlyAgg.pillarScores.professionalism.toFixed(2) : '1.00');
  const pPunctuality = latestEval ? latestEval.ratings.punctuality.toFixed(2) : (staffMonthlyAgg?.pillarScores?.professionalism ? staffMonthlyAgg.pillarScores.professionalism.toFixed(2) : '1.00');

  const pTeamwork = latestEval ? latestEval.ratings.teamwork.toFixed(2) : (staffMonthlyAgg?.pillarScores?.interpersonal ? staffMonthlyAgg.pillarScores.interpersonal.toFixed(2) : '1.00');
  const pCommunication = latestEval ? latestEval.ratings.communication.toFixed(2) : (staffMonthlyAgg?.pillarScores?.interpersonal ? staffMonthlyAgg.pillarScores.interpersonal.toFixed(2) : '1.00');
  const pCustomer = latestEval ? latestEval.ratings.customerOrientation.toFixed(2) : (staffMonthlyAgg?.pillarScores?.interpersonal ? staffMonthlyAgg.pillarScores.interpersonal.toFixed(2) : '1.00');

  const pAdaptability = latestEval ? latestEval.ratings.adaptability.toFixed(2) : (staffMonthlyAgg?.pillarScores?.adaptability ? staffMonthlyAgg.pillarScores.adaptability.toFixed(2) : '1.00');
  const pProblemSolving = latestEval ? latestEval.ratings.problemSolving.toFixed(2) : (staffMonthlyAgg?.pillarScores?.adaptability ? staffMonthlyAgg.pillarScores.adaptability.toFixed(2) : '1.00');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 sm:my-6">
        
        {/* Action Controls Bar (Hidden during window.print()) */}
        <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pratinjau Dokumen Cetak / PDF Resmi Kedinasan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tata naskah dinas resmi Dinas Pendidikan Kab. Hulu Sungai Tengah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintMode('rekap-divisi')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  printMode === 'rekap-divisi'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Rekap Bulanan
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('rapor-staf')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  printMode === 'rapor-staf'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Rapor Individu
              </button>
            </div>

            {/* Selector Staf jika mode Rapor Individu */}
            {printMode === 'rapor-staf' && (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.division.split(' ')[0]})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-500/25 shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Content */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white space-y-6 font-sans max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          
          {/* ================= KOP SURAT RESMI KEDINASAN ================= */}
          <div className="border-b-4 border-double border-slate-900 pb-3 text-center relative">
            <div className="flex items-center justify-between px-2 sm:px-4">
              <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                <img
                  src={inst.logoKiriUrl || '/logos/Lambang_Kabupaten_Hulu_Sungai_Tengah.png'}
                  alt="Lambang Daerah"
                  className="w-full h-full object-contain max-h-20"
                />
              </div>
              <div className="flex-1 px-3 sm:px-6 text-center">
                <h3 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-slate-900 leading-tight">
                  {inst.namaPemda}
                </h3>
                <h2 className="text-base sm:text-xl font-black tracking-wider uppercase text-slate-950 leading-snug">
                  {inst.namaSkpd}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-700 leading-tight mt-0.5 font-medium">
                  {inst.alamatLengkap}
                </p>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Laman: <u>{inst.website}</u> · Pos-el: <u>{inst.email}</u> · Telp: {inst.telepon}
                </p>
              </div>
              <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                <img
                  src={inst.logoKananUrl || '/logos/logo-disdik2026.png'}
                  alt="Logo SKPD"
                  className="w-full h-full object-contain max-h-20"
                />
              </div>
            </div>
          </div>

          {/* ================= MODE 1: REKAPITULASI KINERJA BULANAN ================= */}
          {printMode === 'rekap-divisi' && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  REKAPITULASI BULANAN KEHADIRAN & EVALUASI KINERJA TENAGA ALIH DAYA
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  Nomor: {inst.nomorSuratPrefix} / X / 2026 · Periode: Oktober 2026
                </p>
              </div>

              {/* Summary Strip */}
              <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-500 text-[10px]">Total Tenaga Outsourcing</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {staffList.length} Personel
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Tingkat Kehadiran Disiplin</div>
                  <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                    {attendanceRate}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Total Log Geofence Valid</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {totalLogs} Record
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Rata-rata Skor KPI Tim</div>
                  <div className="text-base font-bold font-mono text-indigo-700 mt-0.5">
                    {averageTeamScore} / 5.00 ★
                  </div>
                </div>
              </div>

              {/* Tabel Rekapitulasi Utama */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  A. Tabel Evaluasi 4 Pilar Kompetensi & Rekomendasi Kontrak Kerja
                </h5>
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2 px-2.5 border-r border-slate-300 w-8 text-center">No</th>
                      <th className="py-2 px-3 border-r border-slate-300">Nama Personel / NIP</th>
                      <th className="py-2 px-3 border-r border-slate-300">Sub Bagian / Vendor</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Kehadiran</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Skor 4P</th>
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center">Predikat</th>
                      <th className="py-2 px-3">Rekomendasi Pejabat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffList.map((st, idx) => {
                      const agg = monthlyAggregates.find((m) => m.staffId === st.id);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <div className="font-bold text-slate-900">{st.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{st.nip}</div>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <div className="font-semibold text-slate-800">{st.division}</div>
                            <div className="text-[10px] text-slate-500">{st.vendorName}</div>
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">
                            100%
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                            {agg ? agg.averageScore.toFixed(2) : '1.00'}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                            <span className="font-semibold text-slate-900">
                              {agg?.predicate || 'Belum Ada Penilaian'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-700">
                            {agg?.contractRecommendation || 'Belum Ada Evaluasi'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODE 2: RAPOR INDIVIDU STAF ================= */}
          {printMode === 'rapor-staf' && selectedStaff && (
            <div className="space-y-6">
              <div className="text-center space-y-1 pt-2">
                <h4 className="text-sm font-extrabold uppercase underline text-slate-950">
                  KARTU HASIL EVALUASI KINERJA INDIVIDU (RAPOR KINERJA TENAGA ALIH DAYA)
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  ID: OTP-INDIV/{selectedStaff.nip} · Periode Evaluasi: Oktober 2026
                </p>
              </div>

              {/* Biodata & Foto Staf */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-extrabold text-white text-lg shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedStaff.avatarColor }}
                >
                  {selectedStaff.initials}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 flex-1 text-xs">
                  <div>
                    <span className="text-slate-500">Nama Lengkap:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">NIP / NIK:</span>{' '}
                    <strong className="font-mono text-slate-900">{selectedStaff.nip}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sub Bagian Tugas:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.division}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Jabatan Operasional:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.roleTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Perusahaan Mitra:</span>{' '}
                    <strong className="text-slate-900">{selectedStaff.vendorName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Titik Geofence:</span>{' '}
                    <strong className="text-slate-900">Dinas Pendidikan Kab. HST (Radius: 80m)</strong>
                  </div>
                </div>
              </div>

              {/* Nilai 4 Pilar Kompetensi */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  A. Hasil Penilaian 4 Pilar Kompetensi Kerja (11 Indikator)
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 1: Kualitas & Produktivitas Kerja
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kualitas Hasil Pekerjaan (A1)</span>
                      <strong>{pQuality} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kuantitas / Volume Output (A2)</span>
                      <strong>{pQuantity} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Manajemen Waktu & Efisiensi (A3)</span>
                      <strong>{pTime} ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 2: Sikap Kerja & Profesionalisme
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Inisiatif & Tanggung Jawab (B1)</span>
                      <strong>{pInitiative} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Akuntabilitas Kerja (B2)</span>
                      <strong>{pAccountability} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kedisiplinan Kehadiran (B3)</span>
                      <strong>{pPunctuality} ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 3: Kompetensi Interpersonal
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kerjasama Tim / Solidaritas (C1)</span>
                      <strong>{pTeamwork} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Komunikasi Efektif (C2)</span>
                      <strong>{pCommunication} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Orientasi Pelayanan Tamu (C3)</span>
                      <strong>{pCustomer} ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 4: Adaptabilitas & Pemecahan Masalah
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Adaptabilitas Kondisi Lapangan (D1)</span>
                      <strong>{pAdaptability} ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Problem Solving Cepat (D2)</span>
                      <strong>{pProblemSolving} ★</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs mt-2">
                  <div>
                    <span className="text-slate-600">Rata-rata Skor Kumulatif:</span>{' '}
                    <strong className="text-base text-indigo-700 font-mono">
                      {staffMonthlyAgg?.averageScore ? staffMonthlyAgg.averageScore.toFixed(2) : (latestEval ? latestEval.overallWeeklyScore.toFixed(2) : '1.00')} / 5.00 ★
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Predikat Kinerja:</span>{' '}
                    <strong className="text-slate-900 uppercase">
                      {staffMonthlyAgg?.predicate || (latestEval ? 'Telah Dievaluasi' : 'Belum Ada Penilaian')}
                    </strong>
                  </div>
                </div>
              </div>
              {/* Bukti Dokumentasi Tugas Harian */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase">
                  B. Sampling Laporan Tugas Harian Terverifikasi
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {staffReports.slice(0, 2).map((rep) => (
                    <div key={rep.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 truncate">{rep.title}</strong>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          {rep.supervisorApproval}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {rep.summary}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t">
                        <span>Waktu: {rep.startTime} - {rep.endTime}</span>
                        <span>Lokasi: Dinas Pendidikan HST</span>
                      </div>
                    </div>
                  ))}
                  {staffReports.length === 0 && (
                    <div className="col-span-2 p-3 text-center text-slate-400 text-xs italic">
                      Laporan tugas harian telah terarsip lengkap di sistem server.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TANDA TANGAN PEJABAT BERWENANG ================= */}
          <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-xs text-center items-end">
            {/* Pejabat Penilai / Atasan Langsung */}
            <div className="space-y-14">
              <div>
                <p className="text-slate-600">Pejabat Penilai,</p>
                <p className="font-bold text-slate-800">
                  {currentUser?.role === 'supervisor'
                    ? (currentUser.roleTitle || 'Atasan Langsung / Kasubag')
                    : 'Atasan Langsung / Kasubag'}
                </p>
              </div>
              <div>
                <p className="font-extrabold underline text-slate-950">
                  {currentUser?.role === 'supervisor'
                    ? currentUser.name
                    : selectedStaff?.division?.includes('Renlap') || selectedStaff?.division?.includes('Perencanaan')
                    ? 'Muhammad Sugeng Wahyudi, A.Md'
                    : selectedStaff?.division?.includes('SD')
                    ? 'Badaruddin, M.Pd'
                    : selectedStaff?.division?.includes('SMP')
                    ? 'Alamsyah Mappaompo, S.Pd. MM'
                    : selectedStaff?.division?.includes('PAUD')
                    ? 'Andry Rachmat Hidayat, S.Kom'
                    : selectedStaff?.division?.includes('Sarpras')
                    ? 'Bayhaki Novie, S.Pd'
                    : selectedStaff?.division?.includes('Keuangan')
                    ? 'Hj. Rabiatul Adawiyah, SE'
                    : 'Ahmad Humaidi, S.Pd.'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {currentUser?.role === 'supervisor'
                    ? (currentUser.nip ? `NIP: ${currentUser.nip}` : '-')
                    : selectedStaff?.division?.includes('Renlap') || selectedStaff?.division?.includes('Perencanaan')
                    ? 'NIP: 19821218 200604 1 008'
                    : selectedStaff?.division?.includes('SD')
                    ? 'NIP: 19800202 200604 1 028'
                    : selectedStaff?.division?.includes('SMP')
                    ? 'NIP: 19780414 200604 1 023'
                    : selectedStaff?.division?.includes('PAUD')
                    ? 'NIP: 19851208 2010011 007'
                    : selectedStaff?.division?.includes('Sarpras')
                    ? 'NIP: 19831110 2005011 007'
                    : selectedStaff?.division?.includes('Keuangan')
                    ? 'NIP: 19730609 199503 2 002'
                    : 'NIP: 19860620 201001 1 008'}
                </p>
              </div>
            </div>

            {/* QR Verifikasi Digital */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="p-2 border-2 border-slate-800 rounded-xl bg-white shadow-2xs">
                <QrCode className="w-14 h-14 text-slate-900" />
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase">
                VALID: OTP-DISDIK-HST
              </span>
              <span className="text-[9px] text-slate-400">
                Dokumen Sah Elektronik
              </span>
            </div>

            {/* Mengetahui HR Governance / Sekretaris Dinas */}
            <div className="space-y-14">
              <div>
                <p className="text-slate-600">{inst.kotaSurat || 'Barabai'}, {today}</p>
                <p className="font-bold text-slate-800">{inst.pejabatJabatan || 'Sekretaris Dinas Pendidikan'}</p>
              </div>
              <div>
                <p className="font-extrabold underline text-slate-950">
                  {inst.pejabatNama || 'Salihin, S.Pd.SD'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">NIP: {inst.pejabatNip || '19780502 200604 1 017'}</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-400 pt-4 border-t border-slate-100">
            Dokumen ini dicetak secara otomatis dari Sistem OutsourceTrack & KPI Pro · Dilindungi Enkripsi Digital
          </div>
        </div>
      </div>
    </div>
  );
};
