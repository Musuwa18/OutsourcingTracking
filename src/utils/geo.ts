import { OfficeLocation } from '../types';

export const PRIMARY_OFFICES: OfficeLocation[] = [
  {
    id: 'loc-disdik-hst',
    name: 'Kantor Dinas Pendidikan Kab. Hulu Sungai Tengah',
    address: 'Jl. Perintis Kemerdekaan No. 32, Barabai Timur, Barabai, Kab. Hulu Sungai Tengah, Kalimantan Selatan 71314',
    latitude: -2.5911226,
    longitude: 115.3735289,
    radiusMeters: 100,
  },
  {
    id: 'loc-skb-hst',
    name: 'Sanggar Kegiatan Belajar (SKB) Disdik HST',
    address: 'Jl. Murakata, Barabai, Kab. Hulu Sungai Tengah, Kalimantan Selatan',
    latitude: -2.58550,
    longitude: 115.37820,
    radiusMeters: 90,
  },
  {
    id: 'loc-kesenian-hst',
    name: 'Gedung Kesenian & Workshop Disdik HST',
    address: 'Kawasan Sarana Pembelajaran Terpadu, Barabai, Kab. Hulu Sungai Tengah',
    latitude: -2.59320,
    longitude: 115.37110,
    radiusMeters: 85,
  },
  {
    id: 'loc-it-center',
    name: 'Pusat Pembinaan & IT Support Disdik HST',
    address: 'Kompleks Perkantoran Pemerintah Kab. HST, Barabai',
    latitude: -2.58980,
    longitude: 115.37540,
    radiusMeters: 80,
  },
  {
    id: 'loc-korwil-barabai',
    name: 'Unit Pelayanan Korwil Pendidikan Barabai',
    address: 'Wilayah Layanan Pendidikan Barabai, Kab. Hulu Sungai Tengah',
    latitude: -2.59450,
    longitude: 115.37680,
    radiusMeters: 100,
  },
];

/**
 * Calculate distance in meters between two coordinates using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format meter distance to human readable Indonesian format
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} meter`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Validate GPS accuracy and anti-fake location flags
 */
export interface GpsValidationResult {
  isValid: boolean;
  accuracy: number;
  message: string;
  isMockSuspected: boolean;
}

export function validateGpsAccuracy(accuracy: number): GpsValidationResult {
  // If accuracy >= 30m, high probability of cell tower fallback or emulated/mock provider
  if (accuracy > 30) {
    return {
      isValid: false,
      accuracy,
      message: `Akurasi GPS rendah (±${Math.round(accuracy)}m). Sistem mensyaratkan akurasi di bawah 30 meter untuk presensi resmi.`,
      isMockSuspected: accuracy > 80,
    };
  }
  return {
    isValid: true,
    accuracy,
    message: `Sinyal GPS Akurat & Terverifikasi (±${Math.round(accuracy)}m)`,
    isMockSuspected: false,
  };
}
