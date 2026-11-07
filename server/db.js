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
      biometric_key TEXT,
      custom_location_json TEXT,
      supervisor_id TEXT,
      pending_supervisor_id TEXT,
      supervisor_change_count INTEGER DEFAULT 0,
      supervisor_request_status TEXT DEFAULT 'NONE',
      workspace_note TEXT,
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
  `);

  // Migrasi aman untuk kolom baru users jika database sudah ada sebelumnya
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
}

// Fallback JSON in-memory store jika sqlite bawaan tidak aktif
const FALLBACK_FILE = path.join(DATA_DIR, 'outsource_store.json');
let fallbackStore = {
  divisions: [],
  users: [],
  attendance: [],
  daily_reports: [],
  evaluations: []
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

  const ext = matches[1].includes('png') ? 'png' : 'jpg';
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
    nip: '19820916 2000121 002',
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
    nip: '19780502200604 1 017',
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
    nip: '19821218 2006041 008',
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
    nip: '19730609199503 2 002',
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
    nip: '19860620 2010011 008',
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
    nip: '19850902 2014061 002',
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
    nip: '197504241998031 006',
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
    nip: '19831110 2005011 007',
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
    nip: '19851207 2005011 002',
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
    nip: '19860206 2005011 002',
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
    nip: '19870606 2011011 008',
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
    nip: '19851208 2010011 007',
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
    id: 'ven-001',
    name: 'PT Handil Bakti Utama (Mitra Disdik HST)',
    code: 'HBU-HST',
    contractNumber: 'SPK/027/DISDIK-HST/2026',
    contractStart: '2026-01-02',
    contractEnd: '2026-12-31',
    picName: 'H. Akhmad Zaini, S.E.',
    picPhone: '0812-5100-8899',
    address: 'Jl. Murakata No. 45, Barabai, Kab. Hulu Sungai Tengah',
    status: 'Aktif'
  },
  {
    id: 'ven-002',
    name: 'CV Murakata Sarana Mandiri',
    code: 'MSM-HST',
    contractNumber: 'SPK/028/DISDIK-HST/2026',
    contractStart: '2026-01-02',
    contractEnd: '2026-12-31',
    picName: 'M. Noor Irfan, S.T.',
    picPhone: '0852-4800-1122',
    address: 'Jl. Perintis Kemerdekaan No. 12, Barabai',
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
      const hasVen = dbEngine.prepare("SELECT id FROM vendors LIMIT 1").get();
      if (!hasVen) {
        const insertVen = dbEngine.prepare(
          'INSERT OR REPLACE INTO vendors (id, name, code, contract_number, contract_start, contract_end, pic_name, pic_phone, address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const v of INITIAL_VENDORS) {
          insertVen.run(v.id, v.name, v.code, v.contractNumber, v.contractStart, v.contractEnd, v.picName, v.picPhone, v.address, v.status, now);
        }
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
    const hasKadis = dbEngine.prepare("SELECT id FROM users WHERE nip = '19820916 2000121 002'").get();
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
  if (isNodeSqlite && dbEngine) {
    const row = dbEngine.prepare(
      'SELECT * FROM users WHERE email = ? OR nip = ? COLLATE NOCASE'
    ).get(emailOrNip, emailOrNip);
    if (!row) return null;
    return mapUserRow(row);
  } else {
    const u = fallbackStore.users.find(
      (user) => user.email.toLowerCase() === emailOrNip.toLowerCase() || user.nip.toLowerCase() === emailOrNip.toLowerCase()
    );
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
    deviceBinding,
    status: row.status || 'Aktif',
    biometricKey: row.biometric_key,
    customLocation,
    assignedLocation: customLocation, // jika null, client fallback ke Kantor Disdik HST
    supervisorId: row.supervisor_id,
    pendingSupervisorId: row.pending_supervisor_id || null,
    supervisorChangeCount: Number(row.supervisor_change_count) || 0,
    supervisorRequestStatus: row.supervisor_request_status || 'NONE',
    workspaceNote: row.workspace_note
  };
}

export function createUser(userData) {
  const id = `usr-${userData.role === 'outsourcing' ? 'os' : 'spv'}-${Date.now()}`;
  const now = new Date().toISOString();
  const initials = userData.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const avatarColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#db2777', '#3b82f6'];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  const userObj = {
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
    vendorName: userData.vendorName || 'Dinas Pendidikan Kab. HST',
    avatarColor,
    initials,
    deviceId: userData.deviceId || null,
    biometricKey: userData.biometricKey || null,
    customLocation: userData.customLocation || null,
    supervisorId: userData.supervisorId || null,
    workspaceNote: userData.workspaceNote || null,
    status: userData.status || 'Aktif',
    createdAt: now
  };

  const customLocationJson = userData.customLocation ? JSON.stringify(userData.customLocation) : null;

  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO users (
        id, nip, name, email, password_hash, role, division_id, division_name,
        role_title, phone, vendor_name, avatar_color, initials, device_id, biometric_key,
        custom_location_json, supervisor_id, workspace_note, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userObj.id,
      userObj.nip,
      userObj.name,
      userObj.email,
      userObj.passwordHash,
      userObj.role,
      userObj.divisionId,
      userObj.divisionName,
      userObj.roleTitle,
      userObj.phone,
      userObj.vendorName,
      userObj.avatarColor,
      userObj.initials,
      userObj.deviceId,
      userObj.biometricKey,
      customLocationJson,
      userObj.supervisorId,
      userObj.workspaceNote,
      userObj.status,
      now
    );
  } else {
    fallbackStore.users.push(userObj);
    persistFallback();
  }

  return userObj;
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

export function updateUserLocation(userId, customLocation, workspaceNote) {
  const customLocationJson = customLocation ? JSON.stringify(customLocation) : null;
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      'UPDATE users SET custom_location_json = ?, workspace_note = COALESCE(?, workspace_note) WHERE id = ?'
    ).run(customLocationJson, workspaceNote || null, userId);
  } else {
    const user = fallbackStore.users.find((u) => u.id === userId);
    if (user) {
      user.customLocation = customLocation;
      if (workspaceNote) user.workspaceNote = workspaceNote;
      persistFallback();
    }
  }
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
  const currentCount = Number(user.supervisorChangeCount) || 0;

  if (currentCount === 0) {
    // Pilihan pertama kali: Berlaku instan (DIRECT APPROVAL)
    if (isNodeSqlite && dbEngine) {
      dbEngine.prepare(
        `UPDATE users SET 
          supervisor_id = ?, 
          pending_supervisor_id = NULL, 
          supervisor_change_count = 1, 
          supervisor_request_status = 'APPROVED' 
        WHERE id = ?`
      ).run(newSupervisorId, userId);
    } else {
      const u = fallbackStore.users.find((x) => x.id === userId);
      if (u) {
        u.supervisorId = newSupervisorId;
        u.pendingSupervisorId = null;
        u.supervisorChangeCount = 1;
        u.supervisorRequestStatus = 'APPROVED';
        persistFallback();
      }
    }
    const updated = getUserById(userId);
    return {
      mode: 'DIRECT',
      user: updated,
      message: `Atasan langsung berhasil dipilih (${targetName}) dan langsung aktif.`
    };
  } else {
    // Pilihan ke-2 dan seterusnya: Menunggu persetujuan Super Admin (PENDING)
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
      message: `Pengajuan pergantian atasan ke ${targetName} telah dikirim dan menunggu persetujuan Super Admin.`
    };
  }
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
    const rows = dbEngine.prepare('SELECT * FROM vendors ORDER BY name ASC').all();
    const staffCounts = dbEngine.prepare("SELECT vendor_name, COUNT(*) as count FROM users WHERE role = 'outsourcing' GROUP BY vendor_name").all();
    const countMap = {};
    for (const sc of staffCounts) {
      if (sc.vendor_name) countMap[sc.vendor_name] = sc.count;
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
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
    return (fallbackStore.vendors || []).map((v) => ({ ...v, staffCount: 0 }));
  }
}

export function createVendor(data) {
  const id = `ven-${Date.now()}`;
  const now = new Date().toISOString();
  const cStart = data.contractStart || data.contractStartDate || '';
  const cEnd = data.contractEnd || data.contractEndDate || '';
  if (isNodeSqlite && dbEngine) {
    dbEngine.prepare(
      `INSERT INTO vendors (id, name, code, contract_number, contract_start, contract_end, pic_name, pic_phone, address, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.name,
      data.code || 'VEN',
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
    fallbackStore.vendors.push({ id, ...data, contractStart: cStart, contractEnd: cEnd, createdAt: now });
    persistFallback();
  }
  return { id, ...data, contractStart: cStart, contractEnd: cEnd, createdAt: now, staffCount: 0 };
}

