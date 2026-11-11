/**
 * SQLite Database & Storage Engine for OutsourceTrack & KPI Pro
 * Mendukung built-in node:sqlite (Node.js v22+) dengan fallback file-based JSON.
 * Disesuaikan khusus untuk Dinas Pendidikan Kabupaten Hulu Sungai Tengah.
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
      hardware_fingerprint TEXT,
      biometric_key TEXT,
      custom_location_json TEXT,
      supervisor_id TEXT,
      pending_supervisor_id TEXT,
      supervisor_change_count INTEGER DEFAULT 0,
      supervisor_request_status TEXT DEFAULT 'NONE',
      workspace_note TEXT,
      supervised_groups TEXT,
      pending_division TEXT,
      pending_job_role TEXT,
      pending_location_id TEXT,
      pending_vendor TEXT,
      division_request_status TEXT DEFAULT 'NONE',
      admin_request_status TEXT DEFAULT 'NONE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      division_id TEXT NOT NULL,
      date TEXT NOT NULL,
      clock_in_time TEXT NOT NULL,
      break_out_time TEXT,
      break_in_time TEXT,
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
      clock_out_selfie_url TEXT,
      clock_out_latitude REAL,
      clock_out_longitude REAL,
      clock_out_accuracy REAL,
      clock_out_location_name TEXT,
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

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      category TEXT DEFAULT 'vendor',
      contract_number TEXT,
      contract_start TEXT,
      contract_end TEXT,
      pic_name TEXT,
      pic_phone TEXT,
      address TEXT,
      status TEXT DEFAULT 'Aktif',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS field_checkins (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      division_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      selfie_url TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL NOT NULL,
      location_name TEXT NOT NULL,
      activity_notes TEXT,
      verified_by TEXT DEFAULT 'Sistem GPS WebRTC',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS overtime_requests (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      staff_nip TEXT,
      division_id TEXT NOT NULL,
      division_name TEXT,
      supervisor_id TEXT NOT NULL,
      supervisor_name TEXT,
      date TEXT NOT NULL,
      start_time_plan TEXT,
      estimated_hours REAL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      supervisor_notes TEXT,
      approved_at TEXT,
      clock_in_time TEXT,
      clock_in_selfie_url TEXT,
      clock_in_coords TEXT,
      clock_out_time TEXT,
      clock_out_selfie_url TEXT,
      clock_out_coords TEXT,
      actual_duration_minutes INTEGER DEFAULT 0,
      work_summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      staff_nip TEXT,
      division_id TEXT NOT NULL,
      division_name TEXT,
      supervisor_id TEXT NOT NULL,
      supervisor_name TEXT,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      attachment_url TEXT,
      status TEXT DEFAULT 'PENDING',
      supervisor_notes TEXT,
      approved_at TEXT,
      verified_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      staff_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_biometrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER DEFAULT 0,
      device_name TEXT,
      transports TEXT,
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_biometrics_user_id ON user_biometrics(user_id);
    CREATE INDEX IF NOT EXISTS idx_biometrics_credential_id ON user_biometrics(credential_id);
  `);

  // Migrasi aman untuk kolom baru users jika database sudah ada sebelumnya
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN hardware_fingerprint TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN custom_location_json TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN supervisor_id TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN workspace_note TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Aktif';`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN pending_supervisor_id TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN supervisor_change_count INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN supervisor_request_status TEXT DEFAULT 'NONE';`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN supervised_groups TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN pending_division TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN pending_job_role TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN pending_location_id TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN pending_vendor TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN division_request_status TEXT DEFAULT 'NONE';`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE users ADD COLUMN admin_request_status TEXT DEFAULT 'NONE';`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE vendors ADD COLUMN category TEXT DEFAULT 'vendor';`);
  } catch (e) {}
  try {
    dbEngine.exec(`UPDATE vendors SET category = 'vendor' WHERE category IS NULL OR category = '';`);
  } catch (e) {}

  // Migrasi aman untuk kolom baru tabel attendance (Sesi istirahat & tugas lapangan)
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN break_out_time TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN break_in_time TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN is_field_duty INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN field_duty_notes TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN auto_closed INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN clock_out_selfie_url TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN clock_out_latitude REAL;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN clock_out_longitude REAL;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN clock_out_accuracy REAL;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN clock_out_location_name TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN notes TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE attendance ADD COLUMN verified_by TEXT;`);
  } catch (e) {}

  // Migrasi aman untuk kolom identitas staf pada notifikasi
  try {
    dbEngine.exec(`ALTER TABLE notifications ADD COLUMN staff_name TEXT;`);
  } catch (e) {}
  try {
    dbEngine.exec(`ALTER TABLE notifications ADD COLUMN division_name TEXT;`);
  } catch (e) {}
}

// Fallback JSON in-memory store jika sqlite bawaan tidak aktif
const FALLBACK_FILE = path.join(DATA_DIR, 'outsource_store.json');
let fallbackStore = {
  divisions: [],
  users: [],
  attendance: [],
  daily_reports: [],
  evaluations: [],
  leave_requests: [],
  notifications: [],
  user_biometrics: []
};

if (!isNodeSqlite && fs.existsSync(FALLBACK_FILE)) {
  try {
    fallbackStore = JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf-8'));
  } catch (e) {
    console.error('[Storage Fallback] Gagal membaca berkas JSON fallback:', e);
  }
}

function persistFallback() {
  if (!isNodeSqlite) {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackStore, null, 2), 'utf-8');
  }
}

// ======================== HELPER FUNCTIONS ========================

export function hashPassword(plainText) {
  return crypto.createHash('sha256').update(plainText).digest('hex');
}

/**
 * Menyimpan Base64 Data URL menjadi berkas fisik foto di direktori uploads
 */
export function saveBase64Image(base64OrUrl, subfolder = 'attendance') {
  if (!base64OrUrl) return '';
  if (base64OrUrl.startsWith('/uploads/')) return base64OrUrl;

  const matches = base64OrUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return base64OrUrl;
  }

  const ext = matches[1].includes('pdf') ? 'pdf' : (matches[1].includes('png') ? 'png' : (matches[1].includes('webp') ? 'webp' : 'jpg'));
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${subfolder}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const targetDir = path.join(UPLOADS_DIR, subfolder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, filename);
  try {
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${subfolder}/${filename}`;
  } catch (err) {
    console.error(`[Storage] Gagal menulis berkas foto ke ${filePath}:`, err);
    return base64OrUrl;
  }
}

// ======================== MASTER DATA RESMI DISDIK HST ========================

export const INITIAL_DIVISIONS = [
  {
    id: 'div-kadis',
    name: 'Pucuk Pimpinan SKPD',
    code: 'KADIS',
    description: 'Pimpinan tertinggi Dinas Pendidikan Kabupaten Hulu Sungai Tengah.',
    supervisorName: 'H. Muhammad Anhar, S.STP, ME'
  },
  {
    id: 'div-sekretariat',
    name: 'Sekretariat Dinas Pendidikan',
    code: 'SEKRETARIAT',
    description: 'Pengkoordinasian program, administrasi keuangan, kepegawaian, dan rumah tangga dinas.',
    supervisorName: 'Salihin, S.Pd.SD'
  },
  {
    id: 'div-renlap',
    name: 'Sub Bagian Perencanaan dan Pelaporan',
    code: 'SUB-RENLAP',
    description: 'Penyusunan rencana kerja, evaluasi program, pelaporan kinerja dinas, dan dukungan TI.',
    supervisorName: 'Muhammad Sugeng Wahyudi, A.Md'
  },
  {
    id: 'div-keuangan',
    name: 'Sub Bagian Keuangan',
    code: 'SUB-KEU',
    description: 'Pengelolaan administrasi keuangan, penatausahaan kas, dan pelaporan SPJ dinas.',
    supervisorName: 'Hj. Rabiatul Adawiyah, SE'
  },
  {
    id: 'div-umpeg',
    name: 'Sub Bagian Umum dan Kepegawaian',
    code: 'SUB-UMPEG',
    description: 'Pelayanan administrasi umum, ketertiban, kepegawaian, pengamanan kantor, dan kebersihan.',
    supervisorName: 'Ahmad Humaidi, S.Pd.'
  },
  {
    id: 'div-arsip',
    name: 'Unit Kerja Kearsipan & Arsiparis',
    code: 'ARSIP',
    description: 'Tata kelola kearsipan naskah dinas, dokumen fisik, dan digitalisasi dokumen dinas.',
    supervisorName: 'Petugas Arsip'
  },
  {
    id: 'div-sd',
    name: 'Bidang Pembinaan Sekolah Dasar',
    code: 'BID-SD',
    description: 'Pembinaan kurikulum, peserta didik, GTK, dan kelembagaan Sekolah Dasar se-Kab. HST.',
    supervisorName: 'Badaruddin, M.Pd'
  },
  {
    id: 'div-smp',
    name: 'Bidang Pembinaan SMP',
    code: 'BID-SMP',
    description: 'Pembinaan kurikulum, peserta didik, GTK, dan kelembagaan Sekolah Menengah Pertama se-Kab. HST.',
    supervisorName: 'Alamsyah Mappaompo, S.Pd. MM'
  },
  {
    id: 'div-sarpras',
    name: 'Bidang Sarana Prasarana dan Kelembagaan',
    code: 'BID-SARPRAS',
    description: 'Pembangunan, pemeliharaan, pengadaan sarpras PAUD, SD, SMP, dan inventarisasi aset dinas.',
    supervisorName: 'Bayhaki Novie, S.Pd'
  },
  {
    id: 'div-paud',
    name: 'Bidang PAUD dan Pendidikan Masyarakat',
    code: 'BID-PAUD',
    description: 'Pembinaan PAUD, TK, Pendidikan Kesetaraan, Sanggar Kegiatan Belajar (SKB), dan Dikmas.',
    supervisorName: 'Andry Rachmat Hidayat, S.Kom'
  }
];

const DEFAULT_PASSWORD_HASH = hashPassword('Password123!');

export const INITIAL_USERS = [
  // 1. Pucuk Pimpinan & Super Admin
  {
    id: 'usr-pimp-001',
    nip: '19820916 200012 1 002',
    name: 'H. Muhammad Anhar, S.STP, ME',
    email: 'kadin@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'admin',
    divisionId: 'div-kadis',
    divisionName: 'Pucuk Pimpinan SKPD',
    roleTitle: 'Kepala Dinas Pendidikan',
    phone: '0811-5000-001',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#0f172a',
    initials: 'MA',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: null,
    workspaceNote: 'Ruang Kepala Dinas - Kantor Disdik HST'
  },
  {
    id: 'usr-pimp-002',
    nip: '19780502 200604 1 017',
    name: 'Salihin, S.Pd.SD',
    email: 'sekretaris@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sekretariat',
    divisionName: 'Sekretariat Dinas Pendidikan',
    roleTitle: 'Sekretaris Dinas (Eselon III.a)',
    phone: '0811-5000-002',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#1e293b',
    initials: 'SL',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-001',
    workspaceNote: 'Ruang Sekretaris - Kantor Disdik HST'
  },

  // 2. Kasubag & Unit Kerja Sekretariat (Atasan Langsung)
  {
    id: 'usr-spv-renlap',
    nip: '19821218 200604 1 008',
    name: 'Muhammad Sugeng Wahyudi, A.Md',
    email: 'renlap@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-renlap',
    divisionName: 'Sub Bagian Perencanaan dan Pelaporan',
    roleTitle: 'Kepala Sub Bagian Perencanaan dan Pelaporan',
    phone: '0812-5100-1008',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#3b82f6',
    initials: 'SW',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-002',
    workspaceNote: 'Ruang Renlap - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-keu',
    nip: '19730609 199503 2 002',
    name: 'Hj. Rabiatul Adawiyah, SE',
    email: 'keuangan@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-keuangan',
    divisionName: 'Sub Bagian Keuangan',
    roleTitle: 'Kepala Sub Bagian Keuangan',
    phone: '0812-5100-2002',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#059669',
    initials: 'RA',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-002',
    workspaceNote: 'Ruang Keuangan - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-umpeg',
    nip: '19860620 201001 1 008',
    name: 'Ahmad Humaidi, S.Pd.',
    email: 'umpeg@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-umpeg',
    divisionName: 'Sub Bagian Umum dan Kepegawaian',
    roleTitle: 'Kepala Sub Bagian Umum dan Kepegawaian',
    phone: '0812-5100-3008',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#d97706',
    initials: 'AH',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-002',
    workspaceNote: 'Ruang Umum & Kepegawaian - Kantor Disdik HST'
  },

  // 3. Bidang Pembinaan SD (Kabid & Kasi)
  {
    id: 'usr-spv-kabid-sd',
    nip: '19800202 200604 1 028',
    name: 'Badaruddin, M.Pd',
    email: 'kabid.sd@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sd',
    divisionName: 'Bidang Pembinaan Sekolah Dasar',
    roleTitle: 'Kepala Bidang Pembinaan Sekolah Dasar (Eselon III.b)',
    phone: '0812-5100-5028',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#2563eb',
    initials: 'BD',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-002',
    workspaceNote: 'Ruang Bidang SD - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-kasi-sd-gtk',
    nip: '19850902 201406 1 002',
    name: 'Miseransyah, S.Pd.I',
    email: 'miseransyah@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sd',
    divisionName: 'Bidang Pembinaan Sekolah Dasar',
    roleTitle: 'Kepala Seksi GTK dan Kelembagaan SD',
    phone: '0813-5100-6002',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#0284c7',
    initials: 'MS',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-sd',
    workspaceNote: 'Ruang Seksi GTK SD - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-kasi-sd-kur',
    nip: '19750424 199803 1 006',
    name: 'Ruswan, S.Pd.',
    email: 'ruswan@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sd',
    divisionName: 'Bidang Pembinaan Sekolah Dasar',
    roleTitle: 'Kepala Seksi Kurikulum dan Peserta Didik SD',
    phone: '0813-5100-7006',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#0d9488',
    initials: 'RS',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-sd',
    workspaceNote: 'Ruang Kurikulum SD - Kantor Disdik HST'
  },

  // 4. Bidang Pembinaan SMP (Kabid & Kasi)
  {
    id: 'usr-spv-kabid-smp',
    nip: '19780414 200604 1 023',
    name: 'Alamsyah Mappaompo, S.Pd. MM',
    email: 'kabid.smp@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-smp',
    divisionName: 'Bidang Pembinaan SMP',
    roleTitle: 'Kepala Bidang Pembinaan SMP (Eselon III.b)',
    phone: '0812-5100-8023',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#7c3aed',
    initials: 'AM',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-002',
    workspaceNote: 'Ruang Bidang SMP - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-kasi-smp-gtk',
    nip: '19880704 201101 2 010',
    name: 'Dewi Susanti, S.Pd',
    email: 'dewi.susanti@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-smp',
    divisionName: 'Bidang Pembinaan SMP',
    roleTitle: 'Kepala Seksi Bidang Pembinaan GTK & Peserta Didik SMP',
    phone: '0813-5100-9010',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#9333ea',
    initials: 'DS',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-smp',
    workspaceNote: 'Ruang Seksi GTK SMP - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-kasi-smp-kur',
    nip: '19830216 200604 2 009',
    name: 'Rusnida Erliyanti, S.Pd',
    email: 'rusnida@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-smp',
    divisionName: 'Bidang Pembinaan SMP',
    roleTitle: 'Kepala Seksi Kurikulum Sekolah Menengah Pertama',
    phone: '0813-5100-1009',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#c026d3',
    initials: 'RE',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-smp',
    workspaceNote: 'Ruang Kurikulum SMP - Kantor Disdik HST'
  },

  // 5. Bidang Sarana Prasarana dan Kelembagaan (Kabid, Kasi, Penelaah)
  {
    id: 'usr-spv-kabid-sarpras',
    nip: '19831110 200501 1 007',
    name: 'Bayhaki Novie, S.Pd',
    email: 'kabid.sarpras@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sarpras',
    divisionName: 'Bidang Sarana Prasarana dan Kelembagaan',
    roleTitle: 'Kepala Bidang Sarana Prasarana dan Kelembagaan (Eselon III.b)',
    phone: '0812-5100-1107',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#ea580c',
    initials: 'BN',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-002',
    workspaceNote: 'Ruang Bidang Sarpras - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-kasi-sarpras-sd',
    nip: '19851207 200501 1 002',
    name: 'Muhammad Fahdi Royansyah',
    email: 'fahdi.royansyah@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sarpras',
    divisionName: 'Bidang Sarana Prasarana dan Kelembagaan',
    roleTitle: 'Kepala Seksi Sarana dan Prasarana SD',
    phone: '0813-5100-1202',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#d97706',
    initials: 'FR',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-sarpras',
    workspaceNote: 'Ruang Sarpras SD - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-kasi-sarpras-smp',
    nip: '19860206 200501 1 002',
    name: 'Muhammad Kharies Setiawan, SE',
    email: 'kharies@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sarpras',
    divisionName: 'Bidang Sarana Prasarana dan Kelembagaan',
    roleTitle: 'Kasi Sarana Prasarana PAUD dan SMP',
    phone: '0813-5100-1302',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#b45309',
    initials: 'KS',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-sarpras',
    workspaceNote: 'Ruang Sarpras PAUD/SMP - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-penelaah-sarpras',
    nip: '19870606 201101 1 008',
    name: 'M. Abdillah, S.Pd.',
    email: 'abdillah@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-sarpras',
    divisionName: 'Bidang Sarana Prasarana dan Kelembagaan',
    roleTitle: 'Penelaah Teknis Kebijakan Sarpras',
    phone: '0813-5100-1408',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#78350f',
    initials: 'MA',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-sarpras',
    workspaceNote: 'Ruang Teknis Sarpras - Kantor Disdik HST'
  },

  // 6. Bidang PAUD dan Pendidikan Masyarakat (Kabid & Kasi)
  {
    id: 'usr-spv-kabid-paud',
    nip: '19851208 201001 1 007',
    name: 'Andry Rachmat Hidayat, S.Kom',
    email: 'kabid.paud@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-paud',
    divisionName: 'Bidang PAUD dan Pendidikan Masyarakat',
    roleTitle: 'Kepala Bidang PAUD dan Pendidikan Masyarakat (Eselon III.b)',
    phone: '0812-5100-1507',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#047857',
    initials: 'AH',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-pimp-002',
    workspaceNote: 'Ruang Bidang PAUD - Kantor Disdik HST'
  },
  {
    id: 'usr-spv-kasi-paud',
    nip: '19880509 201503 2 005',
    name: 'Fatmahidayani Hejna, S.Pd',
    email: 'fatma.hejna@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supervisor',
    divisionId: 'div-paud',
    divisionName: 'Bidang PAUD dan Pendidikan Masyarakat',
    roleTitle: 'Kepala Seksi Kurikulum PAUD dan Pedidikan Masyarakat',
    phone: '0813-5100-1605',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#059669',
    initials: 'FH',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: 'usr-spv-kabid-paud',
    workspaceNote: 'Ruang Kurikulum PAUD - Kantor Disdik HST'
  },

  // 7. Super Admin IT
  {
    id: 'usr-adm-001',
    nip: 'ADMIN-HST',
    name: 'Admin Sistem Disdik HST',
    email: 'admin@disdikhst.go.id',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'admin',
    divisionId: 'div-renlap',
    divisionName: 'Sub Bagian Perencanaan dan Pelaporan',
    roleTitle: 'Super Administrator & Analis Sistem TI',
    phone: '0811-5000-999',
    vendorName: 'Dinas Pendidikan Kab. HST',
    avatarColor: '#0f172a',
    initials: 'AD',
    deviceId: null,
    biometricKey: null,
    customLocationJson: null,
    supervisorId: null,
    workspaceNote: 'Control Center Aplikasi - Kantor Disdik HST'
  }
];

export const INITIAL_VENDORS = [
  {
    id: 'ven-1793854918283',
    name: 'PT. YASMINE BUIH PERSADA',
    code: 'YASMINE',
    category: 'vendor',
    contractNumber: 'EP-01M5XX726VD68KCYTTK3HYTB75',
    contractStart: '2026-01-02',
    contractEnd: '2026-12-31',
    picName: 'AKHMAD NABEHAN',
    picPhone: '0813-4900-5566',
    address: 'Jl. KH. Ideham Khalid RT 04 No. 38 Gang Ketapi, Kab. Hulu Sungai Utara (71419)',
    status: 'Aktif'
  },
  {
    id: 'ven-004',
    name: 'PPPK Paruh Waktu Disdik HST',
    code: 'PPPK-PW',
    category: 'pppk_paruh_waktu',
    contractNumber: 'KEP-BUP/800/DISDIK-HST/2026',
    contractStart: '2026-01-02',
    contractEnd: '2026-12-31',
    picName: 'Koordinator PPPK Paruh Waktu Disdik',
    picPhone: '0811-5000-2233',
    address: 'Kantor Dinas Pendidikan Kab. HST, Barabai',
    status: 'Aktif'
  },
  {
    id: 'ven-005',
    name: 'Siswa / Mahasiswa Magang Disdik HST',
    code: 'MAGANG-HST',
    category: 'magang',
    contractNumber: 'MOU/MAGANG/DISDIK-HST/2026',
    contractStart: '2026-01-02',
    contractEnd: '2026-12-31',
    picName: 'Koordinator Pembina Magang & PKL',
    picPhone: '0821-5300-7788',
    address: 'Kantor Dinas Pendidikan & Sekolah Binaan Kab. HST',
    status: 'Aktif'
  }
];

// ======================== SEEDING / SINKRONISASI DATABASE ========================

export function seedDatabaseIfEmpty() {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  if (isNodeSqlite && dbEngine) {
    // Sinkronisasi Tabel Vendors
    try {
      // Hapus vendor dummy lawas (Handil Bakti & Murakata)
      dbEngine.prepare("DELETE FROM vendors WHERE id IN ('ven-001', 'ven-002') OR name LIKE '%Handil Bakti%' OR name LIKE '%Murakata Sarana Mandiri%'").run();
      // Deduplikasi YASMINE jika ada duplikat (ven-003 vs ven-yasmine vs ven-1793854918283)
      const yasmineRows = dbEngine.prepare("SELECT id FROM vendors WHERE name = 'PT. YASMINE BUIH PERSADA' ORDER BY id DESC").all();
      if (yasmineRows.length > 1) {
        const keepId = yasmineRows[0].id;
        dbEngine.prepare("DELETE FROM vendors WHERE name = 'PT. YASMINE BUIH PERSADA' AND id != ?").run(keepId);
      }

      const insertVen = dbEngine.prepare(
        'INSERT OR IGNORE INTO vendors (id, name, code, category, contract_number, contract_start, contract_end, pic_name, pic_phone, address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const v of INITIAL_VENDORS) {
        insertVen.run(v.id, v.name, v.code, v.category || 'vendor', v.contractNumber, v.contractStart, v.contractEnd, v.picName, v.picPhone, v.address, v.status, now);
        dbEngine.prepare('UPDATE vendors SET category = ? WHERE id = ? OR name = ?').run(v.category || 'vendor', v.id, v.name);
      }
    } catch (e) {
      console.warn('[Database] Gagal seeding vendors:', e.message);
    }

    // Sinkronisasi Tabel Divisions (Upsert/Replace)
    const insertDiv = dbEngine.prepare(
      'INSERT OR REPLACE INTO divisions (id, name, code, description, supervisor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const d of INITIAL_DIVISIONS) {
      insertDiv.run(d.id, d.name, d.code, d.description, d.supervisorName, now);
    }

    // Periksa apakah pengguna resmi Disdik HST sudah masuk
    const hasKadis = dbEngine.prepare("SELECT id FROM users WHERE id = 'usr-pimp-001' OR email = 'kadin@disdikhst.go.id'").get();
    if (!hasKadis) {
      console.log('[Database] Melakukan migrasi dan seeding pengguna resmi Disdik HST...');
      const insertUser = dbEngine.prepare(
        `INSERT OR REPLACE INTO users (
          id, nip, name, email, password_hash, role, division_id, division_name,
          role_title, phone, vendor_name, avatar_color, initials, device_id, biometric_key,
          custom_location_json, supervisor_id, workspace_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const u of INITIAL_USERS) {
        insertUser.run(
          u.id,
          u.nip,
          u.name,
          u.email,
          u.passwordHash,
          u.role,
          u.divisionId,
          u.divisionName,
          u.roleTitle,
          u.phone,
          u.vendorName,
          u.avatarColor,
          u.initials,
          u.deviceId,
          u.biometricKey,
          u.customLocationJson || null,
          u.supervisorId || null,
          u.workspaceNote || null,
          now
        );
      }

      console.log('[Database] Sinkronisasi data resmi Disdik HST selesai.');
    }
  } else {
    fallbackStore.divisions = INITIAL_DIVISIONS;
    fallbackStore.users = INITIAL_USERS;
    persistFallback();
  }
}

