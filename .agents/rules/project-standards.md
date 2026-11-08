# OutsourceTrack & KPI Pro - Project Standards & Architecture Guide

## 1. Overview & Purpose
OutsourceTrack & KPI Pro adalah aplikasi web modern (PWA-ready) terintegrasi untuk manajemen dan evaluasi kinerja tenaga outsourcing. Aplikasi ini dirancang untuk operasional presensi mobile (staf di lapangan) dan monitoring administrasi serta evaluasi KPI 4 pilar di desktop (supervisor/admin).

## 2. Core Architecture & Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Framer Motion (motion)
- **Design System**: Material Glass Acrylic (Frosted Glass with backdrop blur, specular borders, dynamic ambient glowing mesh lights)
- **Icons**: Lucide React (`lucide-react`)
- **State Management**: React Hooks + LocalStorage Persistence
- **Production Server**: Docker Nginx Alpine / Express Node.js (Port default: `3010`)
- **Deployment & Gateway**: Cloudflare Tunnel (`*.renlapdisdikhst.pro`) with full HTTPS/SSL

## 3. Key Modules & Business Logic
### A. Presensi Cerdas (Clock In / Clock Out)
- **WebRTC Camera Only**: Mengakses kamera selfie langsung via `navigator.mediaDevices.getUserMedia`. Dilarang menyediakan opsi file input / upload galeri untuk mencegah pemalsuan foto.
- **Anti-Fake Location & Geofencing**:
  - Filter akurasi GPS: `coords.accuracy < 30 meter` (standar open-sky).
  - Jarak dihitung otomatis menggunakan formula Haversine terhadap koordinat kantor penugasan.
  - Jika berada di luar radius penugasan, sistem memicu notifikasi peringatan berprioritas tinggi (`geofence_alert`) ke dashboard atasan.
- **Server Timestamp Locking**: Waktu presensi menggunakan jam tersinkronisasi server/standar WIB.

### B. Pelaporan Tugas Harian & AI Duplicate Detection
- **Watermark Camera**: Canvas secara otomatis mencetak stempel resmi berupa nama staf, NIP, tanggal, jam server, koordinat GPS, dan alamat lokasi.
- **AI Perceptual Hashing (dHash & aHash)**:
  - Setiap foto diekstrak sidik jari visual 256-bit dan dihitung kemiripannya (Hamming distance & cosine similarity).
  - Jika terdeteksi kemiripan visual >= 85%, sistem menampilkan modal konfirmasi AI Duplicate Detection untuk mencegah duplikasi laporan kerja dari hari-hari sebelumnya.

### C. Penilaian Kinerja 4 Pilar & Spider Radar Chart
Evaluasi berkala mingguan (setiap Jumat) mencakup 4 pilar (11 indikator 1-5 bintang):
1. **Pilar A: Kualitas & Produktivitas Kerja** (Quality of Work, Quantity of Work, Time Management)
2. **Pilar B: Sikap Kerja & Profesionalisme** (Initiative, Accountability, Punctuality)
3. **Pilar C: Kompetensi Interpersonal** (Teamwork, Communication, Customer Orientation)
4. **Pilar D: Adaptabilitas & Pemecahan Masalah** (Adaptability, Problem Solving)
Agregasi bulanan menghitung rata-rata Minggu 1-4, menghasilkan predikat otomatis (Sangat Baik / Baik / Cukup / Kurang) dan rekomendasi perpanjangan kontrak outsourcing.

### D. Pusat Pengaturan Sistem (Administration & Security)
- **Master Lokasi**: CRUD multi-lokasi penugasan dengan Visual Map Picker dan slider toleransi radius.
- **User Management & Device Binding**: 1 Akun = 1 HP (UUID/fingerprint perangkat). Tombol admin "Reset Kunci Perangkat".
- **Dynamic RBAC**: Permission Matrix untuk 4 peran (Outsourcing, Koordinator, Supervisor, Super Admin).
- **Enterprise Security**: Google Workspace SSO, 2FA TOTP Authenticator, Audit Log Trail.

### E. Tugas Lembur Resmi (Overtime Pro) & SPTL Kedinasan
- **Validasi Lokasi Lembur**: Lembur wajib dilakukan di kantor dinas (geofence radius terverifikasi).
- **Persetujuan Berjenjang**: Pengajuan wajib disetujui atasan langsung (Supervisor) sebelum staf dapat melakukan presensi mulai lembur.
- **Durasi Minimal Sah**: Standar keuangan daerah mewajibkan durasi lembur minimal **60 menit (1 Jam)**. Clock-out ditolak jika durasi < 60 menit.
- **Bukti & Output Kerja**: Wajib melampirkan foto selfie WebRTC di kantor serta ringkasan hasil kerja (*work summary*).
- **Format Cetak Dokumen**: Tersedia mode cetak Surat Perintah Tugas Lembur (SPTL) resmi sesuai tata naskah dinas di modal cetak laporan.

### F. Presensi Wakar / Jaga Malam Lintas Hari (Overnight Shift)
- **Jadwal Kerja Lintas Hari**: Jam masuk malam (19:30 - 21:00 WITA) dan jam pulang pagi hari berikutnya (05:30 - 07:00 WITA).
- **Proteksi Auto-Close**: Pengecualian auto-close pukul 23:59/00:00 untuk posisi Jaga Malam/Wakar.
- **Pencarian Sesi Masuk H-1**: Logika clock-out subuh/pagi otomatis mengaitkan kehadiran ke sesi tanggal kemarin ($D-1$).

### G. Identitas Instansi & Kop Surat Dinamis (Multi-SKPD)
- **Replikasi Antar-SKPD**: Konfigurasi nama pemda, SKPD, alamat, nomor surat, logo ganda (daerah & dinas), dan pejabat penandatangan tersimpan dinamis di SQLite (`system_settings`).
- **Pejabat Penandatangan Definitif**: Sekretaris Dinas Pendidikan (`Salihin, S.Pd.SD`, NIP `19780502 200604 1 017`).

## 4. HTTPS & Sensor Requirements (Mobile PWA)
- Fitur `navigator.mediaDevices.getUserMedia` dan `navigator.geolocation` **wajib** dijalankan di atas protokol **HTTPS** (Secure Context) agar dapat beroperasi di smartphone Android/iOS.
- Di lingkungan VPS, aplikasi disajikan di belakang Cloudflare Tunnel (`https://outsourcing.renlapdisdikhst.pro`) yang menyediakan SSL/TLS otomatis.

## 5. Akun Sandbox / Test & Trial Pengembang
- **Nama Akun**: `Musuwarahmi`
- **NIP / ID**: `19821218`
- **Jabatan**: Administrasi Perkantoran
- **Unit / Divisi**: Sub Bagian Perencanaan dan Pelaporan (`div-renlap`)
- **Vendor**: PT. YASMINE BUIH PERSADA
- **Lokasi Tugas**: Kantor Dinas Pendidikan Kab. Hulu Sungai Tengah
- **Catatan**: Akun resmi pengujian (*test and trial*) langsung oleh user pengembang untuk memverifikasi alur presensi, geofencing, laporan kinerja, dan evaluasi.
