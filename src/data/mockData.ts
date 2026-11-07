import {
  StaffProfile,
  AttendanceRecord,
  DailyWorkReport,
  WeeklyEvaluation,
  MonthlyAggregate,
  SystemAuditLog,
  NotificationItem,
} from '../types';
import { PRIMARY_OFFICES } from '../utils/geo';

// SVG Avatar generator helper to satisfy Zero-Broken-Image policy cleanly
function createSvgAvatar(initials: string, bg: string, text: string = '#ffffff'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100%" height="100%" rx="50" fill="${bg}"/>
    <text x="50%" y="54%" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="34" fill="${text}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Sample Selfie Dummy SVG generator (for previewing verified attendance snapshots)
export function createSelfieThumbnail(name: string, timestamp: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
    <rect width="100%" height="100%" fill="#0f172a"/>
    <circle cx="160" cy="100" r="48" fill="#334155"/>
    <path d="M 90 200 C 90 150, 230 150, 230 200 Z" fill="#334155"/>
    <rect x="0" y="190" width="320" height="50" fill="rgba(2, 6, 23, 0.9)"/>
    <text x="14" y="210" font-family="monospace" font-size="11" fill="#38bdf8" font-weight="bold">VERIFIED ATTENDANCE SELFIE</text>
    <text x="14" y="226" font-family="monospace" font-size="9" fill="#94a3b8">${name} · ${timestamp}</text>
    <circle cx="300" cy="20" r="6" fill="#10b981"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Sample Documentation Task Photo Generator
export function createWorkPhotoThumbnail(title: string, category: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)"/>
    <rect x="20" y="20" width="360" height="260" rx="8" fill="none" stroke="#334155" stroke-dasharray="4 4"/>
    <rect x="40" y="50" width="120" height="90" rx="4" fill="#334155"/>
    <rect x="180" y="50" width="180" height="12" rx="3" fill="#475569"/>
    <rect x="180" y="75" width="140" height="10" rx="3" fill="#475569"/>
    <rect x="180" y="98" width="160" height="10" rx="3" fill="#334155"/>
    
    <rect x="0" y="230" width="400" height="70" fill="rgba(15, 23, 42, 0.95)"/>
    <rect x="12" y="240" width="3" height="48" fill="#6366f1"/>
    <text x="24" y="252" font-family="monospace" font-size="10" fill="#38bdf8" font-weight="bold">[WATERMARK DOKUMENTASI RESMI]</text>
    <text x="24" y="268" font-family="sans-serif" font-size="10" fill="#f8fafc" font-weight="500">${title.slice(0, 36)}</text>
    <text x="24" y="284" font-family="monospace" font-size="8.5" fill="#94a3b8">Kategori: ${category} · Koordinat & Jam Server Terkunci</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MOCK_STAFF: StaffProfile[] = [];

export const MOCK_SUPERVISOR = {
  id: 'usr-spv-umpeg',
  nip: '19860620 2010011 008',
  name: 'Ahmad Humaidi, S.Pd.',
  email: 'umpeg@disdikhst.go.id',
  roleTitle: 'Kepala Sub Bagian Umum dan Kepegawaian',
  division: 'Sub Bagian Umum dan Kepegawaian',
};

export const MOCK_ADMIN = {
  id: 'usr-pimp-001',
  nip: '19820916 2000121 002',
  name: 'H. Muhammad Anhar, S.STP, ME',
  email: 'kadin@disdikhst.go.id',
  roleTitle: 'Kepala Dinas Pendidikan',
  division: 'Pucuk Pimpinan SKPD',
};

// Generate 30 days of attendance logs
export function generateInitialAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date(2026, 9, 9); // Oct 9, 2026

  MOCK_STAFF.forEach((staff) => {
    // Generate records for past 20 working days
    for (let i = 0; i < 20; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekend

      const dateStr = d.toISOString().slice(0, 10);
      const isToday = i === 0;

      // Deterministic simulation
      const randomSeed = (staff.nip.charCodeAt(6) + i * 7) % 100;
      let status: 'Hadir' | 'Terlambat' | 'Izin' | 'Alpha' = 'Hadir';
      let inHour = 7;
      let inMin = 45 + (randomSeed % 25); // 07:45 - 08:09
      let distance = 12 + (randomSeed % 40); // 12m - 52m
      if (staff.id === 'staff-3' && isToday) {
        distance = 138; // Melebihi radius aman 80m untuk pengujian peringatan otomatis geofence
      }

      if (randomSeed > 88 && !isToday) {
        status = 'Terlambat';
        inHour = 8;
        inMin = 15 + (randomSeed % 20);
      } else if (randomSeed > 96 && !isToday) {
        status = 'Izin';
      }

      const clockInTime = `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}:14`;
      const clockOutTime = isToday ? undefined : '17:05:42';

      const assignedLoc = staff.assignedLocation || PRIMARY_OFFICES[0];
      const record: AttendanceRecord = {
        id: `att-${staff.id}-${dateStr}`,
        staffId: staff.id,
        date: dateStr,
        clockInTime: status === 'Izin' ? '-' : clockInTime,
        clockOutTime: status === 'Izin' ? '-' : clockOutTime,
        selfieUrl: createSelfieThumbnail(staff.name, `${dateStr} ${clockInTime}`),
        locationCoords: {
          latitude: (assignedLoc.latitude || -2.5911226) + (randomSeed * 0.00001 - 0.0005),
          longitude: (assignedLoc.longitude || 115.3735289) + (randomSeed * 0.00001 - 0.0005),
          accuracy: 8 + (randomSeed % 14), // under 30m
          distanceMeters: distance,
          withinRadius: distance <= (assignedLoc.radiusMeters || 100),
          locationName: assignedLoc.name || PRIMARY_OFFICES[0].name,
        },
        status,
        notes: status === 'Terlambat' ? 'Kendala lalu lintas jalan tol' : status === 'Izin' ? 'Izin keperluan keluarga (disetujui)' : undefined,
        verifiedBy: 'Sistem Geofence Otomatis',
      };
      records.push(record);
    }
  });

  return records;
}

// Generate realistic daily reports
export function generateInitialReports(): DailyWorkReport[] {
  const reports: DailyWorkReport[] = [
    {
      id: 'rep-101',
      staffId: 'staff-1',
      date: '2026-10-09',
      title: 'Pemeliharaan Rutin Server Lantai 8 & Perbaikan Jaringan LAN Ruang Rapat',
      category: 'Pemeliharaan',
      startTime: '08:30',
      endTime: '12:00',
      summary: 'Telah dilakukan pengecekan kabel patch switch rack 8A, reset port koneksi meeting room Bromo, dan pengujian throughput konektivitas 1Gbps stabil.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Pemeliharaan Kabel Switch Rack 8A', 'Pemeliharaan'),
      imageHash: 'ph_e8a21f7c94b3012a_b5a1c944d1887e12',
      aiDuplicateFlag: {
        isDuplicate: false,
        similarityScore: 12.4,
        flagSeverity: 'clean',
        analyzedAt: '2026-10-09 12:15:20',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[0].latitude,
        longitude: PRIMARY_OFFICES[0].longitude,
        accuracy: 12,
        locationName: PRIMARY_OFFICES[0].name,
      },
      supervisorApproval: 'Disetujui',
      supervisorNotes: 'Pekerjaan rapi dan tepat waktu. Pastikan kabel cadangan dirapikan ke organizer.',
      createdAt: '2026-10-09 12:15:22',
    },
    {
      id: 'rep-102',
      staffId: 'staff-1',
      date: '2026-10-09',
      title: 'Penanganan Tiket Insiden Printer Multi-Fungsi Departemen Keuangan',
      category: 'Penanganan Insiden',
      startTime: '13:00',
      endTime: '15:10',
      summary: 'Mengganti unit roller penarik kertas printer Ricoh MP-5000, pembersihan drum unit, dan test print 50 lembar tanpa paper-jam.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Penggantian Roller Printer Ricoh', 'Penanganan Insiden'),
      imageHash: 'ph_7a18f4309cde8821_49b1a0387e411299',
      aiDuplicateFlag: {
        isDuplicate: false,
        similarityScore: 18.2,
        flagSeverity: 'clean',
        analyzedAt: '2026-10-09 15:19:50',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[0].latitude,
        longitude: PRIMARY_OFFICES[0].longitude,
        accuracy: 14,
        locationName: PRIMARY_OFFICES[0].name,
      },
      supervisorApproval: 'Pending',
      createdAt: '2026-10-09 15:20:00',
    },
    {
      id: 'rep-103',
      staffId: 'staff-2',
      date: '2026-10-09',
      title: 'Inspeksi Kebersihan & Stok Kebutuhan Logistik Pantry Lantai 3-7',
      category: 'Inspeksi & Monitoring',
      startTime: '08:00',
      endTime: '11:30',
      summary: 'Pengecekan kesiapan dispenser air, sanitasi area makan bersama, dan pendataan persediaan sabun cuci serta tisu. Seluruh checklist terpenuhi.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Inspeksi Fasilitas Pantry Lt 5', 'Inspeksi & Monitoring'),
      imageHash: 'ph_3f81e944b20a117d_88a4e10199cf812e',
      aiDuplicateFlag: {
        isDuplicate: false,
        similarityScore: 8.5,
        flagSeverity: 'clean',
        analyzedAt: '2026-10-09 11:44:55',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[1].latitude,
        longitude: PRIMARY_OFFICES[1].longitude,
        accuracy: 9,
        locationName: PRIMARY_OFFICES[1].name,
      },
      supervisorApproval: 'Disetujui',
      supervisorNotes: 'Standar kebersihan terjaga dengan baik.',
      createdAt: '2026-10-09 11:45:00',
    },
    {
      id: 'rep-104',
      staffId: 'staff-3',
      date: '2026-10-09',
      title: 'Patroli Keamanan Area Parkir Basemen B1-B3 & Pintu Keluar Darurat',
      category: 'Inspeksi & Monitoring',
      startTime: '09:00',
      endTime: '11:00',
      summary: 'Pemeriksaan 18 titik barcode patroli wand, kondisi pintu darurat terkunci dari luar dan bebas halangan, situasi kondusif tanpa kendaraan mencurigakan.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Patroli Basemen B2 & Pintu Darurat', 'Inspeksi & Monitoring'),
      imageHash: 'ph_11a884fc901b4421_9a12c884b1239840',
      aiDuplicateFlag: {
        isDuplicate: false,
        similarityScore: 14.1,
        flagSeverity: 'clean',
        analyzedAt: '2026-10-09 11:14:40',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[0].latitude,
        longitude: PRIMARY_OFFICES[0].longitude,
        accuracy: 16,
        locationName: PRIMARY_OFFICES[0].name,
      },
      supervisorApproval: 'Disetujui',
      supervisorNotes: 'Pencatatan rute patroli lengkap dan tepat waktu.',
      createdAt: '2026-10-09 11:15:00',
    },
    {
      id: 'rep-105',
      staffId: 'staff-4',
      date: '2026-10-09',
      title: 'Pengarsipan Dokumen Kontrak Vendor Q3 dan Digitalisasi Berkas',
      category: 'Laporan Administrasi',
      startTime: '08:30',
      endTime: '14:00',
      summary: 'Pemindaian 142 berkas kontrak mitra, penamaan file sesuai format ISO DMS, dan penataan fisik pada box arsip lemari C4.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Digitalisasi Dokumen Kontrak Q3', 'Laporan Administrasi'),
      imageHash: 'ph_99b41a772cde0091_33f11a847e124800',
      aiDuplicateFlag: {
        isDuplicate: false,
        similarityScore: 11.0,
        flagSeverity: 'clean',
        analyzedAt: '2026-10-09 14:14:30',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[2].latitude,
        longitude: PRIMARY_OFFICES[2].longitude,
        accuracy: 11,
        locationName: PRIMARY_OFFICES[2].name,
      },
      supervisorApproval: 'Pending',
      createdAt: '2026-10-09 14:15:00',
    },
    {
      id: 'rep-106',
      staffId: 'staff-5',
      date: '2026-10-09',
      title: 'Preventive Maintenance Chiller Unit AHU-02 & Pengukuran Beban Listrik Panel Utama',
      category: 'Pemeliharaan',
      startTime: '09:00',
      endTime: '13:30',
      summary: 'Pembersihan filter udara AHU-02, pelumasan bearing motor blower, pengukuran tegangan 3-phase stabil 382V, arus beban seimbang 42A per phase.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Maintenance AHU-02 & Panel Listrik', 'Pemeliharaan'),
      imageHash: 'ph_55e100f91ab48831_77a22c19984b5511',
      aiDuplicateFlag: {
        isDuplicate: false,
        similarityScore: 16.7,
        flagSeverity: 'clean',
        analyzedAt: '2026-10-09 13:44:50',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[1].latitude,
        longitude: PRIMARY_OFFICES[1].longitude,
        accuracy: 10,
        locationName: PRIMARY_OFFICES[1].name,
      },
      supervisorApproval: 'Disetujui',
      supervisorNotes: 'Parameter beban dicatat dengan detail dan akurat.',
      createdAt: '2026-10-09 13:45:00',
    },
    // Past historical reports for Budi Santoso
    {
      id: 'rep-107',
      staffId: 'staff-1',
      date: '2026-10-08',
      title: 'Instalasi Workstation Baru untuk 4 Karyawan Onboarding Divisi Finance',
      category: 'Pelayanan Pengguna',
      startTime: '09:00',
      endTime: '16:00',
      summary: 'Deploy image Windows 11 Enterprise, instalasi VPN internal, konfigurasi domain Active Directory, dan serah terima unit tepat waktu.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Deploy 4 Unit PC Onboarding', 'Pelayanan Pengguna'),
      imageHash: 'ph_88c44e991af40011_22b11a947e114400',
      aiDuplicateFlag: {
        isDuplicate: false,
        similarityScore: 9.3,
        flagSeverity: 'clean',
        analyzedAt: '2026-10-08 16:14:20',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[0].latitude,
        longitude: PRIMARY_OFFICES[0].longitude,
        accuracy: 12,
        locationName: PRIMARY_OFFICES[0].name,
      },
      supervisorApproval: 'Disetujui',
      supervisorNotes: 'Bagus, serah terima selesai sebelum jam makan siang.',
      createdAt: '2026-10-08 16:15:00',
    },
    // Sample Flagged Duplicate Report to immediately demonstrate AI detection in Supervisor view
    {
      id: 'rep-108',
      staffId: 'staff-1',
      date: '2026-10-09',
      title: 'Pemeriksaan Tambahan Port LAN Workstation Finance Onboarding',
      category: 'Pelayanan Pengguna',
      startTime: '16:00',
      endTime: '16:45',
      summary: 'Pemeriksaan ulang port LAN dinding dekat kubikal nomor 4. Dilakukan pengetesan kabel patch tambahan.',
      status: 'Selesai',
      documentationPhotoUrl: createWorkPhotoThumbnail('Deploy 4 Unit PC Onboarding', 'Pelayanan Pengguna'), // Identical photo to rep-107
      imageHash: 'ph_88c44e991af40011_22b11a947e114400', // Identical perceptual hash to rep-107
      aiDuplicateFlag: {
        isDuplicate: true,
        similarityScore: 96.8,
        matchedReportId: 'rep-107',
        matchedReportTitle: 'Instalasi Workstation Baru untuk 4 Karyawan Onboarding Divisi Finance',
        matchedReportDate: '2026-10-08',
        matchedStaffName: 'Budi Santoso',
        flagSeverity: 'high',
        reason: 'Foto terdeteksi IDENTIK (96.8% kesamaan visual dan pola hash) dengan laporan "Instalasi Workstation Baru untuk 4 Karyawan Onboarding Divisi Finance" tertanggal 2026-10-08.',
        justificationNote: 'Area meja kerja yang sama karena melanjutkan instalasi kabel kemarin sore.',
        analyzedAt: '2026-10-09 16:44:10',
      },
      locationCoords: {
        latitude: PRIMARY_OFFICES[0].latitude,
        longitude: PRIMARY_OFFICES[0].longitude,
        accuracy: 11,
        locationName: PRIMARY_OFFICES[0].name,
      },
      supervisorApproval: 'Pending',
      createdAt: '2026-10-09 16:45:00',
    },
  ];

  return reports;
}

