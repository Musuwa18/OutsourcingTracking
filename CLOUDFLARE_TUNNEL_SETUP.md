# Panduan Lengkap Integrasi Cloudflare Tunnel & VPS Deployment
**Aplikasi: OutsourceTrack & KPI Pro**  
**Domain Utama: `renlapdisdikhst.pro`**  
**Subdomain Target: `https://outsourcing.renlapdisdikhst.pro`** (atau `https://kpi.renlapdisdikhst.pro`)  
**Port Internal VPS: `3005`**

---

## 1. Mengapa Menggunakan Cloudflare Tunnel?
Pada domain Anda (`renlapdisdikhst.pro`), Cloudflare Tunnel telah aktif dan melayani aplikasi SPJ serta SAMPAN-HST. Dengan memanfaatkan tunnel yang sama untuk aplikasi ini:
1. **Kamera WebRTC & GPS Langsung Aktif di HP**: Browser modern (Chrome/Safari) mewajibkan koneksi **HTTPS** untuk membuka akses kamera selfie dan GPS. Cloudflare Tunnel otomatis menyediakan sertifikat SSL tanpa perlu konfigurasi Certbot.
2. **Tanpa Buka Port Publik**: Port internal `3005` hanya mendengarkan di `127.0.0.1` VPS. Tidak ada port yang terbuka bebas ke internet.
3. **PWA Terisolasi**: Subdomain `outsourcing.renlapdisdikhst.pro` memiliki penyimpanan `localStorage` dan ikon PWA mandiri sehingga tidak bercampur dengan SPJ atau SAMPAN.

---

## 2. Langkah 1: Hubungkan Subdomain di Cloudflare Tunnel (1 Menit)

Pilih salah satu metode sesuai cara Anda mengelola Cloudflare Tunnel:

### Metode A: Melalui Cloudflare Zero Trust Dashboard (Web GUI) - *Paling Mudah*
1. Buka dashboard Cloudflare: [https://one.dash.cloudflare.com/](https://one.dash.cloudflare.com/)
2. Di menu sebelah kiri, pilih **Networks** &rarr; **Tunnels**.
3. Klik nama tunnel Anda yang sedang aktif &rarr; klik tombol **Configure**.
4. Masuk ke tab **Public Hostnames** &rarr; klik tombol **Add a public hostname**.
5. Isi konfigurasi berikut:
   * **Subdomain**: `outsourcing` (atau `kpi`)
   * **Domain**: `renlapdisdikhst.pro`
   * **Path**: *(kosongkan)*
   * **Type**: `HTTP`
   * **URL**: `localhost:3005` (atau `127.0.0.1:3005`)
6. Klik **Save hostname** di pojok kanan bawah. Selesai! Subdomain langsung aktif secara global dalam beberapa detik.

---

### Metode B: Melalui Berkas Konfigurasi `config.yml` di Terminal VPS
Jika tunnel Anda dijalankan menggunakan file konfigurasi lokal di VPS (biasanya di `/etc/cloudflared/config.yml` atau `~/.cloudflared/config.yml`):
1. Buka file konfigurasi tunnel:
   ```bash
   sudo nano /etc/cloudflared/config.yml
   ```
2. Tambahkan aturan routing ingress untuk subdomain `outsourcing.renlapdisdikhst.pro`:
   ```yaml
   ingress:
     # Routing baru untuk OutsourceTrack & KPI Pro
     - hostname: outsourcing.renlapdisdikhst.pro
       service: http://localhost:3005

     # Routing yang sudah ada sebelumnya (contoh):
     - hostname: spj.renlapdisdikhst.pro
       service: http://localhost:80
     - hostname: agenda.renlapdisdikhst.pro
       service: http://localhost:8080
     
     # Fallback wajib di baris paling bawah:
     - service: http_status:404
   ```
3. Simpan file (`Ctrl + O`, `Enter`, lalu `Ctrl + X`), kemudian restart service cloudflared:
   ```bash
   sudo systemctl restart cloudflared
   ```

---

## 3. Langkah 2: Jalankan Aplikasi di VPS

Login ke VPS Anda via SSH dan jalankan langkah-langkah berikut:

```bash
# 1. Pindah ke direktori proyek di VPS (atau clone jika belum ada)
git clone git@github.com:Musuwa18/OutsourcingTracking.git
cd OutsourcingTracking

# 2. Ambil update terbaru dari branch main
git pull origin main

# 3. Jalankan skrip otomatis deployment
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Opsi Eksekusi Manual (Jika Memilih Tanpa Skrip):

#### A. Menggunakan Docker Compose (Direkomendasikan):
```bash
docker compose up -d --build
```
*Periksa status kontainer:*
```bash
docker ps
curl http://127.0.0.1:3005/health
```

#### B. Menggunakan Node.js & PM2 (Tanpa Docker):
```bash
npm install
npm run build
pm2 start server.js --name outsource-track --env PORT=3005
pm2 save
```

---

## 4. Langkah 3: Uji Coba dari Smartphone (Android / iOS)

1. Buka browser HP Anda (Google Chrome di Android atau Safari di iPhone).
2. Kunjungi tautan: **`https://outsourcing.renlapdisdikhst.pro`**
3. **Uji Fitur Presensi Cerdas**:
   * Klik tombol **Presensi Cerdas (Clock In)** di beranda.
   * Saat browser meminta izin:
     * Pilih **"Izinkan saat menggunakan aplikasi"** untuk Kamera.
     * Pilih **"Izinkan"** untuk Lokasi (GPS).
   * Pastikan video selfie live WebRTC tampil jernih dengan panduan oval.
   * Tekan tombol Ambil Foto dan kirim presensi.
4. **Uji Fitur Watermark & AI Duplicate Detection**:
   * Buka formulir Laporan Tugas Harian.
   * Ambil foto bukti pekerjaan: periksa apakah stempel visual (Nama, NIP, Tanggal, Jam, Koordinat GPS) tercetak rapi.
   * Coba fitur tombol demo deteksi duplikat AI untuk memastikan algoritma *perceptual hash* berfungsi.
5. **Pasang sebagai Aplikasi PWA**:
   * Di browser HP, tekan menu titik tiga (Chrome) &rarr; pilih **"Tambahkan ke Layar Utama" (Install App)**.
   * Di iPhone (Safari), tekan tombol Share &rarr; pilih **"Add to Home Screen"**.
   * Aplikasi akan terpasang di layar utama dengan ikon resmi layaknya aplikasi Android/iOS asli.

---

## 5. Bonus: Menambahkan Kartu ke-3 di Portal Landing Page `renlapdisdikhst.pro`

Jika Anda ingin menampilkan aplikasi ini di halaman depan portal kedinasan `https://renlapdisdikhst.pro/` berdampingan dengan Kartu SPJ dan Kartu SAMPAN-HST, Anda dapat menyisipkan blok kode HTML berikut pada grid kartu aplikasi Anda:

```html
<!-- CARD 3: APLIKASI OUTSOURCETRACK & KPI PRO -->
<div class="card-hover-effect rounded-2xl bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm group hover:border-indigo-500/50">
  <div class="absolute -right-12 -top-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
  
  <div>
    <div class="flex items-center justify-between mb-5">
      <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-slate-900 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white p-3">
        <!-- Icon Clipboard / Star -->
        <svg class="w-7 h-7 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
        Kepegawaian & Kinerja
      </span>
    </div>

    <h3 class="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
      OutsourceTrack & KPI Pro
    </h3>
    
    <p class="text-slate-300 text-sm mb-6 leading-relaxed">
      Sistem manajemen presensi cerdas WebRTC, anti-fake GPS, pelaporan tugas ber-watermark, dan penilaian kinerja berkala 4 pilar tenaga outsourcing Disdik HST.
    </p>

    <ul class="space-y-2 mb-8 text-xs sm:text-sm text-slate-300">
      <li class="flex items-center gap-2">
        <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Presensi Cerdas Selfie Live & Geofencing Anti-Fake
      </li>
      <li class="flex items-center gap-2">
        <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Laporan Harian Watermark & Deteksi Duplikat AI
      </li>
      <li class="flex items-center gap-2">
        <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Evaluasi KPI 4 Pilar & Spider Radar Chart Bulanan
      </li>
    </ul>
  </div>

  <div>
    <a href="https://outsourcing.renlapdisdikhst.pro" class="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 group-hover:shadow-indigo-500/40">
      <span>Buka OutsourceTrack & KPI Pro</span>
      <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </a>
    <div class="mt-2.5 text-center">
      <span class="text-[11px] text-slate-400">Jalur Cepat: <code class="text-indigo-300 font-mono">outsourcing.renlapdisdikhst.pro</code></span>
    </div>
  </div>
</div>
```