// ======================== API REPOSITORY METHODS ========================

export function getUserByEmailOrNip(emailOrNip) {
  if (!emailOrNip) return null;
  const raw = String(emailOrNip).trim();
  const clean = raw.replace(/[\s.-]/g, '');

  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare(
      `SELECT * FROM users 
       WHERE email = ? COLLATE NOCASE 
          OR nip = ? COLLATE NOCASE 
          OR (LENGTH(?) >= 3 AND REPLACE(REPLACE(REPLACE(nip, ' ', ''), '.', ''), '-', '') = ? COLLATE NOCASE)`
    ).get(raw, raw, clean, clean);
    if (!row) return null;
    return mapUserRow(row);
  } else {
    const rawLower = raw.toLowerCase();
    const cleanLower = clean.toLowerCase();
    const u = fallbackStore.users.find((user) => {
      const uEmail = (user.email || '').trim().toLowerCase();
      const uNip = (user.nip || '').trim().toLowerCase();
      const uCleanNip = uNip.replace(/[\s.-]/g, '');
      return (
        uEmail === rawLower ||
        uNip === rawLower ||
        (cleanLower.length >= 3 && uCleanNip === cleanLower)
      );
    });
    return u || null;
  }
}

export function getUserById(id) {
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!row) return null;
    return mapUserRow(row);
  } else {
    return fallbackStore.users.find((u) => u.id === id) || null;
  }
}

function mapUserRow(row) {
  let customLocation = null;
  if (row.custom_location_json) {
    try {
      customLocation = JSON.parse(row.custom_location_json);
    } catch (e) {}
  }
  let supervisedGroups = [];
  if (row.supervised_groups) {
    try {
      const parsed = JSON.parse(row.supervised_groups);
      if (Array.isArray(parsed)) {
        supervisedGroups = parsed;
      } else if (typeof parsed === 'string') {
        supervisedGroups = [parsed];
      }
    } catch (e) {
      supervisedGroups = row.supervised_groups.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  const supervisedVendor = supervisedGroups.length > 0 ? supervisedGroups[0] : (row.vendor_name || undefined);

  const hasDevice = Boolean(row.device_id);
  const deviceBinding = hasDevice
    ? {
        registered: true,
        deviceModel: row.device_id,
        deviceUuid: row.device_id,
        registeredAt: row.created_at || new Date().toISOString(),
      }
    : null;

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
    hardwareFingerprint: row.hardware_fingerprint || row.device_id || null,
    deviceBinding,
    status: row.status || 'Aktif',
    biometricKey: row.biometric_key,
    customLocation,
    assignedLocation: customLocation, // jika null, client fallback ke Kantor Disdik HST
    supervisorId: row.supervisor_id,
    pendingSupervisorId: row.pending_supervisor_id || null,
    supervisorChangeCount: Number(row.supervisor_change_count) || 0,
    supervisorRequestStatus: row.supervisor_request_status || 'NONE',
    workspaceNote: row.workspace_note,
    supervisedGroups,
    supervisedVendor,
    pendingDivision: row.pending_division || null,
    pendingJobRole: row.pending_job_role || null,
    pendingLocationId: row.pending_location_id || null,
    pendingVendor: row.pending_vendor || null,
    divisionRequestStatus: row.division_request_status || 'NONE',
    adminRequestStatus: row.admin_request_status || 'NONE'
  };
}

export function createUser(userData) {
  const idPrefix = userData.role === 'outsourcing' ? 'os' : userData.role === 'coordinator' ? 'coord' : 'spv';
  const id = `usr-${idPrefix}-${Date.now()}`;
  const now = new Date().toISOString();
  const initials = userData.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const avatarColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#db2777', '#3b82f6'];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  let supervisedGroups = [];
  if (userData.supervisedGroups) {
    supervisedGroups = Array.isArray(userData.supervisedGroups) ? userData.supervisedGroups : [userData.supervisedGroups];
  } else if (userData.supervisedVendor) {
    supervisedGroups = [userData.supervisedVendor];
  }
  const supervisedGroupsJson = supervisedGroups.length > 0 ? JSON.stringify(supervisedGroups) : null;

  const userObj = {
    id,
    nip: userData.nip,
    name: userData.name,
    email: userData.email,
    passwordHash: hashPassword(userData.password),
    role: userData.role || 'outsourcing',
    divisionId: userData.divisionId || (userData.role === 'coordinator' ? 'div-vendor' : 'div-umpeg'),
    divisionName: userData.divisionName || (userData.role === 'coordinator' ? 'Pengawas Mitra Lapangan' : 'Sub Bagian Umum & Kepegawaian'),
    roleTitle: userData.roleTitle || (userData.role === 'coordinator' ? 'Pengawas Lapangan Mitra' : userData.role === 'supervisor' ? 'Pejabat Penilai' : userData.role === 'admin' ? 'Administrator' : 'Tenaga Outsourcing'),
    phone: userData.phone || '',
    vendorName: userData.vendorName || (supervisedGroups[0] || 'Dinas Pendidikan Kab. HST'),
    avatarColor,
    initials,
    deviceId: userData.deviceId || null,
    biometricKey: userData.biometricKey || null,
    customLocation: userData.customLocation || null,
    supervisorId: userData.supervisorId || null,
    workspaceNote: userData.workspaceNote || null,
    supervisedGroups,
    supervisedVendor: supervisedGroups[0] || userData.vendorName || undefined,
    status: userData.status || 'Aktif',
    createdAt: now
  };

  const customLocationJson = userData.customLocation ? JSON.stringify(userData.customLocation) : null;

  const hardwareFingerprint = userData.hardwareFingerprint || userData.deviceId || null;
  userObj.hardwareFingerprint = hardwareFingerprint;

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO users (
        id, nip, name, email, password_hash, role, division_id, division_name,
        role_title, phone, vendor_name, avatar_color, initials, device_id, hardware_fingerprint, biometric_key,
        custom_location_json, supervisor_id, workspace_note, supervised_groups, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userObj.id,
      userObj.nip,
      userObj.name,
      userObj.email,
      userObj.passwordHash,
      userObj.role,
      userObj.divisionId ?? null,
      userObj.divisionName ?? null,
      userObj.roleTitle ?? null,
      userObj.phone ?? null,
      userObj.vendorName ?? null,
      userObj.avatarColor ?? null,
      userObj.initials ?? null,
      userObj.deviceId ?? null,
      hardwareFingerprint,
      userObj.biometricKey ?? null,
      customLocationJson ?? null,
      userObj.supervisorId ?? null,
      userObj.workspaceNote ?? null,
      supervisedGroupsJson ?? null,
      userObj.status || 'Aktif',
      now
    );
  } else {
    fallbackStore.users.push(userObj);
    persistFallback();
  }

  return userObj;
}