// Generate realistic weekly evaluations across 4 pillars & 11 competencies
export function generateInitialEvaluations(): WeeklyEvaluation[] {
  const evaluations: WeeklyEvaluation[] = [
    // Staff 1 (Budi Santoso) - Weeks 1, 2, 3, 4
    {
      id: 'eval-1-w1',
      staffId: 'staff-1',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 1,
      month: '2026-10',
      date: '2026-10-02',
      ratings: {
        qualityOfWork: 5,
        quantityOfWork: 4,
        timeManagement: 5,
        initiative: 5,
        accountability: 5,
        punctuality: 5,
        teamwork: 5,
        communication: 4,
        customerOrientation: 5,
        adaptability: 4,
        problemSolving: 5,
      },
      qualitativeFeedback: 'Respon terhadap tiket masalah sangat cepat dan tuntas. Pengguna puas dengan pelayanan bantuan teknis.',
      overallWeeklyScore: 4.73,
      submittedAt: '2026-10-02 16:30:00',
    },
    {
      id: 'eval-1-w2',
      staffId: 'staff-1',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 2,
      month: '2026-10',
      date: '2026-10-09',
      ratings: {
        qualityOfWork: 5,
        quantityOfWork: 5,
        timeManagement: 4,
        initiative: 4,
        accountability: 5,
        punctuality: 5,
        teamwork: 5,
        communication: 5,
        customerOrientation: 5,
        adaptability: 5,
        problemSolving: 5,
      },
      qualitativeFeedback: 'Mampu menangani insiden jaringan saat jam genting dengan tenang. Komunikasi dengan tim vendor berjalan sangat baik.',
      overallWeeklyScore: 4.82,
      submittedAt: '2026-10-09 17:00:00',
    },

    // Staff 2 (Siti Rahmawati)
    {
      id: 'eval-2-w1',
      staffId: 'staff-2',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 1,
      month: '2026-10',
      date: '2026-10-02',
      ratings: {
        qualityOfWork: 4,
        quantityOfWork: 4,
        timeManagement: 4,
        initiative: 4,
        accountability: 4,
        punctuality: 4,
        teamwork: 5,
        communication: 4,
        customerOrientation: 5,
        adaptability: 4,
        problemSolving: 4,
      },
      qualitativeFeedback: 'Manajemen fasilitas pantry dan ruang pertemuan tertata rapi. Laporan stok akurat.',
      overallWeeklyScore: 4.18,
      submittedAt: '2026-10-02 16:40:00',
    },
    {
      id: 'eval-2-w2',
      staffId: 'staff-2',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 2,
      month: '2026-10',
      date: '2026-10-09',
      ratings: {
        qualityOfWork: 4,
        quantityOfWork: 5,
        timeManagement: 4,
        initiative: 4,
        accountability: 5,
        punctuality: 4,
        teamwork: 4,
        communication: 4,
        customerOrientation: 5,
        adaptability: 4,
        problemSolving: 4,
      },
      qualitativeFeedback: 'Koordinasi pembersihan karpet pasca acara berjalan lancar. Sangat sigap melayani kebutuhan unit kerja.',
      overallWeeklyScore: 4.27,
      submittedAt: '2026-10-09 16:55:00',
    },

    // Staff 3 (Reza Pratama)
    {
      id: 'eval-3-w1',
      staffId: 'staff-3',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 1,
      month: '2026-10',
      date: '2026-10-02',
      ratings: {
        qualityOfWork: 4,
        quantityOfWork: 4,
        timeManagement: 4,
        initiative: 3,
        accountability: 4,
        punctuality: 4,
        teamwork: 4,
        communication: 3,
        customerOrientation: 4,
        adaptability: 3,
        problemSolving: 3,
      },
      qualitativeFeedback: 'Disiplin patroli baik. Perlu meningkatkan komunikasi ramah saat melayani tamu di lobi utama.',
      overallWeeklyScore: 3.64,
      submittedAt: '2026-10-02 16:45:00',
    },
    {
      id: 'eval-3-w2',
      staffId: 'staff-3',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 2,
      month: '2026-10',
      date: '2026-10-09',
      ratings: {
        qualityOfWork: 4,
        quantityOfWork: 4,
        timeManagement: 4,
        initiative: 4,
        accountability: 4,
        punctuality: 4,
        teamwork: 4,
        communication: 4,
        customerOrientation: 4,
        adaptability: 4,
        problemSolving: 3,
      },
      qualitativeFeedback: 'Ada peningkatan keramahan dalam penyambutan tamu. Catatan logbook pos security terisi rapi.',
      overallWeeklyScore: 3.91,
      submittedAt: '2026-10-09 17:10:00',
    },

    // Staff 4 (Dewi Anggraini)
    {
      id: 'eval-4-w1',
      staffId: 'staff-4',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 1,
      month: '2026-10',
      date: '2026-10-02',
      ratings: {
        qualityOfWork: 5,
        quantityOfWork: 4,
        timeManagement: 5,
        initiative: 4,
        accountability: 5,
        punctuality: 5,
        teamwork: 4,
        communication: 5,
        customerOrientation: 5,
        adaptability: 4,
        problemSolving: 4,
      },
      qualitativeFeedback: 'Akurasi entri data dan pengelompokan arsip digital sangat teliti. Zero-defect pada audit dokumen.',
      overallWeeklyScore: 4.55,
      submittedAt: '2026-10-02 16:50:00',
    },

    // Staff 5 (Arif Budiman)
    {
      id: 'eval-5-w1',
      staffId: 'staff-5',
      supervisorId: 'sup-1',
      supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
      weekNumber: 1,
      month: '2026-10',
      date: '2026-10-02',
      ratings: {
        qualityOfWork: 5,
        quantityOfWork: 4,
        timeManagement: 4,
        initiative: 5,
        accountability: 5,
        punctuality: 5,
        teamwork: 4,
        communication: 4,
        customerOrientation: 4,
        adaptability: 5,
        problemSolving: 5,
      },
      qualitativeFeedback: 'Keahlian teknis ME sangat handal. Deteksi dini potensi overheating pada trafo pendingin.',
      overallWeeklyScore: 4.55,
      submittedAt: '2026-10-02 16:52:00',
    },
  ];

  return evaluations;
}

