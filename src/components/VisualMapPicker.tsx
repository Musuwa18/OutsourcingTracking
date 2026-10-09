import React, { useState, useRef } from 'react';
import { MapPin, Crosshair, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface VisualMapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName: string;
  onChangeCoordinates: (lat: number, lng: number) => void;
  onChangeRadius: (radius: number) => void;
}

export const VisualMapPicker: React.FC<VisualMapPickerProps> = ({
  latitude,
  longitude,
  radiusMeters,
  locationName,
  onChangeCoordinates,
  onChangeRadius,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const mapSvgRef = useRef<SVGSVGElement | null>(null);

  // Pixel radius mapping based on zoom level and radiusMeters
  // 1 meter ≈ 0.8 pixels at zoom level 1
  const circlePixelRadius = Math.max(16, (radiusMeters * 0.75) * zoomLevel);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!mapSvgRef.current) return;
    const rect = mapSvgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const deltaX = (x - centerX) / (zoomLevel * 3000);
    const deltaY = (y - centerY) / (zoomLevel * 3000);

    // Calculate new lat/lng with sensitive displacement
    const newLng = Number((longitude + deltaX * 0.005).toFixed(6));
    const newLat = Number((latitude - deltaY * 0.005).toFixed(6));

    onChangeCoordinates(newLat, newLng);
  };

  return (
    <div className="space-y-3">
      {/* Map Canvas Frame */}
      <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner select-none">
        
        {/* Interactive SVG Vector Map Viewport */}
        <svg
          ref={mapSvgRef}
          onClick={handleSvgClick}
          className="w-full h-full cursor-crosshair"
          viewBox="0 0 500 260"
        >
          <defs>
            {/* Base Grid Pattern */}
            <pattern id="picker-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
            {/* Diagonal Hatch for geofence safe zone */}
            <pattern id="geofence-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" />
            </pattern>
            <radialGradient id="geofence-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.28)" />
              <stop offset="80%" stopColor="rgba(99, 102, 241, 0.12)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.02)" />
            </radialGradient>
          </defs>

          {/* Background Map Texture */}
          <rect width="100%" height="100%" fill="#090d16" />
          <rect width="100%" height="100%" fill="url(#picker-grid)" />

          {/* Simulated Roads & Infrastructure */}
          <path d="M 0 130 Q 180 110, 500 150" stroke="#1e293b" strokeWidth="18" fill="none" />
          <path d="M 0 130 Q 180 110, 500 150" stroke="#334155" strokeWidth="8" fill="none" />
          <path d="M 250 0 L 250 260" stroke="#1e293b" strokeWidth="20" fill="none" />
          <path d="M 250 0 L 250 260" stroke="#334155" strokeWidth="10" fill="none" />

          {/* Building Blocks */}
          <rect x="70" y="40" width="80" height="50" rx="4" fill="#141c2e" stroke="#253248" />
          <rect x="330" y="45" width="90" height="55" rx="4" fill="#141c2e" stroke="#253248" />
          <rect x="80" y="170" width="75" height="60" rx="4" fill="#141c2e" stroke="#253248" />
          <rect x="320" y="165" width="110" height="60" rx="4" fill="#141c2e" stroke="#253248" />

          {/* Geofence Transparent Overlay Circle */}
          <g transform="translate(250, 130)">
            {/* Glowing fill */}
            <circle
              cx="0"
              cy="0"
              r={circlePixelRadius}
              fill="url(#geofence-glow)"
            />
            {/* Hatch pattern */}
            <circle
              cx="0"
              cy="0"
              r={circlePixelRadius}
              fill="url(#geofence-hatch)"
            />
            {/* Perimeter stroke */}
            <circle
              cx="0"
              cy="0"
              r={circlePixelRadius}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="4 3"
              className="animate-pulse"
            />
            
            {/* Radius line indicator */}
            <line
              x1="0"
              y1="0"
              x2={circlePixelRadius}
              y2="0"
              stroke="#818cf8"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <text
              x={circlePixelRadius / 2}
              y="-6"
              textAnchor="middle"
              fill="#c7d2fe"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              R: {radiusMeters}m
            </text>

            {/* Target Pin Marker (Center) */}
            <circle cx="0" cy="0" r="14" fill="rgba(99, 102, 241, 0.3)" />
            <circle cx="0" cy="0" r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* Label Card */}
          <g transform="translate(250, 100)">
            <rect
              x="-90"
              y="-18"
              width="180"
              height="22"
              rx="6"
              fill="rgba(15, 23, 42, 0.92)"
              stroke="#4338ca"
              strokeWidth="1"
            />
            <text
              x="0"
              y="-3"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {locationName || 'Titik Tugas Utama'}
            </text>
          </g>
        </svg>

        {/* Floating Map Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 bg-slate-900/90 backdrop-blur-xs p-1 rounded-xl border border-slate-700/60 shadow-lg text-slate-300">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(2, Number((z + 0.25).toFixed(2))))}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Perbesar Peta"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.25).toFixed(2))))}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Perkecil Peta"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
            }}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Pusatkan Ulang"
            aria-label="Reset View"
          >
            <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
          </button>
        </div>

        {/* Floating Instruction Badge */}
        <div className="absolute bottom-2.5 left-2.5 bg-slate-950/85 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1.5">
          <Crosshair className="w-3 h-3 text-emerald-400" />
          <span>Klik di area peta untuk menggeser pin koordinat</span>
        </div>
      </div>

      {/* Coordinate & Radius Sliders & Manual Inputs */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        {/* Radius Slider (10 - 200 meters) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Batas Radius Toleransi Geofence:</span>
              <strong className="font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                {radiusMeters} meter
              </strong>
            </label>
            <span className="text-[10px] text-slate-400">Rentang: 10m - 200m</span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={radiusMeters}
            onChange={(e) => onChangeRadius(Number(e.target.value))}
            className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>

        {/* Lat & Long Manual Numeric Inputs */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Latitude (Garis Lintang)
            </label>
            <input
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => onChangeCoordinates(Number(e.target.value), longitude)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Longitude (Garis Bujur)
            </label>
            <input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => onChangeCoordinates(latitude, Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white tabular-nums"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