export function updateUserDevice(userId, deviceId, biometricKey = null, hardwareFingerprint = null) {
  const hwFp = hardwareFingerprint || deviceId || null;
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare('UPDATE users SET device_id = ?, hardware_fingerprint = ?, biometric_key = COALESCE(?, biometric_key) WHERE id = ?').run(
      deviceId, hwFp, biometricKey, userId
    );
  } else {
    const user = fallbackStore.users.find((u) => u.id === userId);
    if (user) {
      user.deviceId = deviceId;
      user.hardwareFingerprint = hwFp;
      if (biometricKey) user.biometricKey = biometricKey;
      persistFallback();
    }
  }
}

export function checkDeviceBindingConflict(hardwareFingerprint, userId = null) {
  if (!hardwareFingerprint) return null;
  const fp = String(hardwareFingerprint).trim();
  if (!fp || fp.length < 5) return null;

  if (isNodeSqlite && dbEngine) {
    let sql = `
      SELECT id, name, nip, role, vendor_name, hardware_fingerprint, device_id 
      FROM users 
      WHERE (hardware_fingerprint = ? OR device_id = ?) 
      AND role = 'outsourcing'
    `;
    const params = [fp, fp];
    if (userId) {
      sql += ' AND id != ?';
      params.push(userId);
    }
    const conflict = dbEngine.prepare(sql).get(...params);
    return conflict || null;
  } else {
    return fallbackStore.users.find(
      (u) => (u.hardwareFingerprint === fp || u.deviceId === fp) &&
             u.role === 'outsourcing' &&
             (!userId || u.id !== userId)
    ) || null;
  }
}