// Compute Monthly Aggregates for all staff
export function computeMonthlyAggregates(
  staffList: StaffProfile[],
  evaluations: WeeklyEvaluation[],
  month: string = '2026-10'
): MonthlyAggregate[] {
  return staffList.map((staff) => {
    const staffEvals = evaluations.filter((e) => e.staffId === staff.id && e.month === month);

    const weekScores: (number | null)[] = [null, null, null, null];
    let totalQuality = 0;
    let totalProf = 0;
    let totalInter = 0;
    let totalAdapt = 0;
    let count = 0;

    staffEvals.forEach((ev) => {
      if (ev.weekNumber >= 1 && ev.weekNumber <= 4) {
        weekScores[ev.weekNumber - 1] = ev.overallWeeklyScore;
      }
      // Pillar A (Quality): quality, quantity, time
      const q = (ev.ratings.qualityOfWork + ev.ratings.quantityOfWork + ev.ratings.timeManagement) / 3;
      // Pillar B (Professionalism): initiative, accountability, punctuality
      const p = (ev.ratings.initiative + ev.ratings.accountability + ev.ratings.punctuality) / 3;
      // Pillar C (Interpersonal): teamwork, communication, customerOrientation
      const i = (ev.ratings.teamwork + ev.ratings.communication + ev.ratings.customerOrientation) / 3;
      // Pillar D (Adaptability): adaptability, problemSolving
      const a = (ev.ratings.adaptability + ev.ratings.problemSolving) / 2;

      totalQuality += q;
      totalProf += p;
      totalInter += i;
      totalAdapt += a;
      count++;
    });

    // Default baseline 1.00 (bintang 1) jika staf belum dievaluasi
    let avg = 1.00;
    let pillarQuality = 1.00;
    let pillarProf = 1.00;
    let pillarInter = 1.00;
    let pillarAdapt = 1.00;

    let predicate: MonthlyAggregate['predicate'] = 'Belum Ada Penilaian';
    let contractRecommendation: MonthlyAggregate['contractRecommendation'] = 'Belum Ada Evaluasi';

    if (count > 0) {
      const validScores = weekScores.filter((s): s is number => s !== null);
      avg = validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length;
      pillarQuality = Number((totalQuality / count).toFixed(2));
      pillarProf = Number((totalProf / count).toFixed(2));
      pillarInter = Number((totalInter / count).toFixed(2));
      pillarAdapt = Number((totalAdapt / count).toFixed(2));
      avg = Number(avg.toFixed(2));

      // Predicate calculation saat sudah memiliki evaluasi mingguan
      if (avg >= 4.5) {
        predicate = 'Sangat Baik / Unggul';
        contractRecommendation = 'Direkomendasikan Perpanjang Penuh';
      } else if (avg >= 3.5) {
        predicate = 'Baik / Memenuhi Harapan';
        contractRecommendation = 'Perpanjang dengan Masa Evaluasi';
      } else if (avg >= 2.5) {
        predicate = 'Cukup / Perlu Peningkatan';
        contractRecommendation = 'Pertimbangan / Pelatihan Khusus';
      } else {
        predicate = 'Kurang / Evaluasi Khusus';
        contractRecommendation = 'Tidak Direkomendasikan Perpanjang';
      }
    }
    return {
      staffId: staff.id,
      month,
      weekScores,
      averageScore: avg,
      predicate,
      contractRecommendation,
      pillarScores: {
        quality: pillarQuality,
        professionalism: pillarProf,
        interpersonal: pillarInter,
        adaptability: pillarAdapt,
      },
    };
  });
}

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-11-02 15:20:00',
    actorName: 'Budi Santoso (OS-TI-001)',
    role: 'Tenaga Outsourcing',
    action: 'Pengiriman Laporan Kinerja',
    detail: 'Mengunggah laporan "Pemeliharaan Jaringan Fiber Optic & Server Disdik HST" dengan stempel watermark GPS terverifikasi.',
    ipAddress: '192.168.204.57',
    category: 'Laporan',
  },
  {
    id: 'log-2',
    timestamp: '2026-11-02 14:15:00',
    actorName: 'Ahmad Humaidi, S.Pd.',
    role: 'Kasubag Umum & Kepegawaian',
    action: 'Persetujuan Laporan Kerja',
    detail: 'Menyetujui laporan harian petugas kebersihan Siti Nurhaliza (Sterilisasi Ruang Rapat Pimpinan).',
    ipAddress: '192.168.204.57',
    category: 'Laporan',
  },
  {
    id: 'log-3',
    timestamp: '2026-11-02 07:42:14',
    actorName: 'Budi Santoso (OS-TI-001)',
    role: 'Tenaga Outsourcing',
    action: 'Presensi Masuk (Clock In)',
    detail: 'Verifikasi WebRTC selfie berhasil. GPS akurat (±12m), berada di radius 14.5m Kantor Disdik Kab. HST.',
    ipAddress: '192.168.204.57',
    category: 'Kehadiran',
  },
  {
    id: 'log-4',
    timestamp: '2026-11-02 07:35:00',
    actorName: 'Muhammad Rizky (OS-SKB-006)',
    role: 'Tenaga Outsourcing',
    action: 'Presensi Masuk (Clock In)',
    detail: 'Verifikasi selfie valid di Balai Belajar GTK Disdik HST (radius 11.4m).',
    ipAddress: '192.168.204.57',
    category: 'Kehadiran',
  },
  {
    id: 'log-5',
    timestamp: '2026-11-01 18:45:00',
    actorName: 'Sistem Otomatis (Cron Job)',
    role: 'Administrator Sistem',
    action: 'Pencadangan Cloud Google Drive',
    detail: 'Backup harian database dan arsip foto uploads ke Google Drive (gdrive:Backup_OutsourceTrack) berhasil 100%.',
    ipAddress: '127.0.0.1',
    category: 'Sistem',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-geo-1',
    timestamp: '08:14 WITA',
    title: 'Peringatan Geofence: Presensi di Luar Radius',
    message: 'Reza Pratama terdeteksi melakukan Clock-In berjarak 112 meter dari Kantor Disdik HST (Batas Radius Aman: 100 meter).',
    type: 'geofence_alert',
    read: false,
    staffId: 'usr-os-002',
    userId: 'usr-os-002',
    distanceExceededMeters: 112,
    locationName: 'Kantor Dinas Pendidikan Kab. Hulu Sungai Tengah',
    severity: 'warning',
  },
  {
    id: 'notif-1',
    timestamp: '15:20 WITA',
    title: 'Laporan Baru Masuk',
    message: 'Budi Santoso telah mengirimkan Laporan Pemeliharaan TI untuk ditinjau Kasubag Renlap.',
    type: 'approval',
    read: false,
    staffId: 'usr-os-001',
    userId: 'usr-spv-renlap',
  },
  {
    id: 'notif-2',
    timestamp: '14:15 WITA',
    title: 'Laporan Disetujui',
    message: 'Laporan kebersihan ruang rapat utama oleh Siti Nurhaliza telah disetujui Kasubag Umpeg.',
    type: 'approval',
    read: false,
    staffId: 'usr-os-003',
    userId: 'usr-os-003',
  },
  {
    id: 'notif-3',
    timestamp: '07:30 WITA',
    title: 'Pengingat Presensi Kerja Disdik HST',
    message: 'Harap lakukan Clock In sebelum pukul 08:00 WITA dengan kamera selfie langsung dan GPS aktif di lokasi tugas.',
    type: 'attendance',
    read: true,
  },
  {
    id: 'notif-4',
    timestamp: 'Kemarin',
    title: 'Evaluasi Mingguan 4 Pilar Dibuka',
    message: 'Jadwal penilaian evaluasi kinerja berkala 4 pilar telah dapat diisi oleh Para Kasi dan Kasubag.',
    type: 'evaluation',
    read: true,
    userId: 'usr-spv-renlap',
  },
];

