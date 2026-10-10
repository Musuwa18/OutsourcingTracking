/**
 * Express Production Server for OutsourceTrack & KPI Pro
 * Integrasi Database SQLite, Penyimpanan Berkas Foto /uploads/, dan REST API Autentikasi.
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  hashPassword,
  getUserByEmailOrNip,
  getUserById,
  createUser,
  updateUserDevice,
  listUsersByDivision,
  listDivisions,
  saveAttendance,
  listAttendance,
  saveDailyReport,
  listDailyReports,
  approveReport,
  saveEvaluation,
  listEvaluations,
} from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3010;
const DIST_DIR = path.join(__dirname, 'dist');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Parsing JSON & URL-encoded dengan limit besar untuk foto base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security & Caching Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Sajikan berkas foto statis dari folder uploads/
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '30d',
  etag: true
}));

// ======================= REST API ROUTES =======================

// 1. Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    app: 'OutsourceTrack & KPI Pro',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
  try {
    const usernameOrEmail = req.body.usernameOrEmail || req.body.identifier || req.body.email || req.body.nip;
    const { password, deviceId, biometricKey } = req.body;
    if (!usernameOrEmail) {
      return res.status(400).json({ error: 'Username, Email, atau NIP wajib diisi.' });
    }

    const user = getUserByEmailOrNip(usernameOrEmail);
    if (!user) {
      return res.status(401).json({ error: 'Akun tidak ditemukan. Periksa kembali NIP atau Email Anda.' });
    }

    // Cek password jika bukan login via biometricKey yang valid
    if (password) {
      const hashedInput = hashPassword(password);
      if (user.passwordHash !== hashedInput) {
        return res.status(401).json({ error: 'Kata sandi tidak sesuai. Silakan coba lagi.' });
      }
    } else if (biometricKey) {
      if (user.biometricKey !== biometricKey) {
        return res.status(401).json({ error: 'Verifikasi biometrik tidak cocok.' });
      }
    } else {
      return res.status(400).json({ error: 'Kata sandi atau kredensial biometrik diperlukan.' });
    }

    // Device binding check / update
    if (deviceId && !user.deviceId) {
      updateUserDevice(user.id, deviceId);
      user.deviceId = deviceId;
    }

    // Token sesi sederhana
    const token = `ot_token_${user.id}_${Date.now()}`;
    const { passwordHash, ...safeUserData } = user;

    res.json({
      success: true,
      token,
      user: safeUserData
    });
  } catch (err) {
    console.error('[API Error] Login:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat login.' });
  }
});

// 3. Auth: Register
app.post('/api/auth/register', (req, res) => {
  try {
    const {
      nip,
      name,
      email,
      password,
      role,
      divisionId,
      divisionName,
      roleTitle,
      phone,
      vendorName,
      deviceId
    } = req.body;

    if (!nip || !name || !email || !password || !role || !divisionId) {
      return res.status(400).json({ error: 'Seluruh kolom bertanda wajib harus dilengkapi.' });
    }

    // Periksa apakah email atau NIP sudah terdaftar
    const existing = getUserByEmailOrNip(email) || getUserByEmailOrNip(nip);
    if (existing) {
      return res.status(409).json({ error: 'Email atau NIP sudah terdaftar dalam sistem.' });
    }

    const newUser = createUser({
      nip,
      name,
      email,
      password,
      role,
      divisionId,
      divisionName: divisionName || 'Sub Bagian Dinas',
      roleTitle: roleTitle || (role === 'outsourcing' ? 'Tenaga Outsourcing' : 'Atasan Langsung'),
      phone,
      vendorName,
      deviceId
    });

    const token = `ot_token_${newUser.id}_${Date.now()}`;
    const { passwordHash, ...safeUserData } = newUser;

    res.status(201).json({
      success: true,
      message: 'Registrasi akun berhasil.',
      token,
      user: safeUserData
    });
  } catch (err) {
    console.error('[API Error] Register:', err);
    res.status(500).json({ error: 'Gagal melakukan pendaftaran akun.' });
  }
});

// 4. Auth: Get Current Profile
app.get('/api/auth/me', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Sesi tidak valid.' });
    }

    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const { passwordHash, ...safeUserData } = user;
    res.json({ success: true, user: safeUserData });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat profil pengguna.' });
  }
});

// 5. Auth: Bind Device & Biometric
app.post('/api/auth/device-bind', (req, res) => {
  try {
    const { userId, deviceId, biometricKey } = req.body;
    if (!userId || !deviceId) {
      return res.status(400).json({ error: 'ID Pengguna dan ID Perangkat diperlukan.' });
    }

    updateUserDevice(userId, deviceId, biometricKey);
    res.json({ success: true, message: 'Perangkat dan biometrik berhasil ditautkan.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menautkan perangkat.' });
  }
});

// 6. Master Divisions
app.get('/api/divisions', (req, res) => {
  try {
    const divisions = listDivisions();
    res.json({ success: true, divisions });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat master divisi.' });
  }
});

// 7. Users / Staff by Division
app.get('/api/staff', (req, res) => {
  try {
    const divisionId = req.query.divisionId;
    const users = listUsersByDivision(divisionId);
    res.json({ success: true, staff: users });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat data staf.' });
  }
});

// 8. Attendance
app.get('/api/attendance', (req, res) => {
  try {
    const { staffId, divisionId, date } = req.query;
    const records = listAttendance({ staffId, divisionId, date });
    res.json({ success: true, attendance: records });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat riwayat presensi.' });
  }
});

app.post('/api/attendance', (req, res) => {
  try {
    const saved = saveAttendance(req.body);
    res.status(201).json({ success: true, attendance: saved });
  } catch (err) {
    console.error('[API Error] Save Attendance:', err);
    res.status(500).json({ error: 'Gagal menyimpan data presensi.' });
  }
});

// 9. Daily Reports
app.get('/api/reports', (req, res) => {
  try {
    const { staffId, divisionId } = req.query;
    const reports = listDailyReports({ staffId, divisionId });
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat laporan kerja.' });
  }
});

app.post('/api/reports', (req, res) => {
  try {
    const saved = saveDailyReport(req.body);
    res.status(201).json({ success: true, report: saved });
  } catch (err) {
    console.error('[API Error] Save Report:', err);
    res.status(500).json({ error: 'Gagal mengirim laporan kerja harian.' });
  }
});

app.patch('/api/reports/:id/approve', (req, res) => {
  try {
    const reportId = req.params.id;
    const { approvalStatus, supervisorNotes } = req.body;
    approveReport(reportId, approvalStatus || 'Approved', supervisorNotes || '');
    res.json({ success: true, message: 'Status laporan berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui status persetujuan laporan.' });
  }
});

// 10. Evaluations
app.get('/api/evaluations', (req, res) => {
  try {
    const { staffId, divisionId } = req.query;
    const evals = listEvaluations({ staffId, divisionId });
    res.json({ success: true, evaluations: evals });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat data evaluasi mingguan.' });
  }
});

app.post('/api/evaluations', (req, res) => {
  try {
    const saved = saveEvaluation(req.body);
    res.status(201).json({ success: true, evaluation: saved });
  } catch (err) {
    console.error('[API Error] Save Evaluation:', err);
    res.status(500).json({ error: 'Gagal menyimpan evaluasi kinerja.' });
  }
});

// Sajikan berkas statis dari direktori dist/
app.use(express.static(DIST_DIR, {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Fallback semua rute client-side (SPA) ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 OutsourceTrack & KPI Pro Server Aktif (SQLite & File Storage)`);
  console.log(`📍 Port Internal: http://0.0.0.0:${PORT}`);
  console.log(`📁 Uploads Dir  : ${UPLOADS_DIR}`);
  console.log(`🌐 Public URL   : ${process.env.VITE_APP_URL || 'https://outsourcing.renlapdisdikhst.pro'}`);
  console.log(`====================================================`);
});
