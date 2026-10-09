import { OfficeLocation } from '../types';

export const PRIMARY_OFFICES: OfficeLocation[] = [
  {
    id: 'loc-1',
    name: 'Kantor Pusat Menara Sudirman',
    address: 'Jl. Jend. Sudirman Kav. 60, Senayan, Jakarta Selatan',
    latitude: -6.22384,
    longitude: 106.80892,
    radiusMeters: 80,
  },
  {
    id: 'loc-2',
    name: 'Data Center & Hub Operasional BSD',
    address: 'Kawasan Digital Hub, BSD City, Tangerang',
    latitude: -6.30155,
    longitude: 106.65219,
    radiusMeters: 100,
  },
  {
    id: 'loc-3',
    name: 'Pusat Logistik & Gudang Cikarang',
    address: 'Kawasan Industri GIIC Deltamas, Cikarang Pusat',
    latitude: -6.36891,
    longitude: 107.17024,
    radiusMeters: 120,
  },
  {
    id: 'loc-4',
    name: 'Branch Office Thamrin Nine',
    address: 'Jl. M.H. Thamrin No. 10, Kebon Melati, Jakarta Pusat',
    latitude: -6.19632,
    longitude: 106.82245,
    radiusMeters: 75,
  },
  {
    id: 'loc-5',
    name: 'Gedung Operasional Slipi',
    address: 'Jl. Letjen S. Parman Kav. 22, Slipi, Jakarta Barat',
    latitude: -6.19124,
    longitude: 106.79781,
    radiusMeters: 85,
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
      message: `Akurasi GPS rendah (±${Math.round(accuracy)}m). Sistem mensyaratkan akurasi di bawah 30 meter untuk mencegah emulasi atau manipulasi lokasi.`,
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