export const INITIAL_USER_ACCOUNTS: import('../types').UserAccount[] = [
  {
    id: 'usr-pimp-001',
    name: 'H. Muhammad Anhar, S.STP, ME',
    nip: '19820916 2000121 002',
    email: 'kadin@disdikhst.go.id',
    role: 'admin',
    roleTitle: 'Kepala Dinas Pendidikan',
    status: 'Aktif',
    deviceBinding: {
      registered: true,
      deviceModel: 'Apple iPad Pro 12.9 & MacBook Air',
      deviceUuid: 'UUID-9801-APL-KADIN-001',
      registeredAt: '2025-08-01 08:00:00',
      ipAddress: '192.168.204.57',
    },
    lastLogin: '2026-11-02 08:00:00',
    avatarColor: '#0f172a',
    initials: 'MA',
  },
  {
    id: 'usr-pimp-002',
    name: 'Salihin, S.Pd.SD',
    nip: '19780502200604 1 017',
    email: 'sekretaris@disdikhst.go.id',
    role: 'supervisor',
    roleTitle: 'Sekretaris Dinas (Eselon III.a)',
    status: 'Aktif',
    deviceBinding: {
      registered: true,
      deviceModel: 'Samsung Galaxy Tab S9 Ultra',
      deviceUuid: 'UUID-8802-SAM-SEKDIS-002',
      registeredAt: '2025-09-01 08:15:00',
      ipAddress: '192.168.204.57',
    },
    lastLogin: '2026-11-02 08:10:00',
    avatarColor: '#1e293b',
    initials: 'SL',
  },
  {
    id: 'usr-spv-umpeg',
    name: 'Ahmad Humaidi, S.Pd.',
    nip: '19860620 2010011 008',
    email: 'umpeg@disdikhst.go.id',
    role: 'supervisor',
    roleTitle: 'Kepala Sub Bagian Umum dan Kepegawaian',
    status: 'Aktif',
    deviceBinding: {
      registered: true,
      deviceModel: 'Lenovo ThinkPad X1',
      deviceUuid: 'UUID-7703-LEN-UMPEG-003',
      registeredAt: '2025-10-01 08:00:00',
      ipAddress: '192.168.204.57',
    },
    lastLogin: '2026-11-02 08:15:00',
    avatarColor: '#d97706',
    initials: 'AH',
  },
  {
    id: 'usr-spv-renlap',
    name: 'Muhammad Sugeng Wahyudi, A.Md',
    nip: '19821218 2006041 008',
    email: 'renlap@disdikhst.go.id',
    role: 'supervisor',
    roleTitle: 'Kepala Sub Bagian Perencanaan dan Pelaporan',
    status: 'Aktif',
    deviceBinding: {
      registered: true,
      deviceModel: 'HP EliteBook 840',
      deviceUuid: 'UUID-6604-HP-RENLAP-004',
      registeredAt: '2025-10-15 08:20:00',
      ipAddress: '192.168.204.57',
    },
    lastLogin: '2026-11-02 08:20:00',
    avatarColor: '#3b82f6',
    initials: 'SW',
  },
            {
    id: 'usr-adm-001',
    name: 'Admin Sistem Disdik HST',
    nip: 'ADMIN-HST',
    email: 'admin@disdikhst.go.id',
    role: 'admin',
    roleTitle: 'Super Administrator TI Disdik HST',
    status: 'Aktif',
    deviceBinding: {
      registered: true,
      deviceModel: 'Dell XPS 15 (Linux Server Console)',
      deviceUuid: 'UUID-8801-DEL-XPS15-9A33F',
      registeredAt: '2025-08-01 08:00:00',
      ipAddress: '192.168.204.57',
    },
    lastLogin: '2026-11-02 08:25:00',
    avatarColor: '#0f172a',
    initials: 'AD',
  },
];

