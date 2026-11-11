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
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import {
  hashPassword,
  getUserByEmailOrNip,
  getUserById,
  createUser,
  updateUserDevice,
  checkDeviceBindingConflict,
  saveUserBiometricCredential,
  getUserBiometricCredentials,
  getBiometricCredentialById,
  updateBiometricCounter,
  deleteUserBiometricCredential,
  updateUserLocation,
  updateUserSupervisor,
  listSupervisors,
  requestSupervisorChange,
  approveSupervisorChange,
  rejectSupervisorChange,
  requestUserProfileUpdate,
  approveUserDivisionChange,
  rejectUserDivisionChange,
  approveUserAssignmentChange,
  rejectUserAssignmentChange,
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
  getServerWitaTime,
  saveAttendance,
  listAttendance,
  saveFieldCheckin,
  listFieldCheckins,
  saveDailyReport,
  listDailyReports,
  approveReport,
  updateDailyReport,
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
app.set('query parser', 'simple');
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
    const rawIdentifier = req.body.usernameOrEmail || req.body.identifier || req.body.email || req.body.nip;
    const usernameOrEmail = rawIdentifier ? String(rawIdentifier).trim() : '';
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
    // Device Binding Enforcement (Anti-Titip Absen & Anti Multi-User)
    // ----------------------------------------------------
    const hardwareFp = req.body.hardwareFingerprint || req.body.hardware_fingerprint || deviceId;

    // Aturan ketat 1 Akun = 1 HP khusus Tenaga Outsourcing
    if (user.role === 'outsourcing') {
      // 1. Cek apakah perangkat fisik ini sudah terikat pada AKUN PEGAWAI LAIN
      if (hardwareFp) {
        const conflictUser = checkDeviceBindingConflict(hardwareFp, user.id);
        if (conflictUser) {
          const conflictName = conflictUser.name || 'Pegawai Lain';
          const conflictNip = conflictUser.nip ? ` (${conflictUser.nip})` : '';
          return res.status(403).json({
            error: `Perangkat ini sudah terikat dengan akun pegawai lain [${conflictName}${conflictNip}]. 1 perangkat fisik hanya boleh digunakan oleh 1 akun pegawai demi integritas presensi.`,
            code: 'DEVICE_BOUND_TO_ANOTHER_USER',
            boundTo: {
              name: conflictUser.name,
              nip: conflictUser.nip
            }
          });
        }
      }

      // 2. Cek apakah akun staf ini sudah terikat pada HP berbeda
      const userBoundFp = user.hardwareFingerprint || user.deviceId;
      if (userBoundFp) {
        if (!hardwareFp || (hardwareFp !== userBoundFp && hardwareFp !== user.deviceId && hardwareFp !== user.hardwareFingerprint)) {
          return res.status(403).json({
            error: 'PERANGKAT TIDAK DIKENALI (ANTI-TITIP ABSEN): Akun Anda telah terikat secara resmi pada smartphone utama yang Anda daftarkan sebelumnya. Demi integritas presensi, dilarang login di HP orang lain untuk mencegah titip absen. Silakan gunakan HP terdaftar Anda, atau hubungi Kasubag / Administrator Disdik HST untuk reset kunci perangkat jika Anda resmi berganti HP baru.',
            code: 'DEVICE_BINDING_MISMATCH',
            boundDeviceId: userBoundFp
          });
        }
      } else if (hardwareFp) {
        // Ikat HP pertama kali (setelah registrasi atau setelah di-reset oleh admin)
        updateUserDevice(user.id, deviceId || hardwareFp, null, hardwareFp);
        user.deviceId = deviceId || hardwareFp;
        user.hardwareFingerprint = hardwareFp;
        user.deviceBinding = {
          registered: true,
          deviceModel: deviceId || hardwareFp,
          registeredAt: new Date().toISOString(),
          biometricEnabled: !!user.biometricKey
        };
      }
    } else {
      // Supervisor, Admin, & Super Admin bebas login multi-perangkat (PC / Laptop / HP)
      if (hardwareFp && !user.deviceId) {
        updateUserDevice(user.id, deviceId || hardwareFp, null, hardwareFp);
        user.deviceId = deviceId || hardwareFp;
        user.hardwareFingerprint = hardwareFp;
        user.deviceBinding = {
          registered: true,
          deviceModel: deviceId || hardwareFp,
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

// ==============================================================================
// 2.B. WEBAUTHN / FIDO2 BIOMETRIC AUTHENTICATION (HARDWARE SENSOR HP)
// ==============================================================================
function getWebAuthnConfig(req) {
  const originHeader = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
  const hostHeader = req.headers.host || '';

  let rpID = 'outsourcing.renlapdisdikhst.pro';
  if (hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1')) {
    rpID = 'localhost';
  } else if (hostHeader) {
    rpID = hostHeader.split(':')[0];
  }

  let expectedOrigin = originHeader;
  if (!expectedOrigin) {
    const proto = req.headers['x-forwarded-proto'] || (rpID === 'localhost' ? 'http' : 'https');
    expectedOrigin = `${proto}://${hostHeader || rpID}`;
  }

  return { rpID, expectedOrigin, rpName: 'OutsourceTrack Disdik HST' };
}

const biometricChallenges = new Map();

function storeChallenge(key, challenge) {
  biometricChallenges.set(key, { challenge, timestamp: Date.now() });
}

function retrieveChallenge(key) {
  const entry = biometricChallenges.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
    biometricChallenges.delete(key);
    return null;
  }
  biometricChallenges.delete(key);
  return entry.challenge;
}

// 2.B.1. Opsi Registrasi Sensor Biometrik (Passkey / WebAuthn Enrollment)
app.post('/api/auth/biometric/register-options', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID wajib disertakan.' });
    }
    const user = getUserById(userId) || getUserByEmailOrNip(userId);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const { rpID, rpName } = getWebAuthnConfig(req);
    const existingCredentials = getUserBiometricCredentials(user.id);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email || user.nip,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports,
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Meminta sensor fisik bawaan HP (fingerprint / Face ID)
        userVerification: 'required',
        residentKey: 'preferred',
      },
    });

    storeChallenge(`reg_${user.id}`, options.challenge);
    res.json({ success: true, options });
  } catch (err) {
    console.error('[WebAuthn] Register Options Error:', err);
    res.status(500).json({ error: 'Gagal membuat opsi pendaftaran biometrik.' });
  }
});

