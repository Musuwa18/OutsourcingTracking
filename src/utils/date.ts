/**
 * Date and Time Utilities for OutsourceTrack & KPI Pro
 * Timezone: Asia/Makassar (WITA - UTC+8) for Hulu Sungai Tengah, Kalimantan Selatan
 */

export const WITA_TIMEZONE = 'Asia/Makassar';

/**
 * Returns current date string in 'YYYY-MM-DD' formatted for WITA
 */
export const getTodayDateStr = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

/**
 * Returns yesterday's date string in 'YYYY-MM-DD' formatted for WITA
 */
export const getYesterdayWitaDateStr = (date: Date = new Date()): string => {
  const todayStr = getTodayDateStr(date);
  const [y, m, d] = todayStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  target.setUTCDate(target.getUTCDate() - 1);
  return target.toISOString().slice(0, 10);
};

/**
 * Returns current hour (0-23) in WITA
 */
export const getWitaHour = (date: Date = new Date()): number => {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: WITA_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(date);
  return parseInt(hourStr, 10);
};

/**
 * Returns current time string in 'HH:mm:ss' formatted for WITA
 */
export const getCurrentWitaTimeStr = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(/\./g, ':');
};

/**
 * Returns human readable date in Indonesian format
 * Example: 'Jumat, 6 November 2026'
 */
export const getHumanDateStr = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

/**
 * Returns day of week key: 'sunday', 'monday', ..., 'saturday'
 */
export const getDayOfWeekKey = (date: Date = new Date()): string => {
  const day = date.getDay();
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
