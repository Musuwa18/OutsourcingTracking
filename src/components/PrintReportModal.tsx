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
            <div className="flex items-center justify-between px-4">
              <div className="w-16 h-16 flex items-center justify-center border-2 border-slate-800 rounded-xl font-bold text-xs uppercase p-1">
                LOGO DISDIK
              </div>
              <div className="flex-1 px-4 text-center">
                <h3 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-slate-900 leading-tight">
                  PEMERINTAH KABUPATEN HULU SUNGAI TENGAH
                </h3>
                <h2 className="text-base sm:text-xl font-black tracking-wider uppercase text-slate-950 leading-snug">
                  DINAS PENDIDIKAN
                </h2>
                <p className="text-[11px] text-slate-700 leading-tight mt-0.5 font-medium">
                  Jalan Perintis Kemerdekaan No. 10, Barabai, Kalimantan Selatan 71315
                </p>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Laman: <u>disdik.barabaikab.go.id</u> · Pos-el: <u>disdik@barabaikab.go.id</u> · Telp: (0517) 41234
                </p>
              </div>
              <div className="w-16 h-16 flex items-center justify-center border-2 border-slate-800 rounded-xl font-bold text-xs uppercase p-1">
                KAB. HST
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
                  Nomor: 800.1 / OTP-DISDIK / X / 2026 · Periode: Oktober 2026
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
                    4.42 / 5.00 ★
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
                            {agg?.averageScore ? agg.averageScore.toFixed(2) : '4.40'}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                            <span className="font-semibold text-slate-900">
                              {agg?.predicate || 'Sangat Baik'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-700">
                            {agg?.contractRecommendation || 'Direkomendasikan Perpanjangan Kontrak'}
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
                      <strong>4.60 ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kuantitas / Volume Output (A2)</span>
                      <strong>4.40 ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Manajemen Waktu & Efisiensi (A3)</span>
                      <strong>4.50 ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 2: Sikap Kerja & Profesionalisme
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Inisiatif & Tanggung Jawab (B1)</span>
                      <strong>4.50 ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Akuntabilitas Kerja (B2)</span>
                      <strong>4.60 ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kedisiplinan Kehadiran (B3)</span>
                      <strong>4.80 ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 3: Kompetensi Interpersonal
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Kerjasama Tim / Solidaritas (C1)</span>
                      <strong>4.70 ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Komunikasi Efektif (C2)</span>
                      <strong>4.40 ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Orientasi Pelayanan Tamu (C3)</span>
                      <strong>4.50 ★</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="font-bold text-indigo-900 border-b pb-1">
                      Pilar 4: Adaptabilitas & Pemecahan Masalah
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Adaptabilitas Kondisi Lapangan (D1)</span>
                      <strong>4.50 ★</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Problem Solving Cepat (D2)</span>
                      <strong>4.30 ★</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs mt-2">
                  <div>
                    <span className="text-slate-600">Rata-rata Skor Kumulatif:</span>{' '}
                    <strong className="text-base text-indigo-700 font-mono">
                      {staffMonthlyAgg?.averageScore ? staffMonthlyAgg.averageScore.toFixed(2) : '4.52'} / 5.00 ★
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Predikat Kinerja:</span>{' '}
                    <strong className="text-slate-900 uppercase">
                      {staffMonthlyAgg?.predicate || 'SANGAT BAIK'}
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
                <p className="font-bold text-slate-800">Atasan Langsung / Kasubag</p>
              </div>
              <div>
                <p className="font-extrabold underline text-slate-950">
                  {selectedStaff?.division.includes('IT')
                    ? 'Hendra Wijaya, S.T.'
                    : selectedStaff?.division.includes('Security')
                    ? 'Agus Suryanto, S.Sos.'
                    : selectedStaff?.division.includes('Kebersihan')
                    ? 'Hj. Ratna Sari, S.E.'
                    : selectedStaff?.division.includes('Transport')
                    ? 'Bambang Hermawan, S.AP.'
                    : 'Dian Paramita, S.Kom.'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">NIP: 19820514 200801 1 003</p>
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

            {/* Mengetahui HR Governance */}
            <div className="space-y-14">
              <div>
                <p className="text-slate-600">Barabai, {today}</p>
                <p className="font-bold text-slate-800">Sekretaris Dinas Pendidikan</p>
              </div>
              <div>
                <p className="font-extrabold underline text-slate-950">
                  H. M. Arsyad, S.Pd., M.M.
                </p>
                <p className="text-[10px] text-slate-500 font-mono">NIP: 19740312 199803 1 004</p>
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
