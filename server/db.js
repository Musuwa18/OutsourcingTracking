/**
 * SQLite Database & Storage Engine for OutsourceTrack & KPI Pro
 * Mendukung built-in node:sqlite (Node.js v22+) dengan fallback file-based JSON.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const ATTENDANCE_UPLOADS = path.join(UPLOADS_DIR, 'attendance');
const REPORTS_UPLOADS = path.join(UPLOADS_DIR, 'reports');
const DB_PATH = path.join(DATA_DIR, 'outsource_track.db');

// Pastikan direktori fisik selalu siap
for (const dir of [DATA_DIR, UPLOADS_DIR, ATTENDANCE_UPLOADS, REPORTS_UPLOADS]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Inisialisasi Database Engine (Built-in node:sqlite jika ada, atau fallback JSON)
let dbEngine = null;
let isNodeSqlite = false;

try {
  const { DatabaseSync } = await import('node:sqlite');
  dbEngine = new DatabaseSync(DB_PATH);
  isNodeSqlite = true;
  console.log(`[Database] Menggunakan Node.js built-in SQLite: ${DB_PATH}`);
} catch (err) {
  console.warn(`[Database] node:sqlite tidak aktif/didukung di versi Node ini. Menggunakan Fallback Storage JSON: ${DATA_DIR}`);
}

// Inisialisasi Tabel SQLite
if (isNodeSqlite && dbEngine) {
  dbEngine.exec(`
    CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      supervisor_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nip TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      division_id TEXT NOT NULL,
      division_name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      phone TEXT,
      vendor_name TEXT,
      avatar_color TEXT,
      initials TEXT,
      device_id TEXT,
      biometric_key TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      division_id TEXT NOT NULL,
      date TEXT NOT NULL,
      clock_in_time TEXT NOT NULL,
      clock_out_time TEXT,
      status TEXT NOT NULL,
      selfie_url TEXT,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      location_name TEXT,
      is_geofence_valid INTEGER,
      distance_meters REAL,
      device_fingerprint TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      division_id TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      documentation_photo_url TEXT,
      image_hash TEXT,
      ai_duplicate_flag_json TEXT,
      location_coords_json TEXT,
      supervisor_approval TEXT NOT NULL,
      supervisor_notes TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      supervisor_id TEXT NOT NULL,
      division_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      month_year TEXT NOT NULL,
      scores_json TEXT NOT NULL,
      average_score REAL NOT NULL,
      predicate TEXT NOT NULL,
      recommendation TEXT,
      notes TEXT,
      evaluated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

// Fallback in-memory storage jika bukan SQLite
const JSON_BACKUP_PATH = path.join(DATA_DIR, 'outsource_store.json');
let fallbackStore = {
  divisions: [],
  users: [],
  attendance: [],
  daily_reports: [],
  evaluations: []
};

if (!isNodeSqlite && fs.existsSync(JSON_BACKUP_PATH)) {
  try {
    fallbackStore = JSON.parse(fs.readFileSync(JSON_BACKUP_PATH, 'utf-8'));
  } catch (e) {
    // fallback default
  }
}

function persistFallback() {
  if (!isNodeSqlite) {
    fs.writeFileSync(JSON_BACKUP_PATH, JSON.stringify(fallbackStore, null, 2), 'utf-8');
  }
}

// Hash password sederhana
export function hashPassword(plainText) {
  return crypto.createHash('sha256').update(`OT_SALT_2026_${plainText}`).digest('hex');
}

// Simpan Foto Base64 menjadi file gambar fisik di server (/uploads/...)
export function saveBase64Image(base64OrUrl, folder = 'attendance') {
  if (!base64OrUrl) return '';
  if (base64OrUrl.startsWith('http://') || base64OrUrl.startsWith('https://') || base64OrUrl.startsWith('/uploads/')) {
    return base64OrUrl;
  }

  try {
    const matches = base64OrUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64OrUrl, 'base64');
    }

    const filename = `${folder}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const targetDir = folder === 'reports' ? REPORTS_UPLOADS : ATTENDANCE_UPLOADS;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folder}/${filename}`;
  } catch (err) {
    console.error('[Storage] Gagal menyimpan file base64:', err);
    return base64OrUrl; // fallback jika gagal
  }
}

// Data Master 5 Divisi
export const INITIAL_DIVISIONS = [
  {
    id: 'div-it',
    name: 'Sub Bagian Teknologi Informasi & Jaringan',
    code: 'TI-NET',
    description: 'Pemeliharaan perangkat keras, jaringan LAN/WLAN, server data, dan dukungan teknis aplikasi dinas.',
    supervisorName: 'Hendra Wijaya, S.T.'
  },
  {
    id: 'div-sec',
    name: 'Sub Bagian Pengamanan & Ketertiban',
    code: 'SEC-OPS',
    description: 'Keamanan fisik gedung dinas, pos jaga, patroli berkala 24/7, dan penerimaan tamu dinas.',
    supervisorName: 'Agus Suryanto, S.Sos.'
  },
  {
    id: 'div-cln',
    name: 'Sub Bagian Kebersihan Lingkungan & Fasilitas',
    code: 'CLN-ENV',
    description: 'Sanitasi gedung perkantoran, sterilisasi ruang rapat utama, penataan taman dan koridor dinas.',
    supervisorName: 'Hj. Ratna Sari, S.E.'
  },
  {
    id: 'div-drv',
    name: 'Sub Bagian Transportasi & Operasional Kendaraan',
    code: 'TRN-LOG',
    description: 'Operasional armada kendaraan dinas pimpinan, ekspedisi dokumen penting, dan antar jemput tamu dinas.',
    supervisorName: 'Bambang Hermawan, S.AP.'
  },
  {
    id: 'div-adm',
    name: 'Sub Bagian Administrasi Umum & Pelayanan Tamu',
    code: 'ADM-GEN',
    description: 'Front office pelayanan umum, pengarsipan berkas surat masuk/keluar, dan registrasi tamu kedinasan.',
    supervisorName: 'Dian Paramita, S.Kom.'
  }
];

// Data 10 Akun Dummy Resmi + 1 Super Admin (Password Seragam: Password123!)
const DEFAULT_PASSWORD_HASH = hashPassword('Password123!');

export const INITIAL_USERS = [
  // 5 Tenaga Outsourcing
  {
    id: 'usr-os-001',
    nip: 'OS-IT-001',
    name: 'Budi Santoso',
    email: 'budi.it@outsource.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'outsourcing',
    divisionId: 'div-it',
    divisionName: 'Sub Bagian Teknologi Informasi & Jaringan',
    roleTitle: 'Teknisi IT Support & Jaringan',
    phone: '0812-3456-7891',
    vendorName: 'PT Indo Tekno Prima',
    avatarColor: '#4f46e5',
    initials: 'BS',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-os-002',
    nip: 'OS-SEC-002',
    name: 'Reza Pratama',
    email: 'reza.sec@outsource.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'outsourcing',
    divisionId: 'div-sec',
    divisionName: 'Sub Bagian Pengamanan & Ketertiban',
    roleTitle: 'Petugas Keamanan (Security)',
    phone: '0813-9876-5432',
    vendorName: 'PT Garda Bhakti Perkasa',
    avatarColor: '#d97706',
    initials: 'RP',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-os-003',
    nip: 'OS-CLN-003',
    name: 'Siti Nurhaliza',
    email: 'siti.clean@outsource.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'outsourcing',
    divisionId: 'div-cln',
    divisionName: 'Sub Bagian Kebersihan Lingkungan & Fasilitas',
    roleTitle: 'Petugas Fasilitas & Kebersihan',
    phone: '0857-1234-5678',
    vendorName: 'PT Bersih Makmur Sentosa',
    avatarColor: '#059669',
    initials: 'SN',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-os-004',
    nip: 'OS-DRV-004',
    name: 'Ahmad Fauzi',
    email: 'ahmad.drv@outsource.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'outsourcing',
    divisionId: 'div-drv',
    divisionName: 'Sub Bagian Transportasi & Operasional Kendaraan',
    roleTitle: 'Pengemudi Operasional Dinas',
    phone: '0878-8765-4321',
    vendorName: 'PT Armada Solusi Prima',
    avatarColor: '#dc2626',
    initials: 'AF',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-os-005',
    nip: 'OS-ADM-005',
    name: 'Dewi Lestari',
    email: 'dewi.adm@outsource.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'outsourcing',
    divisionId: 'div-adm',
    divisionName: 'Sub Bagian Administrasi Umum & Pelayanan Tamu',
    roleTitle: 'Staf Administrasi & Front Office',
    phone: '0821-4567-8901',
    vendorName: 'PT Bina Karya Mandiri',
    avatarColor: '#db2777',
    initials: 'DL',
    deviceId: null,
    biometricKey: null
  },

  // 5 Atasan Langsung / Supervisor
  {
    id: 'usr-spv-101',
    nip: 'SPV-IT-101',
    name: 'Hendra Wijaya, S.T.',
    email: 'hendra.spv@dinas.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-it',
    divisionName: 'Sub Bagian Teknologi Informasi & Jaringan',
    roleTitle: 'Kepala Sub Bagian TI & Data',
    phone: '0811-5000-101',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#3b82f6',
    initials: 'HW',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-spv-102',
    nip: 'SPV-SEC-102',
    name: 'Agus Suryanto, S.Sos.',
    email: 'agus.spv@dinas.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sec',
    divisionName: 'Sub Bagian Pengamanan & Ketertiban',
    roleTitle: 'Komandan Regu / Kasubag Ketertiban',
    phone: '0811-5000-102',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#f59e0b',
    initials: 'AS',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-spv-103',
    nip: 'SPV-CLN-103',
    name: 'Hj. Ratna Sari, S.E.',
    email: 'ratna.spv@dinas.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-cln',
    divisionName: 'Sub Bagian Kebersihan Lingkungan & Fasilitas',
    roleTitle: 'Kasubag Fasilitas & Perlengkapan',
    phone: '0811-5000-103',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#10b981',
    initials: 'RS',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-spv-104',
    nip: 'SPV-DRV-104',
    name: 'Bambang Hermawan, S.AP.',
    email: 'bambang.spv@dinas.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-drv',
    divisionName: 'Sub Bagian Transportasi & Operasional Kendaraan',
    roleTitle: 'Koordinator Armada & Logistik',
    phone: '0811-5000-104',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#ef4444',
    initials: 'BH',
    deviceId: null,
    biometricKey: null
  },
  {
    id: 'usr-spv-105',
    nip: 'SPV-ADM-105',
    name: 'Dian Paramita, S.Kom.',
    email: 'dian.spv@dinas.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-adm',
    divisionName: 'Sub Bagian Administrasi Umum & Pelayanan Tamu',
    roleTitle: 'Kasubag Umum & Pelayanan Publik',
    phone: '0811-5000-105',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#ec4899',
    initials: 'DP',
    deviceId: null,
    biometricKey: null
  },

  // 1 Super Admin HR Master
  {
    id: 'usr-adm-000',
    nip: 'ADM-MASTER-001',
    name: 'Administrator HR Governance',
    email: 'admin@dinas.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'admin',
    divisionId: 'div-all',
    divisionName: 'Sekretariat Utama / HR Governance',
    roleTitle: 'Super Administrator',
    phone: '0811-0000-999',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#6366f1',
    initials: 'AD',
    deviceId: null,
    biometricKey: null
  }
];

// Inisialisasi Seeding Data ke Database
export function seedDatabaseIfEmpty() {
  const now = new Date().toISOString();

  if (isNodeSqlite && dbEngine) {
    const checkUser = dbEngine.prepare('SELECT COUNT(*) as count FROM users').get();
    if (checkUser && checkUser.count === 0) {
      console.log('[Database] Mengisi Seeding Data Awal 10 Akun & 5 Divisi ke SQLite...');
      
      const insertDiv = dbEngine.prepare(
        'INSERT INTO divisions (id, name, code, description, supervisor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const d of INITIAL_DIVISIONS) {
        insertDiv.run(d.id, d.name, d.code, d.description, d.supervisorName, now);
      }

      const insertUser = dbEngine.prepare(
        `INSERT INTO users (
          id, nip, name, email, password_hash, role, division_id, division_name,
          role_title, phone, vendor_name, avatar_color, initials, device_id, biometric_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const u of INITIAL_USERS) {
        insertUser.run(
          u.id, u.nip, u.name, u.email, u.passwordHash, u.role, u.divisionId, u.divisionName,
          u.roleTitle, u.phone, u.vendorName, u.avatarColor, u.initials, u.deviceId, u.biometricKey, now
        );
      }

      // Seed sampel presensi hari ini
      const today = new Date().toISOString().slice(0, 10);
      const insertAtt = dbEngine.prepare(
        `INSERT INTO attendance (
          id, staff_id, staff_name, division_id, date, clock_in_time, clock_out_time, status,
          selfie_url, latitude, longitude, accuracy, location_name, is_geofence_valid, distance_meters, device_fingerprint, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      insertAtt.run('att-seed-1', 'usr-os-001', 'Budi Santoso', 'div-it', today, '07:42 WIB', '-', 'Hadir', '', -2.5938, 115.3789, 12, 'Dinas Pendidikan Kab. HST', 1, 14.5, 'dev-pixel7-bud', now);
      insertAtt.run('att-seed-2', 'usr-os-002', 'Reza Pratama', 'div-sec', today, '06:55 WIB', '-', 'Hadir', '', -2.5938, 115.3789, 8, 'Dinas Pendidikan Kab. HST', 1, 9.2, 'dev-samsung-rez', now);
      insertAtt.run('att-seed-3', 'usr-os-003', 'Siti Nurhaliza', 'div-cln', today, '06:30 WIB', '-', 'Hadir', '', -2.5938, 115.3789, 15, 'Dinas Pendidikan Kab. HST', 1, 18.0, 'dev-oppo-sit', now);
      insertAtt.run('att-seed-4', 'usr-os-004', 'Ahmad Fauzi', 'div-drv', today, '07:50 WIB', '-', 'Hadir', '', -2.5938, 115.3789, 20, 'Dinas Pendidikan Kab. HST', 1, 24.1, 'dev-xiaomi-ahm', now);
      insertAtt.run('att-seed-5', 'usr-os-005', 'Dewi Lestari', 'div-adm', today, '07:35 WIB', '-', 'Hadir', '', -2.5938, 115.3789, 10, 'Dinas Pendidikan Kab. HST', 1, 11.4, 'dev-vivo-dew', now);

      // Seed sampel laporan harian
      const insertRep = dbEngine.prepare(
        `INSERT INTO daily_reports (
          id, staff_id, staff_name, division_id, date, title, category, start_time, end_time,
          summary, status, documentation_photo_url, image_hash, ai_duplicate_flag_json, location_coords_json,
          supervisor_approval, supervisor_notes, approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      insertRep.run(
        'rep-seed-1', 'usr-os-001', 'Budi Santoso', 'div-it', today,
        'Pemeliharaan & Reset Switch Hub Ruang Rapat Pimpinan', 'Pemeliharaan', '08:30', '10:00',
        'Pengecekan kabel patch cord LAN dan penggantian port switch yang bermasalah. Akses internet kembali normal.',
        'Selesai', '', 'hash-it-001', '{}', '{"locationName":"Dinas Pendidikan HST"}',
        'Pending', null, null, now
      );

      insertRep.run(
        'rep-seed-2', 'usr-os-002', 'Reza Pratama', 'div-sec', today,
        'Patroli Pagi Area Parkir & Gerbang Masuk Utama', 'Pelayanan Pengguna', '07:00', '08:30',
        'Pemeriksaan kendaraan dinas dan buku register tamu masuk kedinasan. Kondisi aman terkendali.',
        'Selesai', '', 'hash-sec-002', '{}', '{"locationName":"Dinas Pendidikan HST"}',
        'Approved', 'Laporan lengkap dan terverifikasi di pos jaga.', now, now
      );

      console.log('[Database] Seeding SQLite Selesai 100%.');
    }
  } else {
    // Fallback JSON Seeding
    if (!fallbackStore.users || fallbackStore.users.length === 0) {
      fallbackStore.divisions = INITIAL_DIVISIONS;
      fallbackStore.users = INITIAL_USERS;
      fallbackStore.attendance = [];
      fallbackStore.daily_reports = [];
      fallbackStore.evaluations = [];
      persistFallback();
      console.log('[Database] Seeding Fallback JSON Selesai.');
    }
  }
}

// ======================== API REPOSITORY METHODS ========================

// USERS & AUTH
export function getUserByEmailOrNip(emailOrNip) {
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare(
      'SELECT * FROM users WHERE email = ? OR nip = ? COLLATE NOCASE'
    ).get(emailOrNip, emailOrNip);
    if (!row) return null;
    return {
      id: row.id,
      nip: row.nip,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      divisionId: row.division_id,
      divisionName: row.division_name,
      roleTitle: row.role_title,
      phone: row.phone,
      vendorName: row.vendor_name,
      avatarColor: row.avatar_color,
      initials: row.initials,
      deviceId: row.device_id,
      biometricKey: row.biometric_key
    };
  } else {
    return fallbackStore.users.find(
      (u) => u.email.toLowerCase() === emailOrNip.toLowerCase() || u.nip.toLowerCase() === emailOrNip.toLowerCase()
    ) || null;
  }
}

export function getUserById(id) {
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      nip: row.nip,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      divisionId: row.division_id,
      divisionName: row.division_name,
      roleTitle: row.role_title,
      phone: row.phone,
      vendorName: row.vendor_name,
      avatarColor: row.avatar_color,
      initials: row.initials,
      deviceId: row.device_id,
      biometricKey: row.biometric_key
    };
  } else {
    return fallbackStore.users.find((u) => u.id === id) || null;
  }
}

export function createUser(userData) {
  const id = `usr-${userData.role === 'outsourcing' ? 'os' : 'spv'}-${Date.now()}`;
  const now = new Date().toISOString();
  const initials = userData.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const avatarColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#db2777', '#3b82f6'];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  const user = {
    id,
    nip: userData.nip,
    name: userData.name,
    email: userData.email,
    passwordHash: hashPassword(userData.password),
    role: userData.role,
    divisionId: userData.divisionId,
    divisionName: userData.divisionName,
    roleTitle: userData.roleTitle,
    phone: userData.phone || '',
    vendorName: userData.vendorName || (userData.role === 'outsourcing' ? 'Mitra Rekanan Disdik' : 'Dinas Pendidikan Kab. HST'),
    avatarColor,
    initials,
    deviceId: userData.deviceId || null,
    biometricKey: userData.biometricKey || null,
    createdAt: now
  };

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO users (
        id, nip, name, email, password_hash, role, division_id, division_name,
        role_title, phone, vendor_name, avatar_color, initials, device_id, biometric_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.id, user.nip, user.name, user.email, user.passwordHash, user.role,
      user.divisionId, user.divisionName, user.roleTitle, user.phone, user.vendorName,
      user.avatarColor, user.initials, user.deviceId, user.biometricKey, now
    );
  } else {
    fallbackStore.users.push(user);
    persistFallback();
  }

  return user;
}

export function updateUserDevice(userId, deviceId, biometricKey = null) {
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare('UPDATE users SET device_id = ?, biometric_key = COALESCE(?, biometric_key) WHERE id = ?').run(
      deviceId, biometricKey, userId
    );
  } else {
    const user = fallbackStore.users.find((u) => u.id === userId);
    if (user) {
      user.deviceId = deviceId;
      if (biometricKey) user.biometricKey = biometricKey;
      persistFallback();
    }
  }
}

export function listUsersByDivision(divisionId) {
  if (isNodeSqlite && dbEngine) {
    const rows = divisionId === 'div-all' || !divisionId
      ? dbEngine.prepare('SELECT * FROM users').all()
      : dbEngine.prepare('SELECT * FROM users WHERE division_id = ?').all(divisionId);
    
    return rows.map((row) => ({
      id: row.id,
      nip: row.nip,
      name: row.name,
      email: row.email,
      role: row.role,
      divisionId: row.division_id,
      divisionName: row.division_name,
      roleTitle: row.role_title,
      phone: row.phone,
      vendorName: row.vendor_name,
      avatarColor: row.avatar_color,
      initials: row.initials,
      deviceId: row.device_id
    }));
  } else {
    return fallbackStore.users
      .filter((u) => !divisionId || divisionId === 'div-all' || u.divisionId === divisionId)
      .map(({ passwordHash, ...safeUser }) => safeUser);
  }
}

// DIVISIONS
export function listDivisions() {
  if (isNodeSqlite && dbEngine) {
    const rows = dbEngine.prepare('SELECT * FROM divisions').all();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      supervisorName: r.supervisor_name
    }));
  } else {
    return fallbackStore.divisions;
  }
}

// ATTENDANCE
export function saveAttendance(attData) {
  const id = attData.id || `att-${Date.now()}`;
  const now = new Date().toISOString();
  const selfieUrl = saveBase64Image(attData.selfieUrl, 'attendance');

  let staffName = attData.staffName;
  let divisionId = attData.divisionId;
  if (!staffName || !divisionId) {
    const user = getUserById(attData.staffId);
    if (user) {
      staffName = staffName || user.name;
      divisionId = divisionId || user.divisionId;
    }
  }

  const lat = attData.locationCoords?.latitude ?? attData.latitude ?? null;
  const lon = attData.locationCoords?.longitude ?? attData.longitude ?? null;
  const acc = attData.locationCoords?.accuracy ?? attData.accuracy ?? null;
  const locName = attData.locationCoords?.locationName ?? attData.locationName ?? 'Lokasi Terdaftar';
  const isGeoValid = (attData.locationCoords?.withinRadius ?? attData.isGeofenceValid ?? true) ? 1 : 0;
  const dist = attData.locationCoords?.distanceMeters ?? attData.distanceMeters ?? 0;

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO attendance (
        id, staff_id, staff_name, division_id, date, clock_in_time, clock_out_time, status,
        selfie_url, latitude, longitude, accuracy, location_name, is_geofence_valid, distance_meters, device_fingerprint, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      attData.staffId || null,
      staffName || 'Tenaga Outsourcing',
      divisionId || 'div-it',
      attData.date || new Date().toISOString().slice(0, 10),
      attData.clockInTime || null,
      attData.clockOutTime || null,
      attData.status || 'Hadir',
      selfieUrl || null,
      lat,
      lon,
      acc,
      locName,
      isGeoValid,
      dist,
      attData.deviceFingerprint || '',
      now
    );
  } else {
    fallbackStore.attendance.push({
      ...attData,
      id,
      selfieUrl,
      createdAt: now
    });
    persistFallback();
  }

  return { ...attData, id, selfieUrl, staffName, divisionId };
}

export function listAttendance(filters = {}) {
  const { staffId, divisionId, date } = filters;
  if (isNodeSqlite && dbEngine) {
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];
    if (staffId) {
      query += ' AND staff_id = ?';
      params.push(staffId);
    }
    if (divisionId && divisionId !== 'div-all') {
      query += ' AND division_id = ?';
      params.push(divisionId);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    query += ' ORDER BY created_at DESC';

    const rows = dbEngine.prepare(query).all(...params);
    return rows.map((r) => ({
      id: r.id,
      staffId: r.staff_id,
      staffName: r.staff_name,
      divisionId: r.division_id,
      date: r.date,
      clockInTime: r.clock_in_time,
      clockOutTime: r.clock_out_time,
      status: r.status,
      selfieUrl: r.selfie_url,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      locationName: r.location_name,
      isGeofenceValid: Boolean(r.is_geofence_valid),
      distanceMeters: r.distance_meters,
      deviceFingerprint: r.device_fingerprint,
      createdAt: r.created_at
    }));
  } else {
    return fallbackStore.attendance.filter((r) => {
      if (staffId && r.staffId !== staffId) return false;
      if (divisionId && divisionId !== 'div-all' && r.divisionId !== divisionId) return false;
      if (date && r.date !== date) return false;
      return true;
    });
  }
}

// DAILY REPORTS
export function saveDailyReport(repData) {
  const id = repData.id || `rep-${Date.now()}`;
  const now = new Date().toISOString();
  const rawPhoto = repData.photoUrl || repData.documentationPhotoUrl;
  const photoUrl = saveBase64Image(rawPhoto, 'reports');

  let staffName = repData.staffName;
  let divisionId = repData.divisionId;
  if (!staffName || !divisionId) {
    const user = getUserById(repData.staffId);
    if (user) {
      staffName = staffName || user.name;
      divisionId = divisionId || user.divisionId;
    }
  }

  const title = repData.title || 'Laporan Pekerjaan';
  const category = repData.category || 'Pemeliharaan';
  const date = repData.date || new Date().toISOString().slice(0, 10);
  const startTime = repData.startTime || '08:00';
  const endTime = repData.endTime || '16:00';
  const summary = repData.description || repData.summary || '';
  const status = repData.status || 'Selesai';
  const imageHash = repData.imageHash || '';
  const aiDuplicateJson = JSON.stringify(repData.aiDuplicateFlag || {});
  const locCoordsJson = JSON.stringify(repData.locationCoords || {});
  const supervisorApproval = repData.supervisorApproval || 'Pending';
  const supervisorNotes = repData.supervisorNotes || null;

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO daily_reports (
        id, staff_id, staff_name, division_id, date, title, category, start_time, end_time,
        summary, status, documentation_photo_url, image_hash, ai_duplicate_flag_json, location_coords_json,
        supervisor_approval, supervisor_notes, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      repData.staffId || null,
      staffName || 'Tenaga Outsourcing',
      divisionId || 'div-it',
      date,
      title,
      category,
      startTime,
      endTime,
      summary,
      status,
      photoUrl,
      imageHash,
      aiDuplicateJson,
      locCoordsJson,
      supervisorApproval,
      supervisorNotes,
      null,
      now
    );
  } else {
    fallbackStore.daily_reports.push({
      ...repData,
      id,
      documentationPhotoUrl: photoUrl,
      createdAt: now
    });
    persistFallback();
  }

  return { ...repData, id, documentationPhotoUrl: photoUrl, staffName, divisionId };
}

export function listDailyReports(filters = {}) {
  const { staffId, divisionId } = filters;
  if (isNodeSqlite && dbEngine) {
    let query = 'SELECT * FROM daily_reports WHERE 1=1';
    const params = [];
    if (staffId) {
      query += ' AND staff_id = ?';
      params.push(staffId);
    }
    if (divisionId && divisionId !== 'div-all') {
      query += ' AND division_id = ?';
      params.push(divisionId);
    }
    query += ' ORDER BY created_at DESC';

    const rows = dbEngine.prepare(query).all(...params);
    return rows.map((r) => ({
      id: r.id,
      staffId: r.staff_id,
      staffName: r.staff_name,
      divisionId: r.division_id,
      date: r.date,
      title: r.title,
      category: r.category,
      startTime: r.start_time,
      endTime: r.end_time,
      summary: r.summary,
      status: r.status,
      documentationPhotoUrl: r.documentation_photo_url,
      imageHash: r.image_hash,
      aiDuplicateFlag: r.ai_duplicate_flag_json ? JSON.parse(r.ai_duplicate_flag_json) : null,
      locationCoords: r.location_coords_json ? JSON.parse(r.location_coords_json) : null,
      supervisorApproval: r.supervisor_approval,
      supervisorNotes: r.supervisor_notes,
      approvedAt: r.approved_at,
      createdAt: r.created_at
    }));
  } else {
    return fallbackStore.daily_reports.filter((r) => {
      if (staffId && r.staffId !== staffId) return false;
      if (divisionId && divisionId !== 'div-all' && r.divisionId !== divisionId) return false;
      return true;
    });
  }
}

export function approveReport(reportId, approvalStatus, supervisorNotes) {
  const now = new Date().toISOString();
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      'UPDATE daily_reports SET supervisor_approval = ?, supervisor_notes = ?, approved_at = ? WHERE id = ?'
    ).run(approvalStatus, supervisorNotes, now, reportId);
  } else {
    const report = fallbackStore.daily_reports.find((r) => r.id === reportId);
    if (report) {
      report.supervisorApproval = approvalStatus;
      report.supervisorNotes = supervisorNotes;
      report.approvedAt = now;
      persistFallback();
    }
  }
}

// EVALUATIONS
export function saveEvaluation(evalData) {
  const id = evalData.id || `eval-${Date.now()}`;
  const now = new Date().toISOString();

  let staffName = evalData.staffName;
  let divisionId = evalData.divisionId;
  if (!staffName || !divisionId) {
    const user = getUserById(evalData.staffId);
    if (user) {
      staffName = staffName || user.name;
      divisionId = divisionId || user.divisionId;
    }
  }

  const supervisorId = evalData.supervisorId || 'usr-spv-101';
  const weekNumber = Number(evalData.weekNumber) || 1;
  const monthYear = evalData.monthYear || evalData.month || '2026-10';
  const averageScore = Number(evalData.averageScore || evalData.overallWeeklyScore) || 5;
  const predicate = evalData.predicate || 'Sangat Baik (A)';
  const recommendation = evalData.recommendation || '';
  const notes = evalData.notes || evalData.supervisorNotes || '';
  const scoresJson = JSON.stringify(evalData.scores || evalData.pillarScores || {});

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO evaluations (
        id, staff_id, staff_name, supervisor_id, division_id, week_number, month_year,
        scores_json, average_score, predicate, recommendation, notes, evaluated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      evalData.staffId || null,
      staffName || 'Tenaga Outsourcing',
      supervisorId,
      divisionId || 'div-it',
      weekNumber,
      monthYear,
      scoresJson,
      averageScore,
      predicate,
      recommendation,
      notes,
      now,
      now
    );
  } else {
    fallbackStore.evaluations.push({
      ...evalData,
      id,
      evaluatedAt: now,
      createdAt: now
    });
    persistFallback();
  }

  return { ...evalData, id };
}

export function listEvaluations(filters = {}) {
  const { staffId, divisionId } = filters;
  if (isNodeSqlite && dbEngine) {
    let query = 'SELECT * FROM evaluations WHERE 1=1';
    const params = [];
    if (staffId) {
      query += ' AND staff_id = ?';
      params.push(staffId);
    }
    if (divisionId && divisionId !== 'div-all') {
      query += ' AND division_id = ?';
      params.push(divisionId);
    }
    query += ' ORDER BY created_at DESC';

    const rows = dbEngine.prepare(query).all(...params);
    return rows.map((r) => ({
      id: r.id,
      staffId: r.staff_id,
      staffName: r.staff_name,
      supervisorId: r.supervisor_id,
      divisionId: r.division_id,
      weekNumber: r.week_number,
      monthYear: r.month_year,
      scores: JSON.parse(r.scores_json || '{}'),
      averageScore: r.average_score,
      predicate: r.predicate,
      recommendation: r.recommendation,
      notes: r.notes,
      evaluatedAt: r.evaluated_at,
      createdAt: r.created_at
    }));
  } else {
    return fallbackStore.evaluations.filter((r) => {
      if (staffId && r.staffId !== staffId) return false;
      if (divisionId && divisionId !== 'div-all' && r.divisionId !== divisionId) return false;
      return true;
    });
  }
}

// Inisialisasi awal saat pertama kali di-import
seedDatabaseIfEmpty();
