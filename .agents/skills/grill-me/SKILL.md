---
name: grill-me
description: Use to rigorously interview, interrogate, and stress-test technical plans, architectures, feature designs, or trade-offs before implementation. Probes edge cases, security, data integrity, and rollback strategies with sharp questions.
---

# Grill-Me: Pre-Implementation Interrogation & Stress-Testing

Gunakan skill ini sebelum menulis kode atau mengimplementasikan fitur besar, refactoring berisiko tinggi, atau perubahan arsitektur kritis.

## Tujuan Utama
Membedah dan menguji rencana secara kritis agar seluruh asumsi implisit, celah logika, *edge cases*, resiko kegagalan, dan implikasi performa/keamanan teridentifikasi dan disepakati sebelum eksekusi.

---

## Aturan Sesi Grill-Me

1. **Satu Topik / Pertanyaan Terarah Per Putaran**:
   - Ajukan pertanyaan tajam dan langsung ke inti persoalan teknis.
   - Jangan membanjiri pengguna dengan puluhan pertanyaan terbuka sekaligus; fokuskan pada 1–3 pilihan konkret dengan opsi rekomendasi jelas.

2. **Fokus Interogasi Kritis**:
   - **Asumsi Data & Skema**: Apakah skema database kompatibel mundur (*backward compatible*)? Bagaimana jika terjadi migrasi atau kegagalan transaksi?
   - **Validasi & Integritas**: Apa dampak terhadap aturan bisnis utama (seperti geofencing Haversine, anti-spoofing kamera WebRTC, dan perhitungan skor KPI)?
   - **Edge Cases & Failure Modes**: Apa yang terjadi jika jaringan offline, GPS melompat (*location spoofing/jitter*), atau beban request tinggi?
   - **Rollback & Pemulihan**: Jika deploy gagal atau bug lolos ke produksi, bagaimana prosedur pemulihan data instan?
   - **Kredensial & Keamanan**: Apakah ada data sensitif, plain-text token, atau kebocoran akses publik?

3. **Format Rekomendasi**:
   - Selalu sertakan alasan teknis (*trade-off*) di balik opsi yang direkomendasikan.
   - Pilihlah pendekatan yang paling membosankan, stabil, dan minim risiko (*boring technology & minimal allocation*).

4. **Sintesis Akhir**:
   - Setelah semua celah terjawab dan disepakati, rangkum rencana eksekusi final yang kedap risiko ke dalam checklist tugas siap eksekusi.
