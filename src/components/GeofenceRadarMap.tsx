import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Maximize2, Minimize2, ShieldCheck, AlertCircle, Compass } from 'lucide-react';
import { OfficeLocation } from '../types';
import { formatDistance, PRIMARY_OFFICES } from '../utils/geo';

interface GeofenceRadarMapProps {
  userCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distance: number;
    withinRadius: boolean;
  } | null;
  assignedLocation?: OfficeLocation;
  height?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export const GeofenceRadarMap: React.FC<GeofenceRadarMapProps> = ({
  userCoords,
  assignedLocation,
  height = '240px',
  isExpanded = false,
  onToggleExpand,
  className = '',
}) => {
  const safeOffice = assignedLocation || PRIMARY_OFFICES[0];
  const officeLat = typeof safeOffice?.latitude === 'number' ? safeOffice.latitude : PRIMARY_OFFICES[0].latitude;
  const officeLng = typeof safeOffice?.longitude === 'number' ? safeOffice.longitude : PRIMARY_OFFICES[0].longitude;
  const officeRadius = typeof safeOffice?.radiusMeters === 'number' ? safeOffice.radiusMeters : 100;
  const officeName = safeOffice?.name || PRIMARY_OFFICES[0].name;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const officeMarkerRef = useRef<L.Marker | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const connectionLineRef = useRef<L.Polyline | null>(null);

  const [mapReady, setMapReady] = useState(false);

  // Inisialisasi Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Bersihkan instance lama jika ada
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultLat = userCoords?.latitude ?? officeLat;
    const defaultLng = userCoords?.longitude ?? officeLng;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap Standar Resmi (Bebas Token/API Key, Beresolusi Tinggi & Lengkap di Barabai Kab. HST)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Zoom control di pojok kanan bawah agar tidak bertumpukan dengan status badge
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    // Invalidate size untuk memastikan tile ter-render penuh tanpa area kosong
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update ukuran peta saat ekspansi atau perubahan ukuran container
  useEffect(() => {
    if (mapInstanceRef.current) {
      const t = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isExpanded, height]);

  // Update elemen grafis peta (Geofence Circle, User Pulsing Marker, Office Pin, Garis Jarak)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const officePos: [number, number] = [officeLat, officeLng];
    const isWithin = userCoords?.withinRadius ?? true;

    // 1. Lingkaran Radius Geofence Kantor
    const circleColor = isWithin ? '#10b981' : '#ef4444';
    const circleFill = isWithin ? '#34d399' : '#f87171';

    // Batasi radius visual agar SVG tidak membebani browser jika akurasi GPS desktop melompat tinggi
    const safeRadius = Math.min(Math.max(Number(officeRadius) || 100, 20), 5000);

    if (!geofenceCircleRef.current) {
      geofenceCircleRef.current = L.circle(officePos, {
        radius: safeRadius,
        color: circleColor,
        weight: 2,
        fillColor: circleFill,
        fillOpacity: 0.18,
        dashArray: isWithin ? undefined : '5, 6',
      }).addTo(map);
    } else {
      geofenceCircleRef.current.setLatLng(officePos);
      geofenceCircleRef.current.setRadius(safeRadius);
      geofenceCircleRef.current.setStyle({
        color: circleColor,
        fillColor: circleFill,
        dashArray: isWithin ? undefined : '5, 6',
      });
    }

    // 2. Marker Kantor Penugasan
    const officeIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-indigo-500/40">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-indigo-600 rotate-45"></div>
      </div>
    `;

    const officeIcon = L.divIcon({
      html: officeIconHtml,
      className: 'custom-office-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    if (!officeMarkerRef.current) {
      officeMarkerRef.current = L.marker(officePos, { icon: officeIcon })
        .addTo(map)
        .bindPopup(
          `<div class="text-xs p-1 font-sans">
            <strong class="text-slate-900 block">${officeName}</strong>
            <span class="text-slate-500 block text-[10px]">Radius Operasional: ${officeRadius} meter</span>
          </div>`
        );
    } else {
      officeMarkerRef.current.setLatLng(officePos);
      officeMarkerRef.current.setIcon(officeIcon);
    }

    // 3. Marker Pegawai (Pulsing Radar Wave)
    if (userCoords) {
      const userPos: [number, number] = [userCoords.latitude, userCoords.longitude];
      const pulseColor = isWithin ? 'bg-emerald-500' : 'bg-rose-500';
      const waveColor = isWithin ? 'bg-emerald-400' : 'bg-rose-400';

      const userIconHtml = `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full ${waveColor} opacity-75 animate-ping"></div>
          <div class="absolute w-6 h-6 rounded-full ${waveColor} opacity-40"></div>
          <div class="relative w-4 h-4 rounded-full ${pulseColor} border-2 border-white shadow-md flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userIconHtml,
        className: 'custom-user-radar',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userPos, { icon: userIcon })
          .addTo(map)
          .bindTooltip(`Posisi Anda (±${Math.round(userCoords.accuracy)}m)`, {
            permanent: false,
            direction: 'top',
          });
      } else {
        userMarkerRef.current.setLatLng(userPos);
        userMarkerRef.current.setIcon(userIcon);
      }

      // 4. Garis Jarak Putus-Putus Dinamis
      const lineLatLngs: [number, number][] = [userPos, officePos];
      const lineColor = isWithin ? '#10b981' : '#f43f5e';

      if (!connectionLineRef.current) {
        connectionLineRef.current = L.polyline(lineLatLngs, {
          color: lineColor,
          weight: 2.5,
          dashArray: '6, 8',
          opacity: 0.85,
        }).addTo(map);
      } else {
        connectionLineRef.current.setLatLngs(lineLatLngs);
        connectionLineRef.current.setStyle({ color: lineColor });
      }

      // Fit bounds hanya jika kedua titik berbeda; jika titik sama gunakan setView langsung tanpa animasi berulang
      const isDifferentPoint = Math.abs(userPos[0] - officePos[0]) > 0.0001 || Math.abs(userPos[1] - officePos[1]) > 0.0001;
      if (isDifferentPoint) {
        try {
          const bounds = L.latLngBounds([userPos, officePos]);
          map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 17,
            animate: false,
          });
        } catch {
          map.setView(userPos, 16, { animate: false });
        }
      } else {
        map.setView(userPos, 16, { animate: false });
      }
    }
  }, [userCoords, assignedLocation, mapReady]);

  // Fungsi Re-Center ke Posisi Pengguna
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userCoords) {
      map.setView([userCoords.latitude, userCoords.longitude], 17, { animate: true });
    } else {
      map.setView([officeLat, officeLng], 17, { animate: true });
    }
  };

  // Fungsi Fit Bounds (Tampilkan Kantor + Posisi Pegawai Sekaligus)
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const officePos: [number, number] = [officeLat, officeLng];
    if (userCoords) {
      const userPos: [number, number] = [userCoords.latitude, userCoords.longitude];
      map.fitBounds(L.latLngBounds([userPos, officePos]), { padding: [35, 35], maxZoom: 18 });
    } else {
      map.setView(officePos, 17);
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-900 ${className}`}>
      {/* Kontainer Peta Leaflet */}
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="w-full z-0 transition-all duration-200"
      />

      {/* Floating Header Badge Status Jarak & Radius */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          {userCoords ? (
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md border ${
              userCoords.withinRadius
                ? 'bg-emerald-500/90 text-white border-emerald-400'
                : 'bg-rose-500/90 text-white border-rose-400 animate-pulse'
            }`}>
              {userCoords.withinRadius ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Radius Aman: {formatDistance(userCoords.distance)}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Di Luar Radius: {formatDistance(userCoords.distance)}</span>
                </>
              )}
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 text-slate-200 border border-slate-700 flex items-center gap-1.5 shadow-md backdrop-blur-md">
              <Compass className="w-3.5 h-3.5 animate-spin" />
              <span>Mencari Posisi GPS...</span>
            </div>
          )}
        </div>

        {/* Tombol Expand / Minimize jika disediakan */}
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="pointer-events-auto p-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title={isExpanded ? 'Kecilkan Peta' : 'Perbesar Peta Layar Penuh'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Floating Bottom Action Toolbar */}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleRecenter}
          className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          <Navigation className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          <span>Posisi Saya</span>
        </button>

        <button
          type="button"
          onClick={handleFitAll}
          className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          <span>Lihat Kantor & Radius</span>
        </button>
      </div>
    </div>
  );
};
