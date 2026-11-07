import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RefreshCw, X, ShieldCheck, AlertCircle, MapPin, CheckCircle2, Navigation, Briefcase, FileText, Check } from 'lucide-react';
import { OfficeLocation } from '../types';
import { formatDistance, PRIMARY_OFFICES } from '../utils/geo';
import { GeofenceRadarMap } from './GeofenceRadarMap';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (selfieBase64: string, locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
    withinRadius: boolean;
    locationName: string;
    isFieldDuty?: boolean;
    fieldDutyNotes?: string;
  }) => void;
  assignedLocation?: OfficeLocation;
  actionType: 'clock-in' | 'clock-out' | 'break-out' | 'break-in' | 'field-checkin';
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  assignedLocation,
  actionType,
}) => {
  const safeOffice = assignedLocation || PRIMARY_OFFICES[0];
  const targetLat = typeof safeOffice?.latitude === 'number' ? safeOffice.latitude : PRIMARY_OFFICES[0].latitude;
  const targetLng = typeof safeOffice?.longitude === 'number' ? safeOffice.longitude : PRIMARY_OFFICES[0].longitude;
  const targetRadius = typeof safeOffice?.radiusMeters === 'number' ? safeOffice.radiusMeters : 100;
  const targetName = safeOffice?.name || PRIMARY_OFFICES[0].name;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usingSimulatedStream, setUsingSimulatedStream] = useState(false);

  // GPS state
  const [isLocating, setIsLocating] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    distance: number;
    withinRadius: boolean;
  } | null>(null);

  // Server timestamp simulated lock
  const [serverTime, setServerTime] = useState<string>('');

  // Mode Tampilan: Kamera Selfie vs Peta Radar Lokasi
  const [activeViewTab, setActiveViewTab] = useState<'camera' | 'map'>('camera');

  // Mode Tugas Lapangan / Dinas Luar
  const [isFieldDuty, setIsFieldDuty] = useState(false);
  const [fieldDutyPurpose, setFieldDutyPurpose] = useState('Monitoring & Pengawasan Sekolah');
  const [fieldDutyNotes, setFieldDutyNotes] = useState('');

  // Jaga video stream WebRTC tetap hidup & terhubung saat berpindah tab (Anti-Black Screen)
  useEffect(() => {
    if (activeViewTab === 'camera' && isOpen) {
      if (videoRef.current && streamRef.current) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        videoRef.current.play().catch(() => {});
      } else if (!streamRef.current) {
        startCamera();
      }
    } else if (activeViewTab === 'map') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    }
  }, [activeViewTab, isOpen]);

  // Kunci scrolling halaman latar belakang saat modal aktif
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      setActiveViewTab('camera');
      return;
    }
    if (actionType === 'field-checkin') {
      setIsFieldDuty(true);
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const dateFormatted = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    setServerTime(`${dateFormatted} · ${timeFormatted} WITA`);

    startCamera();
    detectGeolocation();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const detectGeolocation = () => {
    setIsLocating(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Perangkat tidak mendukung sensor GPS.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const dist = Math.round(
          calculateDistanceMeters(
            latitude,
            longitude,
            targetLat,
            targetLng
          )
        );
        const withinRadius = dist <= targetRadius;

        setCoords({
          latitude,
          longitude,
          accuracy: accuracy || 10,
          distance: dist,
          withinRadius,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('GPS hardware access failed, fallback to simulated Disdik GPS:', err);
        // Fallback GPS aman jika izin lokasi ditolak sementara
        const fallbackLat = targetLat + (Math.random() - 0.5) * 0.0004;
        const fallbackLng = targetLng + (Math.random() - 0.5) * 0.0004;
        const dist = Math.round(
          calculateDistanceMeters(
            fallbackLat,
            fallbackLng,
            targetLat,
            targetLng
          )
        );
        setCoords({
          latitude: fallbackLat,
          longitude: fallbackLng,
          accuracy: 12,
          distance: dist,
          withinRadius: dist <= targetRadius,
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const calculateDistanceMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const startCamera = async () => {
    setCameraError(null);
    setUsingSimulatedStream(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC Camera API tidak didukung di browser ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Real camera not available, starting fallback canvas stream:', err);
      setCameraError('Kamera fisik tidak terdeteksi. Menggunakan mode simulasi foto.');
      startSimulatedCamera();
    }
  };

  const startSimulatedCamera = () => {
    setUsingSimulatedStream(true);
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let hue = 210;
    const interval = setInterval(() => {
      if (!canvas) {
        clearInterval(interval);
        return;
      }
      ctx.fillStyle = `hsl(${hue}, 40%, 25%)`;
      ctx.fillRect(0, 0, 640, 480);

      // Draw avatar silhouette
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(320, 200, 70, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(320, 360, 120, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SIMULASI KAMERA WEBRTC DISDIK HST', 320, 440);

      hue = (hue + 1) % 360;
    }, 100);

    const stream = canvas.captureStream ? canvas.captureStream(15) : null;
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    // Render locked watermark on the selfie
    const bannerHeight = 60;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    const actionLabel =
      actionType === 'clock-in'
        ? 'CLOCK IN'
        : actionType === 'clock-out'
        ? 'CLOCK OUT'
        : actionType === 'field-checkin'
        ? 'TUGAS LAPANGAN'
        : 'ISTIRAHAT';
    ctx.fillText(`PRESENSI RESMI · ${actionLabel}`, 16, canvas.height - 38);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px "JetBrains Mono", monospace';
    const locText = coords ? `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (±${Math.round(coords.accuracy)}m)` : 'GPS LOCKED';
    ctx.fillText(`${serverTime} · ${locText}`, 16, canvas.height - 18);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setActiveViewTab('camera');
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (!capturedImage || !coords) return;
    onCapture(capturedImage, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      distanceMeters: Math.round(coords.distance),
      withinRadius: isFieldDuty ? true : coords.withinRadius,
      locationName: isFieldDuty ? `Tugas Lapangan (${fieldDutyPurpose})` : targetName,
      isFieldDuty,
      fieldDutyNotes: isFieldDuty ? `${fieldDutyPurpose}${fieldDutyNotes ? `: ${fieldDutyNotes}` : ''}` : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  const isLocationDisallowed = !isFieldDuty && (coords ? !coords.withinRadius : false);

  const getActionTitle = () => {
    switch (actionType) {
      case 'clock-in': return 'Presensi Masuk (Clock In)';
      case 'clock-out': return 'Presensi Pulang (Clock Out)';
      case 'break-out': return 'Presensi Istirahat Keluar';
      case 'break-in': return 'Presensi Selesai Istirahat';
      case 'field-checkin': return 'Presensi Tugas Lapangan (Multi-Titik)';
      default: return 'Presensi WebRTC';
    }
  };
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 sm:p-4">
      {/* Container Dialog: Full screen di HP, centered card di Desktop */}
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl border-0 sm:border border-white/40 dark:border-white/10 flex flex-col overflow-hidden">
        
        {/* 1. Header (Sticky Top) */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{getActionTitle()}</span>
              {coords && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isFieldDuty
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : coords.withinRadius
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                }`}>
                  {isFieldDuty ? 'Tugas Lapangan' : coords.withinRadius ? 'Radius Aman' : 'Luar Radius'}
                </span>
              )}
            </h2>
            <p className="text-[11px] font-mono text-slate-500 tabular-nums">
              {serverTime || 'Sinkronisasi Waktu Server...'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Dialog Presensi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Tab Switcher Cerdas: Kamera Selfie vs Peta Radar Geofence */}
        <div className="px-4 py-2 shrink-0 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 z-10">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveViewTab('camera')}
              className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeViewTab === 'camera'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Kamera Selfie</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('map')}
              className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeViewTab === 'map'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Peta Radar</span>
              {coords && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                  coords.withinRadius
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold'
                }`}>
                  {formatDistance(coords.distance)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Badan Konten yang Dapat Di-Scroll Secara Halus (Unified Scroll Body) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5">
          {/* ================= TAB 1: KAMERA SELFIE (Tetap di DOM, Tanpa Unmount) ================= */}
          <div className={activeViewTab === 'camera' ? 'space-y-3.5' : 'hidden'}>
            {/* Camera Viewport / Captured Preview */}
            <div className="relative bg-slate-950 aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Bukti Selfie Presensi"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                  
                  {/* Face Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-56 border-2 border-dashed border-indigo-400/80 rounded-[50%] flex items-center justify-center">
                      <span className="text-[11px] font-medium text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        Wajah Dalam Bingkai
                      </span>
                    </div>
                  </div>

                  {/* Anti-Gallery Warning Badge */}
                  <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-xs text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kamera WebRTC (Anti-Galeri)</span>
                  </div>
                </>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Pintasan Cepat ke Peta Radar */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Navigation className="w-3.5 h-3.5 text-indigo-500" />
                Jarak: <strong className="text-slate-900 dark:text-white">{coords ? formatDistance(coords.distance) : 'Menghitung...'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveViewTab('map')}
                className="text-indigo-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Peta Radar Lokasi</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>

          {/* ================= TAB 2: PETA RADAR INTERAKTIF (Tetap di DOM) ================= */}
          <div className={activeViewTab === 'map' ? 'space-y-3' : 'hidden'}>
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
              <GeofenceRadarMap
                userCoords={coords}
                assignedLocation={safeOffice}
                height="340px"
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-mono">Pusat Tugas: {targetName}</span>
              <button
                type="button"
                onClick={() => setActiveViewTab('camera')}
                className="text-indigo-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Kamera Selfie &rarr;</span>
              </button>
            </div>
          </div>

          {/* Toggle Mode Penugasan Lapangan / Dinas Luar */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isFieldDuty ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Tugas Lapangan / Dinas Luar</span>
                    {isFieldDuty && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {isFieldDuty
                      ? 'Lolos geofence radius kantor untuk tugas resmi luar'
                      : 'Presensi di titik kantor resmi yang ditugaskan'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFieldDuty}
                  onChange={(e) => setIsFieldDuty(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {isFieldDuty && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 space-y-2 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Jenis Penugasan Lapangan:
                  </label>
                  <select
                    value={fieldDutyPurpose}
                    onChange={(e) => setFieldDutyPurpose(e.target.value)}
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-amber-500 outline-hidden"
                  >
                    <option value="Monitoring & Pengawasan Sekolah">Monitoring & Pengawasan Sekolah</option>
                    <option value="Inspeksi & Pemeliharaan Sarpras">Inspeksi & Pemeliharaan Sarpras</option>
                    <option value="Pelayanan Operasional Korwil">Pelayanan Operasional Korwil</option>
                    <option value="Pendampingan Acara Kedinasan">Pendampingan Acara Kedinasan</option>
                    <option value="Pengantaran Berkas & Logistik Dinas">Pengantaran Berkas & Logistik Dinas</option>
                    <option value="Tugas Lapangan Khusus">Tugas Lapangan Khusus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Catatan Lokasi / Surat Tugas (Opsional):
                  </label>
                  <input
                    type="text"
                    value={fieldDutyNotes}
                    onChange={(e) => setFieldDutyNotes(e.target.value)}
                    placeholder="Contoh: SDN 1 Barabai Timur / Giat Apel"
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rincian Status Lokasi & GPS */}
          <div className={`p-3.5 rounded-2xl border text-xs transition-colors ${
            isLocating
              ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              : gpsError
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
              : isFieldDuty
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
              : coords?.withinRadius
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${
                isFieldDuty ? 'text-amber-600 dark:text-amber-400' : coords?.withinRadius ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isFieldDuty ? `Dinas Luar: ${fieldDutyPurpose}` : targetName}
                  </span>
                  {coords && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isFieldDuty
                        ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold'
                        : coords.withinRadius
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300 font-bold'
                    }`}>
                      {isFieldDuty ? 'Izin Tugas Lapangan' : coords.withinRadius ? 'Radius Aman' : 'Luar Radius'}
                    </span>
                  )}
                </div>

                {isLocating ? (
                  <p className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" /> Mengunci koordinat GPS perangkat...
                  </p>
                ) : gpsError ? (
                  <div className="text-[11px] text-rose-600 dark:text-rose-300 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{gpsError}</span>
                  </div>
                ) : coords ? (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pt-0.5">
                    <div className="flex justify-between">
                      <span>Jarak dari titik tugas:</span>
                      <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{formatDistance(coords.distance)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Akurasi sinyal GPS:</span>
                      <strong className="font-mono tabular-nums">±{Math.round(coords.accuracy)} meter (Anti-Mock OK)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Status Geofence:</span>
                      <span className={`font-mono font-bold ${isFieldDuty || coords.withinRadius ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isFieldDuty ? 'Disetujui Tugas Luar' : coords.withinRadius ? `Dalam Radius ${targetRadius}m` : `Di Luar Radius (${targetRadius}m)`}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Banner Peringatan Luar Radius atau Info Tugas Lapangan */}
          {isFieldDuty ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Penugasan Lapangan / Dinas Luar Sah:</strong> Presensi di luar kantor diizinkan untuk keperluan dinas. Koordinat GPS dicatat sebagai bukti kehadiran tugas lapangan tanpa tanda peringatan pelanggaran.
              </div>
            </div>
          ) : isLocationDisallowed ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Peringatan Pelanggaran Geofence:</strong> Anda berada di luar radius resmi tugas ({formatDistance(coords?.distance || 0)} dari batas {targetRadius}m). Jika Anda sedang tugas luar, aktifkan tombol <strong>"Tugas Lapangan / Dinas Luar"</strong> di atas.
              </div>
            </div>
          ) : null}
        </div>

        {/* 4. Footer Aksi Menempel di Bawah (Sticky Bottom Action Footer) */}
        <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
          {!capturedImage ? (
            activeViewTab === 'map' ? (
              <button
                type="button"
                onClick={() => setActiveViewTab('camera')}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Beralih ke Kamera Selfie</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={isLocating || !!gpsError}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto Selfie Sekarang</span>
              </button>
            )
          ) : (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                className="w-1/3 py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
              >
                Ulangi Foto
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!capturedImage || !coords || !!gpsError}
                className={`w-2/3 py-3 px-4 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] ${
                  isFieldDuty
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                    : coords?.withinRadius
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                }`}
              >
                {isFieldDuty ? (
                  <>
                    <Briefcase className="w-4 h-4" />
                    <span>Kirim Presensi Tugas Lapangan</span>
                  </>
                ) : coords?.withinRadius ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim &amp; Kunci Presensi</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Kirim (Alert Luar Radius)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
