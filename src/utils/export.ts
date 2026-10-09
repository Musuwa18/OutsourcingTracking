import { AttendanceRecord, StaffProfile, MonthlyAggregate, DailyWorkReport } from '../types';

/**
 * Trigger file download helper
 */
function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export attendance records to Excel-compatible CSV with UTF-8 BOM
 */
export function exportAttendanceToCSV(
  records: AttendanceRecord[],
  staffMap: Map<string, StaffProfile>
) {
  // UTF-8 BOM to ensure Indonesian characters & Excel columns render without glitch
  const BOM = '\uFEFF';
  const headers = [
    'Tanggal',
    'NIP',
    'Nama Staf',
    'Divisi',
    'Vendor Outsourcing',
    'Jam Masuk',
    'Jam Keluar',
    'Status Kehadiran',
    'Lokasi Presensi',
    'Akurasi GPS (meter)',
    'Jarak dari Titik Tugas (meter)',
    'Radius Aman',
    'Keterangan',
  ];

  const rows = records.map((rec) => {
    const staff = staffMap.get(rec.staffId);
    return [
      `"${rec.date}"`,
      `"${staff?.nip || '-'}"`,
      `"${staff?.name || '-'}"`,
      `"${staff?.division || '-'}"`,
      `"${staff?.vendorName || '-'}"`,
      `"${rec.clockInTime}"`,
      `"${rec.clockOutTime || '-'}"`,
      `"${rec.status}"`,
      `"${rec.locationCoords.locationName}"`,
      `"${Math.round(rec.locationCoords.accuracy)}"`,
      `"${rec.locationCoords.distanceMeters}"`,
      `"${rec.locationCoords.withinRadius ? 'Dalam Radius' : 'Luar Radius'}"`,
      `"${rec.notes || '-'}"`,
    ].join(',');
  });

  const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
  const fileName = `Rekap_Presensi_OutsourceTrack_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

/**
 * Export monthly KPI evaluations to Excel-compatible CSV
 */
export function exportMonthlyKpiToCSV(
  aggregates: MonthlyAggregate[],
  staffMap: Map<string, StaffProfile>
) {
  const BOM = '\uFEFF';
  const headers = [
    'Bulan',
    'NIP',
    'Nama Staf',
    'Divisi',
    'Vendor Mitra',
    'Skor Minggu 1',
    'Skor Minggu 2',
    'Skor Minggu 3',
    'Skor Minggu 4',
    'Nilai Rata-rata Akhir',
    'Predikat Kinerja',
    'Rekomendasi Kontrak',
    'Pilar Kualitas',
    'Pilar Profesionalisme',
    'Pilar Interpersonal',
    'Pilar Adaptabilitas',
  ];

  const rows = aggregates.map((agg) => {
    const staff = staffMap.get(agg.staffId);
    return [
      `"${agg.month}"`,
      `"${staff?.nip || '-'}"`,
      `"${staff?.name || '-'}"`,
      `"${staff?.division || '-'}"`,
      `"${staff?.vendorName || '-'}"`,
      `"${agg.weekScores[0] !== null ? agg.weekScores[0]?.toFixed(2) : '-'}"`,
      `"${agg.weekScores[1] !== null ? agg.weekScores[1]?.toFixed(2) : '-'}"`,
      `"${agg.weekScores[2] !== null ? agg.weekScores[2]?.toFixed(2) : '-'}"`,
      `"${agg.weekScores[3] !== null ? agg.weekScores[3]?.toFixed(2) : '-'}"`,
      `"${agg.averageScore.toFixed(2)}"`,
      `"${agg.predicate}"`,
      `"${agg.contractRecommendation}"`,
      `"${agg.pillarScores.quality.toFixed(2)}"`,
      `"${agg.pillarScores.professionalism.toFixed(2)}"`,
      `"${agg.pillarScores.interpersonal.toFixed(2)}"`,
      `"${agg.pillarScores.adaptability.toFixed(2)}"`,
    ].join(',');
  });

  const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
  const fileName = `Rekap_Evaluasi_KPI_Bulanan_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

/**
 * Export daily reports to CSV
 */
export function exportWorkReportsToCSV(
  reports: DailyWorkReport[],
  staffMap: Map<string, StaffProfile>
) {
  const BOM = '\uFEFF';
  const headers = [
    'Tanggal',
    'NIP',
    'Nama Staf',
    'Divisi',
    'Judul Tugas',
    'Kategori',
    'Jam Mulai',
    'Jam Selesai',
    'Status Pekerjaan',
    'Persetujuan Supervisor',
    'Ringkasan Hasil',
    'Lokasi',
  ];

  const rows = reports.map((r) => {
    const staff = staffMap.get(r.staffId);
    return [
      `"${r.date}"`,
      `"${staff?.nip || '-'}"`,
      `"${staff?.name || '-'}"`,
      `"${staff?.division || '-'}"`,
      `"${r.title}"`,
      `"${r.category}"`,
      `"${r.startTime}"`,
      `"${r.endTime}"`,
      `"${r.status}"`,
      `"${r.supervisorApproval}"`,
      `"${r.summary.replace(/"/g, '""')}"`,
      `"${r.locationCoords.locationName}"`,
    ].join(',');
  });

  const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
  const fileName = `Laporan_Kinerja_Harian_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}