// 2.B.2. Verifikasi & Penyimpanan Public Key Biometrik
app.post('/api/auth/biometric/register-verify', async (req, res) => {
  try {
    const { userId, response, deviceName } = req.body;
    if (!userId || !response) {
      return res.status(400).json({ error: 'Data verifikasi biometrik tidak lengkap.' });
    }
    const user = getUserById(userId) || getUserByEmailOrNip(userId);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const expectedChallenge = retrieveChallenge(`reg_${user.id}`);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Sesi pendaftaran biometrik kedaluwarsa. Silakan coba lagi.' });
    }

    const { rpID, expectedOrigin } = getWebAuthnConfig(req);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verifikasi biometrik gagal.' });
    }

    const { credential } = verification.registrationInfo;
    const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64');

    const saved = saveUserBiometricCredential({
      userId: user.id,
      credentialId: credential.id,
      publicKey: publicKeyBase64,
      counter: credential.counter,
      deviceName: deviceName || 'Smartphone Biometrik',
      transports: response.response?.transports || ['internal'],
    });

    res.json({
      success: true,
      message: 'Sidik Jari / Face ID berhasil didaftarkan di perangkat ini.',
      credential: saved,
    });
  } catch (err) {
    console.error('[WebAuthn] Register Verify Error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi pendaftaran biometrik: ' + (err.message || 'Error tidak diketahui') });
  }
});