// ==============================================================================
// 10.C. WEBAUTHN FIDO2 BIOMETRIC CREDENTIALS STORAGE
// ==============================================================================
export function saveUserBiometricCredential({ userId, credentialId, publicKey, counter = 0, deviceName = 'Smartphone Biometrik', transports = '[]' }) {
  const id = `bio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const transportsStr = typeof transports === 'string' ? transports : JSON.stringify(transports || []);

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT OR REPLACE INTO user_biometrics (
        id, user_id, credential_id, public_key, counter, device_name, transports, created_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, credentialId, publicKey, counter, deviceName, transportsStr, now, now);

    // Tandai akun pengguna bahwa biometrik aktif
    dbEngine.prepare(`UPDATE users SET biometric_key = 'ENROLLED' WHERE id = ?`).run(userId);
  } else {
    if (!fallbackStore.user_biometrics) fallbackStore.user_biometrics = [];
    const existingIdx = fallbackStore.user_biometrics.findIndex(b => b.credentialId === credentialId);
    const record = { id, userId, credentialId, publicKey, counter, deviceName, transports: transportsStr, createdAt: now, lastUsedAt: now };
    if (existingIdx >= 0) {
      fallbackStore.user_biometrics[existingIdx] = record;
    } else {
      fallbackStore.user_biometrics.push(record);
    }
    const user = fallbackStore.users.find(u => u.id === userId);
    if (user) user.biometricKey = 'ENROLLED';
    persistFallback();
  }

  return { id, userId, credentialId, publicKey, counter, deviceName, transports: transportsStr, createdAt: now, lastUsedAt: now };
}

export function getUserBiometricCredentials(userId) {
  if (isNodeSqlite && dbEngine) {
    const rows = dbEngine.prepare('SELECT * FROM user_biometrics WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      credentialId: r.credential_id,
      publicKey: r.public_key,
      counter: Number(r.counter) || 0,
      deviceName: r.device_name || 'Smartphone Biometrik',
      transports: r.transports ? JSON.parse(r.transports) : [],
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
    }));
  } else {
    if (!fallbackStore.user_biometrics) fallbackStore.user_biometrics = [];
    return fallbackStore.user_biometrics
      .filter(b => b.userId === userId)
      .map(b => ({
        ...b,
        transports: typeof b.transports === 'string' ? JSON.parse(b.transports) : b.transports,
      }));
  }
}

export function getBiometricCredentialById(credentialId) {
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare('SELECT * FROM user_biometrics WHERE credential_id = ?').get(credentialId);
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      credentialId: row.credential_id,
      publicKey: row.public_key,
      counter: Number(row.counter) || 0,
      deviceName: row.device_name || 'Smartphone Biometrik',
      transports: row.transports ? JSON.parse(row.transports) : [],
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  } else {
    if (!fallbackStore.user_biometrics) fallbackStore.user_biometrics = [];
    const b = fallbackStore.user_biometrics.find(x => x.credentialId === credentialId);
    if (!b) return null;
    return {
      ...b,
      transports: typeof b.transports === 'string' ? JSON.parse(b.transports) : b.transports,
    };
  }
}

export function updateBiometricCounter(credentialId, newCounter) {
  const now = new Date().toISOString();
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare('UPDATE user_biometrics SET counter = ?, last_used_at = ? WHERE credential_id = ?').run(
      newCounter, now, credentialId
    );
  } else {
    if (!fallbackStore.user_biometrics) return;
    const b = fallbackStore.user_biometrics.find(x => x.credentialId === credentialId);
    if (b) {
      b.counter = newCounter;
      b.lastUsedAt = now;
      persistFallback();
    }
  }
}

export function deleteUserBiometricCredential(credentialId, userId) {
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare('DELETE FROM user_biometrics WHERE credential_id = ? AND user_id = ?').run(credentialId, userId);
    const remaining = dbEngine.prepare('SELECT COUNT(*) as count FROM user_biometrics WHERE user_id = ?').get(userId);
    if (!remaining || remaining.count === 0) {
      dbEngine.prepare('UPDATE users SET biometric_key = NULL WHERE id = ?').run(userId);
    }
  } else {
    if (!fallbackStore.user_biometrics) return;
    fallbackStore.user_biometrics = fallbackStore.user_biometrics.filter(
      b => !(b.credentialId === credentialId && b.userId === userId)
    );
    const hasRemaining = fallbackStore.user_biometrics.some(b => b.userId === userId);
    if (!hasRemaining) {
      const user = fallbackStore.users.find(u => u.id === userId);
      if (user) user.biometricKey = null;
    }
    persistFallback();
  }
  return true;
}

export function updateUserLocation(userId, customLocation, workspaceNote) {
  const customLocationJson = customLocation ? JSON.stringify(customLocation) : null;
  const note = workspaceNote !== undefined ? workspaceNote : null;
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      'UPDATE users SET custom_location_json = ?, workspace_note = COALESCE(?, workspace_note) WHERE id = ? OR nip = ?'
    ).run(customLocationJson, note, userId, userId);
  } else {
    const user = fallbackStore.users.find((u) => u.id === userId || u.nip === userId);
    if (user) {
      user.customLocation = customLocation;
      user.assignedLocation = customLocation;
      if (note !== null) user.workspaceNote = note;
      persistFallback();
    }
  }
  return getUserById(userId) || getUserByEmailOrNip(userId);
}

export function updateUserSupervisor(userId, supervisorId) {
  const spvId = supervisorId && String(supervisorId).trim() !== '' ? String(supervisorId).trim() : null;
  const status = spvId ? 'APPROVED' : 'NONE';
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `UPDATE users SET supervisor_id = ?, pending_supervisor_id = NULL, supervisor_request_status = ? WHERE id = ?`
    ).run(spvId, status, userId);
  } else {
    const user = fallbackStore.users.find((u) => u.id === userId);
    if (user) {
      user.supervisorId = spvId || undefined;
      user.pendingSupervisorId = null;
      user.supervisorRequestStatus = status;
      persistFallback();
    }
  }
}

export function listSupervisors() {
  if (isNodeSqlite && dbEngine) {
    const rows = dbEngine.prepare(
      "SELECT * FROM users WHERE role = 'supervisor' ORDER BY division_name ASC, name ASC"
    ).all();
    return rows.map((r) => mapUserRow(r));
  } else {
    return fallbackStore.users
      .filter((u) => u.role === 'supervisor')
      .map((u) => ({ ...u, passwordHash: undefined }));
  }
}

export function requestSupervisorChange(userId, newSupervisorId) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('Pengguna tidak ditemukan.');
  }
  if (user.supervisorId === newSupervisorId) {
    throw new Error('Atasan yang dipilih sama dengan atasan aktif Anda saat ini.');
  }

  const targetSupervisor = getUserById(newSupervisorId);
  const targetName = targetSupervisor ? targetSupervisor.name : 'Atasan Baru';

  // S & K: Perubahan / pemilihan atasan selalu memerlukan persetujuan atasan bersangkutan atau Superadmin (PENDING)
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `UPDATE users SET 
        pending_supervisor_id = ?, 
        supervisor_request_status = 'PENDING' 
      WHERE id = ?`
    ).run(newSupervisorId, userId);
  } else {
    const u = fallbackStore.users.find((x) => x.id === userId);
    if (u) {
      u.pendingSupervisorId = newSupervisorId;
      u.supervisorRequestStatus = 'PENDING';
      persistFallback();
    }
  }
  const updated = getUserById(userId);
  return {
    mode: 'PENDING',
    user: updated,
    message: `Pengajuan atasan langsung ke ${targetName} telah dikirim dan menunggu persetujuan atasan yang bersangkutan atau Superadmin.`
  };
}

export function approveSupervisorChange(userId) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('Pengguna tidak ditemukan.');
  }
  if (!user.pendingSupervisorId) {
    throw new Error('Tidak ada pengajuan atasan yang tertunda untuk pengguna ini.');
  }

  const targetSupervisor = getUserById(user.pendingSupervisorId);
  const targetName = targetSupervisor ? targetSupervisor.name : 'Atasan Baru';

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `UPDATE users SET 
        supervisor_id = pending_supervisor_id, 
        pending_supervisor_id = NULL, 
        supervisor_request_status = 'APPROVED', 
        supervisor_change_count = COALESCE(supervisor_change_count, 0) + 1 
      WHERE id = ?`
    ).run(userId);
  } else {
    const u = fallbackStore.users.find((x) => x.id === userId);
    if (u) {
      u.supervisorId = u.pendingSupervisorId;
      u.pendingSupervisorId = null;
      u.supervisorRequestStatus = 'APPROVED';
      u.supervisorChangeCount = (u.supervisorChangeCount || 0) + 1;
      persistFallback();
    }
  }
  return getUserById(userId);
}

export function rejectSupervisorChange(userId) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('Pengguna tidak ditemukan.');
  }
  if (!user.pendingSupervisorId && user.supervisorRequestStatus !== 'PENDING') {
    throw new Error('Tidak ada pengajuan atasan yang tertunda untuk pengguna ini.');
  }

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `UPDATE users SET 
        pending_supervisor_id = NULL, 
        supervisor_request_status = 'REJECTED' 
      WHERE id = ?`
    ).run(userId);
  } else {
    const u = fallbackStore.users.find((x) => x.id === userId);
    if (u) {
      u.pendingSupervisorId = null;
      u.supervisorRequestStatus = 'REJECTED';
      persistFallback();
    }
  }
  return getUserById(userId);
}

export function requestUserProfileUpdate(userId, { phone, divisionId, jobRole, locationId, vendor }) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('Pengguna tidak ditemukan.');
  }

  let phoneUpdated = false;
  if (phone !== undefined && phone !== null && phone.trim() !== (user.phone || '')) {
    if (isNodeSqlite && dbEngine) {
      dbEngine.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone.trim(), userId);
    } else {
      const u = fallbackStore.users.find((x) => x.id === userId);
      if (u) {
        u.phone = phone.trim();
        persistFallback();
      }
    }
    phoneUpdated = true;
  }

  // 1. Periksa perubahan Divisi (Memerlukan persetujuan Atasan Langsung / Supervisor Divisi)
  let divisionRequested = false;
  if (divisionId && divisionId !== user.divisionId) {
    if (isNodeSqlite && dbEngine) {
      dbEngine.prepare(
        `UPDATE users SET pending_division = ?, division_request_status = 'PENDING' WHERE id = ?`
      ).run(divisionId, userId);
    } else {
      const u = fallbackStore.users.find((x) => x.id === userId);
      if (u) {
        u.pendingDivision = divisionId;
        u.divisionRequestStatus = 'PENDING';
        persistFallback();
      }
    }
    divisionRequested = true;
  }

  // 2. Periksa perubahan Formasi, Lokasi, dan Vendor (Memerlukan persetujuan Superadmin)
  const currentLocId = user.assignedLocation?.id || user.customLocation?.id || 'loc-disdik-hst';
  const jobRoleChanged = Boolean(jobRole && jobRole !== user.roleTitle);
  const locationChanged = Boolean(locationId && locationId !== currentLocId);
  const vendorChanged = Boolean(vendor && vendor !== user.vendorName);

  let adminRequested = false;
  if (jobRoleChanged || locationChanged || vendorChanged) {
    const pendingJobRole = jobRoleChanged ? jobRole : (user.pendingJobRole || null);
    const pendingLocId = locationChanged ? locationId : (user.pendingLocationId || null);
    const pendingVen = vendorChanged ? vendor : (user.pendingVendor || null);

    if (isNodeSqlite && dbEngine) {
      dbEngine.prepare(
        `UPDATE users SET 
          pending_job_role = ?, 
          pending_location_id = ?, 
          pending_vendor = ?, 
          admin_request_status = 'PENDING' 
        WHERE id = ?`
      ).run(pendingJobRole, pendingLocId, pendingVen, userId);
    } else {
      const u = fallbackStore.users.find((x) => x.id === userId);
      if (u) {
        u.pendingJobRole = pendingJobRole;
        u.pendingLocationId = pendingLocId;
        u.pendingVendor = pendingVen;
        u.adminRequestStatus = 'PENDING';
        persistFallback();
      }
    }
    adminRequested = true;
  }

  const updated = getUserById(userId);
  let message = 'Informasi akun berhasil disimpan.';
  if (divisionRequested && adminRequested) {
    message = 'Pengajuan pindah divisi dan penugasan telah dikirim untuk verifikasi atasan serta Superadmin.';
  } else if (divisionRequested) {
    message = 'Pengajuan pindah divisi telah dikirim dan menunggu persetujuan atasan langsung.';
  } else if (adminRequested) {
    message = 'Pengajuan penugasan (formasi/lokasi/vendor) telah dikirim dan menunggu persetujuan Superadmin.';
  } else if (phoneUpdated) {
    message = 'Nomor kontak WhatsApp berhasil diperbarui.';
  }

  return {
    success: true,
    user: updated,
    divisionRequested,
    adminRequested,
    message,
  };
}

export function approveUserDivisionChange(userId) {
  const user = getUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan.');
  if (!user.pendingDivision) throw new Error('Tidak ada pengajuan perubahan divisi yang tertunda untuk pengguna ini.');

  let divisionName = user.pendingDivision;
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare('SELECT name FROM divisions WHERE id = ?').get(user.pendingDivision);
    if (row && row.name) divisionName = row.name;
  } else {
    const d = fallbackStore.divisions.find((x) => x.id === user.pendingDivision);
    if (d && d.name) divisionName = d.name;
  }

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `UPDATE users SET 
        division_id = ?, 
        division_name = ?, 
        pending_division = NULL, 
        division_request_status = 'APPROVED' 
      WHERE id = ?`
    ).run(user.pendingDivision, divisionName, userId);
  } else {
    const u = fallbackStore.users.find((x) => x.id === userId);
    if (u) {
      u.divisionId = user.pendingDivision;
      u.divisionName = divisionName;
      u.pendingDivision = null;
      u.divisionRequestStatus = 'APPROVED';
      persistFallback();
    }
  }
  return getUserById(userId);
}

export function rejectUserDivisionChange(userId) {
  const user = getUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan.');

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `UPDATE users SET 
        pending_division = NULL, 
        division_request_status = 'REJECTED' 
      WHERE id = ?`
    ).run(userId);
  } else {
    const u = fallbackStore.users.find((x) => x.id === userId);
    if (u) {
      u.pendingDivision = null;
      u.divisionRequestStatus = 'REJECTED';
      persistFallback();
    }
  }
  return getUserById(userId);
}

export function approveUserAssignmentChange(userId) {
  const user = getUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan.');
  if (!user.pendingJobRole && !user.pendingLocationId && !user.pendingVendor) {
    throw new Error('Tidak ada pengajuan penugasan yang tertunda untuk pengguna ini.');
  }

  const updates = [];
  const values = [];

  if (user.pendingJobRole) {
    updates.push('role_title = ?');
    values.push(user.pendingJobRole);
  }
  if (user.pendingVendor) {
    updates.push('vendor_name = ?');
    values.push(user.pendingVendor);
  }
  if (user.pendingLocationId) {
    let locData = null;
    if (isNodeSqlite && dbEngine) {
      const row = dbEngine.prepare('SELECT * FROM locations WHERE id = ?').get(user.pendingLocationId);
      if (row) {
        locData = {
          id: row.id,
          name: row.name,
          address: row.address,
          latitude: row.latitude,
          longitude: row.longitude,
          radiusMeters: row.radius_meters,
        };
      }
    }
    if (!locData) {
      locData = DEFAULT_OFFICES.find((l) => l.id === user.pendingLocationId) || null;
    }
    if (locData) {
      updates.push('custom_location_json = ?');
      values.push(JSON.stringify(locData));
    }
  }

  updates.push('pending_job_role = NULL');
  updates.push('pending_location_id = NULL');
  updates.push('pending_vendor = NULL');
  updates.push("admin_request_status = 'APPROVED'");
  values.push(userId);

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  } else {
    const u = fallbackStore.users.find((x) => x.id === userId);
    if (u) {
      if (user.pendingJobRole) u.roleTitle = user.pendingJobRole;
      if (user.pendingVendor) u.vendorName = user.pendingVendor;
      if (user.pendingLocationId) {
        const loc = DEFAULT_OFFICES.find((l) => l.id === user.pendingLocationId);
        if (loc) {
          u.customLocation = loc;
          u.assignedLocation = loc;
        }
      }
      u.pendingJobRole = null;
      u.pendingLocationId = null;
      u.pendingVendor = null;
      u.adminRequestStatus = 'APPROVED';
      persistFallback();
    }
  }
  return getUserById(userId);
}

export function rejectUserAssignmentChange(userId) {
  const user = getUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan.');

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `UPDATE users SET 
        pending_job_role = NULL, 
        pending_location_id = NULL, 
        pending_vendor = NULL, 
        admin_request_status = 'REJECTED' 
      WHERE id = ?`
    ).run(userId);
  } else {
    const u = fallbackStore.users.find((x) => x.id === userId);
    if (u) {
      u.pendingJobRole = null;
      u.pendingLocationId = null;
      u.pendingVendor = null;
      u.adminRequestStatus = 'REJECTED';
      persistFallback();
    }
  }
  return getUserById(userId);
}

export function listUsersByDivision(divisionId) {
  if (isNodeSqlite && dbEngine) {
    const rows = divisionId === 'div-all' || !divisionId
      ? dbEngine.prepare('SELECT * FROM users').all()
      : dbEngine.prepare('SELECT * FROM users WHERE division_id = ?').all(divisionId);
    
    return rows.map((r) => mapUserRow(r));
  } else {
    return fallbackStore.users
      .filter((u) => !divisionId || divisionId === 'div-all' || u.divisionId === divisionId)
      .map(({ passwordHash, ...safeUser }) => safeUser);
  }
}

// DIVISIONS
export function listDivisions() {
  if (isNodeSqlite && dbEngine) {
    const rows = dbEngine.prepare('SELECT * FROM divisions ORDER BY name ASC').all();
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

export function createDivision(data) {
  const id = data.id || `div-${Date.now()}`;
  const now = new Date().toISOString();
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      'INSERT INTO divisions (id, name, code, description, supervisor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, data.code || 'DIV', data.description || '', data.supervisorName || '', now);
  } else {
    fallbackStore.divisions.push({
      id,
      name: data.name,
      code: data.code || 'DIV',
      description: data.description || '',
      supervisorName: data.supervisorName || ''
    });
    persistFallback();
  }
  return { id, ...data };
}

export function updateDivision(id, data) {
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      'UPDATE divisions SET name = ?, code = ?, description = ?, supervisor_name = ? WHERE id = ?'
    ).run(data.name, data.code, data.description || '', data.supervisorName || '', id);

    // Sinkronisasi update nama divisi pada pengguna yang terkait
    if (data.name) {
      dbEngine.prepare('UPDATE users SET division_name = ? WHERE division_id = ?').run(data.name, id);
    }
  } else {
    const d = fallbackStore.divisions.find((div) => div.id === id);
    if (d) {
      d.name = data.name;
      d.code = data.code;
      d.description = data.description || '';
      d.supervisorName = data.supervisorName || '';
      persistFallback();
    }
  }
  return { id, ...data };
}

export function deleteDivision(id) {
  if (isNodeSqlite && dbEngine) {
    // Cek apakah masih ada staf pada divisi ini
    const staffCount = dbEngine.prepare('SELECT COUNT(*) as cnt FROM users WHERE division_id = ?').get(id)?.cnt || 0;
    if (staffCount > 0) {
      throw new Error(`Tidak dapat menghapus bidang/subbagian ini karena masih terdapat ${staffCount} staf/pegawai terdaftar.`);
    }
    dbEngine.prepare('DELETE FROM divisions WHERE id = ?').run(id);
  } else {
    fallbackStore.divisions = fallbackStore.divisions.filter((d) => d.id !== id);
    persistFallback();
  }
  return true;
}

// VENDORS (PERUSAHAAN PENYEDIA OUTSOURCING)
export function listVendors() {
  if (isNodeSqlite && dbEngine) {
    const rows = dbEngine.prepare("SELECT * FROM vendors WHERE name NOT LIKE '%Handil Bakti%' AND name NOT LIKE '%Murakata Sarana Mandiri%' ORDER BY name ASC").all();
    const staffCounts = dbEngine.prepare("SELECT vendor_name, COUNT(*) as count FROM users WHERE role = 'outsourcing' GROUP BY vendor_name").all();
    const countMap = {};
    for (const sc of staffCounts) {
      if (sc.vendor_name) countMap[sc.vendor_name] = sc.count;
    }

    // Deduplikasi berdasarkan nama agar tidak pernah ada vendor ganda
    const seen = new Set();
    const uniqueRows = [];
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(r);
      }
    }

    return uniqueRows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      category: r.category || 'vendor',
      contractNumber: r.contract_number,
      contractStart: r.contract_start,
      contractEnd: r.contract_end,
      picName: r.pic_name,
      picPhone: r.pic_phone,
      address: r.address,
      status: r.status || 'Aktif',
      staffCount: countMap[r.name] || 0,
      createdAt: r.created_at
    }));
  } else {
    const list = (fallbackStore.vendors || []).filter((v) => !v.name.includes('Handil Bakti') && !v.name.includes('Murakata Sarana Mandiri'));
    return list.map((v) => ({ ...v, category: v.category || 'vendor', staffCount: 0 }));
  }
}

export function createVendor(data) {
  const id = `ven-${Date.now()}`;
  const now = new Date().toISOString();
  const cStart = data.contractStart || data.contractStartDate || '';
  const cEnd = data.contractEnd || data.contractEndDate || '';
  const category = data.category || 'vendor';
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO vendors (id, name, code, category, contract_number, contract_start, contract_end, pic_name, pic_phone, address, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.name,
      data.code || 'VEN',
      category,
      data.contractNumber || '',
      cStart,
      cEnd,
      data.picName || '',
      data.picPhone || '',
      data.address || '',
      data.status || 'Aktif',
      now
    );
  } else {
    if (!fallbackStore.vendors) fallbackStore.vendors = [];
    fallbackStore.vendors.push({ id, ...data, category, contractStart: cStart, contractEnd: cEnd, createdAt: now });
    persistFallback();
  }
  return { id, ...data, category, contractStart: cStart, contractEnd: cEnd, createdAt: now, staffCount: 0 };
}

export function updateVendor(id, data) {
  const cStart = data.contractStart || data.contractStartDate || '';
  const cEnd = data.contractEnd || data.contractEndDate || '';
  const category = data.category || 'vendor';
  if (isNodeSqlite && dbEngine) {
    // Ambil nama lama untuk sinkronisasi nama vendor jika berubah
    const oldVen = dbEngine.prepare('SELECT name FROM vendors WHERE id = ?').get(id);
    dbEngine.prepare(
      `UPDATE vendors SET name = ?, code = ?, category = ?, contract_number = ?, contract_start = ?, contract_end = ?, pic_name = ?, pic_phone = ?, address = ?, status = ? WHERE id = ?`
    ).run(
      data.name,
      data.code,
      category,
      data.contractNumber || '',
      cStart,
      cEnd,
      data.picName || '',
      data.picPhone || '',
      data.address || '',
      data.status || 'Aktif',
      id
    );

    if (oldVen && oldVen.name && data.name && oldVen.name !== data.name) {
      dbEngine.prepare('UPDATE users SET vendor_name = ? WHERE vendor_name = ?').run(data.name, oldVen.name);
    }
  } else {
    if (!fallbackStore.vendors) fallbackStore.vendors = [];
    const v = fallbackStore.vendors.find((item) => item.id === id);
    if (v) {
      Object.assign(v, data, { category, contractStart: cStart, contractEnd: cEnd });
      persistFallback();
    }
  }
  return { id, ...data, category, contractStart: cStart, contractEnd: cEnd };
}
export function deleteVendor(id) {
  if (isNodeSqlite && dbEngine) {
    const ven = dbEngine.prepare('SELECT name FROM vendors WHERE id = ?').get(id);
    if (ven) {
      // Alihkan staf yang tertaut ke Dinas Pendidikan Kab. HST agar tidak yatim piatu
      dbEngine.prepare("UPDATE users SET vendor_name = 'Dinas Pendidikan Kab. HST' WHERE vendor_name = ?").run(ven.name);
    }
    dbEngine.prepare('DELETE FROM vendors WHERE id = ?').run(id);
  } else {
    if (fallbackStore.vendors) {
      const ven = fallbackStore.vendors.find((v) => v.id === id);
      if (ven && fallbackStore.users) {
        fallbackStore.users.forEach((u) => {
          if (u.vendorName === ven.name) u.vendorName = 'Dinas Pendidikan Kab. HST';
        });
      }
      fallbackStore.vendors = fallbackStore.vendors.filter((v) => v.id !== id);
      persistFallback();
    }
  }
  return true;
}

// USER MANAGEMENT & PROFILE
export function listAllUsers() {
  if (isNodeSqlite && dbEngine) {
    const rows = dbEngine.prepare('SELECT * FROM users ORDER BY name ASC').all();
    return rows.map((r) => mapUserRow(r));
  } else {
    return fallbackStore.users.map(({ passwordHash, ...u }) => u);
  }
}

export function resetUserPassword(userId, newPassword = 'Password123!') {
  const newHash = hashPassword(newPassword);
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  } else {
    const u = fallbackStore.users.find((user) => user.id === userId);
    if (u) {
      u.passwordHash = newHash;
      persistFallback();
    }
  }
  return true;
}

export function changeUserPassword(userId, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Kata sandi baru minimal 6 karakter.');
  }

  if (isNodeSqlite && dbEngine) {
    const user = dbEngine.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('Pengguna tidak ditemukan.');
    const oldHash = hashPassword(oldPassword);
    if (user.password_hash !== oldHash) {
      throw new Error('Kata sandi lama tidak sesuai.');
    }
    const newHash = hashPassword(newPassword);
    dbEngine.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  } else {
    const u = fallbackStore.users.find((user) => user.id === userId);
    if (!u) throw new Error('Pengguna tidak ditemukan.');
    if (u.passwordHash !== hashPassword(oldPassword)) {
      throw new Error('Kata sandi lama tidak sesuai.');
    }
    u.passwordHash = hashPassword(newPassword);
    persistFallback();
  }
  return true;
}

export function updateUserProfile(userId, profileData) {
  if (isNodeSqlite && dbEngine) {
    const updates = [];
    const values = [];

    if (profileData.name) {
      updates.push('name = ?');
      values.push(profileData.name);
    }
    if (profileData.phone !== undefined) {
      updates.push('phone = ?');
      values.push(profileData.phone);
    }
    if (profileData.vendorName) {
      updates.push('vendor_name = ?');
      values.push(profileData.vendorName);
    }
    if (profileData.roleTitle) {
      updates.push('role_title = ?');
      values.push(profileData.roleTitle);
    }
    if (profileData.divisionId) {
      updates.push('division_id = ?');
      values.push(profileData.divisionId);
    }
    if (profileData.divisionName) {
      updates.push('division_name = ?');
      values.push(profileData.divisionName);
    }
    if (profileData.supervisorId !== undefined) {
      updates.push('supervisor_id = ?');
      values.push(profileData.supervisorId);
      updates.push('pending_supervisor_id = NULL');
      updates.push("supervisor_request_status = 'APPROVED'");
    }
    if (profileData.role) {
      updates.push('role = ?');
      values.push(profileData.role);
    }
    if (profileData.workspaceNote !== undefined) {
      updates.push('workspace_note = ?');
      values.push(profileData.workspaceNote);
    }
    if (profileData.status) {
      updates.push('status = ?');
      values.push(profileData.status);
    }
    if (profileData.deviceId !== undefined) {
      updates.push('device_id = ?');
      values.push(profileData.deviceId);
      if (profileData.deviceId === null) {
        updates.push('hardware_fingerprint = NULL');
      }
    }
    if (profileData.hardwareFingerprint !== undefined) {
      updates.push('hardware_fingerprint = ?');
      values.push(profileData.hardwareFingerprint);
    }
    if (profileData.email) {
      updates.push('email = ?');
      values.push(profileData.email);
    }
    if (profileData.nip) {
      updates.push('nip = ?');
      values.push(profileData.nip);
    }
    if (profileData.supervisedGroups !== undefined) {
      updates.push('supervised_groups = ?');
      const val = profileData.supervisedGroups
        ? (Array.isArray(profileData.supervisedGroups) ? JSON.stringify(profileData.supervisedGroups) : JSON.stringify([profileData.supervisedGroups]))
        : null;
      values.push(val);
    }
    if (profileData.supervisedVendor !== undefined && profileData.supervisedGroups === undefined) {
      updates.push('supervised_groups = ?');
      values.push(profileData.supervisedVendor ? JSON.stringify([profileData.supervisedVendor]) : null);
    }
    if (updates.length > 0) {
      values.push(userId);
      dbEngine.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return getUserById(userId);
  } else {
    const u = fallbackStore.users.find((user) => user.id === userId);
    if (u) {
      Object.assign(u, profileData);
      persistFallback();
    }
    return u;
  }
}

export function deleteUser(userId) {
  const user = getUserById(userId);
  if (user && (user.nip === 'ADMIN-HST' || user.email === 'admin@disdikhst.go.id')) {
    throw new Error('Akun Super Administrator Utama tidak dapat dihapus demi keamanan sistem.');
  }
  if (isNodeSqlite && dbEngine) {
    try {
      dbEngine.prepare('DELETE FROM evaluations WHERE staff_id = ?').run(userId);
      dbEngine.prepare('DELETE FROM daily_reports WHERE staff_id = ?').run(userId);
      dbEngine.prepare('DELETE FROM attendance WHERE staff_id = ?').run(userId);
    } catch (e) {
      console.warn('[DB deleteUser cascade warn]', e.message);
    }
    dbEngine.prepare('DELETE FROM users WHERE id = ?').run(userId);
  } else {
    fallbackStore.evaluations = (fallbackStore.evaluations || []).filter((e) => e.staffId !== userId);
    fallbackStore.dailyReports = (fallbackStore.dailyReports || []).filter((r) => r.staffId !== userId);
    fallbackStore.attendance = (fallbackStore.attendance || []).filter((a) => a.staffId !== userId);
    fallbackStore.users = fallbackStore.users.filter((u) => u.id !== userId);
    persistFallback();
  }
  return true;
}

// ==============================================================================
// SERVER-AUTHORITATIVE NTP CLOCK HELPER (WITA - ASIA/MAKASSAR)
// Anti-Manipulasi Jam HP: Jam presensi selalu dikunci langsung oleh Server NTP
// ==============================================================================
export function getServerWitaTime() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now).replace(/\./g, ':');
  return {
    timestamp: now.getTime(),
    iso: now.toISOString(),
    date: dateStr,
    time: timeStr,
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA (UTC+8)',
    ntpLocked: true,
  };
}

// ATTENDANCE
export function saveAttendance(attData) {
  const serverWita = getServerWitaTime();
  const autoClosed = attData.autoClosed ? 1 : 0;
  // Otoritas Server: untuk presensi live staf, tanggal dan jam selalu mengacu ke waktu server WITA
  const recordDate = autoClosed ? (attData.date || serverWita.date) : serverWita.date;
  const staffId = attData.staffId || null;
  const id = attData.id || `att-${staffId || 'staff'}-${recordDate}`;
  const now = new Date().toISOString();
  const selfieUrl = saveBase64Image(attData.selfieUrl, 'attendance');

  let staffName = attData.staffName;
  let divisionId = attData.divisionId;
  let user = null;
  if (attData.staffId) {
    user = getUserById(attData.staffId);
  }
  if (!staffName || !divisionId) {
    if (user) {
      staffName = staffName || user.name;
      divisionId = divisionId || user.divisionId;
    }
  }

  const roleTitleLower = (user?.role_title || user?.roleTitle || '').toLowerCase();
  const isRestrictedEarlyWorker = roleTitleLower.includes('administrasi perkantoran') ||
    roleTitleLower.includes('driver') ||
    roleTitleLower.includes('pengemudi') ||
    roleTitleLower.includes('supir');

  const lat = attData.locationCoords?.latitude ?? attData.latitude ?? null;
  const lon = attData.locationCoords?.longitude ?? attData.longitude ?? null;
  const acc = attData.locationCoords?.accuracy ?? attData.accuracy ?? null;
  const locName = attData.locationCoords?.locationName ?? attData.locationName ?? 'Lokasi Terdaftar';
  const isFieldDuty = (attData.isFieldDuty || attData.locationCoords?.isFieldDuty) ? 1 : 0;
  const fieldDutyNotes = attData.fieldDutyNotes || attData.locationCoords?.fieldDutyNotes || null;
  // Jika tugas lapangan, otomatis lolos validasi geofence
  const isGeoValid = isFieldDuty ? 1 : ((attData.locationCoords?.withinRadius ?? attData.isGeofenceValid ?? true) ? 1 : 0);
  const dist = attData.locationCoords?.distanceMeters ?? attData.distanceMeters ?? 0;
  const breakOut = attData.breakOutTime || attData.break_out_time || null;
  const breakIn = attData.breakInTime || attData.break_in_time || null;

  // Strict Geofence Enforcement: Tolak presensi di luar radius tanpa penugasan lapangan resmi
  if (!autoClosed && !isFieldDuty && isGeoValid === 0) {
    const error = new Error(`PRESENSI_DITOLAK_LUAR_RADIUS: Presensi ditolak karena posisi GPS berjarak ${dist}m (di luar radius aman kantor) tanpa izin dinas luar.`);
    error.statusCode = 422;
    throw error;
  }

  // Strict Hardware Device Binding & Anti-Multi User Enforcement
  const clientFp = attData.hardwareFingerprint || attData.hardware_fingerprint || attData.deviceFingerprint || attData.deviceId || null;
  if (!autoClosed && user && user.role === 'outsourcing') {
    // 1. Cek apakah perangkat HP fisik ini sudah terikat pada AKUN PEGAWAI LAIN
    if (clientFp) {
      const conflict = checkDeviceBindingConflict(clientFp, user.id);
      if (conflict) {
        const conflictLabel = conflict.nip ? `${conflict.name} (${conflict.nip})` : conflict.name;
        const error = new Error(`PRESENSI_DITOLAK_DEVICE_CONFLICT: Perangkat ini sudah terikat dengan akun pegawai lain [${conflictLabel}]. 1 perangkat fisik hanya boleh digunakan oleh 1 akun pegawai demi integritas presensi.`);
        error.statusCode = 403;
        throw error;
      }
    }

    // 2. Cek apakah akun staf ini sudah terikat pada HP berbeda
    const userBoundFp = user.hardwareFingerprint || user.deviceId;
    if (userBoundFp) {
      if (!clientFp || (clientFp !== userBoundFp && clientFp !== user.deviceId && clientFp !== user.hardwareFingerprint)) {
        const error = new Error('PRESENSI_DITOLAK_PERANGKAT_BERBEDA: Presensi ditolak karena perangkat yang Anda gunakan tidak cocok dengan HP resmi yang terikat pada akun Anda. Dilarang berganti perangkat tanpa izin admin.');
        error.statusCode = 403;
        throw error;
      }
    } else if (clientFp) {
      // Ikat perangkat pertama kali jika akun belum memiliki device terikat
      updateUserDevice(user.id, clientFp, null, clientFp);
      user.deviceId = clientFp;
      user.hardwareFingerprint = clientFp;
    }
  }

  if (isNodeSqlite && dbEngine) {
    // Periksa record presensi (prioritas ID, tanggal hari ini, atau shift malam kemarin)
    let existing = null;
    if (attData.id) {
      existing = dbEngine.prepare('SELECT id, clock_in_time, break_out_time, break_in_time, clock_out_time, selfie_url, status FROM attendance WHERE id = ?').get(attData.id);
    }
    if (!existing && staffId) {
      existing = dbEngine.prepare('SELECT id, clock_in_time, break_out_time, break_in_time, clock_out_time, selfie_url, status FROM attendance WHERE staff_id = ? AND date = ?').get(staffId, recordDate);
    }
    // Jika presensi pulang (clock-out) tapi belum ada record tanggal ini, kaitkan ke shift malam kemarin
    if (!existing && staffId && attData.clockOutTime && !attData.clockInTime) {
      existing = dbEngine.prepare(
        "SELECT id, clock_in_time, break_out_time, break_in_time, clock_out_time, selfie_url, status FROM attendance WHERE staff_id = ? AND date = date(?, '-1 day') AND clock_in_time >= '18:00'"
      ).get(staffId, recordDate);
    }

    // Pembatasan Jam Presensi Masuk: Khusus Administrasi Perkantoran & Driver baru dibuka mulai pukul 07:30 WITA
    if (!existing && !autoClosed && isRestrictedEarlyWorker && serverWita.time < '07:30:00') {
      const error = new Error('PRESENSI_DITOLAK_BELUM_WAKTUNYA: Presensi masuk untuk posisi Administrasi Perkantoran dan Driver / Pengemudi baru dibuka mulai pukul 07:30 WITA.');
      error.statusCode = 422;
      throw error;
    }

    if (existing) {
      // Update record presensi yang sudah ada (dukung snapshot mandiri untuk Clock Out)
      const isClockOutAction = Boolean(attData.clockOutTime && (!attData.clockInTime || attData.clockInTime === existing.clock_in_time));
      const clockOutSelfie = isClockOutAction ? (selfieUrl || existing.clock_out_selfie_url) : (attData.clockOutSelfieUrl ? saveBase64Image(attData.clockOutSelfieUrl, 'attendance') : existing.clock_out_selfie_url);

      // Kunci jam ke waktu Server WITA resmi
      const finalClockIn = existing.clock_in_time || serverWita.time;
      const finalBreakOut = breakOut ? (existing.break_out_time || serverWita.time) : existing.break_out_time;
      const finalBreakIn = breakIn ? (existing.break_in_time || serverWita.time) : existing.break_in_time;
      const finalClockOut = isClockOutAction ? (autoClosed ? (attData.clockOutTime || serverWita.time) : serverWita.time) : existing.clock_out_time;
      // Foto selfie Clock In tidak tertimpa saat Clock Out dilakukan
      const finalSelfie = isClockOutAction ? existing.selfie_url : (selfieUrl || existing.selfie_url);

      dbEngine.prepare(
        `UPDATE attendance SET
          clock_in_time = ?,
          break_out_time = ?,
          break_in_time = ?,
          clock_out_time = ?,
          status = ?,
          selfie_url = ?,
          clock_out_selfie_url = COALESCE(?, clock_out_selfie_url),
          clock_out_latitude = CASE WHEN ? = 1 THEN ? ELSE clock_out_latitude END,
          clock_out_longitude = CASE WHEN ? = 1 THEN ? ELSE clock_out_longitude END,
          clock_out_accuracy = CASE WHEN ? = 1 THEN ? ELSE clock_out_accuracy END,
          clock_out_location_name = CASE WHEN ? = 1 THEN ? ELSE clock_out_location_name END,
          latitude = CASE WHEN ? = 1 THEN latitude ELSE COALESCE(?, latitude) END,
          longitude = CASE WHEN ? = 1 THEN longitude ELSE COALESCE(?, longitude) END,
          accuracy = CASE WHEN ? = 1 THEN accuracy ELSE COALESCE(?, accuracy) END,
          location_name = CASE WHEN ? = 1 THEN location_name ELSE COALESCE(?, location_name) END,
          is_geofence_valid = COALESCE(?, is_geofence_valid),
          distance_meters = COALESCE(?, distance_meters),
          device_fingerprint = COALESCE(?, device_fingerprint),
          is_field_duty = COALESCE(?, is_field_duty),
          field_duty_notes = COALESCE(?, field_duty_notes),
          auto_closed = COALESCE(?, auto_closed)
        WHERE id = ?`
      ).run(
        finalClockIn ?? null,
        finalBreakOut ?? null,
        finalBreakIn ?? null,
        finalClockOut ?? null,
        (existing.status || attData.status || 'Hadir') ?? null,
        finalSelfie ?? null,
        clockOutSelfie ?? null,
        isClockOutAction ? 1 : 0, lat ?? null,
        isClockOutAction ? 1 : 0, lon ?? null,
        isClockOutAction ? 1 : 0, acc ?? null,
        isClockOutAction ? 1 : 0, locName ?? null,
        isClockOutAction ? 1 : 0, lat ?? null,
        isClockOutAction ? 1 : 0, lon ?? null,
        isClockOutAction ? 1 : 0, acc ?? null,
        isClockOutAction ? 1 : 0, locName ?? null,
        isGeoValid ?? 1,
        dist ?? 0,
        clientFp || attData.deviceFingerprint || null,
        isFieldDuty ?? 0,
        fieldDutyNotes ?? null,
        autoClosed ?? 0,
        existing.id
      );

      return {
        ...attData,
        id: existing.id,
        date: recordDate,
        selfieUrl: finalSelfie,
        staffName,
        divisionId,
        clockInTime: finalClockIn,
        breakOutTime: finalBreakOut,
        break_out_time: finalBreakOut,
        breakInTime: finalBreakIn,
        break_in_time: finalBreakIn,
        clockOutTime: finalClockOut,
        isFieldDuty: Boolean(isFieldDuty),
        fieldDutyNotes: fieldDutyNotes || '',
        autoClosed: Boolean(autoClosed),
        serverTimeLocked: true,
      };
    } else {
      // Buat entri presensi baru
      // Otoritas Server: Jam Clock-In dikunci langsung ke waktu Server WITA!
      const finalClockIn = autoClosed ? (attData.clockInTime || serverWita.time) : serverWita.time;
      const finalClockOut = autoClosed ? (attData.clockOutTime || null) : null;

      // Hitung status Hadir vs Terlambat secara otomatis berdasarkan jam server WITA dan jadwal instansi
      let finalStatus = attData.status || 'Hadir';
      if (finalStatus === 'Hadir' && !isFieldDuty && !autoClosed) {
        try {
          const settings = getAttendanceSettings();
          const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayKey = dayKeys[new Date(serverWita.iso).getDay()];
          const schedule = settings?.workSchedule?.[dayKey];
          if (schedule && schedule.enabled && schedule.clockInEnd) {
            const clockInEndSeconds = schedule.clockInEnd.length === 5 ? `${schedule.clockInEnd}:00` : schedule.clockInEnd;
            if (finalClockIn > clockInEndSeconds) {
              finalStatus = 'Terlambat';
            }
          }
        } catch (e) {
          if (finalClockIn > '08:30:00') finalStatus = 'Terlambat';
        }
      }

      dbEngine.prepare(
        `INSERT INTO attendance (
          id, staff_id, staff_name, division_id, date, clock_in_time, break_out_time, break_in_time, clock_out_time, status,
          selfie_url, latitude, longitude, accuracy, location_name, is_geofence_valid, distance_meters, device_fingerprint,
          is_field_duty, field_duty_notes, auto_closed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        staffId ?? null,
        staffName || 'Tenaga Outsourcing',
        divisionId || 'div-umpeg',
        recordDate,
        finalClockIn,
        breakOut ?? null,
        breakIn ?? null,
        finalClockOut,
        finalStatus,
        selfieUrl || null,
        lat ?? null,
        lon ?? null,
        acc ?? null,
        locName ?? 'Lokasi Terdaftar',
        isGeoValid ?? 1,
        dist ?? 0,
        clientFp || attData.deviceFingerprint || '',
        isFieldDuty ?? 0,
        fieldDutyNotes ?? null,
        autoClosed ?? 0,
        now
      );

      return {
        ...attData,
        id,
        staffId,
        staffName,
        divisionId,
        date: recordDate,
        clockInTime: finalClockIn,
        clockOutTime: finalClockOut,
        status: finalStatus,
        selfieUrl,
        breakOutTime: breakOut,
        break_out_time: breakOut,
        breakInTime: breakIn,
        break_in_time: breakIn,
        isFieldDuty: Boolean(isFieldDuty),
        fieldDutyNotes: fieldDutyNotes || '',
        autoClosed: Boolean(autoClosed),
        serverTimeLocked: true,
      };
    }
  } else {
    const existingIdx = fallbackStore.attendance.findIndex(
      (r) => r.staffId === staffId && r.date === recordDate
    );
    if (existingIdx < 0 && !autoClosed && isRestrictedEarlyWorker && serverWita.time < '07:30:00') {
      const error = new Error('PRESENSI_DITOLAK_BELUM_WAKTUNYA: Presensi masuk untuk posisi Administrasi Perkantoran dan Driver / Pengemudi baru dibuka mulai pukul 07:30 WITA.');
      error.statusCode = 422;
      throw error;
    }
    if (existingIdx >= 0) {
      fallbackStore.attendance[existingIdx] = {
        ...fallbackStore.attendance[existingIdx],
        ...attData,
        clockInTime: attData.clockInTime || fallbackStore.attendance[existingIdx].clockInTime,
        breakOutTime: breakOut || fallbackStore.attendance[existingIdx].breakOutTime || fallbackStore.attendance[existingIdx].break_out_time,
        break_out_time: breakOut || fallbackStore.attendance[existingIdx].breakOutTime || fallbackStore.attendance[existingIdx].break_out_time,
        breakInTime: breakIn || fallbackStore.attendance[existingIdx].breakInTime || fallbackStore.attendance[existingIdx].break_in_time,
        break_in_time: breakIn || fallbackStore.attendance[existingIdx].breakInTime || fallbackStore.attendance[existingIdx].break_in_time,
        clockOutTime: attData.clockOutTime || fallbackStore.attendance[existingIdx].clockOutTime,
        selfieUrl: selfieUrl || fallbackStore.attendance[existingIdx].selfieUrl,
        isFieldDuty: Boolean(isFieldDuty),
        fieldDutyNotes: fieldDutyNotes || '',
      };
    } else {
      fallbackStore.attendance.push({
        ...attData,
        id,
        selfieUrl,
        breakOutTime: breakOut,
        break_out_time: breakOut,
        breakInTime: breakIn,
        break_in_time: breakIn,
        isFieldDuty: Boolean(isFieldDuty),
        fieldDutyNotes: fieldDutyNotes || '',
        createdAt: now
      });
    }
    persistFallback();
    return { ...attData, id, selfieUrl, staffName, divisionId, isFieldDuty: Boolean(isFieldDuty) };
  }
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
      breakOutTime: r.break_out_time || null,
      break_out_time: r.break_out_time || null,
      breakInTime: r.break_in_time || null,
      break_in_time: r.break_in_time || null,
      clockOutTime: r.clock_out_time,
      status: r.status,
      selfieUrl: r.selfie_url,
      clockOutSelfieUrl: r.clock_out_selfie_url || null,
      clockOutLocationCoords: r.clock_out_latitude ? {
        latitude: r.clock_out_latitude,
        longitude: r.clock_out_longitude,
        accuracy: r.clock_out_accuracy || 15,
        locationName: r.clock_out_location_name || r.location_name || 'Lokasi Pulang',
      } : null,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      locationName: r.location_name,
      isGeofenceValid: Boolean(r.is_geofence_valid),
      isFieldDuty: Boolean(r.is_field_duty),
      fieldDutyNotes: r.field_duty_notes || '',
      autoClosed: Boolean(r.auto_closed),
      distanceMeters: r.distance_meters,
      locationCoords: {
        latitude: r.latitude ?? -2.5911226,
        longitude: r.longitude ?? 115.3789452,
        accuracy: r.accuracy ?? 10,
        distanceMeters: r.distance_meters ?? 0,
        withinRadius: Boolean(r.is_geofence_valid),
        locationName: r.location_name || 'Lokasi Terdaftar',
        isFieldDuty: Boolean(r.is_field_duty),
        fieldDutyNotes: r.field_duty_notes || '',
      },
      notes: r.notes || r.field_duty_notes || '',
      verifiedBy: r.verified_by || '',
      deviceFingerprint: r.device_fingerprint,
      createdAt: r.created_at
    }));
  } else {
    return fallbackStore.attendance
      .filter((r) => {
        if (staffId && r.staffId !== staffId) return false;
        if (divisionId && divisionId !== 'div-all' && r.divisionId !== divisionId) return false;
        if (date && r.date !== date) return false;
        return true;
      })
      .map((r) => ({
        ...r,
        breakOutTime: r.breakOutTime || r.break_out_time || null,
        break_out_time: r.break_out_time || r.breakOutTime || null,
        breakInTime: r.breakInTime || r.break_in_time || null,
        break_in_time: r.break_in_time || r.breakInTime || null,
      }));
  }
}

