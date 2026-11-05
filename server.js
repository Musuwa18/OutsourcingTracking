/**
 * Express Production Server for OutsourceTrack & KPI Pro
 * Integrasi Database SQLite, Penyimpanan Berkas Foto /uploads/, REST API Autentikasi,
 * dan Gemini AI Data Analytics Engine Disdik Kab. Hulu Sungai Tengah.
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
  updateUserLocation,
  updateUserSupervisor,
  listUsersByDivision,
  listDivisions,
  createDivision,
  updateDivision,
  deleteDivision,
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  listAllUsers,
  resetUserPassword,
  changeUserPassword,
  updateUserProfile,
  deleteUser,
  saveAttendance,
  listAttendance,
  saveDailyReport,
  listDailyReports,
  approveReport,
  saveEvaluation,
  listEvaluations,
  getLiveAnalyticsContext,
  listLocations,
  saveLocations,
  createLocation,
  deleteLocation,
  getAttendanceSettings,
  saveAttendanceSettings,
  autoClosePreviousDayAttendance,
} from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3010;
const DIST_DIR = path.join(__dirname, 'dist');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Master Daftar Lokasi Kerja Resmi di Kabupaten Hulu Sungai Tengah (3 Lokasi Resmi)
export const PRIMARY_OFFICES = [
  {
    id: 'loc-disdik-hst',
    name: 'Kantor Dinas Pendidikan Kab. Hulu Sungai Tengah',
    address: 'Jalan Sibli Imansyah No. 01',
    latitude: -2.591165664588203,
    longitude: 115.3736617167045,
    radiusMeters: 100,
  },
  {
    id: 'loc-balai-gtk',
    name: 'Balai Belajar GTK',
    address: 'Jalan Hevea',
    latitude: -2.5852061347338484,
    longitude: 115.38895848670282,
    radiusMeters: 85,
  },
  {
    id: 'loc-workshop-banua',
    name: 'Gudang WorkShop Banua Hanyar',
    address: 'Desa Banua Hanyar',
    latitude: -2.5974671727527188,
    longitude: 115.34398742731446,
    radiusMeters: 90,
  },
];

// Parsing JSON & URL-encoded dengan limit besar untuk foto base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Tangani error parsing JSON secara graceful agar server tidak crash saat menerima payload malformed
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Format JSON payload tidak valid.' });
  }
  next(err);
});

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
    agency: 'Dinas Pendidikan Kabupaten Hulu Sungai Tengah',
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

    // Cek status aktif / nonaktif akun oleh Administrator
    if (user.status === 'Nonaktif') {
      return res.status(403).json({
        error: 'Akun Anda sedang dinonaktifkan oleh Administrator. Silakan hubungi Sub Bagian Umum dan Kepegawaian Disdik HST.'
      });
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

    // ----------------------------------------------------
    // Device Binding Enforcement (Anti-Titip Absen)
    // ----------------------------------------------------
    // Aturan ketat 1 Akun = 1 HP khusus Tenaga Outsourcing
    if (user.role === 'outsourcing') {
      if (user.deviceId) {
        if (!deviceId || deviceId !== user.deviceId) {
          return res.status(403).json({
            error: 'PERANGKAT TIDAK DIKENALI (ANTI-TITIP ABSEN): Akun Anda telah terikat secara resmi pada smartphone utama yang Anda daftarkan sebelumnya. Demi integritas presensi, dilarang login di HP orang lain untuk mencegah titip absen. Silakan gunakan HP terdaftar Anda, atau hubungi Kasubag / Administrator Disdik HST untuk reset kunci perangkat jika Anda resmi berganti HP baru.',
            code: 'DEVICE_BINDING_MISMATCH',
            boundDeviceId: user.deviceId
          });
        }
      } else if (deviceId) {
        // Ikat HP pertama kali (setelah registrasi atau setelah di-reset oleh admin)
        updateUserDevice(user.id, deviceId);
        user.deviceId = deviceId;
        user.deviceBinding = {
          registered: true,
          deviceModel: deviceId,
          registeredAt: new Date().toISOString(),
          biometricEnabled: !!user.biometricKey
        };
      }
    } else {
      // Supervisor, Admin, & Super Admin bebas login multi-perangkat (PC / Laptop / HP)
      if (deviceId && !user.deviceId) {
        updateUserDevice(user.id, deviceId);
        user.deviceId = deviceId;
        user.deviceBinding = {
          registered: true,
          deviceModel: deviceId,
          registeredAt: new Date().toISOString(),
          biometricEnabled: !!user.biometricKey
        };
      }
    }

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
      deviceId,
      customLocation,
      supervisorId,
      workspaceNote
    } = req.body;

    if (!nip || !name || !email || !password || !role || !divisionId) {
      return res.status(400).json({ error: 'Seluruh kolom bertanda wajib harus dilengkapi.' });
    }

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
      vendorName: vendorName || 'PT Handil Bakti Utama (Mitra Disdik HST)',
      deviceId,
      customLocation,
      supervisorId,
      workspaceNote
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

app.post('/api/divisions', (req, res) => {
  try {
    const { name, code, description, supervisorName } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama bidang / subbagian wajib diisi.' });
    const created = createDivision({ name, code, description, supervisorName });
    res.status(201).json({ success: true, division: created, message: 'Bidang/Subbagian berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal menambahkan bidang/subbagian.' });
  }
});

app.put('/api/divisions/:id', (req, res) => {
  try {
    const updated = updateDivision(req.params.id, req.body);
    res.json({ success: true, division: updated, message: 'Bidang/Subbagian berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui bidang/subbagian.' });
  }
});

app.delete('/api/divisions/:id', (req, res) => {
  try {
    deleteDivision(req.params.id);
    res.json({ success: true, message: 'Bidang/Subbagian berhasil dihapus.' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal menghapus bidang/subbagian.' });
  }
});

// 6.B. Master Vendors (Perusahaan Penyedia Jasa Outsourcing)
app.get('/api/vendors', (req, res) => {
  try {
    const vendors = listVendors();
    res.json({ success: true, vendors });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat daftar perusahaan vendor.' });
  }
});

app.post('/api/vendors', (req, res) => {
  try {
    const { name, code, contractNumber, contractStart, contractEnd, picName, picPhone, address, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama perusahaan penyedia wajib diisi.' });
    const created = createVendor({ name, code, contractNumber, contractStart, contractEnd, picName, picPhone, address, status });
    res.status(201).json({ success: true, vendor: created, message: 'Perusahaan vendor berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal menambahkan vendor.' });
  }
});

app.put('/api/vendors/:id', (req, res) => {
  try {
    const updated = updateVendor(req.params.id, req.body);
    res.json({ success: true, vendor: updated, message: 'Data perusahaan vendor berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui vendor.' });
  }
});

app.delete('/api/vendors/:id', (req, res) => {
  try {
    deleteVendor(req.params.id);
    res.json({ success: true, message: 'Perusahaan vendor berhasil dihapus.' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal menghapus vendor.' });
  }
});

// 6.C. User Accounts & Kepegawaian
app.get('/api/users', (req, res) => {
  try {
    const users = listAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat daftar akun pegawai.' });
  }
});

app.post('/api/users', (req, res) => {
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
      deviceId,
      customLocation,
      supervisorId,
      workspaceNote
    } = req.body;

    if (!nip || !name || !email) {
      return res.status(400).json({ error: 'NIP, Nama, dan Email wajib diisi.' });
    }

    const existing = getUserByEmailOrNip(email) || getUserByEmailOrNip(nip);
    if (existing) {
      return res.status(409).json({ error: 'Email atau NIP sudah terdaftar dalam sistem.' });
    }

    const newUser = createUser({
      nip: String(nip).trim(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: password || 'Password123!',
      role: role || 'outsourcing',
      divisionId: divisionId || 'div-umpeg',
      divisionName: divisionName || 'Sub Bagian Dinas',
      roleTitle: roleTitle || (role === 'supervisor' ? 'Pejabat Penilai' : role === 'admin' ? 'Administrator' : 'Tenaga Outsourcing'),
      phone: phone || '',
      vendorName: vendorName || 'PT Handil Bakti Utama (Mitra Disdik HST)',
      deviceId: deviceId || null,
      customLocation: customLocation || null,
      supervisorId: supervisorId || null,
      workspaceNote: workspaceNote || ''
    });

    const { passwordHash, ...safeUserData } = newUser;
    res.status(201).json({ success: true, user: safeUserData, message: 'Akun pegawai berhasil dibuat.' });
  } catch (err) {
    console.error('[API Error] Create User:', err);
    res.status(500).json({ error: err.message || 'Gagal menambahkan akun pegawai.' });
  }
});

app.post('/api/users/:id/reset-password', (req, res) => {
  try {
    const { newPassword } = req.body;
    resetUserPassword(req.params.id, newPassword || 'Password123!');
    res.json({ success: true, message: `Kata sandi akun berhasil direset ke '${newPassword || 'Password123!'}'` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal mereset kata sandi.' });
  }
});

app.post('/api/users/change-password', (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'User ID, kata sandi lama, dan kata sandi baru wajib diisi.' });
    }
    changeUserPassword(userId, oldPassword, newPassword);
    res.json({ success: true, message: 'Kata sandi Anda berhasil diperbarui.' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal memperbarui kata sandi.' });
  }
});

app.post('/api/users/:id/reset-device', (req, res) => {
  try {
    const updated = updateUserProfile(req.params.id, { deviceId: null });
    res.json({ success: true, user: updated, message: 'Kunci perangkat pengguna berhasil direset.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal mereset kunci perangkat.' });
  }
});

app.put('/api/users/:id/profile', (req, res) => {
  try {
    const updatedUser = updateUserProfile(req.params.id, req.body);
    res.json({ success: true, user: updatedUser, message: 'Profil pegawai berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal memperbarui profil pegawai.' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    deleteUser(req.params.id);
    res.json({ success: true, message: 'Akun pegawai berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal menghapus akun pegawai.' });
  }
});

// 7. Master Lokasi Kerja / Titik Tugas Resmi Terpusat (Sinkron ke Seluruh Perangkat)
app.get('/api/offices', (req, res) => {
  try {
    const offices = listLocations();
    res.json({ success: true, offices: offices.length > 0 ? offices : PRIMARY_OFFICES });
  } catch (err) {
    res.json({ success: true, offices: PRIMARY_OFFICES });
  }
});

app.put('/api/offices', (req, res) => {
  try {
    const newOffices = req.body.offices || req.body;
    const updated = saveLocations(newOffices);
    res.json({ success: true, offices: updated });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui master lokasi di server.' });
  }
});

app.post('/api/offices', (req, res) => {
  try {
    const created = createLocation(req.body);
    res.status(201).json({ success: true, office: created });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambah master lokasi baru.' });
  }
});

app.delete('/api/offices/:id', (req, res) => {
  try {
    deleteLocation(req.params.id);
    res.json({ success: true, message: 'Lokasi berhasil dihapus dari server.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus lokasi dari server.' });
  }
});

// 8. Users / Staff by Division
app.get('/api/staff', (req, res) => {
  try {
    const divisionId = req.query.divisionId;
    const users = listUsersByDivision(divisionId);
    res.json({ success: true, staff: users });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat data staf.' });
  }
});

// 9. Update Staff Work Location (Setting Ruang Kerja Khusus Per Orang)
app.put('/api/staff/:id/location', (req, res) => {
  try {
    const staffId = req.params.id;
    const { customLocation, workspaceNote } = req.body;
    updateUserLocation(staffId, customLocation, workspaceNote);
    res.json({
      success: true,
      message: 'Lokasi dan ruang kerja penugasan staf berhasil diperbarui.'
    });
  } catch (err) {
    console.error('[API Error] Update Location:', err);
    res.status(500).json({ error: 'Gagal memperbarui lokasi penugasan staf.' });
  }
});

// 10. Update Staff Direct Supervisor
app.put('/api/staff/:id/supervisor', (req, res) => {
  try {
    const staffId = req.params.id;
    const { supervisorId } = req.body;
    updateUserSupervisor(staffId, supervisorId);
    res.json({
      success: true,
      message: 'Atasan langsung (Kasi/Kasubag) staf berhasil disetel.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui atasan langsung staf.' });
  }
});

// 11. Attendance
app.get('/api/attendance', (req, res) => {
  try {
    const { staffId, divisionId, date, todayDateStr } = req.query;
    if (todayDateStr) {
      autoClosePreviousDayAttendance(todayDateStr);
    }
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

// 11b. Attendance Schedule & Work Hours Settings
app.get('/api/settings/attendance', (req, res) => {
  try {
    const settings = getAttendanceSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat pengaturan jadwal presensi.' });
  }
});

app.post('/api/settings/attendance', (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ error: 'Data pengaturan jadwal tidak valid.' });
    }
    const saved = saveAttendanceSettings(settings);
    res.json({ success: true, settings: saved });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan pengaturan jadwal presensi.' });
  }
});

app.post('/api/attendance/auto-close', (req, res) => {
  try {
    const { todayDateStr } = req.body;
    const closedCount = autoClosePreviousDayAttendance(todayDateStr);
    res.json({ success: true, closedCount });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menjalankan auto-close presensi.' });
  }
});

// 12. Daily Reports
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

// 13. Evaluations
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

// 14. GEMINI DATA ANALYTICS AI CHAT ENGINE
app.post('/api/analytics/ai-chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Pertanyaan atau prompt analitik wajib diisi.' });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server.' });
    }

    const liveContext = getLiveAnalyticsContext();
    const systemPrompt = `Anda adalah asisten cerdas AI Analitik Kinerja & Presensi Tenaga Alih Daya (Outsourcing) Dinas Pendidikan Kabupaten Hulu Sungai Tengah (Disdik HST).
Instansi: Dinas Pendidikan Kab. Hulu Sungai Tengah, Barabai, Kalimantan Selatan.
Kepala Dinas: H. Muhammad Anhar, S.STP, ME.
Sekretaris Dinas: Salihin, S.Pd.SD.
Para Kasi dan Kasubag adalah Atasan Langsung penilai kinerja tenaga outsourcing sesuai unit kerja penugasan.
Lokasi tugas utama: Kantor Disdik HST (Jl. Perintis Kemerdekaan No. 32, Barabai). Beberapa staf memiliki ruang kerja khusus (SKB Murakata, Gedung Kesenian, Workshop, dsb).

Berikut data live operasional terbaru dari database sistem:
- Total Staf Outsourcing Terdata: ${liveContext.totalStaff} orang
- Total Pejabat / Pengawas: ${liveContext.totalSupervisors} orang
- Rekap Presensi Terakhir: ${JSON.stringify(liveContext.attendanceToday)}
- Rekap Laporan Tugas Harian: ${JSON.stringify(liveContext.reportsSummary)}
- Rekap Evaluasi KPI Mingguan: ${JSON.stringify(liveContext.evalsSummary)}

Pedoman Menjawab:
1. Jawab secara akurat, objektif, profesional, dan berbasis data di atas.
2. Jika ditanya staf yang terlambat atau di luar area geofence, sebutkan nama staf dan rincian waktu/jaraknya.
3. Jika ditanya performa atau KPI, sebutkan angka skor rata-rata, predikat, dan rekomendasi kontraknya.
4. Berikan saran/rekomendasi taktis yang bermanfaat bagi supervisor atau Kepala Dinas.
5. Gunakan bahasa Indonesia yang santun, tertata, dengan format markdown (bullet points dan bold) yang nyaman dibaca tanpa silau.`;

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    let aiReply = '';
    let usedModel = '';
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `${systemPrompt}\n\nPertanyaan Pengawas/Pimpinan: "${message}"`
        });
        if (response && response.text) {
          aiReply = response.text;
          usedModel = model;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[AI Chat] Gagal model ${model}:`, err.message);
      }
    }

    if (!aiReply) {
      throw lastError || new Error('Tidak ada respon dari model AI.');
    }

    res.json({
      success: true,
      reply: aiReply,
      model: usedModel,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API Error] AI Chat:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses analisis AI.' });
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
});

process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 OutsourceTrack & KPI Pro Server Aktif (SQLite & File Storage)`);
  console.log(`🏛️ Instansi      : Dinas Pendidikan Kabupaten Hulu Sungai Tengah`);
  console.log(`📍 Port Internal: http://0.0.0.0:${PORT}`);
  console.log(`📁 Uploads Dir  : ${UPLOADS_DIR}`);
  console.log(`🌐 Public URL   : ${process.env.VITE_APP_URL || 'https://outsourcing.renlapdisdikhst.pro'}`);
  console.log(`====================================================`);
});