// 2.B.3. Opsi Autentikasi / Login Biometrik
app.post('/api/auth/biometric/login-options', async (req, res) => {
  try {
    const rawIdentifier = req.body.usernameOrEmail || req.body.identifier;
    const { rpID } = getWebAuthnConfig(req);
    let allowCredentials = undefined;
    let challengeKey = 'login_anon_' + Date.now();

    if (rawIdentifier) {
      const user = getUserByEmailOrNip(String(rawIdentifier).trim());
      if (user) {
        challengeKey = `login_${user.id}`;
        const creds = getUserBiometricCredentials(user.id);
        if (creds && creds.length > 0) {
          allowCredentials = creds.map((c) => ({
            id: c.credentialId,
            transports: c.transports,
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'required',
    });

    storeChallenge(challengeKey, options.challenge);
    storeChallenge(`challenge_${options.challenge}`, options.challenge);

    res.json({ success: true, options, challengeKey });
  } catch (err) {
    console.error('[WebAuthn] Login Options Error:', err);
    res.status(500).json({ error: 'Gagal menyiapkan autentikasi biometrik.' });
  }
});

// 2.B.4. Verifikasi Login Biometrik & Penerbitan Sesi
app.post('/api/auth/biometric/login-verify', async (req, res) => {
  try {
    const { response, challengeKey, deviceId } = req.body;
    if (!response || !response.id) {
      return res.status(400).json({ error: 'Data respons biometrik tidak valid.' });
    }

    const cred = getBiometricCredentialById(response.id);
    if (!cred) {
      return res.status(404).json({ error: 'Kredensial biometrik tidak terdaftar di sistem. Harap masuk terlebih dahulu dengan kata sandi, lalu daftarkan sidik jari di menu Profil.' });
    }

    const user = getUserById(cred.userId);
    if (!user) {
      return res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
    }

    if (user.status === 'Nonaktif') {
      return res.status(403).json({ error: 'Akun Anda dinonaktifkan oleh Administrator.' });
    }

    let expectedChallenge = null;
    if (challengeKey) {
      expectedChallenge = retrieveChallenge(challengeKey);
    }
    if (!expectedChallenge) {
      expectedChallenge = retrieveChallenge(`login_${user.id}`);
    }
    if (!expectedChallenge) {
      try {
        const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64').toString('utf-8'));
        if (clientData.challenge) {
          expectedChallenge = retrieveChallenge(`challenge_${clientData.challenge}`);
        }
      } catch (e) {}
    }

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Sesi biometrik kedaluwarsa atau tidak valid. Silakan coba lagi.' });
    }

    const { rpID, expectedOrigin } = getWebAuthnConfig(req);
    const publicKeyBytes = Uint8Array.from(Buffer.from(cred.publicKey, 'base64'));

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: cred.credentialId,
        publicKey: publicKeyBytes,
        counter: cred.counter,
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return res.status(400).json({ error: 'Verifikasi sidik jari gagal atau tidak cocok.' });
    }

    updateBiometricCounter(cred.credentialId, verification.authenticationInfo.newCounter);

    // Device binding check untuk staf outsourcing (Anti-Titip Absen & Anti Multi-User)
    const hardwareFp = req.body.hardwareFingerprint || req.body.hardware_fingerprint || deviceId;
    if (user.role === 'outsourcing') {
      if (hardwareFp) {
        const conflictUser = checkDeviceBindingConflict(hardwareFp, user.id);
        if (conflictUser) {
          const conflictName = conflictUser.name || 'Pegawai Lain';
          const conflictNip = conflictUser.nip ? ` (${conflictUser.nip})` : '';
          return res.status(403).json({
            error: `Perangkat ini sudah terikat dengan akun pegawai lain [${conflictName}${conflictNip}]. 1 perangkat fisik hanya boleh digunakan oleh 1 akun pegawai demi integritas presensi.`,
            code: 'DEVICE_BOUND_TO_ANOTHER_USER',
          });
        }
      }
      const userBoundFp = user.hardwareFingerprint || user.deviceId;
      if (userBoundFp && hardwareFp && hardwareFp !== userBoundFp && hardwareFp !== user.deviceId && hardwareFp !== user.hardwareFingerprint) {
        return res.status(403).json({
          error: 'PERANGKAT TIDAK DIKENALI: Akun Anda terikat pada HP lain. Demi keamanan presensi, dilarang login di perangkat berbeda.',
          code: 'DEVICE_BINDING_MISMATCH',
        });
      }
    }

    const token = `ot_token_${user.id}_${Date.now()}`;
    const { passwordHash, ...safeUserData } = user;

    res.json({
      success: true,
      message: 'Autentikasi biometrik berhasil.',
      token,
      user: safeUserData,
    });
  } catch (err) {
    console.error('[WebAuthn] Login Verify Error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi biometrik: ' + (err.message || 'Error tidak diketahui') });
  }
});

// 2.B.5. Status Biometrik Pengguna
app.get('/api/auth/biometric/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const creds = getUserBiometricCredentials(userId);
    res.json({
      success: true,
      enrolled: creds.length > 0,
      count: creds.length,
      credentials: creds.map(c => ({
        id: c.id,
        credentialId: c.credentialId,
        deviceName: c.deviceName,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil status biometrik pengguna.' });
  }
});

// 2.B.6. Hapus Kredensial Biometrik
app.delete('/api/auth/biometric/credential/:credentialId', (req, res) => {
  try {
    const { credentialId } = req.params;
    const userId = req.body?.userId || req.query?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID diperlukan.' });
    }
    deleteUserBiometricCredential(credentialId, userId);
    res.json({ success: true, message: 'Kredensial biometrik berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus kredensial biometrik.' });
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
      supervisedGroups,
      supervisedVendor,
      deviceId,
      customLocation,
      supervisorId,
      workspaceNote
    } = req.body;

    if (role && role !== 'outsourcing' && role !== 'coordinator') {
      return res.status(403).json({
        error: 'Registrasi mandiri hanya diperbolehkan untuk Staf Lapangan atau Pengawas Lapangan. Akun Atasan dan Administrator didaftarkan langsung oleh Super Admin.'
      });
    }

    if (!nip || !name || !email || !password) {
      return res.status(400).json({ error: 'Seluruh kolom bertanda wajib harus dilengkapi.' });
    }

    const existing = getUserByEmailOrNip(email) || getUserByEmailOrNip(nip);
    if (existing) {
      return res.status(409).json({ error: 'Email atau NIP sudah terdaftar dalam sistem.' });
    }

    const finalRole = role === 'coordinator' ? 'coordinator' : 'outsourcing';
    const finalGroups = supervisedGroups || (vendorName ? [vendorName] : []);
    const hardwareFp = req.body.hardwareFingerprint || req.body.hardware_fingerprint || deviceId;

    if (finalRole === 'outsourcing' && hardwareFp) {
      const conflictUser = checkDeviceBindingConflict(hardwareFp, null);
      if (conflictUser) {
        const conflictName = conflictUser.name || 'Pegawai Lain';
        const conflictNip = conflictUser.nip ? ` (${conflictUser.nip})` : '';
        return res.status(403).json({
          error: `Perangkat ini sudah terikat dengan akun pegawai lain [${conflictName}${conflictNip}]. 1 perangkat fisik hanya boleh digunakan oleh 1 akun pegawai demi integritas presensi.`,
          code: 'DEVICE_BOUND_TO_ANOTHER_USER',
        });
      }
    }

    const newUser = createUser({
      nip,
      name,
      email,
      password,
      role: finalRole,
      divisionId: divisionId || 'div-umpeg',
      divisionName: divisionName || 'Sub Bagian Umum & Kepegawaian',
      roleTitle: roleTitle || (finalRole === 'coordinator' ? 'Pengawas Lapangan Mitra' : 'Tenaga Outsourcing'),
      phone,
      vendorName: vendorName || (finalGroups[0] || 'PT. YASMINE BUIH PERSADA'),
      supervisedGroups: finalGroups,
      supervisedVendor: supervisedVendor || finalGroups[0] || vendorName,
      deviceId: deviceId || hardwareFp,
      hardwareFingerprint: hardwareFp,
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
    const { userId, deviceId, biometricKey, hardwareFingerprint } = req.body;
    const targetFp = hardwareFingerprint || deviceId;
    if (!userId || !targetFp) {
      return res.status(400).json({ error: 'ID Pengguna dan ID Perangkat diperlukan.' });
    }

    const conflictUser = checkDeviceBindingConflict(targetFp, userId);
    if (conflictUser) {
      const conflictName = conflictUser.name || 'Pegawai Lain';
      const conflictNip = conflictUser.nip ? ` (${conflictUser.nip})` : '';
      return res.status(403).json({
        error: `Perangkat ini sudah terikat dengan akun pegawai lain [${conflictName}${conflictNip}]. 1 perangkat fisik hanya boleh digunakan oleh 1 akun pegawai demi integritas presensi.`,
        code: 'DEVICE_BOUND_TO_ANOTHER_USER',
      });
    }

    updateUserDevice(userId, deviceId || targetFp, biometricKey, targetFp);
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
    const { name, code, category, contractNumber, contractStart, contractEnd, picName, picPhone, address, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama perusahaan penyedia wajib diisi.' });
    const created = createVendor({ name, code, category, contractNumber, contractStart, contractEnd, picName, picPhone, address, status });
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
      supervisedGroups,
      supervisedVendor,
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

    const finalRole = role || 'outsourcing';
    const finalGroups = supervisedGroups || (supervisedVendor ? [supervisedVendor] : (finalRole === 'coordinator' && vendorName ? [vendorName] : []));

    const newUser = createUser({
      nip: String(nip).trim(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: password || 'Password123!',
      role: finalRole,
      divisionId: divisionId || 'div-umpeg',
      divisionName: divisionName || 'Sub Bagian Dinas',
      roleTitle: roleTitle || (finalRole === 'supervisor' ? 'Pejabat Penilai' : finalRole === 'admin' ? 'Administrator' : finalRole === 'coordinator' ? 'Pengawas Lapangan Mitra' : 'Tenaga Outsourcing'),
      phone: phone || '',
      vendorName: vendorName || (finalGroups[0] || 'PT. YASMINE BUIH PERSADA'),
      supervisedGroups: finalGroups,
      supervisedVendor: supervisedVendor || finalGroups[0] || vendorName,
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
    const updated = updateUserProfile(req.params.id, { deviceId: null, hardwareFingerprint: null });
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

// 6.E. Pengajuan & Persetujuan Perubahan Divisi, Formasi, Lokasi, dan Vendor
app.put(['/api/user/request-profile-update', '/api/users/:id/request-profile-update'], (req, res) => {
  try {
    const userId = req.params.id || req.body.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID pengguna wajib disertakan.' });
    }
    const result = requestUserProfileUpdate(userId, req.body);
    res.json(result);
  } catch (err) {
    console.error('[API PUT request-profile-update error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal mengajukan perubahan profil.' });
  }
});

app.put(['/api/supervisor/approve-division/:userId', '/api/admin/users/:userId/approve-division'], (req, res) => {
  try {
    const updated = approveUserDivisionChange(req.params.userId);
    res.json({ success: true, user: updated, message: 'Perubahan divisi berhasil disetujui.' });
  } catch (err) {
    console.error('[API PUT approve-division error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal menyetujui perubahan divisi.' });
  }
});

app.put(['/api/supervisor/reject-division/:userId', '/api/admin/users/:userId/reject-division'], (req, res) => {
  try {
    const updated = rejectUserDivisionChange(req.params.userId);
    res.json({ success: true, user: updated, message: 'Pengajuan perubahan divisi telah ditolak.' });
  } catch (err) {
    console.error('[API PUT reject-division error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal menolak perubahan divisi.' });
  }
});

app.put(['/api/admin/approve-assignment/:userId', '/api/admin/users/:userId/approve-assignment'], (req, res) => {
  try {
    const updated = approveUserAssignmentChange(req.params.userId);
    res.json({ success: true, user: updated, message: 'Pengajuan penugasan (formasi/lokasi/vendor) berhasil disetujui.' });
  } catch (err) {
    console.error('[API PUT approve-assignment error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal menyetujui pengajuan penugasan.' });
  }
});

app.put(['/api/admin/reject-assignment/:userId', '/api/admin/users/:userId/reject-assignment'], (req, res) => {
  try {
    const updated = rejectUserAssignmentChange(req.params.userId);
    res.json({ success: true, user: updated, message: 'Pengajuan penugasan (formasi/lokasi/vendor) telah ditolak.' });
  } catch (err) {
    console.error('[API PUT reject-assignment error]', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal menolak pengajuan penugasan.' });
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
    const updatedUser = updateUserLocation(staffId, customLocation, workspaceNote);
    res.json({
      success: true,
      user: updatedUser,
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

app.get('/api/attendance/today', (req, res) => {
  try {
    const { staffId } = req.query;
    if (!staffId) {
      return res.status(400).json({ error: 'Parameter staffId diperlukan.' });
    }
    const todayDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    autoClosePreviousDayAttendance(todayDateStr);
    const records = listAttendance({ staffId, date: todayDateStr });
    const todayRecord = records.find((r) => r.staffId === staffId && r.date === todayDateStr) || records[0] || null;
    res.json({ success: true, attendance: todayRecord, records });
  } catch (err) {
    console.error('[API Error] Get Today Attendance:', err);
    res.status(500).json({ error: 'Gagal memuat presensi hari ini.' });
  }
});

app.post('/api/attendance/break', (req, res) => {
  try {
    const { type, staffId, date, time } = req.body;
    if (!type || (type !== 'break-out' && type !== 'break-in')) {
      return res.status(400).json({ error: 'Tipe sesi istirahat tidak valid (gunakan break-out atau break-in).' });
    }
    const todayDateStr = date || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const currentWitaTime = time || new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date()).replace(/\./g, ':');

    const payload = {
      ...req.body,
      staffId,
      date: todayDateStr,
      status: req.body.status || 'Hadir',
    };

    if (type === 'break-out') {
      payload.breakOutTime = currentWitaTime;
      payload.break_out_time = currentWitaTime;
    } else {
      payload.breakInTime = currentWitaTime;
      payload.break_in_time = currentWitaTime;
    }

    const saved = saveAttendance(payload);
    res.status(200).json({ success: true, attendance: saved, message: type === 'break-out' ? 'Istirahat keluar berhasil dicatat.' : 'Kembali bekerja berhasil dicatat.' });
  } catch (err) {
    console.error('[API Error] Break Attendance:', err);
    res.status(500).json({ error: 'Gagal memproses sesi istirahat presensi.' });
  }
});

app.post('/api/attendance', (req, res) => {
  try {
    const saved = saveAttendance(req.body);
    res.status(201).json({ success: true, attendance: saved });
  } catch (err) {
    if (err && (err.statusCode === 403 || err.statusCode === 422 || (err.message && err.message.startsWith('PRESENSI_DITOLAK_')))) {
      return res.status(err.statusCode || 422).json({ success: false, error: err.message });
    }
    console.error('[API Error] Save Attendance:', err);
    res.status(500).json({ error: 'Gagal menyimpan data presensi.' });
  }
});

// 10.B. Server-Authoritative NTP Clock (Anti-Tamper Jam HP)
app.get('/api/time', (req, res) => {
  try {
    const timeInfo = getServerWitaTime();
    res.json({ success: true, ...timeInfo });
  } catch (err) {
    console.error('[API Error] Get Server Time:', err);
    res.status(500).json({ error: 'Gagal mengambil waktu resmi server.' });
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
            : created.leaveType === 'TUGAS_LUAR' || created.leaveType === 'DINAS_LUAR'
            ? 'Tugas Luar / Perjalanan Dinas'
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
            : updated.leaveType === 'TUGAS_LUAR' || updated.leaveType === 'DINAS_LUAR'
            ? 'Tugas Luar / Perjalanan Dinas'
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

// 11g. EXPORT REKAP PRESENSI EXCEL (.XLSX MULTI-SHEET IDENTIK REFERENSI)
app.get('/api/reports/rekap-presensi/excel', async (req, res) => {
  try {
    const { month, staffId, vendor, category } = req.query;
    const monthStr = month || new Date().toISOString().slice(0, 7);
    const { generateRekapPresensiWorkbook } = await import('./server/excelReport.js');
    const xlsxModule = await import('xlsx');
    const XLSX = xlsxModule.default || xlsxModule;
    const wb = generateRekapPresensiWorkbook({
      monthStr,
      targetStaffId: staffId || null,
      vendorFilter: vendor || null,
      categoryFilter: category || null
    });
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rekap_presensi_outsourcing_${monthStr}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error('[API Error] Export Rekap Excel:', err);
    res.status(500).json({ error: 'Gagal mengekspor berkas Excel rekap presensi.' });
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

app.patch('/api/reports/:id', (req, res) => {
  try {
    const reportId = req.params.id;
    const updated = updateDailyReport(reportId, req.body);
    res.json({ success: true, report: updated });
  } catch (err) {
    console.error('[API Error] Update Report:', err);
    res.status(500).json({ error: 'Gagal memperbarui data laporan kerja.' });
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
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