// ==========================================================
// TUGAS LAPANGAN / FIELD CHECK-INS (MULTI-TITIK PER HARI)
// ==========================================================
export function saveFieldCheckin(data) {
  const serverWita = getServerWitaTime();
  const now = new Date().toISOString();
  const date = serverWita.date;
  const time = serverWita.time;
  const id = data.id || `fld-${data.staffId || 'staff'}-${Date.now()}`;
  const selfieUrl = saveBase64Image(data.selfieUrl, 'attendance');

  let staffName = data.staffName;
  let divisionId = data.divisionId;
  if (!staffName || !divisionId) {
    const user = getUserById(data.staffId);
    if (user) {
      staffName = staffName || user.name;
      divisionId = divisionId || user.divisionId;
    }
  }

  const lat = data.locationCoords?.latitude ?? data.latitude ?? -2.591165;
  const lon = data.locationCoords?.longitude ?? data.longitude ?? 115.373661;
  const acc = data.locationCoords?.accuracy ?? data.accuracy ?? 15;
  const locName = data.locationCoords?.locationName ?? data.locationName ?? 'Lokasi Tugas Lapangan';
  const notes = data.activityNotes || data.notes || '';
  const verifiedBy = data.verifiedBy || 'Sistem GPS WebRTC';

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT INTO field_checkins (
        id, staff_id, staff_name, division_id, date, time, selfie_url,
        latitude, longitude, accuracy, location_name, activity_notes, verified_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.staffId, staffName || 'Staf Lapangan', divisionId || 'div-umpeg',
      date, time, selfieUrl, lat, lon, acc, locName, notes, verifiedBy, now
    );
  } else {
    if (!fallbackStore.field_checkins) fallbackStore.field_checkins = [];
    fallbackStore.field_checkins.push({
      id, staffId: data.staffId, staffName, divisionId, date, time, selfieUrl,
      latitude: lat, longitude: lon, accuracy: acc, locationName: locName,
      activityNotes: notes, verifiedBy, createdAt: now
    });
    persistFallback();
  }

  return {
    id,
    staffId: data.staffId,
    staffName,
    divisionId,
    date,
    time,
    selfieUrl,
    locationCoords: {
      latitude: lat,
      longitude: lon,
      accuracy: acc,
      locationName: locName,
    },
    activityNotes: notes,
    verifiedBy,
    createdAt: now,
  };
}

