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
  listSupervisors,
  requestSupervisorChange,
  approveSupervisorChange,
  rejectSupervisorChange,
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
  saveFieldCheckin,
  listFieldCheckins,
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
  getHelpDeskSettings,
  saveHelpDeskSettings,
  getInstitutionSettings,
  saveInstitutionSettings,
  createOvertimeRequest,
  listOvertimeRequests,
  approveOvertimeRequest,
  startOvertime,
  finishOvertime,
  getOvertimeById,
  createLeaveRequest,
  listLeaveRequests,
  approveLeaveRequest,
  getLeaveById,
  getLeaveQuota,
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
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
      role = 'outsourcing',
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

    if (role && role !== 'outsourcing') {
      return res.status(403).json({
        error: 'Registrasi mandiri hanya diperbolehkan untuk Staf Outsourcing. Akun Atasan dan Administrator didaftarkan langsung oleh Super Admin.'
      });
    }

    if (!nip || !name || !email || !password || !divisionId) {
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
      role: 'outsourcing',
      divisionId,
      divisionName: divisionName || 'Sub Bagian Dinas',
      roleTitle: roleTitle || 'Tenaga Outsourcing',
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

// 6.D. Manajemen Pemilihan & Persetujuan Atasan Langsung (Penilai KPI)
app.get('/api/supervisors', (req, res) => {
  try {
    const supervisors = listSupervisors();
    res.json({ success: true, supervisors });
  } catch (err) {
    console.error('[API GET /api/supervisors error]', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar atasan.' });
  }
});

app.put('/api/user/supervisor', (req, res) => {
  try {
    const { userId, supervisorId } = req.body;
    if (!userId || !supervisorId) {
      return res.status(400).json({ success: false, message: 'ID pengguna dan ID atasan wajib disertakan.' });
    }
    const result = requestSupervisorChange(userId, supervisorId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API PUT /api/user/supervisor error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal mengajukan perubahan atasan.' });
  }
});

app.put('/api/admin/users/:id/approve-supervisor', (req, res) => {
  try {
    const updated = approveSupervisorChange(req.params.id);
    res.json({ success: true, user: updated, message: 'Pengajuan atasan langsung berhasil disetujui.' });
  } catch (err) {
    console.error('[API PUT approve supervisor error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal menyetujui pengajuan atasan.' });
  }
});

app.put('/api/admin/users/:id/reject-supervisor', (req, res) => {
  try {
    const updated = rejectSupervisorChange(req.params.id);
    res.json({ success: true, user: updated, message: 'Pengajuan atasan langsung berhasil ditolak.' });
  } catch (err) {
    console.error('[API PUT reject supervisor error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal menolak pengajuan atasan.' });
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
    console.error('[API Error] Update Staff Direct Supervisor:', err);
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

// 11.A. Field Duty Check-in (Multi-titik harian)
app.post('/api/attendance/field-checkin', (req, res) => {
  try {
    const saved = saveFieldCheckin(req.body);
    res.status(201).json({ success: true, checkin: saved, message: 'Presensi tugas lapangan berhasil dicatat.' });
  } catch (err) {
    console.error('[API Error] Field Checkin:', err);
    res.status(500).json({ error: 'Gagal mencatat presensi tugas lapangan.' });
  }
});

app.get('/api/attendance/field-checkins', (req, res) => {
  try {
    const { staffId, divisionId, date } = req.query;
    const checkins = listFieldCheckins({ staffId, divisionId, date });
    res.json({ success: true, checkins });
  } catch (err) {
    console.error('[API Error] List Field Checkins:', err);
    res.status(500).json({ error: 'Gagal memuat riwayat tugas lapangan.' });
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

// 11c. HelpDesk & IT Support Settings (Pusat Bantuan Disdik HST)
app.get('/api/settings/helpdesk', (req, res) => {
  try {
    const settings = getHelpDeskSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat pengaturan pusat bantuan.' });
  }
});

app.post('/api/settings/helpdesk', (req, res) => {
  try {
    const payload = req.body.settings || req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Data pengaturan pusat bantuan tidak valid.' });
    }
    const saved = saveHelpDeskSettings(payload);
    res.json({ success: true, settings: saved, message: 'Pengaturan pusat bantuan berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan pengaturan pusat bantuan.' });
  }
});

// 11d. Institution Identity & Kop Surat Settings
app.get('/api/settings/institution', (req, res) => {
  try {
    const settings = getInstitutionSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil pengaturan instansi.' });
  }
});

app.post('/api/settings/institution', (req, res) => {
  try {
    const payload = req.body.settings || req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Data pengaturan instansi tidak valid.' });
    }
    const saved = saveInstitutionSettings(payload);
    res.json({ success: true, settings: saved, message: 'Pengaturan identitas instansi & kop surat berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan pengaturan instansi.' });
  }
});

// 11e. TUGAS LEMBUR RESMI / OVERTIME ENGINE PRO
app.post('/api/overtime/request', (req, res) => {
  try {
    const created = createOvertimeRequest(req.body);
    if (created && created.supervisorId) {
      try {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        createNotification({
          id: `notif-ot-req-${created.id}`,
          userId: created.supervisorId,
          staffId: created.staffId,
          title: 'Pengajuan Tugas Lembur Baru',
          message: `${created.staffName || 'Staf'} mengajukan tugas lembur (${created.date}, estimasi ${created.estimatedHours} jam): "${created.reason}".`,
          type: 'approval',
          read: false,
          timestamp: timeFormatted,
        });
      } catch (ne) {
        console.error('[Notification Error] Overtime Request:', ne);
      }
    }
    res.status(201).json({ success: true, overtime: created, message: 'Izin lembur berhasil diajukan, menunggu persetujuan atasan langsung.' });
  } catch (err) {
    console.error('[API Error] Overtime Request:', err);
    res.status(500).json({ error: 'Gagal mengajukan izin lembur.' });
  }
});

app.get('/api/overtime', (req, res) => {
  try {
    const { staffId, supervisorId, date, status } = req.query;
    const list = listOvertimeRequests({ staffId, supervisorId, date, status });
    res.json({ success: true, overtime: list });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat daftar tugas lembur.' });
  }
});

app.patch('/api/overtime/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { approved, supervisorNotes } = req.body;
    const updated = approveOvertimeRequest(id, { approved: Boolean(approved), supervisorNotes });
    if (updated && updated.staffId) {
      try {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        createNotification({
          id: `notif-ot-${updated.id}-${approved ? 'app' : 'rej'}`,
          userId: updated.staffId,
          staffId: updated.staffId,
          title: approved ? 'Pengajuan Lembur Disetujui' : 'Pengajuan Lembur Ditolak',
          message: `Pengajuan lembur Anda tanggal ${updated.date} telah ${approved ? 'disetujui' : 'ditolak'} oleh atasan (${updated.supervisorName || 'Supervisor'}).${updated.supervisorNotes ? ` Catatan: "${updated.supervisorNotes}"` : ''}`,
          type: 'approval',
          read: false,
          timestamp: timeFormatted,
        });
      } catch (ne) {
        console.error('[Notification Error] Overtime Approval:', ne);
      }
    }
    res.json({ success: true, overtime: updated, message: approved ? 'Pengajuan lembur disetujui.' : 'Pengajuan lembur ditolak.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui status persetujuan lembur.' });
  }
});

app.post('/api/overtime/:id/start', (req, res) => {
  try {
    const { id } = req.params;
    const { clockInTime, selfieUrl, coords } = req.body;
    const updated = startOvertime(id, { clockInTime, selfieUrl, coords });
    res.json({ success: true, overtime: updated, message: 'Presensi mulai lembur di kantor berhasil dicatat.' });
  } catch (err) {
    console.error('[API Error] Overtime Start:', err);
    res.status(500).json({ error: 'Gagal mencatat jam mulai lembur.' });
  }
});

app.post('/api/overtime/:id/finish', (req, res) => {
  try {
    const { id } = req.params;
    const { clockOutTime, selfieUrl, coords, workSummary, durationMinutes } = req.body;
    const updated = finishOvertime(id, { clockOutTime, selfieUrl, coords, workSummary, durationMinutes });
    res.json({ success: true, overtime: updated, message: 'Laporan dan jam selesai lembur berhasil dikunci.' });
  } catch (err) {
    console.error('[API Error] Overtime Finish:', err);
    res.status(500).json({ error: 'Gagal mengunci jam selesai lembur.' });
  }
});

// 11f. MODUL MANAJEMEN IZIN & CUTI TERPADU (SMART LEAVE PRO)
app.post('/api/leave/request', (req, res) => {
  try {
    const created = createLeaveRequest(req.body);
    if (created && created.supervisorId) {
      try {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        const leaveLabel =
          created.leaveType === 'SAKIT'
            ? 'Izin Sakit'
            : created.leaveType === 'CUTI_TAHUNAN'
            ? 'Cuti Tahunan'
            : 'Izin Keperluan Mendesak';
        createNotification({
          id: `notif-leave-req-${created.id}`,
          userId: created.supervisorId,
          staffId: created.staffId,
          title: 'Permohonan Izin / Cuti Baru',
          message: `${created.staffName || 'Staf'} mengajukan ${leaveLabel} (${created.startDate} s/d ${created.endDate}): "${created.reason}".`,
          type: 'approval',
          read: false,
          timestamp: timeFormatted,
        });
      } catch (ne) {
        console.error('[Notification Error] Leave Request:', ne);
      }
    }
    res.status(201).json({ success: true, leave: created, message: 'Permohonan izin/cuti berhasil diajukan, menunggu persetujuan atasan langsung.' });
  } catch (err) {
    console.error('[API Error] Leave Request:', err);
    res.status(500).json({ error: 'Gagal mengajukan permohonan izin/cuti.' });
  }
});

app.get('/api/leave', (req, res) => {
  try {
    const { staffId, supervisorId, date, status, leaveType } = req.query;
    const list = listLeaveRequests({ staffId, supervisorId, date, status, leaveType });
    res.json({ success: true, leaves: list });
  } catch (err) {
    console.error('[API Error] List Leaves:', err);
    res.status(500).json({ error: 'Gagal mengambil data permohonan izin/cuti.' });
  }
});

app.patch('/api/leave/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { approved, supervisorNotes, verifiedBy } = req.body;
    const updated = approveLeaveRequest(id, { approved, supervisorNotes, verifiedBy });
    if (updated && updated.staffId) {
      try {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        const leaveLabel =
          updated.leaveType === 'SAKIT'
            ? 'Izin Sakit'
            : updated.leaveType === 'CUTI_TAHUNAN'
            ? 'Cuti Tahunan'
            : 'Izin Keperluan Mendesak';
        const statusLabel = approved ? 'disetujui' : 'ditolak';
        const notesSuffix = updated.supervisorNotes ? ` Catatan: "${updated.supervisorNotes}"` : '';
        createNotification({
          id: `notif-leave-${updated.id}-${approved ? 'app' : 'rej'}`,
          userId: updated.staffId,
          staffId: updated.staffId,
          title: approved ? 'Permohonan Izin / Cuti Disetujui' : 'Permohonan Izin / Cuti Ditolak',
          message: `Permohonan ${leaveLabel} Anda (${updated.startDate} s/d ${updated.endDate}) telah ${statusLabel} oleh atasan (${updated.verifiedBy || updated.supervisorName || 'Supervisor'}).${notesSuffix}`,
          type: 'approval',
          read: false,
          timestamp: timeFormatted,
        });
      } catch (ne) {
        console.error('[Notification Error] Leave Approval:', ne);
      }
    }
    res.json({
      success: true,
      leave: updated,
      message: approved ? 'Permohonan izin/cuti berhasil disetujui dan status presensi telah disinkronkan.' : 'Permohonan izin/cuti telah ditolak.'
    });
  } catch (err) {
    console.error('[API Error] Approve Leave:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses persetujuan izin/cuti.' });
  }
});

app.get('/api/leave/quota/:staffId', (req, res) => {
  try {
    const { staffId } = req.params;
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const quota = getLeaveQuota(staffId, year);
    res.json({ success: true, quota });
  } catch (err) {
    console.error('[API Error] Leave Quota:', err);
    res.status(500).json({ error: 'Gagal memuat saldo kuota cuti staf.' });
  }
});

// 11g. REAL-TIME NOTIFICATIONS API
app.get('/api/notifications', (req, res) => {
  try {
    const { userId, role, staffId } = req.query;
    const notifs = listNotifications({ userId, role, staffId });
    res.json({ success: true, notifications: notifs });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat notifikasi.' });
  }
});

app.post('/api/notifications', (req, res) => {
  try {
    const created = createNotification(req.body);
    res.status(201).json({ success: true, notification: created });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat notifikasi.' });
  }
});

app.patch('/api/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    markNotificationRead(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menandai notifikasi dibaca.' });
  }
});

app.patch('/api/notifications/read-all', (req, res) => {
  try {
    const { userId } = req.body;
    markAllNotificationsRead(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menandai semua notifikasi dibaca.' });
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