export function updateVendor(id, data) {
  const cStart = data.contractStart || data.contractStartDate || '';
  const cEnd = data.contractEnd || data.contractEndDate || '';
  if (isNodeSqlite && dbEngine) {
    // Ambil nama lama untuk sinkronisasi nama vendor jika berubah
    const oldVen = dbEngine.prepare('SELECT name FROM vendors WHERE id = ?').get(id);
    dbEngine.prepare(
      `UPDATE vendors SET name = ?, code = ?, contract_number = ?, contract_start = ?, contract_end = ?, pic_name = ?, pic_phone = ?, address = ?, status = ? WHERE id = ?`
    ).run(
      data.name,
      data.code,
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
      Object.assign(v, data, { contractStart: cStart, contractEnd: cEnd });
      persistFallback();
    }
  }
  return { id, ...data, contractStart: cStart, contractEnd: cEnd };
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
    }
    if (profileData.email) {
      updates.push('email = ?');
      values.push(profileData.email);
    }
    if (profileData.nip) {
      updates.push('nip = ?');
      values.push(profileData.nip);
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

// ATTENDANCE
export function saveAttendance(attData) {
  const recordDate = attData.date || new Date().toISOString().slice(0, 10);
  const staffId = attData.staffId || null;
  const id = attData.id || `att-${staffId || 'staff'}-${recordDate}`;
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
  const isFieldDuty = (attData.isFieldDuty || attData.locationCoords?.isFieldDuty) ? 1 : 0;
  const fieldDutyNotes = attData.fieldDutyNotes || attData.locationCoords?.fieldDutyNotes || null;
  // Jika tugas lapangan, otomatis lolos validasi geofence
  const isGeoValid = isFieldDuty ? 1 : ((attData.locationCoords?.withinRadius ?? attData.isGeofenceValid ?? true) ? 1 : 0);
  const dist = attData.locationCoords?.distanceMeters ?? attData.distanceMeters ?? 0;
  const breakOut = attData.breakOutTime || null;
  const breakIn = attData.breakInTime || null;
  const autoClosed = attData.autoClosed ? 1 : 0;

  if (isNodeSqlite && dbEngine) {
    // Periksa record presensi (prioritas ID, tanggal hari ini, atau shift malam kemarin)
    let existing = null;
    if (attData.id) {
      existing = dbEngine.prepare('SELECT id, clock_in_time, break_out_time, break_in_time, clock_out_time, selfie_url FROM attendance WHERE id = ?').get(attData.id);
    }
    if (!existing && staffId) {
      existing = dbEngine.prepare('SELECT id, clock_in_time, break_out_time, break_in_time, clock_out_time, selfie_url FROM attendance WHERE staff_id = ? AND date = ?').get(staffId, recordDate);
    }
    // Jika presensi pulang (clock-out) tapi belum ada record tanggal ini, kaitkan ke shift malam kemarin
    if (!existing && staffId && attData.clockOutTime && !attData.clockInTime) {
      existing = dbEngine.prepare(
        "SELECT id, clock_in_time, break_out_time, break_in_time, clock_out_time, selfie_url FROM attendance WHERE staff_id = ? AND date = date(?, '-1 day') AND clock_in_time >= '18:00'"
      ).get(staffId, recordDate);
    }
    if (existing) {
      // Update record presensi yang sudah ada (dukung snapshot mandiri untuk Clock Out)
      const isClockOutAction = Boolean(attData.clockOutTime && (!attData.clockInTime || attData.clockInTime === existing.clock_in_time));
      const clockOutSelfie = isClockOutAction ? (selfieUrl || existing.clock_out_selfie_url) : (attData.clockOutSelfieUrl ? saveBase64Image(attData.clockOutSelfieUrl, 'attendance') : existing.clock_out_selfie_url);

      const finalClockIn = attData.clockInTime || existing.clock_in_time;
      const finalBreakOut = breakOut || existing.break_out_time;
      const finalBreakIn = breakIn || existing.break_in_time;
      const finalClockOut = attData.clockOutTime || existing.clock_out_time;
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
        finalClockIn,
        finalBreakOut,
        finalBreakIn,
        finalClockOut,
        attData.status || 'Hadir',
        finalSelfie,
        clockOutSelfie,
        isClockOutAction ? 1 : 0, lat,
        isClockOutAction ? 1 : 0, lon,
        isClockOutAction ? 1 : 0, acc,
        isClockOutAction ? 1 : 0, locName,
        isClockOutAction ? 1 : 0, lat,
        isClockOutAction ? 1 : 0, lon,
        isClockOutAction ? 1 : 0, acc,
        isClockOutAction ? 1 : 0, locName,
        isGeoValid,
        dist,
        attData.deviceFingerprint || null,
        isFieldDuty,
        fieldDutyNotes,
        autoClosed,
        existing.id
      );

      return {
        ...attData,
        id: existing.id,
        selfieUrl: finalSelfie,
        staffName,
        divisionId,
        clockInTime: finalClockIn,
        breakOutTime: finalBreakOut,
        breakInTime: finalBreakIn,
        clockOutTime: finalClockOut,
        isFieldDuty: Boolean(isFieldDuty),
        fieldDutyNotes: fieldDutyNotes || '',
        autoClosed: Boolean(autoClosed),
      };
    } else {
      // Buat entri presensi baru
      dbEngine.prepare(
        `INSERT INTO attendance (
          id, staff_id, staff_name, division_id, date, clock_in_time, break_out_time, break_in_time, clock_out_time, status,
          selfie_url, latitude, longitude, accuracy, location_name, is_geofence_valid, distance_meters, device_fingerprint,
          is_field_duty, field_duty_notes, auto_closed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        staffId,
        staffName || 'Tenaga Outsourcing',
        divisionId || 'div-umpeg',
        recordDate,
        attData.clockInTime || null,
        breakOut,
        breakIn,
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
        isFieldDuty,
        fieldDutyNotes,
        autoClosed,
        now
      );

      return {
        ...attData,
        id,
        staffId,
        staffName,
        divisionId,
        date: recordDate,
        selfieUrl,
        breakOutTime: breakOut,
        breakInTime: breakIn,
        isFieldDuty: Boolean(isFieldDuty),
        fieldDutyNotes: fieldDutyNotes || '',
        autoClosed: Boolean(autoClosed),
      };
    }
  } else {
    const existingIdx = fallbackStore.attendance.findIndex(
      (r) => r.staffId === staffId && r.date === recordDate
    );
    if (existingIdx >= 0) {
      fallbackStore.attendance[existingIdx] = {
        ...fallbackStore.attendance[existingIdx],
        ...attData,
        clockInTime: attData.clockInTime || fallbackStore.attendance[existingIdx].clockInTime,
        breakOutTime: breakOut || fallbackStore.attendance[existingIdx].breakOutTime,
        breakInTime: breakIn || fallbackStore.attendance[existingIdx].breakInTime,
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
        breakInTime: breakIn,
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
      breakInTime: r.break_in_time || null,
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
        latitude: r.latitude,
        longitude: r.longitude,
        accuracy: r.accuracy,
        distanceMeters: r.distance_meters,
        withinRadius: Boolean(r.is_geofence_valid),
        locationName: r.location_name || 'Lokasi Terdaftar',
        isFieldDuty: Boolean(r.is_field_duty),
        fieldDutyNotes: r.field_duty_notes || '',
      },
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

// ==========================================================
// TUGAS LAPANGAN / FIELD CHECK-INS (MULTI-TITIK PER HARI)
// ==========================================================
export function saveFieldCheckin(data) {
  const now = new Date().toISOString();
  const date = data.date || now.slice(0, 10);
  const time = data.time || now.slice(11, 19);
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
      const result = dbEngine.prepare(`
        UPDATE attendance
        SET clock_out_time = '23:59:59', auto_closed = 1
        WHERE (
          (date < ? AND (clock_in_time < '18:00' OR clock_in_time IS NULL))
          OR (date < date(?, '-1 day'))
        )
        AND (clock_out_time IS NULL OR clock_out_time = '' OR clock_out_time = '-')
      `).run(todayDateStr, todayDateStr);
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
