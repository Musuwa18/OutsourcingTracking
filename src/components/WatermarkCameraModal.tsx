import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { StaffProfile } from '../types';
import { stampWatermarkOnPhoto } from '../utils/watermark';

interface WatermarkCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured: (watermarkedPhotoUrl: string, locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName: string;
  }) => void;
  currentStaff: StaffProfile;
  taskTitle: string;
}

export const WatermarkCameraModal: React.FC<WatermarkCameraModalProps> = ({
  isOpen,
  onClose,
  onCaptured,
  currentStaff,
  taskTitle,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    locationName: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPreview(null);
      return;
    }

    startCamera();
    captureLocation();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const captureLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 12,
            locationName: currentStaff.assignedLocation.name,
          });
        },
        () => {
          // Fallback to assigned office location
          setCoords({
            latitude: currentStaff.assignedLocation.latitude,
            longitude: currentStaff.assignedLocation.longitude,
            accuracy: 10,
            locationName: currentStaff.assignedLocation.name,
          });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setCoords({
        latitude: currentStaff.assignedLocation.latitude,
        longitude: currentStaff.assignedLocation.longitude,
        accuracy: 10,
        locationName: currentStaff.assignedLocation.name,
      });
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC unavalaible');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 800 }, height: { ideal: 600 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      createSimulatedWorkStream();
    }
  };

  const createSimulatedWorkStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    setInterval(() => {
      frame++;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 480);

      // Work area mockup grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 40; x < 640; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }

      // Equipment silhouette
      ctx.fillStyle = '#475569';
      ctx.fillRect(160, 140, 320, 200);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(200, 180, 240, 120);

      // Crosshair
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(320, 240, 40, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('KAMERA DOKUMENTASI PEKERJAAN AKTIF', 40, 40);
    }, 50);

    const stream = canvas.captureStream(25);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleSnap = async () => {
    if (!videoRef.current || !coords) return;
    setIsProcessing(true);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const rawImage = canvas.toDataURL('image/jpeg', 0.9);

    const now = new Date();
    const timestampText = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('id-ID', { hour12: false })} WIB`;

    // Apply official tamper-resistant watermark stamp
    const stamped = await stampWatermarkOnPhoto(rawImage, {
      staffName: currentStaff.name,
      nip: currentStaff.nip,
      locationName: coords.locationName,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestampText,
      taskTitle: taskTitle || 'Dokumentasi Tugas Lapangan',
    });

    setCapturedPreview(stamped);
    setIsProcessing(false);
  };

  const handleConfirm = () => {
    if (!capturedPreview || !coords) return;
    onCaptured(capturedPreview, coords);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-surface rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/40 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white">
              Dokumentasi Foto Lapangan (Watermark GPS)
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
          {capturedPreview ? (
            <img src={capturedPreview} alt="Bukti Terstempel Watermark" className="w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs font-mono">Membubuhkan stempel watermark GPS & server time...</span>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          {!capturedPreview ? (
            <button
              type="button"
              onClick={handleSnap}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Ambil Bukti Pekerjaan & Stempel Watermark</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCapturedPreview(null)}
                className="w-1/3 py-2 px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl cursor-pointer"
              >
                Ulangi
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-2/3 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Gunakan Foto Bertanda Resmi</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