export const INITIAL_ACTIVE_SESSIONS: import('../types').ActiveSession[] = [];

export const INITIAL_GEOFENCE_CONFIG: import('../types').GeofenceGlobalConfig = {
  assignmentPolicy: 'fixed',
  gpsAccuracyThreshold: 30, // standard < 30m
  autoNotifySupervisorOnBreach: true,
  strictOpenSkyWarning: true,
};

export const INITIAL_ROLE_PERMISSIONS: Record<string, import('../types').RolePermissions> = {
  outsourcing: {
    attendance_clock: true,
    attendance_view_self: true,
    attendance_view_all: false,
    attendance_override_location: false,
    report_submit: true,
    report_review: false,
    report_request_revision: false,
    report_delete: false,
    kpi_rate_weekly: false,
    kpi_view_monthly: true,
    kpi_download_raport: false,
    admin_manage_geofence: false,
    admin_manage_users: false,
    admin_export_reports: false,
    admin_view_audit_log: false,
  },
  coordinator: {
    attendance_clock: true,
    attendance_view_self: true,
    attendance_view_all: true,
    attendance_override_location: false,
    report_submit: true,
    report_review: true,
    report_request_revision: true,
    report_delete: false,
    kpi_rate_weekly: false,
    kpi_view_monthly: true,
    kpi_download_raport: false,
    admin_manage_geofence: false,
    admin_manage_users: false,
    admin_export_reports: true,
    admin_view_audit_log: false,
  },
  supervisor: {
    attendance_clock: false,
    attendance_view_self: true,
    attendance_view_all: true,
    attendance_override_location: true,
    report_submit: false,
    report_review: true,
    report_request_revision: true,
    report_delete: false,
    kpi_rate_weekly: true,
    kpi_view_monthly: true,
    kpi_download_raport: true,
    admin_manage_geofence: true,
    admin_manage_users: false,
    admin_export_reports: true,
    admin_view_audit_log: true,
  },
  admin: {
    attendance_clock: true,
    attendance_view_self: true,
    attendance_view_all: true,
    attendance_override_location: true,
    report_submit: true,
    report_review: true,
    report_request_revision: true,
    report_delete: true,
    kpi_rate_weekly: true,
    kpi_view_monthly: true,
    kpi_download_raport: true,
    admin_manage_geofence: true,
    admin_manage_users: true,
    admin_export_reports: true,
    admin_view_audit_log: true,
  },
};

