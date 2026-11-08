# Changelog

Semua perubahan penting pada proyek **OutsourceTrack & KPI Pro** didokumentasikan dalam berkas ini. Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mengikuti standar [Conventional Commits](https://www.conventionalcommits.org/).

---

## [2.5.0] - 2026-11-08

### Ditambahkan (Added)
- **Modul Manajemen Izin & Cuti Terpadu (Smart Leave Pro)**:
  - Form pengajuan izin multi-kategori: Izin Sakit (SKD), Cuti Tahunan (12 hari/tahun), Cuti Alasan Penting, Cuti Bersalin, dan Izin Keperluan Mendesak.
  - Lampiran Bukti Hybrid: Pengambilan foto fisik surat keterangan dokter via kamera WebRTC ber-watermark atau unggah berkas foto/PDF dokumen medis hingga 5MB.
  - Sinkronisasi Presensi Otomatis: Persetujuan oleh atasan langsung (`APPROVED`) secara otomatis menginjeksi rekam kehadiran pada rentang tanggal terkait di database SQLite dengan status `'Sakit'` atau `'Izin'`, mencegah status Alpha dan alarm geofence.
  - Saldo Kuota Hak Cuti Terukur: Visual meter saldo sisa cuti tahunan, jumlah cuti terpakai, dan akumulasi izin sakit yang terintegrasi langsung ke profil staf.
  - Antarmuka Supervisor (Sub-tab Verifikasi Izin & Cuti): Dashboard review permohonan staf binaan, badge tiket pending, inspeksi berkas SKD/PDF, serta aksi persetujuan dengan arahan atasan.
  - Format Cetak Naskah Dinas (Surat Keterangan Izin/Cuti Resmi): Opsi cetak baru `surat-izin` pada modal cetak laporan dengan KOP Pemkab HST & Disdik dinamis serta tanda tangan definitif Sekretaris Dinas.
  - Skema Database SQLite `leave_requests` dan REST API endpoints: `POST /api/leave/request`, `GET /api/leave`, `PATCH /api/leave/:id/approve`, dan `GET /api/leave/quota/:staffId`.

- **Perombakan Peran Koordinator / Pengawas Lapangan Mitra (`coordinator`)**:
  - Penambahan peran baru `coordinator` pada sistem RBAC 4 level (`outsourcing`, `coordinator`, `supervisor`, `admin`).
  - Form registrasi mandiri Pengawas Lapangan di `AuthView` dengan pemilihan kelompok binaan vendor/peserta magang (`supervisedGroups`).
  - Hak akses supervisi khusus di `Sidebar` dan `Header`: badge status amber, akses ke Monitoring Presensi, Persetujuan Laporan, Riwayat Lembur, dan Rekapitulasi KPI.
  - Scoping otomatis data kehadiran di `AdminAttendanceView`: Pengawas hanya melihat staf dan absensi di kelompok vendor binaannya.
  - Mode Pantau Evaluasi 4 Pilar (*Read-Only*) di `SupervisorEvaluationView`: Menampilkan banner lock informasi; nilai bintang dikunci untuk menjamin objektivitas (penilaian definitif tetap menjadi wewenang Pejabat Penilai Disdik HST).
  - Integrasi master pengguna di `SystemSettingsView`: Formulir pendaftaran akun koordinator dengan penugasan kelompok vendor yang diawasi.
  - Penyimpanan persisten kolom `supervised_groups` dan prefix ID `usr-coord-...` di database SQLite.

---

## [2.4.0] - 2026-11-08

### Ditambahkan (Added)
- **Modul Tugas Lembur Resmi (Overtime Pro)**:
  - Form pengajuan izin lembur resmi dengan alasan kedinasan mendesak dan estimasi jam.
  - Alur persetujuan (*approval workflow*) berjenjang oleh atasan langsung / supervisor sebelum lembur dapat dimulai.
  - Presensi mulai & selesai lembur via kamera WebRTC selfie langsung dengan validasi GPS geofencing radius kantor.
  - Validasi durasi lembur sah minimal 60 menit (1 Jam) sesuai standar pertanggungjawaban audit keuangan.
  - Form input ringkasan output kerja (*work summary*) dan bukti visual pelaksanaan lembur.
  - Tabel SQLite `overtime_requests` beserta REST endpoints: `/api/overtime/request`, `/api/overtime`, `/api/overtime/:id/approve`, `/api/overtime/:id/start`, dan `/api/overtime/:id/finish`.
- **Cetak Surat Perintah Tugas Lembur (SPTL)**:
  - Mode cetak baru `sptl-lembur` pada modal cetak laporan (`PrintReportModal`).
  - Format standar naskah dinas resmi lengkap dengan nomor surat, konsiderans kebutuhan dinas, tabel rekapitulasi realisasi jam lembur staf, dan kolom tanda tangan pejabat penandatangan definitif.
- **Konfigurasi Identitas Instansi & Kop Surat Dinamis (Multi-SKPD)**:
  - Interface `InstitutionSettings` dan preset dinamis Disdik Kab. HST.
  - Form pengaturan kop surat instansi di tab baru `SystemSettingsView`: nama pemda, nama SKPD, alamat lengkap, telepon, email, website, prefix nomor surat, logo ganda (daerah & instansi), dan data pejabat penandatangan (Sekretaris Dinas Pendidikan: Salihin, S.Pd.SD / NIP 19780502 200604 1 017).
  - Endpoint REST `/api/settings/institution` dan penyimpanan persisten di SQLite tabel `system_settings`.
- **Aset Grafis Resmi Kedinasan**:
  - Logo resmi Kabupaten Hulu Sungai Tengah (`Lambang_Kabupaten_Hulu_Sungai_Tengah.png` & `logo-pemda-hst.svg`).
  - Logo resmi Dinas Pendidikan Kab. HST 2026 (`logo-disdik2026.png` & `logo-disdik.svg`).

### Diperbaiki (Fixed)
- **Skema Presensi Penjaga Malam (Wakar) Lintas Hari**:
  - Proteksi cron auto-close midnight: jadwal jaga malam tidak lagi di-auto-close pada pukul 23:59/00:00.
  - Logika pencarian record clock-out di pagi hari memprioritaskan sesi masuk malam kemarin (H-1) sehingga sesi presensi terhubung utuh.
- **Scoping Otoritas & Hierarki Supervisor**:
  - Sinkronisasi kolom `supervisor_id` pada tabel `users` di database SQLite via `/api/admin/supervisor-mapping`.
  - Supervisor hanya dapat melihat daftar staf binaan, feed laporan harian, dan tiket lembur yang ditugaskan di bawah unit kerjanya.
  - Restriksi menu navigasi sidebar khusus peran supervisor (hanya evaluasi dan pemantauan).
- **Perbaikan UI Modal & Bug**:
  - Memperbaiki `ReferenceError: staff is not defined` pada feed laporan kerja supervisor.
  - Mengimpor komponen ikon `X` dari `lucide-react` pada modal lembur staf.
  - Menetapkan nilai default skor evaluasi pilar kinerja ke 1 bintang (mencegah nilai 0/null merusak poligon Spider Radar Chart).
  - Memperbaiki event klik sub-tab clock-out pada modal detail kehadiran agar tidak me-reset state dan mencegah Leaflet Map mengalami freeze/memory leak.

---

## [2.3.0] - 2026-11-07

### Ditambahkan (Added)
- **Unifikasi Modal Inspeksi Kehadiran**:
  - Penggabungan modal inspeksi admin dan atasan dengan komponen `DetailRiwayatModal`.
  - Peta interaktif Leaflet untuk titik koordinat presensi masuk, istirahat, dan pulang.
  - Tab switcher bukti visual tugas lapangan dan status akurasi GPS open-sky (< 30 meter).

### Diperbaiki (Fixed)
- Penanganan tampilan informatif pada sesi presensi historis yang belum memiliki snapshot foto pulang.

---

## [2.2.0] - 2026-10-31

### Ditambahkan (Added)
- Fitur AI Duplicate Detection laporan harian berbasis Perceptual Hashing (dHash & aHash 256-bit).
- Formula Geofencing Haversine akurasi tinggi dengan toleransi radius kantor.
- Stempel watermark otomatis pada HTML5 canvas bukti dokumentasi kerja.
