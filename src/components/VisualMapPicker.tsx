import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Crosshair,
  Copy,
  ClipboardCheck,
  ExternalLink,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface VisualMapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName: string;
  onChangeCoordinates: (lat: number, lng: number) => void;
  onChangeRadius: (radius: number) => void;
}

export function parseGoogleMapsCoords(input: string): { lat: number; lng: number } | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim();

  // 1. Check Google Maps URL format: @lat,lng or q=lat,lng
  const urlMatch =
    clean.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    clean.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lng = parseFloat(urlMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // 2. Standard coordinate string: "-2.591159346853362, 115.37352462956034"
  // Handles comma, space, semicolon, brackets
  const matches = clean.match(/(-?\d+(?:\.\d+)?)[,\s;]+(-?\d+(?:\.\d+)?)/);
  if (matches) {
    const lat = parseFloat(matches[1]);
    const lng = parseFloat(matches[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

export const VisualMapPicker: React.FC<VisualMapPickerProps> = ({
  latitude,
  longitude,
  radiusMeters,
  locationName,
  onChangeCoordinates,
  onChangeRadius,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Unified string coordinate input state
  const [coordsInput, setCoordsInput] = useState<string>(
    latitude && longitude ? `${latitude}, ${longitude}` : ''
  );
  const [isCopied, setIsCopied] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Sync coordsInput when props change externally (e.g. initial load or parent update)
  useEffect(() => {
    const parsedCurrent = parseGoogleMapsCoords(coordsInput);
    if (!parsedCurrent || parsedCurrent.lat !== latitude || parsedCurrent.lng !== longitude) {
      setCoordsInput(`${latitude}, ${longitude}`);
    }
  }, [latitude, longitude]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : -2.591159;
    const initLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 115.373525;

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    // High resolution OpenStreetMap layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Geofence Circle
    const circle = L.circle([initLat, initLng], {
      radius: radiusMeters,
      color: '#6366f1',
      weight: 2,
      fillColor: '#818cf8',
      fillOpacity: 0.2,
      dashArray: '4, 4',
    }).addTo(map);
    circleRef.current = circle;

    // Custom Draggable Pin Marker
    const pinIconHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
        <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-indigo-500/30">
          <svg class="w-5 h-5 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" fill="white" />
          </svg>
        </div>
        <div class="absolute -bottom-1 w-2.5 h-2.5 bg-indigo-700 rotate-45 border-r border-b border-white"></div>
      </div>
    `;

    const customPinIcon = L.divIcon({
      html: pinIconHtml,
      className: 'custom-picker-pin',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -36],
    });

    const marker = L.marker([initLat, initLng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);

    marker.bindPopup(
      `<div class="text-xs p-1 font-sans">
        <strong class="text-slate-900 block font-bold">${locationName || 'Titik Lokasi'}</strong>
        <span class="text-indigo-600 block text-[10px] font-mono mt-0.5">Lat: ${initLat.toFixed(6)}, Lng: ${initLng.toFixed(6)}</span>
        <span class="text-slate-500 block text-[10px]">Radius: ${radiusMeters} meter</span>
      </div>`
    );

    // Event: Dragging marker on map
    marker.on('drag', () => {
      const pos = marker.getLatLng();
      circle.setLatLng(pos);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const newLat = Number(pos.lat.toFixed(6));
      const newLng = Number(pos.lng.toFixed(6));
      circle.setLatLng([newLat, newLng]);
      onChangeCoordinates(newLat, newLng);
      setCoordsInput(`${newLat}, ${newLng}`);
      setParseError(null);
    });

    // Event: Click anywhere on map to move marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      circle.setLatLng([newLat, newLng]);
      onChangeCoordinates(newLat, newLng);
      setCoordsInput(`${newLat}, ${newLng}`);
      setParseError(null);
    });

    markerRef.current = marker;
    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync circle radius
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Sync map position when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latitude) > 0.000001 ||
        Math.abs(currentPos.lng - longitude) > 0.000001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.flyTo([latitude, longitude], 17, { duration: 0.6 });
      }
    }
  }, [latitude, longitude]);

  // Handle typing or pasting coordinates
  const handleCoordsInputChange = (val: string) => {
    setCoordsInput(val);
    if (!val.trim()) {
      setParseError('Koordinat belum diisi.');
      return;
    }
    const parsed = parseGoogleMapsCoords(val);
    if (parsed) {
      setParseError(null);
      onChangeCoordinates(parsed.lat, parsed.lng);
    } else {
      setParseError('Format koordinat tidak terbaca. Contoh valid: -2.591159, 115.373525');
    }
  };

  // Paste directly from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleCoordsInputChange(text);
      }
    } catch (err) {
      // Fallback focus to input for manual paste
      const inputEl = document.getElementById('unified-coords-input');
      inputEl?.focus();
    }
  };

  // Get current device GPS location
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung sensor Geolocation.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoordsInput(`${lat}, ${lng}`);
        setParseError(null);
        onChangeCoordinates(lat, lng);
      },
      (err) => {
        setIsLocatingGps(false);
        alert('Gagal mengambil titik GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reset to default Kantor Disdik HST
  const handleResetToDisdik = () => {
    const lat = -2.591159;
    const lng = 115.373525;
    setCoordsInput(`${lat}, ${lng}`);
    setParseError(null);
    onChangeCoordinates(lat, lng);
  };

  const parsedValid = parseGoogleMapsCoords(coordsInput);

  return (
    <div className="space-y-3.5">
      {/* 1. UNIFIED GOOGLE MAPS COORDINATE INPUT */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <label
            htmlFor="unified-coords-input"
            className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider"
          >
            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Titik Koordinat Google Maps (Latitude, Longitude)</span>
          </label>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Tempel teks koordinat dari clipboard"
            >
              <ClipboardCheck className="w-3 h-3 text-indigo-500" />
              <span>Tempel (Paste)</span>
            </button>

            <button
              type="button"
              onClick={handleUseCurrentGps}
              disabled={isLocatingGps}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Ambil titik koordinat GPS saya saat ini"
            >
              <Navigation className={`w-3 h-3 text-emerald-500 ${isLocatingGps ? 'animate-spin' : ''}`} />
              <span>{isLocatingGps ? 'Mencari...' : 'GPS Saya'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDisdik}
              className="p-1 text-[10px] rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Reset ke Kantor Dinas Pendidikan HST"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Input box */}
        <div className="relative">
          <input
            id="unified-coords-input"
            type="text"
            required
            value={coordsInput}
            onChange={(e) => handleCoordsInputChange(e.target.value)}
            placeholder="Tempel dari Google Maps, contoh: -2.591159346853362, 115.37352462956034"
            className={`w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 shadow-xs transition-colors ${
              parseError
                ? 'border-rose-400 focus:ring-rose-500'
                : 'border-indigo-300 dark:border-indigo-800 focus:ring-indigo-500'
            }`}
          />
        </div>

        {/* Real-time Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pt-0.5">
          {parsedValid ? (
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Lintang (Lat): <strong>{parsedValid.lat}</strong> · Bujur (Lng): <strong>{parsedValid.lng}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{parseError || 'Tempelkan titik koordinat Google Maps.'}</span>
            </div>
          )}

          {parsedValid && (
            <a
              href={`https://www.google.com/maps?q=${parsedValid.lat},${parsedValid.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold text-[10px] shrink-0"
            >
              <span>Lihat di Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* 2. REAL INTERACTIVE LEAFLET OPENSTREETMAP */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold flex items-center gap-1.5 text-[11px]">
            <Compass className="w-3.5 h-3.5 text-indigo-500" />
            Peta Geofence Nyata (Klik peta atau geser pin untuk atur titik)
          </span>
          <span className="text-[10px] text-slate-400">OpenStreetMap Barabai HST</span>
        </div>

        <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-900">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Instructions Pill */}
          <div className="absolute top-2.5 left-2.5 z-[400] bg-slate-950/85 backdrop-blur-xs px-3 py-1 rounded-xl border border-slate-700/80 text-[10px] text-white flex items-center gap-1.5 shadow-md pointer-events-none">
            <Crosshair className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Klik peta / geser pin untuk sesuaikan titik</span>
          </div>

          {/* Radius Badge Overlay */}
          <div className="absolute bottom-2.5 left-2.5 z-[400] bg-indigo-950/90 backdrop-blur-xs px-3 py-1 rounded-xl border border-indigo-700/80 text-[10px] text-indigo-200 font-mono font-bold shadow-md pointer-events-none">
            Radius Toleransi: {radiusMeters} meter
          </div>
        </div>
      </div>

      {/* 3. GEOFENCE RADIUS SLIDER */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>Batas Radius Toleransi Geofence:</span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold tabular-nums border border-indigo-200 dark:border-indigo-800">
              {radiusMeters} meter
            </span>
          </label>
          <span className="text-[10px] text-slate-400 font-medium">Rentang: 10m - 200m</span>
        </div>

        <input
          type="range"
          min={10}
          max={200}
          step={5}
          value={radiusMeters}
          onChange={(e) => onChangeRadius(Number(e.target.value))}
          className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span>10m (Sangat Ketat)</span>
          <span>50m (Standar Kantor)</span>
          <span>100m (Gedung Luas)</span>
          <span>200m (Maksimal)</span>
        </div>
      </div>
    </div>
  );
};
