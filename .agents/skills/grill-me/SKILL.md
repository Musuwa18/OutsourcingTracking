---
name: grill-me
description: Use when stress-testing technical plans, architectures, feature designs, or trade-offs before implementation. Conducts a rigorous, structured interview probing edge cases, backward compatibility, data integrity, and rollback strategies one question at a time with recommended answers.
---

# Grill-Me: Pre-Implementation Interrogation & Stress-Testing

Gunakan skill ini sebelum menulis kode atau mengimplementasikan fitur besar, refactoring berisiko tinggi, atau perubahan arsitektur kritis.

## Tujuan Utama
Membedah dan menguji rencana secara kritis agar seluruh asumsi implisit, celah logika, *edge cases*, risiko kegagalan, dan implikasi performa/keamanan teridentifikasi dan disepakati sebelum eksekusi kode dilakukan.

---

## Aturan Sesi Grill-Me

1. **Satu Topik / Pertanyaan Terarah Per Putaran**:
   - Ajukan pertanyaan tajam dan langsung ke inti persoalan teknis.
   - Jangan membanjiri pengguna dengan puluhan pertanyaan terbuka sekaligus; fokuskan pada 1–3 pilihan konkret dengan opsi rekomendasi jelas.
   - Jika jawaban dapat ditemukan dengan menelusuri basis kode (*codebase exploration*), telusuri basis kode terlebih dahulu sebelum bertanya ke pengguna.

2. **Fokus Interogasi Kritis**:
   - **Asumsi Data & Skema**: Apakah skema database kompatibel mundur (*backward compatible*)? Bagaimana jika terjadi migrasi atau kegagalan transaksi?
   - **Validasi & Integritas**: Apa dampak terhadap aturan bisnis utama (seperti geofencing Haversine, anti-spoofing kamera WebRTC, dan perhitungan skor KPI)?
   - **Edge Cases & Failure Modes**: Apa yang terjadi jika jaringan offline, GPS melompat (*location spoofing/jitter*), atau beban request tinggi?
   - **Rollback & Pemulihan**: Jika deploy gagal atau bug lolos ke produksi, bagaimana prosedur pemulihan data instan?
   - **Kredensial & Keamanan**: Apakah ada data sensitif, plain-text token, atau kebocoran akses publik?

3. **Format Rekomendasi**:
   - Untuk setiap pertanyaan, selalu sertakan jawaban rekomendasi Anda beserta alasan teknis (*trade-off*).
   - Pilihlah pendekatan yang paling membosankan, stabil, dan minim risiko (*boring technology & minimal allocation*).

4. **Sintesis Akhir**:
   - Setelah seluruh cabang pohon keputusan terjawab dan disepakati, rangkum rencana eksekusi final yang kedap risiko ke dalam checklist tugas siap eksekusi.