export function listFieldCheckins(filters = {}) {
  const { staffId, divisionId, date } = filters;
  if (isNodeSqlite && dbEngine) {
    let query = 'SELECT * FROM field_checkins WHERE 1=1';
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
      time: r.time,
      selfieUrl: r.selfie_url,
      locationCoords: {
        latitude: r.latitude,
        longitude: r.longitude,
        accuracy: r.accuracy,
        locationName: r.location_name,
      },
      activityNotes: r.activity_notes,
      verifiedBy: r.verified_by,
      createdAt: r.created_at,
    }));
  } else {
    return (fallbackStore.field_checkins || []).filter((r) => {
      if (staffId && r.staffId !== staffId) return false;
      if (date && r.date !== date) return false;
      return true;
    });
  }
}

// ==========================================================
// TUGAS LEMBUR RESMI / OVERTIME ENGINE PRO
// ==========================================================
function mapOvertimeRow(r) {
  let clockInCoords = undefined;
  if (r.clock_in_coords) {
    try {
      clockInCoords = typeof r.clock_in_coords === 'string' ? JSON.parse(r.clock_in_coords) : r.clock_in_coords;
    } catch (e) {}
  }
  let clockOutCoords = undefined;
  if (r.clock_out_coords) {
    try {
      clockOutCoords = typeof r.clock_out_coords === 'string' ? JSON.parse(r.clock_out_coords) : r.clock_out_coords;
    } catch (e) {}
  }

  return {
    id: r.id,
    staffId: r.staff_id,
    staffName: r.staff_name,
    staffNip: r.staff_nip || '',
    divisionId: r.division_id,
    divisionName: r.division_name || '',
    supervisorId: r.supervisor_id,
    supervisorName: r.supervisor_name || '',
    date: r.date,
    startTimePlan: r.start_time_plan || '',
    estimatedHours: Number(r.estimated_hours) || 1,
    reason: r.reason,
    status: r.status || 'PENDING',
    supervisorNotes: r.supervisor_notes || '',
    approvedAt: r.approved_at || null,
    clockInTime: r.clock_in_time || null,
    clockInSelfieUrl: r.clock_in_selfie_url || null,
    clockInCoords,
    clockOutTime: r.clock_out_time || null,
    clockOutSelfieUrl: r.clock_out_selfie_url || null,
    clockOutCoords,
    actualDurationMinutes: Number(r.actual_duration_minutes) || 0,
    workSummary: r.work_summary || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function createOvertimeRequest(data) {
  const now = new Date().toISOString();
  const id = data.id || `ovt-${Date.now()}`;
  const staff = getUserById(data.staffId);
  const staffName = data.staffName || staff?.name || 'Tenaga Outsourcing';
  const staffNip = data.staffNip || staff?.nip || '';
  const divisionId = data.divisionId || staff?.divisionId || 'div-renlap';
  const divisionName = data.divisionName || staff?.divisionName || '';
  const supervisorId = data.supervisorId || staff?.supervisorId || 'usr-spv-renlap';
  const supervisor = getUserById(supervisorId);
  const supervisorName = data.supervisorName || supervisor?.name || 'Atasan Penilai';
  const date = data.date || now.slice(0, 10);
  const startTimePlan = data.startTimePlan || '17:00';
  const estimatedHours = Number(data.estimatedHours) || 1;
  const reason = data.reason || 'Penyelesaian tugas kedinasan mendesak';
  const status = 'PENDING';

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT INTO overtime_requests (
        id, staff_id, staff_name, staff_nip, division_id, division_name,
        supervisor_id, supervisor_name, date, start_time_plan, estimated_hours,
        reason, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.staffId, staffName, staffNip, divisionId, divisionName,
      supervisorId, supervisorName, date, startTimePlan, estimatedHours,
      reason, status, now, now
    );
  } else {
    if (!fallbackStore.overtime_requests) fallbackStore.overtime_requests = [];
    fallbackStore.overtime_requests.push({
      id, staffId: data.staffId, staffName, staffNip, divisionId, divisionName,
      supervisorId, supervisorName, date, startTimePlan, estimatedHours,
      reason, status, createdAt: now, updatedAt: now
    });
    persistFallback();
  }

  return getOvertimeById(id);
}

export function getOvertimeById(id) {
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare('SELECT * FROM overtime_requests WHERE id = ?').get(id);
    return row ? mapOvertimeRow(row) : null;
  } else {
    const list = fallbackStore.overtime_requests || [];
    return list.find((o) => o.id === id) || null;
  }
}

