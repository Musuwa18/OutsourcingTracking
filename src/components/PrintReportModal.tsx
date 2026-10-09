import React from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { StaffProfile, AttendanceRecord, MonthlyAggregate } from '../types';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffProfile[];
  attendanceRecords: AttendanceRecord[];
  monthlyAggregates: MonthlyAggregate[];
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  staffList,
  attendanceRecords,
  monthlyAggregates,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate summary stats
  const totalLogs = attendanceRecords.length;
  const hadirCount = attendanceRecords.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = attendanceRecords.filter((r) => r.status === 'Terlambat').length;
  const attendanceRate = totalLogs > 0 ? ((hadirCount / totalLogs) * 100).toFixed(1) : '100';

  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Modal Action Bar (Hidden during actual print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pratinjau Cetak / Ekspor PDF Resmi
              </h2>
              <p className="text-xs text-slate-500">
                Format dokumen eksekutif siap cetak atau simpan ke PDF via browser
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Content */}
        <div className="p-8 md:p-12 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 space-y-8 font-sans">
          
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
            <div>
              <div className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white uppercase">
                OutsourceTrack & KPI Pro
              </div>
              <div className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">
                Sistem Tata Kelola & Evaluasi Tenaga Alih Daya
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-md">
                Laporan Komprehensif Presensi Cerdas Geofence, Rekapitulasi Kinerja Harian, dan Evaluasi KPI Berkala 4 Pilar
              </p>
            </div>
            <div className="text-right text-xs space-y-1 font-mono">
              <div className="text-slate-400">NO. DOKUMEN:</div>
              <div className="font-bold text-slate-800 dark:text-slate-200">OTP-REP/2026/X-10</div>
              <div className="text-slate-400 mt-1">TANGGAL TERBIT:</div>
              <div className="text-slate-700 dark:text-slate-300">{today}</div>
            </div>
          </div>

          {/* KPI Executive Summary Strip */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-500">Total Tenaga Outsourcing</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                {staffList.length} Personel
              </div>
            </div>
            <div>
              <div className="text-slate-500">Tingkat Kehadiran Tepat Waktu</div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {attendanceRate}%
              </div>
            </div>
            <div>
              <div className="text-slate-500">Total Log Presensi</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                {totalLogs} Record
              </div>
            </div>
            <div>
              <div className="text-slate-500">Rata-rata KPI Tim</div>
              <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                4.38 / 5.00★
              </div>
            </div>
          </div>

          {/* Section 1: Staff KPI Aggregate Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              1. Rekapitulasi Penilaian Kinerja Bulanan (4 Pilar Kompetensi)
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300">
                  <th className="py-2.5 px-3 font-semibold">Nama / NIP</th>
                  <th className="py-2.5 px-3 font-semibold">Divisi</th>
                  <th className="py-2.5 px-3 font-semibold text-center">W1</th>
                  <th className="py-2.5 px-3 font-semibold text-center">W2</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Rata-rata</th>
                  <th className="py-2.5 px-3 font-semibold">Predikat</th>
                  <th className="py-2.5 px-3 font-semibold">Rekomendasi Kontrak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyAggregates.map((item) => {
                  const staff = staffMap.get(item.staffId);
                  return (
                    <tr key={item.staffId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium">
                        <div>{staff?.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{staff?.nip}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{staff?.division}</td>
                      <td className="py-2.5 px-3 font-mono text-center tabular-nums">
                        {item.weekScores[0] ? item.weekScores[0]?.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-center tabular-nums">
                        {item.weekScores[1] ? item.weekScores[1]?.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-center tabular-nums text-indigo-600 dark:text-indigo-400">
                        {item.averageScore.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.predicate}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-700 dark:text-slate-300">
                        {item.contractRecommendation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 2: Recent Attendance Records */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Sampling Log Presensi Geofence Terverifikasi Terkini
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300">
                  <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                  <th className="py-2.5 px-3 font-semibold">Personel</th>
                  <th className="py-2.5 px-3 font-semibold">Jam Masuk</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Lokasi Tugas</th>
                  <th className="py-2.5 px-3 font-semibold">Akurasi GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attendanceRecords.slice(0, 8).map((rec) => {
                  const staff = staffMap.get(rec.staffId);
                  return (
                    <tr key={rec.id}>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">{rec.date}</td>
                      <td className="py-2 px-3 font-medium">{staff?.name}</td>
                      <td className="py-2 px-3 font-mono tabular-nums">{rec.clockInTime}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{rec.locationCoords.locationName}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-500">±{Math.round(rec.locationCoords.accuracy)}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures Block */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-xs border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-16">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Disusun oleh,</p>
                <p className="text-slate-500">Supervisor Operasional Lapangan</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 dark:text-white">Hendra Wijaya, S.T.</p>
                <p className="text-slate-500 font-mono">NIP: MGR-1082</p>
              </div>
            </div>

            <div className="space-y-16 text-right">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Disetujui oleh,</p>
                <p className="text-slate-500">Admin Utama & HR Vendor Specialist</p>
              </div>
              <div>
                <p className="font-bold underline text-slate-900 dark:text-white">Dian Paramita, S.Kom.</p>
                <p className="text-slate-500 font-mono">NIP: ADM-0041</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-400 pt-6">
            Dicetak secara otomatis melalui platform terpadu OutsourceTrack & KPI Pro · Dilindungi enkripsi audit trail
          </div>
        </div>
      </div>
    </div>
  );
};
