import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ShieldCheck, AlertCircle, Navigation, Compass, Building2, MapPin } from 'lucide-react';
import { OfficeLocation } from '../types';
import { formatDistance, PRIMARY_OFFICES } from '../utils/geo';
import { STORAGE_MAP_LAYER_KEY } from './VisualMapPicker';

interface GeofenceMiniMapProps {
  userCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distance: number;
    withinRadius: boolean;
  } | null;
  assignedLocation?: OfficeLocation;
  isLocating?: boolean;
  onRecenter?: () => void;
  className?: string;
}

export const GeofenceMiniMap: React.FC<GeofenceMiniMapProps> = ({
  userCoords,
  assignedLocation,
  isLocating = false,
  onRecenter,
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
  const polylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MAP_LAYER_KEY);
      if (saved === 'satellite' || saved === 'streets') return saved;
    } catch (e) {}
    return 'streets';
  });

  const [mapReady, setMapReady] = useState(false);

  // Switch map mode and save to localStorage
  const handleSwitchMapMode = (newMode: 'streets' | 'satellite') => {
    setMapMode(newMode);
    try {
      localStorage.setItem(STORAGE_MAP_LAYER_KEY, newMode);
      window.dispatchEvent(new CustomEvent('outsourcetrack:map-mode-changed', { detail: newMode }));
    } catch (e) {}
  };

  // Sync mode with other components
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvt = e as CustomEvent<'streets' | 'satellite'>;
      if (customEvt.detail && (customEvt.detail === 'streets' || customEvt.detail === 'satellite')) {
        setMapMode(customEvt.detail);
      }
    };
    window.addEventListener('outsourcetrack:map-mode-changed', handleSync);
    return () => window.removeEventListener('outsourcetrack:map-mode-changed', handleSync);
  }, []);

  // Sync tile layers on mode change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    if (mapMode === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri World Imagery',
        }
      ).addTo(map);
      tileLayerRef.current = satLayer;

      const overlayLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri Labels',
        }
      ).addTo(map);
      overlayLayerRef.current = overlayLayer;
    } else {
      const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      tileLayerRef.current = osmLayer;
    }
  }, [mapMode]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialLat = userCoords?.latitude ?? officeLat;
    const initialLng = userCoords?.longitude ?? officeLng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    if (mapMode === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri World Imagery',
        }
      ).addTo(map);
      tileLayerRef.current = satLayer;

      const overlayLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri Labels',
        }
      ).addTo(map);
      overlayLayerRef.current = overlayLayer;
    } else {
      const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      tileLayerRef.current = osmLayer;
    }

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map graphics (Circle, Office Pin, User GPS Dot, Distance Polyline)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const officePos: [number, number] = [officeLat, officeLng];
    const isWithin = userCoords?.withinRadius ?? true;

    // 1. Geofence Circle
    const circleColor = isWithin ? '#3b82f6' : '#ef4444';
    const circleFill = isWithin ? '#60a5fa' : '#f87171';

    if (!geofenceCircleRef.current) {
      geofenceCircleRef.current = L.circle(officePos, {
        radius: officeRadius,
        color: circleColor,
        weight: 2,
        fillColor: circleFill,
        fillOpacity: 0.16,
        dashArray: '4, 4',
      }).addTo(map);
    } else {
      geofenceCircleRef.current.setLatLng(officePos);
      geofenceCircleRef.current.setRadius(officeRadius);
      geofenceCircleRef.current.setStyle({
        color: circleColor,
        fillColor: circleFill,
      });
    }

    // 2. Office Marker (Indigo Pin with Building)
    const officeIconHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-indigo-500/30">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div class="absolute -bottom-1 w-2 h-2 bg-indigo-700 rotate-45 border-r border-b border-white"></div>
      </div>
    `;

    const officeIcon = L.divIcon({
      html: officeIconHtml,
      className: 'custom-office-pin',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (!officeMarkerRef.current) {
      officeMarkerRef.current = L.marker(officePos, { icon: officeIcon }).addTo(map);
      officeMarkerRef.current.bindPopup(
        `<div class="text-xs p-1 font-sans">
          <strong class="text-slate-900 block font-bold">${officeName}</strong>
          <span class="text-indigo-600 block text-[10px] font-mono mt-0.5">Radius Geofence: ${officeRadius} meter</span>
        </div>`
      );
    } else {
      officeMarkerRef.current.setLatLng(officePos);
      officeMarkerRef.current.setIcon(officeIcon);
    }

    // 3. User Marker (Glowing Green Pulsing Dot)
    if (userCoords) {
      const userPos: [number, number] = [userCoords.latitude, userCoords.longitude];

      const userIconHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <span class="absolute w-6 h-6 rounded-full bg-emerald-400/40 animate-ping"></span>
          <span class="relative w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
          </span>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userIconHtml,
        className: 'custom-user-gps-dot',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userPos, { icon: userIcon }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng(userPos);
        userMarkerRef.current.setIcon(userIcon);
      }

      // 4. Distance Measurement Polyline (Cyan/White Dashed Line)
      if (!polylineRef.current) {
        polylineRef.current = L.polyline([userPos, officePos], {
          color: '#38bdf8',
          weight: 2.5,
          dashArray: '6, 8',
          opacity: 0.9,
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs([userPos, officePos]);
      }

      // 5. Auto Fit Bounds if user and office both exist
      try {
        const bounds = L.latLngBounds([userPos, officePos]);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 18, animate: true });
      } catch (e) {}
    } else {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
      map.setView(officePos, 17);
    }
  }, [userCoords, assignedLocation, mapReady]);

  // Recenter handler
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (userCoords) {
      map.setView([userCoords.latitude, userCoords.longitude], 17, { animate: true });
    } else {
      map.setView([officeLat, officeLng], 17, { animate: true });
    }
    if (onRecenter) onRecenter();
  };

  return (
    <div
      className={`h-52 sm:h-60 w-full relative overflow-hidden bg-slate-950 border-b border-slate-800 shadow-inner ${className}`}
    >
      {/* Kontainer Peta Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Status Badge (Kiri Atas) */}
      <div className="absolute top-2.5 left-2.5 z-[400] max-w-[75%] sm:max-w-none pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-lg space-y-0.5 text-white pointer-events-auto">
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-[260px]">{officeName}</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono">
            {userCoords ? (
              <>
                <span
                  className={`inline-flex items-center gap-1 font-bold ${
                    userCoords.withinRadius ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
                  }`}
                >
                  {userCoords.withinRadius ? (
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 shrink-0" />
                  )}
                  <span>Jarak: {formatDistance(userCoords.distance)}</span>
                  <span>({userCoords.withinRadius ? 'Aman' : 'Di Luar'})</span>
                </span>
                <span className="text-slate-400">• Akurasi ±{Math.round(userCoords.accuracy)}m</span>
              </>
            ) : isLocating ? (
              <span className="text-cyan-300 flex items-center gap-1 animate-pulse">
                <Compass className="w-3 h-3 animate-spin shrink-0" />
                <span>Mendeteksi sinyal GPS...</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Sinyal GPS belum aktif</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Layer Mode Switcher: Jalan | Satelit (Kanan Atas z-[400]) */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center bg-slate-950/85 backdrop-blur-md p-0.5 rounded-xl border border-slate-700/80 shadow-md">
        <button
          type="button"
          onClick={() => handleSwitchMapMode('streets')}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            mapMode === 'streets'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Tampilkan mode peta jalan"
        >
          🗺️ Jalan
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMapMode('satellite')}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            mapMode === 'satellite'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Tampilkan citra satelit hibrida"
        >
          🛰️ Satelit
        </button>
      </div>

      {/* Floating Re-center / GPS Saya (Kiri Bawah z-[400]) */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          className="px-2.5 py-1 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700 text-[10px] font-semibold flex items-center gap-1 shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Arahkan peta ke posisi GPS saya"
        >
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>GPS Saya</span>
        </button>
      </div>
    </div>
  );
};