export function listOvertimeRequests(filters = {}) {
  const { staffId, supervisorId, date, status } = filters;
  if (isNodeSqlite && dbEngine) {
    let query = 'SELECT * FROM overtime_requests WHERE 1=1';
    const params = [];
    if (staffId) {
      query += ' AND staff_id = ?';
      params.push(staffId);
    }
    if (supervisorId) {
      query += ' AND supervisor_id = ?';
      params.push(supervisorId);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const rows = dbEngine.prepare(query).all(...params);
    return rows.map((r) => mapOvertimeRow(r));
  } else {
    return (fallbackStore.overtime_requests || []).filter((r) => {
      if (staffId && r.staffId !== staffId) return false;
      if (supervisorId && r.supervisorId !== supervisorId) return false;
      if (date && r.date !== date) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }
}

export function approveOvertimeRequest(id, { approved, supervisorNotes }) {
  const now = new Date().toISOString();
  const newStatus = approved ? 'APPROVED' : 'REJECTED';
  const notes = supervisorNotes || (approved ? 'Disetujui untuk dilaksanakan di kantor dinas.' : 'Permohonan lembur belum dapat disetujui.');
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      UPDATE overtime_requests
      SET status = ?, supervisor_notes = ?, approved_at = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, notes, approved ? now : null, now, id);
  } else {
    const req = (fallbackStore.overtime_requests || []).find((o) => o.id === id);
    if (req) {
      req.status = newStatus;
      req.supervisorNotes = notes;
      req.approvedAt = approved ? now : null;
      req.updatedAt = now;
      persistFallback();
    }
  }
  return getOvertimeById(id);
}

export function startOvertime(id, { clockInTime, selfieUrl, coords }) {
  const serverWita = getServerWitaTime();
  const now = new Date().toISOString();
  const actualTime = serverWita.time;
  const savedSelfie = saveBase64Image(selfieUrl, 'attendance');
  const coordsJson = coords ? JSON.stringify(coords) : null;

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      UPDATE overtime_requests
      SET status = 'IN_PROGRESS',
          clock_in_time = ?,
          clock_in_selfie_url = ?,
          clock_in_coords = ?,
          updated_at = ?
      WHERE id = ?
    `).run(actualTime, savedSelfie, coordsJson, now, id);
  } else {
    const req = (fallbackStore.overtime_requests || []).find((o) => o.id === id);
    if (req) {
      req.status = 'IN_PROGRESS';
      req.clockInTime = actualTime;
      req.clockInSelfieUrl = savedSelfie;
      req.clockInCoords = coords;
      req.updatedAt = now;
      persistFallback();
    }
  }
  return getOvertimeById(id);
}

export function finishOvertime(id, { clockOutTime, selfieUrl, coords, workSummary, durationMinutes }) {
  const serverWita = getServerWitaTime();
  const now = new Date().toISOString();
  const actualTime = serverWita.time;
  const savedSelfie = saveBase64Image(selfieUrl, 'reports');
  const coordsJson = coords ? JSON.stringify(coords) : null;
  const duration = Number(durationMinutes) || 60;

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      UPDATE overtime_requests
      SET status = 'COMPLETED',
          clock_out_time = ?,
          clock_out_selfie_url = ?,
          clock_out_coords = ?,
          work_summary = ?,
          actual_duration_minutes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(actualTime, savedSelfie, coordsJson, workSummary || '', duration, now, id);
  } else {
    const req = (fallbackStore.overtime_requests || []).find((o) => o.id === id);
    if (req) {
      req.status = 'COMPLETED';
      req.clockOutTime = actualTime;
      req.clockOutSelfieUrl = savedSelfie;
      req.clockOutCoords = coords;
      req.workSummary = workSummary || '';
      req.actualDurationMinutes = duration;
      req.updatedAt = now;
      persistFallback();
    }
  }
  return getOvertimeById(id);
}

// ======================== MODUL IZIN & CUTI TERPADU ========================

function mapLeaveRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    staffId: r.staff_id,
    staffName: r.staff_name,
    staffNip: r.staff_nip || '',
    divisionId: r.division_id,
    divisionName: r.division_name || '',
    supervisorId: r.supervisor_id,
    supervisorName: r.supervisor_name || '',
    leaveType: r.leave_type,
    startDate: r.start_date,
    endDate: r.end_date,
    totalDays: Number(r.total_days) || 1,
    reason: r.reason,
    attachmentUrl: r.attachment_url || '',
    status: r.status,
    supervisorNotes: r.supervisor_notes || '',
    approvedAt: r.approved_at || null,
    verifiedBy: r.verified_by || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export function createLeaveRequest(data) {
  const now = new Date().toISOString();
  const id = data.id || `lve-${Date.now()}`;
  const staff = getUserById(data.staffId);
  const staffName = data.staffName || staff?.name || 'Tenaga Outsourcing';
  const staffNip = data.staffNip || staff?.nip || '';
  const divisionId = data.divisionId || staff?.divisionId || 'div-renlap';
  const divisionName = data.divisionName || staff?.divisionName || '';
  const supervisorId = data.supervisorId || staff?.supervisorId || 'usr-spv-renlap';
  const supervisor = getUserById(supervisorId);
  const supervisorName = data.supervisorName || supervisor?.name || 'Atasan Penilai';
  const leaveType = data.leaveType || 'IZIN_KEPERLUAN';
  const startDate = data.startDate || now.slice(0, 10);
  const endDate = data.endDate || startDate;
  const totalDays = Number(data.totalDays) || 1;
  const reason = data.reason || 'Izin dinas/pribadi';
  const status = 'PENDING';
  const attachmentUrl = data.attachmentUrl ? saveBase64Image(data.attachmentUrl, 'documents') : '';

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT INTO leave_requests (
        id, staff_id, staff_name, staff_nip, division_id, division_name,
        supervisor_id, supervisor_name, leave_type, start_date, end_date,
        total_days, reason, attachment_url, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.staffId, staffName, staffNip, divisionId, divisionName,
      supervisorId, supervisorName, leaveType, startDate, endDate,
      totalDays, reason, attachmentUrl, status, now, now
    );
  } else {
    if (!fallbackStore.leave_requests) fallbackStore.leave_requests = [];
    fallbackStore.leave_requests.push({
      id, staffId: data.staffId, staffName, staffNip, divisionId, divisionName,
      supervisorId, supervisorName, leaveType, startDate, endDate,
      totalDays, reason, attachmentUrl, status, createdAt: now, updatedAt: now
    });
    persistFallback();
  }

  return getLeaveById(id);
}

export function getLeaveById(id) {
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    return row ? mapLeaveRow(row) : null;
  } else {
    const list = fallbackStore.leave_requests || [];
    const r = list.find((item) => item.id === id);
    return r ? { ...r } : null;
  }
}

export function listLeaveRequests(filters = {}) {
  const { staffId, supervisorId, date, status, leaveType } = filters;
  if (isNodeSqlite && dbEngine) {
    let query = 'SELECT * FROM leave_requests WHERE 1=1';
    const params = [];
    if (staffId) {
      query += ' AND staff_id = ?';
      params.push(staffId);
    }
    if (supervisorId) {
      query += ' AND supervisor_id = ?';
      params.push(supervisorId);
    }
    if (date) {
      query += ' AND ? BETWEEN start_date AND end_date';
      params.push(date);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (leaveType) {
      query += ' AND leave_type = ?';
      params.push(leaveType);
    }
    query += ' ORDER BY created_at DESC';
    const rows = dbEngine.prepare(query).all(...params);
    return rows.map((r) => mapLeaveRow(r));
  } else {
    return (fallbackStore.leave_requests || []).filter((r) => {
      if (staffId && r.staffId !== staffId) return false;
      if (supervisorId && r.supervisorId !== supervisorId) return false;
      if (date && (date < r.startDate || date > r.endDate)) return false;
      if (status && r.status !== status) return false;
      if (leaveType && r.leaveType !== leaveType) return false;
      return true;
    });
  }
}

function autoPopulateLeaveAttendance(leave) {
  const now = new Date().toISOString();
  const cur = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  const isDinas = leave.leaveType === 'TUGAS_LUAR' || leave.leaveType === 'DINAS_LUAR';
  const statusStr = leave.leaveType === 'SAKIT' ? 'Sakit' : isDinas ? 'Dinas Luar' : 'Izin';
  const locationNameStr = isDinas ? 'Lokasi Penugasan Luar / SPPD Resmi Kedinasan' : 'Lokasi Tempat Tinggal / Faskes (Izin Kedinasan Sah)';
  const labelMap = {
    'SAKIT': 'Izin Sakit (SKD Terverifikasi)',
    'CUTI_TAHUNAN': 'Cuti Tahunan Sah',
    'CUTI_ALASAN_PENTING': 'Cuti Alasan Penting',
    'CUTI_BERSALIN': 'Cuti Melahirkan/Bersalin',
    'IZIN_KEPERLUAN': 'Izin Keperluan Mendesak',
    'TUGAS_LUAR': 'Tugas Luar / Perjalanan Dinas',
    'DINAS_LUAR': 'Tugas Luar / Perjalanan Dinas'
  };
  const noteText = `[${labelMap[leave.leaveType] || leave.leaveType}] ${leave.reason}`;
  const attSettings = getAttendanceSettings();
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const isConfiguredDayOff = (dayOfWeek) => {
    const dayKey = dayKeys[dayOfWeek];
    if (attSettings && attSettings.workSchedule && attSettings.workSchedule[dayKey] !== undefined) {
      return !attSettings.workSchedule[dayKey].enabled;
    }
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 is Sunday
    const dateStr = cur.toISOString().slice(0, 10);
    
    // Lewatkan hari libur mingguan (Sabtu / Minggu sesuai pengaturan jadwal kerja)
    if (!isConfiguredDayOff(dayOfWeek)) {
      if (isNodeSqlite && dbEngine) {
        const existing = dbEngine.prepare('SELECT id, selfie_url FROM attendance WHERE staff_id = ? AND date = ?').get(leave.staffId, dateStr);
        if (existing) {
          dbEngine.prepare(`
            UPDATE attendance
            SET status = ?, notes = ?, verified_by = ?, selfie_url = COALESCE(selfie_url, ?)
            WHERE id = ?
          `).run(statusStr, noteText, leave.supervisorName || 'Atasan Langsung', leave.attachmentUrl || '', existing.id);
        } else {
          const attId = `att-lve-${leave.staffId}-${dateStr}`;
          dbEngine.prepare(`
            INSERT INTO attendance (
              id, staff_id, staff_name, division_id, date, clock_in_time, clock_out_time,
              status, selfie_url, latitude, longitude, accuracy, location_name,
              is_geofence_valid, distance_meters, notes, verified_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            attId, leave.staffId, leave.staffName, leave.divisionId, dateStr,
            '08:00:00', '16:30:00', statusStr, leave.attachmentUrl || '',
            -2.5911226, 115.3789452, 10, locationNameStr,
            1, 0, noteText, leave.supervisorName || 'Atasan Langsung', now
          );
        }
      } else {
        if (!fallbackStore.attendance) fallbackStore.attendance = [];
        const existingIdx = fallbackStore.attendance.findIndex((a) => a.staffId === leave.staffId && a.date === dateStr);
        if (existingIdx >= 0) {
          fallbackStore.attendance[existingIdx].status = statusStr;
          fallbackStore.attendance[existingIdx].notes = noteText;
          fallbackStore.attendance[existingIdx].verifiedBy = leave.supervisorName || 'Atasan Langsung';
          if (!fallbackStore.attendance[existingIdx].selfieUrl && leave.attachmentUrl) {
            fallbackStore.attendance[existingIdx].selfieUrl = leave.attachmentUrl;
          }
        } else {
          fallbackStore.attendance.push({
            id: `att-lve-${leave.staffId}-${dateStr}`,
            staffId: leave.staffId,
            staffName: leave.staffName,
            divisionId: leave.divisionId,
            date: dateStr,
            clockInTime: '08:00:00',
            clockOutTime: '16:30:00',
            status: statusStr,
            selfieUrl: leave.attachmentUrl || '',
            locationCoords: {
              latitude: -2.5911226,
              longitude: 115.3789452,
              accuracy: 10,
              distanceMeters: 0,
              withinRadius: true,
              locationName: locationNameStr,
            },
            notes: noteText,
            verifiedBy: leave.supervisorName || 'Atasan Langsung',
            createdAt: now
          });
        }
        persistFallback();
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
}

export function approveLeaveRequest(id, { approved, supervisorNotes, verifiedBy }) {
  const now = new Date().toISOString();
  const leave = getLeaveById(id);
  if (!leave) throw new Error('Data permohonan izin tidak ditemukan.');

  const newStatus = approved ? 'APPROVED' : 'REJECTED';
  const notes = supervisorNotes || (approved ? 'Permohonan izin/cuti telah disetujui atasan.' : 'Permohonan izin belum dapat disetujui.');
  const verifier = verifiedBy || leave.supervisorName || 'Supervisor Unit Kerja';

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      UPDATE leave_requests
      SET status = ?, supervisor_notes = ?, approved_at = ?, verified_by = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, notes, approved ? now : null, verifier, now, id);
  } else {
    const r = (fallbackStore.leave_requests || []).find((item) => item.id === id);
    if (r) {
      r.status = newStatus;
      r.supervisorNotes = notes;
      r.approvedAt = approved ? now : null;
      r.verifiedBy = verifier;
      r.updatedAt = now;
      persistFallback();
    }
  }

  // Auto-populate presensi jika disetujui
  if (approved) {
    autoPopulateLeaveAttendance(leave);
  }

  return getLeaveById(id);
}

export function getLeaveQuota(staffId, year = new Date().getFullYear()) {
  const annualTotal = 12; // Standar 12 hari cuti tahunan
  const yearStr = String(year);
  let allLeaves = [];

  if (isNodeSqlite && dbEngine) {
    allLeaves = dbEngine.prepare(`
      SELECT * FROM leave_requests
      WHERE staff_id = ? AND status = 'APPROVED' AND (start_date LIKE ? OR end_date LIKE ?)
    `).all(staffId, `${yearStr}%`, `${yearStr}%`);
  } else {
    allLeaves = (fallbackStore.leave_requests || []).filter(
      (l) => l.staffId === staffId && l.status === 'APPROVED' && (l.startDate.startsWith(yearStr) || l.endDate.startsWith(yearStr))
    );
  }

  let annualUsed = 0;
  let sickUsed = 0;
  let specialUsed = 0;

  for (const l of allLeaves) {
    const days = Number(l.total_days || l.totalDays) || 1;
    const type = l.leave_type || l.leaveType;
    if (type === 'CUTI_TAHUNAN') {
      annualUsed += days;
    } else if (type === 'SAKIT') {
      sickUsed += days;
    } else {
      specialUsed += days;
    }
  }

  return {
    staffId,
    year,
    annualTotal,
    annualUsed,
    annualRemaining: Math.max(0, annualTotal - annualUsed),
    sickUsed,
    specialUsed
  };
}

// ==========================================================
// NOTIFIKASI REAL-TIME & HISTORI PERSISTEN DI SQLITE
// ==========================================================
export function createNotification(data) {
  const now = new Date();
  const id = data.id || `notif-${Date.now()}`;
  const timestamp = data.timestamp || (now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
  const createdAt = data.createdAt || now.toISOString();
  const isRead = data.read ? 1 : 0;
  const staffName = data.staffName || null;
  const divisionName = data.divisionName || null;

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT INTO notifications (
        id, user_id, staff_id, staff_name, division_name, title, message, type, is_read, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.userId || null, data.staffId || null,
      staffName, divisionName,
      data.title, data.message, data.type || 'system',
      isRead, timestamp, createdAt
    );
  } else {
    if (!fallbackStore.notifications) fallbackStore.notifications = [];
    fallbackStore.notifications.unshift({
      id, userId: data.userId || null, staffId: data.staffId || null,
      staffName, divisionName,
      title: data.title, message: data.message, type: data.type || 'system',
      read: Boolean(data.read), timestamp, createdAt
    });
    persistFallback();
  }

  return {
    id,
    userId: data.userId || null,
    staffId: data.staffId || null,
    staffName,
    divisionName,
    title: data.title,
    message: data.message,
    type: data.type || 'system',
    read: Boolean(isRead),
    timestamp,
    createdAt
  };
}