export const INITIAL_SUPERVISOR_MAPPINGS: import('../types').SupervisorMapping[] = [
  {
    supervisorId: 'usr-spv-umpeg',
    supervisorName: 'Ahmad Humaidi, S.Pd.',
    supervisorRole: 'Kepala Sub Bagian Umum dan Kepegawaian',
    assignedStaffIds: ['usr-os-002', 'usr-os-003', 'usr-os-004'],
  },
  {
    supervisorId: 'usr-spv-renlap',
    supervisorName: 'Muhammad Sugeng Wahyudi, A.Md',
    supervisorRole: 'Kepala Sub Bagian Perencanaan dan Pelaporan',
    assignedStaffIds: ['usr-os-001'],
  },
  {
    supervisorId: 'usr-pimp-002',
    supervisorName: 'Salihin, S.Pd.SD',
    supervisorRole: 'Sekretaris Dinas (Eselon III.a)',
    assignedStaffIds: ['usr-os-001', 'usr-os-002', 'usr-os-003', 'usr-os-004', 'usr-os-005', 'usr-os-006', 'usr-os-007', 'usr-os-008', 'usr-os-009', 'usr-os-010'],
  },
  {
    supervisorId: 'usr-spv-kabid-sarpras',
    supervisorName: 'Bayhaki Novie, S.Pd',
    supervisorRole: 'Kepala Bidang Sarana Prasarana dan Kelembagaan',
    assignedStaffIds: ['usr-os-007', 'usr-os-010'],
  },
  {
    supervisorId: 'usr-spv-kabid-paud',
    supervisorName: 'Andry Rachmat Hidayat, S.Kom',
    supervisorRole: 'Kepala Bidang PAUD dan Pendidikan Masyarakat',
    assignedStaffIds: ['usr-os-006'],
  },
  {
    supervisorId: 'usr-spv-kabid-sd',
    supervisorName: 'Badaruddin, M.Pd',
    supervisorRole: 'Kepala Bidang Pembinaan Sekolah Dasar',
    assignedStaffIds: ['usr-os-005'],
  },
  {
    supervisorId: 'usr-spv-kabid-smp',
    supervisorName: 'Alamsyah Mappaompo, S.Pd. MM',
    supervisorRole: 'Kepala Bidang Pembinaan SMP',
    assignedStaffIds: ['usr-os-008'],
  },
  {
    supervisorId: 'usr-spv-arsip',
    supervisorName: 'Petugas Arsip',
    supervisorRole: 'Pramubakti Kearsipan & Arsiparis',
    assignedStaffIds: ['usr-os-009'],
  },
];

export const INITIAL_SECURITY_CONFIG: import('../types').EnterpriseSecurityConfig = {
  requireGoogleSso: true,
  requireTwoFactorTotp: true,
  requireWebAuthnBiometric: false,
  livenessDetection: true,
  duplicateReportAiDetection: true,
  offlineCryptographicSync: true,
  aiNarrativeSummaryEnabled: true,
  scheduled1630Reminder: true,
};

