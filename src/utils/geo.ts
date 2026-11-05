import { OfficeLocation } from '../types';

export const PRIMARY_OFFICES: OfficeLocation[] = [
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
