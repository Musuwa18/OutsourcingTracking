import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building, Globe, Loader2, X, AlertCircle } from 'lucide-react';

export interface LocationSearchResult {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  source: 'preset' | 'osm';
}

interface LocationAutoSuggestInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectLocation: (loc: { name: string; latitude: number; longitude: number; address?: string }) => void;
  placeholder?: string;
  presetLocations?: Array<{ id?: string; name: string; latitude: number; longitude: number; address?: string }>;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const LocationAutoSuggestInput: React.FC<LocationAutoSuggestInputProps> = ({
  value,
  onChange,
  onSelectLocation,
  placeholder = 'Contoh: Gedung Guru Barabai / SDN 1 Barabai / RSUD Damanhuri',
  presetLocations = [],
  disabled = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function combining preset master locations and OpenStreetMap Nominatim
  const performSearch = async (query: string) => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const matches: LocationSearchResult[] = [];

    // 1. Search locally in preset master locations (instant 0ms)
    if (presetLocations && presetLocations.length > 0) {
      presetLocations.forEach((loc, idx) => {
        const nameMatch = loc.name?.toLowerCase().includes(q);
        const addrMatch = loc.address?.toLowerCase().includes(q);
        if (nameMatch || addrMatch) {
          matches.push({
            id: loc.id || `preset-${idx}`,
            name: loc.name,
            address: loc.address || 'Master Lokasi Terdaftar',
            latitude: loc.latitude,
            longitude: loc.longitude,
            source: 'preset',
          });
        }
      });
    }

    // 2. Search OpenStreetMap Nominatim with Barabai/Kab. HST bounding box prioritization
    try {
      // Prioritize Barabai / HST bounding box: approx [115.0, -2.3, 115.7, -2.9]
      const osmQuery = encodeURIComponent(query.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${osmQuery}&format=json&limit=6&countrycodes=id&viewbox=115.0,-2.3,115.7,-2.9&bounded=0`,
        {
          headers: {
            'Accept-Language': 'id, en',
          },
        }
      );

      if (res.ok) {
        const osmData = await res.json();
        if (Array.isArray(osmData)) {
          osmData.forEach((item: any, idx: number) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              // Avoid duplicate if already in preset matches with close coordinates
              const isDuplicate = matches.some(
                (m) => Math.abs(m.latitude - lat) < 0.0005 && Math.abs(m.longitude - lng) < 0.0005
              );
              if (!isDuplicate) {
                matches.push({
                  id: `osm-${item.place_id || idx}`,
                  name: item.name || item.display_name.split(',')[0],
                  address: item.display_name,
                  latitude: Number(lat.toFixed(6)),
                  longitude: Number(lng.toFixed(6)),
                  source: 'osm',
                });
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Gagal melakukan geocoding OSM:', err);
    } finally {
      setResults(matches);
      setIsLoading(false);
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      setIsLoading(true);
      setIsOpen(true);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(val);
      }, 500);
    } else {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      setHasSearched(false);
    }
  };

  const handleSelectResult = (item: LocationSearchResult) => {
    onChange(item.name);
    onSelectLocation({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          required={required}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-9 py-2.5 rounded-xl text-xs bg-slate-950/80 border border-slate-700/80 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium ${className}`}
        />

        {/* Left Search Icon / Spinner */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>

        {/* Right Clear Button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Bersihkan input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Autosuggest Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150 max-h-72 overflow-y-auto">
          {isLoading && results.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Mencari koordinat tempat & fasilitas di Barabai / HST...</span>
            </div>
          )}

          {!isLoading && results.length === 0 && hasSearched && (
            <div className="p-3.5 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Titik lokasi tidak ditemukan otomatis di database peta.</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-5.5">
                Silakan geser pin pada peta di bawah atau tempel koordinat manual.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="divide-y divide-slate-800/80">
              <div className="px-3 py-1.5 bg-slate-950/60 text-[10px] font-bold text-slate-400 flex items-center justify-between uppercase tracking-wider">
                <span>Rekomendasi Titik Lokasi ({results.length})</span>
                <span className="text-[9px] font-normal normal-case text-indigo-400">
                  Klik untuk arahkan pin peta
                </span>
              </div>

              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-950/50 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      item.source === 'preset'
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                        : 'bg-indigo-950/80 text-indigo-400 border border-indigo-700/50'
                    }`}
                  >
                    {item.source === 'preset' ? (
                      <Building className="w-3.5 h-3.5" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                        {item.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold tracking-wide shrink-0 ${
                          item.source === 'preset'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {item.source === 'preset' ? 'Master Kantor' : 'Peta Publik'}
                      </span>
                    </div>

                    {item.address && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 group-hover:text-slate-300">
                        {item.address}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 mt-1">
                      <span>Lat: {item.latitude.toFixed(6)}</span>
                      <span>•</span>
                      <span>Lng: {item.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