export function listNotifications(filters = {}) {
  const { userId, role, staffId } = filters;

  if (isNodeSqlite && dbEngine) {
    let query = `
      SELECT n.*,
        COALESCE(n.staff_name, u.name) AS resolved_staff_name,
        COALESCE(n.division_name, d.name) AS resolved_division_name
      FROM notifications n
      LEFT JOIN users u ON (n.staff_id = u.id OR (n.staff_id IS NULL AND n.user_id = u.id))
      LEFT JOIN divisions d ON u.division_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'admin') {
      // Admin dapat melihat seluruh notifikasi sistem
    } else if (role === 'supervisor') {
      // Supervisor: melihat notifikasi yang ditujukan kepadanya (userId) atau alert persetujuan/geofence
      query += ' AND (n.user_id = ? OR n.user_id IS NULL OR n.type IN (\'geofence_alert\', \'approval\', \'attendance\'))';
      params.push(userId);
    } else if (role === 'outsourcing') {
      // Staf: melihat notifikasi pribadi miliknya (userId atau staffId)
      query += ' AND (n.user_id = ? OR n.staff_id = ? OR n.user_id IS NULL)';
      params.push(userId, staffId || userId);
    } else if (userId) {
      query += ' AND (n.user_id = ? OR n.user_id IS NULL)';
      params.push(userId);
    }

    query += ' ORDER BY n.created_at DESC LIMIT 60';
    const rows = dbEngine.prepare(query).all(...params);
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      staffId: r.staff_id,
      staffName: r.resolved_staff_name || r.staff_name || null,
      divisionName: r.resolved_division_name || r.division_name || null,
      title: r.title,
      message: r.message,
      type: r.type,
      read: Boolean(r.is_read),
      timestamp: r.timestamp,
      createdAt: r.created_at,
    }));
  } else {
    return (fallbackStore.notifications || []).slice(0, 60);
  }
}

export function markNotificationRead(id) {
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  } else {
    const n = (fallbackStore.notifications || []).find((x) => x.id === id);
    if (n) {
      n.read = true;
      persistFallback();
    }
  }
  return true;
}

export function markAllNotificationsRead(userId) {
  if (isNodeSqlite && dbEngine) {
    if (userId) {
      dbEngine.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL').run(userId);
    } else {
      dbEngine.prepare('UPDATE notifications SET is_read = 1').run();
    }
  } else {
    (fallbackStore.notifications || []).forEach((n) => { n.read = true; });
    persistFallback();
  }
  return true;
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
      `INSERT OR REPLACE INTO daily_reports (
        id, staff_id, staff_name, division_id, date, title, category, start_time, end_time,
        summary, status, documentation_photo_url, image_hash, ai_duplicate_flag_json, location_coords_json,
        supervisor_approval, supervisor_notes, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      repData.staffId || null,
      staffName || 'Tenaga Outsourcing',
      divisionId || 'div-umpeg',
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

export function updateDailyReport(reportId, updates = {}) {
  if (isNodeSqlite && dbEngine) {
    const fields = [];
    const values = [];

    if (updates.startTime !== undefined || updates.start_time !== undefined) {
      fields.push('start_time = ?');
      values.push(updates.startTime || updates.start_time);
    }
    if (updates.endTime !== undefined || updates.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.endTime || updates.end_time);
    }
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.summary !== undefined || updates.description !== undefined) {
      fields.push('summary = ?');
      values.push(updates.summary || updates.description);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.supervisorApproval !== undefined || updates.supervisor_approval !== undefined) {
      fields.push('supervisor_approval = ?');
      values.push(updates.supervisorApproval || updates.supervisor_approval);
    }
    if (updates.supervisorNotes !== undefined || updates.supervisor_notes !== undefined) {
      fields.push('supervisor_notes = ?');
      values.push(updates.supervisorNotes || updates.supervisor_notes);
    }

    if (fields.length > 0) {
      values.push(reportId);
      dbEngine.prepare(`UPDATE daily_reports SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return dbEngine.prepare('SELECT * FROM daily_reports WHERE id = ?').get(reportId);
  } else {
    const report = fallbackStore.daily_reports.find((r) => r.id === reportId);
    if (report) {
      if (updates.startTime) report.startTime = updates.startTime;
      if (updates.endTime) report.endTime = updates.endTime;
      if (updates.title) report.title = updates.title;
      if (updates.summary || updates.description) report.summary = updates.summary || updates.description;
      if (updates.category) report.category = updates.category;
      if (updates.status) report.status = updates.status;
      if (updates.supervisorApproval) report.supervisorApproval = updates.supervisorApproval;
      if (updates.supervisorNotes) report.supervisorNotes = updates.supervisorNotes;
      persistFallback();
    }
    return report;
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

  const supervisorId = evalData.supervisorId || 'usr-spv-umpeg';
  const weekNumber = Number(evalData.weekNumber) || 1;
  const monthYear = evalData.monthYear || evalData.month || '2026-10';
  const averageScore = Number(evalData.averageScore || evalData.overallWeeklyScore) || 4.5;
  const predicate = evalData.predicate || 'Sangat Baik (A)';
  const recommendation = evalData.recommendation || 'Direkomendasikan Perpanjang Penuh';
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
      divisionId || 'div-umpeg',
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

// AI ANALYTICS CONTEXT SUMMARY
export function getLiveAnalyticsContext() {
  if (isNodeSqlite && dbEngine) {
    const totalStaff = dbEngine.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'outsourcing'").get().count;
    const totalSupervisors = dbEngine.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'supervisor'").get().count;
    const divisions = dbEngine.prepare('SELECT name, code FROM divisions').all();
    const attendanceToday = dbEngine.prepare(
      "SELECT staff_name, status, clock_in_time, is_geofence_valid, distance_meters, location_name FROM attendance ORDER BY created_at DESC LIMIT 30"
    ).all();
    const reportsSummary = dbEngine.prepare(
      "SELECT staff_name, title, category, supervisor_approval, image_hash FROM daily_reports ORDER BY created_at DESC LIMIT 30"
    ).all();
    const evalsSummary = dbEngine.prepare(
      "SELECT staff_name, average_score, predicate, recommendation FROM evaluations ORDER BY created_at DESC LIMIT 30"
    ).all();

    return {
      totalStaff,
      totalSupervisors,
      divisions,
      attendanceToday,
      reportsSummary,
      evalsSummary
    };
  } else {
    return {
      totalStaff: fallbackStore.users.filter((u) => u.role === 'outsourcing').length,
      totalSupervisors: fallbackStore.users.filter((u) => u.role === 'supervisor').length,
      divisions: fallbackStore.divisions,
      attendanceToday: fallbackStore.attendance.slice(0, 30),
      reportsSummary: fallbackStore.daily_reports.slice(0, 30),
      evalsSummary: fallbackStore.evaluations.slice(0, 30)
    };
  }
}

// ==========================================================
// MASTER LOKASI KERJA / GEOFENCE RESMI DISDIK HST
// ==========================================================
export const DEFAULT_OFFICES = [
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
  {
    id: 'loc-lkp-mslsc',
    name: 'Lembaga Kursus dan Pelatihan Murakata Student Learning and Support Centre (LKP MSLSC)',
    address: 'Barabai, Kab. Hulu Sungai Tengah',
    latitude: -2.5930812650074406,
    longitude: 115.37153449654713,
    radiusMeters: 85,
  },
];

export function listLocations() {
  if (isNodeSqlite && dbEngine) {
    // Pastikan lokasi resmi dinas terdaftar di database
    for (const off of DEFAULT_OFFICES) {
      dbEngine.prepare(
        'INSERT OR IGNORE INTO locations (id, name, address, latitude, longitude, radius_meters, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(off.id, off.name, off.address, off.latitude, off.longitude, off.radiusMeters, new Date().toISOString());
    }
    const rows = dbEngine.prepare('SELECT * FROM locations ORDER BY name ASC').all();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      radiusMeters: r.radius_meters,
      createdAt: r.created_at,
    }));
  }
  return DEFAULT_OFFICES;
}

export function saveLocations(newLocations) {
  if (!Array.isArray(newLocations) || newLocations.length === 0) return listLocations();
  if (isNodeSqlite && dbEngine) {
    const now = new Date().toISOString();
    // Hapus lokasi yang sudah tidak ada di daftar baru
    const newIds = newLocations.map((l) => l.id);
    const existing = dbEngine.prepare('SELECT id FROM locations').all();
    for (const ex of existing) {
      if (!newIds.includes(ex.id)) {
        dbEngine.prepare('DELETE FROM locations WHERE id = ?').run(ex.id);
      }
    }
    // Simpan atau perbarui lokasi baru
    for (const loc of newLocations) {
      dbEngine.prepare(
        `INSERT OR REPLACE INTO locations (id, name, address, latitude, longitude, radius_meters, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        loc.id || `loc-${Date.now()}`,
        loc.name,
        loc.address || '',
        loc.latitude || -2.5911,
        loc.longitude || 115.3735,
        loc.radiusMeters || 100,
        loc.createdAt || now
      );
    }
  }
  return listLocations();
}

export function createLocation(loc) {
  const id = loc.id || `loc-${Date.now()}`;
  const now = new Date().toISOString();
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT OR REPLACE INTO locations (id, name, address, latitude, longitude, radius_meters, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      loc.name,
      loc.address || '',
      loc.latitude || -2.5911,
      loc.longitude || 115.3735,
      loc.radiusMeters || 100,
      now
    );
  }
  return { ...loc, id, createdAt: now };
}

export function deleteLocation(id) {
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare('DELETE FROM locations WHERE id = ?').run(id);
  }
  return true;
}

// ==============================================================================
// ATTENDANCE WORK HOURS & SCHEDULE SETTINGS (DISDIK HST)
// ==============================================================================
export const DEFAULT_ATTENDANCE_SETTINGS = {
  workSchedule: {
    monday: {
      enabled: true,
      dayName: 'Senin',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    tuesday: {
      enabled: true,
      dayName: 'Selasa',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    wednesday: {
      enabled: true,
      dayName: 'Rabu',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    thursday: {
      enabled: true,
      dayName: 'Kamis',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '16:30',
      clockOutEnd: '21:00',
      enableBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    friday: {
      enabled: true,
      dayName: 'Jumat',
      clockInStart: '07:00',
      clockInEnd: '08:30',
      clockOutStart: '11:00',
      clockOutEnd: '20:00',
      enableBreak: false,
      breakStart: '11:30',
      breakEnd: '13:30',
    },
    saturday: {
      enabled: false,
      dayName: 'Sabtu',
      clockInStart: '08:00',
      clockInEnd: '09:00',
      clockOutStart: '13:00',
      clockOutEnd: '17:00',
      enableBreak: false,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    sunday: {
      enabled: false,
      dayName: 'Minggu',
      clockInStart: '08:00',
      clockInEnd: '09:00',
      clockOutStart: '13:00',
      clockOutEnd: '17:00',
      enableBreak: false,
      breakStart: '12:00',
      breakEnd: '13:00',
    },
  },
  breakSettings: {
    enabled: true,
    mandatory: false,
    toleranceMinutes: 15,
  },
  fieldDutySettings: {
    allowSelfAssignment: true,
    requireSupervisorApproval: false,
    bypassGeofenceOnFieldDuty: true,
    allowedPurposes: [
      'Monitoring & Pengawasan Sekolah',
      'Inspeksi & Pemeliharaan Sarpras',
      'Pelayanan Operasional Korwil',
      'Pendampingan Acara Kedinasan',
      'Pengantaran Berkas & Logistik Dinas',
    ],
  },
  autoCloseMissingClockOut: true,
  wakarSchedule: {
    enabled: true,
    dayName: 'Jaga Malam / Wakar',
    clockInStart: '19:30',
    clockInEnd: '21:00',
    clockOutStart: '05:30',
    clockOutEnd: '07:00',
  },
};

export function getAttendanceSettings() {
  if (isNodeSqlite && dbEngine) {
    try {
      const row = dbEngine.prepare("SELECT value FROM system_settings WHERE key = 'attendance_settings'").get();
      if (row && row.value) {
        return JSON.parse(row.value);
      }
    } catch (e) {
      console.warn('getAttendanceSettings error:', e);
    }
  }
  return DEFAULT_ATTENDANCE_SETTINGS;
}

export function saveAttendanceSettings(settings) {
  const jsonStr = JSON.stringify(settings);
  const now = new Date().toISOString();
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('attendance_settings', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(jsonStr, now);
  }
  return settings;
}

/**
 * Otomatis menutup sesi presensi hari-hari sebelumnya yang belum di-clock out (23:59:59)
 */
export function autoClosePreviousDayAttendance(todayDateStr) {
  if (!todayDateStr) return 0;
  if (isNodeSqlite && dbEngine) {
    try {
      // Dapatkan jam saat ini di WITA (Asia/Makassar)
      const nowWitaHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' })).getHours();

      // Jika masih pagi hari (sebelum jam 10:00 WITA), lindungi shift malam kemarin (clock_in >= 18:00) agar wakar bisa clock-out
      if (nowWitaHour < 10) {
        dbEngine.prepare(`
          UPDATE attendance
          SET clock_out_time = '23:59:59', auto_closed = 1
          WHERE (
            (date < ? AND (clock_in_time < '18:00' OR clock_in_time IS NULL))
            OR (date < date(?, '-1 day'))
          )
          AND (clock_out_time IS NULL OR clock_out_time = '' OR clock_out_time = '-')
        `).run(todayDateStr, todayDateStr);
      } else {
        // Jika sudah lewat jam 10:00 pagi WITA, shift malam kemarin yang belum clock-out ditutup otomatis jam 07:00:00
        dbEngine.prepare(`
          UPDATE attendance
          SET clock_out_time = CASE WHEN clock_in_time >= '18:00' THEN '07:00:00' ELSE '23:59:59' END,
              auto_closed = 1
          WHERE date < ?
            AND (clock_out_time IS NULL OR clock_out_time = '' OR clock_out_time = '-')
        `).run(todayDateStr);
      }
    } catch (e) {
      console.warn('autoClosePreviousDayAttendance warning:', e);
    }
  }
  return 0;
}

// ==============================================================================
// HELPDESK & IT SUPPORT CONFIGURATION (PUSAT BANTUAN DISDIK HST)
// ==============================================================================
export const DEFAULT_HELPDESK_SETTINGS = {
  title: 'Pusat Bantuan & Layanan IT Disdik',
  subTitle: 'Subbag Perencanaan dan Pelaporan · Disdik Kab. HST',
  whatsapp: '0811-518-515',
  email: 'disdik@hulusungaitengahkab.go.id',
  address: 'Jalan Sibli Imansyah No. 01, Barabai, Kab. Hulu Sungai Tengah',
  guideGeofence: 'Pastikan GPS pada perangkat aktif dengan mode "Akurasi Tinggi" dan browser diizinkan mengakses lokasi.',
  guideCamera: 'Berikan izin kamera pada browser saat diminta. Jika layar hitam, muat ulang (refresh) halaman.',
  guideAccount: 'Hubungi admin TI atau Subbag Kepegawaian Disdik untuk verifikasi & reset akun dinas Anda.',
};

export function getHelpDeskSettings() {
  if (isNodeSqlite && dbEngine) {
    try {
      const row = dbEngine.prepare("SELECT value FROM system_settings WHERE key = 'helpdesk_settings'").get();
      if (row && row.value) {
        return JSON.parse(row.value);
      }
    } catch (e) {
      console.warn('getHelpDeskSettings error:', e);
    }
  }
  return DEFAULT_HELPDESK_SETTINGS;
}

export function saveHelpDeskSettings(settings) {
  const jsonStr = JSON.stringify(settings);
  const now = new Date().toISOString();
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('helpdesk_settings', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(jsonStr, now);
  }
  return settings;
}

export const DEFAULT_INSTITUTION_SETTINGS = {
  namaPemda: 'PEMERINTAH KABUPATEN HULU SUNGAI TENGAH',
  namaSkpd: 'DINAS PENDIDIKAN',
  singkatanSkpd: 'DISDIK',
  alamatLengkap: 'Jalan H. Sibli Imansyah No. 1 RT 06 RW 02 Barabai, Kabupaten Hulu Sungai Tengah, Kalimantan Selatan 71315',
  website: 'disdik.barabaikab.go.id',
  email: 'disdik@barabaikab.go.id',
  telepon: '(0517) 41234',
  kotaSurat: 'Barabai',
  nomorSuratPrefix: '800.1 / OTP-DISDIK',
  logoKiriUrl: '/logos/Lambang_Kabupaten_Hulu_Sungai_Tengah.png',
  logoKananUrl: '/logos/logo-disdik2026.png',
  pejabatNama: 'Salihin, S.Pd.SD',
  pejabatNip: '19780502 200604 1 017',
  pejabatJabatan: 'Sekretaris Dinas Pendidikan',
};

export function getInstitutionSettings() {
  if (isNodeSqlite && dbEngine) {
    try {
      const row = dbEngine.prepare("SELECT value FROM system_settings WHERE key = 'institution_settings'").get();
      if (row && row.value) {
        return JSON.parse(row.value);
      }
    } catch (e) {
      console.warn('getInstitutionSettings error:', e);
    }
  }
  return DEFAULT_INSTITUTION_SETTINGS;
}

export function saveInstitutionSettings(settings) {
  const jsonStr = JSON.stringify(settings);
  const now = new Date().toISOString();
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('institution_settings', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(jsonStr, now);
  }
  return settings;
}

// Jalankan inisialisasi awal
seedDatabaseIfEmpty();
