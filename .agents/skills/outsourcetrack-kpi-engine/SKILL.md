---
name: outsourcetrack-kpi-engine
description: Logika bisnis dan engine operasional aplikasi OutsourceTrack & KPI Pro Dinas Pendidikan Kab. Hulu Sungai Tengah. Mencakup validasi presensi cerdas WebRTC camera-only (anti-spoofing galeri), kalkulasi geofencing radius kantor menggunakan formula Haversine dengan akurasi GPS < 30m, cetak stempel watermark canvas pada bukti kerja, deteksi duplikasi foto kerja menggunakan AI Perceptual Hashing (dHash dan aHash), perhitungan nilai KPI 4 pilar berbobot, serta visualisasi Spider Radar Chart. Gunakan skill ini saat mengembangkan, memperbaiki, atau menguji modul presensi, laporan tugas harian, kalkulasi skor KPI, dan integrasi Cloudflare/Docker.
---

# OutsourceTrack & KPI Pro: Engine Manajemen Presensi & Penilaian Kinerja Tenaga Outsourcing

Panduan arsitektur bisnis, formula matematis, dan standar teknis aplikasi **OutsourceTrack & KPI Pro** Dinas Pendidikan Kabupaten Hulu Sungai Tengah.

---

## 1. Presensi Cerdas & Validasi Geofencing (Anti-Spoofing)

### A. Kebijakan Kamera WebRTC Khusus
- Presensi wajib menggunakan *stream* kamera langsung melalui `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`.
- **Dilarang keras** menyediakan `<input type="file">` atau upload dari galeri penyimpanan HP untuk mencegah manipulasi foto.

### B. Validasi Koordinat & Formula Haversine
- Syarat akurasi sinyal GPS: `coords.accuracy < 30` meter (standar akurasi tinggi / open-sky).
- Jarak antara staf dan titik kantor penugasan dihitung secara real-time dengan rumus Haversine:
  $$a = \sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos(\varphi_1) \cdot \cos(\varphi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
  $$d = R \cdot c \quad (\text{dengan } R = 6.371.000 \text{ meter})$$
- Jika $d > \text{Radius Toleransi Penugasan}$ (misal $> 50$ meter dari kantor dinas/sekolah), presensi ditandai sebagai status *Di Luar Area* dan mengirimkan `geofence_alert` ke dashboard admin/pengawas.

---

## 2. Pelaporan Tugas Harian & AI Duplicate Detection

### A. Stempel Watermark Canvas Otomatis
Setiap kali staf mengambil foto dokumentasi pekerjaan:
1. Gambar diproyeksikan ke HTML5 Canvas.
2. Canvas otomatis membubuhkan watermark permanen di sudut bawah:
   - Nama Tenaga Outsourcing & NIP/ID Kontrak
   - Timestamp server (WIB)
   - Koordinat Geografis (Latitude, Longitude) & Geocoding Alamat
   - Stempel Identitas Dinas Pendidikan Kab. HST

### B. Deteksi Duplikasi Foto Lapangan (dHash & aHash)
Untuk mencegah penggunaan ulang foto dokumentasi kerja dari hari sebelumnya:
1. Gambar dikonversi ke grayscale resolusi rendah ($8 \times 8$ atau $16 \times 16$).
2. Hitung hash perbedaan kecerahan piksel horizontal (*Difference Hash* - dHash).
3. Hitung jarak Hamming (*Hamming Distance*) terhadap riwayat foto staf dalam 30 hari terakhir:
   $$\text{Similarity \%} = \left(1 - \frac{\text{HammingDistance}}{\text{TotalBits}}\right) \times 100\%$$
4. Jika $\text{Similarity} \ge 85\%$, sistem memunculkan dialog peringatan deteksi duplikasi dan mewajibkan konfirmasi alasan khusus jika memang lokasi kerja identik.

---

## 3. Formula Penilaian Kinerja 4 Pilar & Spider Radar

Evaluasi berkala staf outsourcing dinilai berdasarkan 4 pilar utama dengan bobot standar:

| Pilar Kinerja | Bobot | Parameter Pengukuran |
| :--- | :---: | :--- |
| **1. Kedisiplinan** ($K_1$) | 25% | Ketepatan waktu jam masuk/pulang, rekap kehadiran bulanan, ketepatan geofence. |
| **2. Kualitas Tugas** ($K_2$) | 35% | Jumlah laporan kerja harian valid, kelayakan foto dokumentasi, penyelesaian target bulanan. |
| **3. Tanggung Jawab** ($K_3$) | 20% | Kesiapsiagaan saat instruksi dadakan, kebersihan area penugasan, kelengkapan logbook. |
| **4. Perilaku Kerja** ($K_4$) | 20% | Kerjasama tim, etika komunikasi, kepatuhan atribut seragam dinas. |

### Skor Akhir Terbobot (Total KPI):
$$\text{Total KPI} = (K_1 \times 0.25) + (K_2 \times 0.35) + (K_3 \times 0.20) + (K_4 \times 0.20)$$

### Kategori Predikat:
- **$\ge 90.00$**: Sangat Baik (*A - Sangat Direkomendasikan Perpanjangan Kontrak*)
- **$80.00 - 89.99$**: Baik (*B - Memenuhi Syarat*)
- **$70.00 - 79.99$**: Cukup (*C - Perlu Pembinaan*)
- **$< 70.00$**: Kurang (*D - Evaluasi Kelanjutan Kontrak*)

Visualisasi disajikan dalam bentuk **Spider Radar Chart** menggunakan koordinat poligon radial 4 aksis untuk perbandingan visual capaian vs target.

---

## 4. Konfigurasi Deployment & Akses Jaringan

- **Port Standar**: `3010` (Vite Preview / Express Production Server).
- **Domain Publik**: Cloudflare Tunnel `*.renlapdisdikhst.pro` dengan enkripsi penuh SSL/TLS.
- **PWA Capabilities**: Service worker caching offline untuk form laporan darurat saat sinyal lapangan terputus, sinkronisasi otomatis saat kembali online.
