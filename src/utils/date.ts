/**
 * Date and Time Utilities for OutsourceTrack & KPI Pro
 * Timezone: Asia/Makassar (WITA - UTC+8) for Hulu Sungai Tengah, Kalimantan Selatan
 */

export const WITA_TIMEZONE = 'Asia/Makassar';

// ==============================================================================
// SERVER-AUTHORITATIVE TIME SYNCHRONIZATION (ANTI-TAMPER CLOCK)
// Menjaga akurasi jam presensi terhadap waktu server resmi NTP
// ==============================================================================
let serverTimeOffsetMs = 0;
let isSynced = false;

/**
 * Menyinkronkan offset waktu antara browser/HP client dengan server NTP
 */
export function syncServerTime(serverTimestamp: number) {
  const clientNow = Date.now();
  serverTimeOffsetMs = serverTimestamp - clientNow;
  isSynced = true;
}

/**
 * Mengambil selisih waktu antara HP client dan server dalam milidetik
 */
export function getServerTimeOffsetMs(): number {
  return serverTimeOffsetMs;
}

/**
 * Status apakah jam sudah tersinkronisasi dengan server NTP
 */
export function isServerTimeSynced(): boolean {
  return isSynced;
}

/**
 * Deteksi apakah jam perangkat HP diotak-atik / selisih > 2 menit dari server
 */
export function isDeviceClockTampered(): boolean {
  return isSynced && Math.abs(serverTimeOffsetMs) > 120_000;
}

/**
 * Mengambil objek Date yang sudah dikoreksi offset waktu server (NTP-Locked)
 */
export function getSyncedDate(date?: Date): Date {
  if (date) return date;
  return new Date(Date.now() + serverTimeOffsetMs);
}

/**
 * Returns current date string in 'YYYY-MM-DD' formatted for WITA
 */
export const getTodayDateStr = (date?: Date): string => {
  const d = getSyncedDate(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Returns yesterday's date string in 'YYYY-MM-DD' formatted for WITA
 */
export const getYesterdayWitaDateStr = (date?: Date): string => {
  const todayStr = getTodayDateStr(date);
  const [y, m, d] = todayStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  target.setUTCDate(target.getUTCDate() - 1);
  return target.toISOString().slice(0, 10);
};

/**
 * Returns current hour (0-23) in WITA
 */
export const getWitaHour = (date?: Date): number => {
  const d = getSyncedDate(date);
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: WITA_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(d);
  return parseInt(hourStr, 10);
};

/**
 * Returns current time string in 'HH:mm:ss' formatted for WITA
 */
export const getCurrentWitaTimeStr = (date?: Date): string => {
  const d = getSyncedDate(date);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d).replace(/\./g, ':');
};

/**
 * Returns human readable date in Indonesian format
 * Example: 'Jumat, 6 November 2026'
 */
export const getHumanDateStr = (date?: Date): string => {
  const d = getSyncedDate(date);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

/**
 * Returns day of week key: 'sunday', 'monday', ..., 'saturday'
 */
export const getDayOfWeekKey = (date?: Date): string => {
  const d = getSyncedDate(date);
  const day = d.getDay();
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return keys[day];
};

/**
 * Returns Indonesian day name
 */
export const getIndonesianDayName = (key: string): string => {
  const names: Record<string, string> = {
    monday: 'Senin',
    tuesday: 'Selasa',
    wednesday: 'Rabu',
    thursday: 'Kamis',
    friday: 'Jumat',
    saturday: 'Sabtu',
    sunday: 'Minggu',
  };
  return names[key] || key;
};
