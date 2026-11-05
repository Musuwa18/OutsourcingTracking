import React, { useState, useEffect } from 'react';
import {
  MapPin,
  X,
  Check,
  Building,
  Navigation,
  Shield,
  FileText,
  AlertCircle
} from 'lucide-react';
import { OfficeLocation, StaffProfile } from '../types';
import { PRIMARY_OFFICES } from '../utils/geo';
import { apiUpdateStaffLocation } from '../services/api';

interface CustomLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffProfile | null;
  onLocationUpdated: (staffId: string, newLocation: OfficeLocation, note?: string) => void;
  onShowToast: (message: string, type: 'success' | 'warning' | 'info') => void;
}

export const CustomLocationModal: React.FC<CustomLocationModalProps> = ({
  isOpen,
  onClose,
  staff,
  onLocationUpdated,
  onShowToast,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('loc-disdik-hst');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [customLat, setCustomLat] = useState<number>(-2.5911226);
  const [customLng, setCustomLng] = useState<number>(115.3735289);
  const [customRadius, setCustomRadius] = useState<number>(100);
  const [workspaceNote, setWorkspaceNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (staff) {
      setWorkspaceNote(staff.workspaceNote || '');
      const assigned = staff.assignedLocation || PRIMARY_OFFICES[0];
      const match = PRIMARY_OFFICES.find((o) => o.id === assigned.id);
      if (match) {
        setSelectedPresetId(match.id);
        setIsCustomMode(false);
      } else {
        setIsCustomMode(true);
        setCustomName(assigned.name || 'Lokasi Khusus');
        setCustomAddress(assigned.address || '');
        setCustomLat(typeof assigned.latitude === 'number' ? assigned.latitude : PRIMARY_OFFICES[0].latitude);
        setCustomLng(typeof assigned.longitude === 'number' ? assigned.longitude : PRIMARY_OFFICES[0].longitude);
        setCustomRadius(assigned.radiusMeters || 100);
      }
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let locationToSave: OfficeLocation;
    if (isCustomMode) {
      if (!customName.trim()) {
        onShowToast('Nama lokasi atau ruang kerja khusus wajib diisi.', 'warning');
        setIsSubmitting(false);
        return;
      }
      locationToSave = {
        id: `loc-custom-${Date.now()}`,
        name: customName.trim(),
        address: customAddress.trim() || 'Kabupaten Hulu Sungai Tengah',
        latitude: Number(customLat),
        longitude: Number(customLng),
        radiusMeters: Number(customRadius) || 100,
      };
    } else {
      const selected = PRIMARY_OFFICES.find((o) => o.id === selectedPresetId) || PRIMARY_OFFICES[0];
      locationToSave = selected;
    }

    try {
      await apiUpdateStaffLocation(staff.id, locationToSave, workspaceNote.trim());
      onLocationUpdated(staff.id, locationToSave, workspaceNote.trim());
      onShowToast(`Lokasi penugasan untuk ${staff.name} berhasil diperbarui.`, 'success');
      onClose();
    } catch (err: any) {
      onShowToast(err?.message || 'Gagal menyimpan perubahan lokasi.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                Setting Ruang Kerja & Titik Geofence
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur lokasi tugas resmi untuk: <strong className="text-slate-800 dark:text-slate-200">{staff.name}</strong> ({staff.nip})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                !isCustomMode
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Pilih Kantor / Unit Resmi HST</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                isCustomMode
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Koordinat Khusus / Lapangan</span>
            </button>
          </div>

          {!isCustomMode ? (
            <div className="space-y-2.5">
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                Pilih Titik Penugasan Resmi Disdik HST:
              </label>
              <div className="space-y-2">
                {PRIMARY_OFFICES.map((office) => {
                  const isSelected = selectedPresetId === office.id;
                  return (
                    <div
                      key={office.id}
                      onClick={() => setSelectedPresetId(office.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-700'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {office.name}
                          </span>
                          {office.id === 'loc-disdik-hst' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                              Kantor Induk
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-1">
                          {office.address}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                          <span>GPS: {office.latitude.toFixed(5)}, {office.longitude.toFixed(5)}</span>
                          <span>Radius: ±{office.radiusMeters} meter</span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Titik Lokasi / Fasilitas Khusus:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Misal: Sanggar Kegiatan Belajar (SKB) Murakata / Gedung Kesenian"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap:
                </label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="Jl. Murakata No. 12, Barabai, HST"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Latitude (Lintang):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                    className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Longitude (Bujur):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLng}
                    onChange={(e) => setCustomLng(parseFloat(e.target.value) || 0)}
                    className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Radius Toleransi (m):
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={500}
                    value={customRadius}
                    onChange={(e) => setCustomRadius(parseInt(e.target.value, 10) || 100)}
                    className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Catatan Ruang Kerja */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Catatan Ruang Kerja / Penugasan Khusus:
            </label>
            <input
              type="text"
              value={workspaceNote}
              onChange={(e) => setWorkspaceNote(e.target.value)}
              placeholder="Contoh: Gedung Induk Lantai 2 / Ruang Server TI / Pos Jaga Belakang"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Catatan ini akan otomatis muncul pada kartu identitas presensi dan stempel watermark laporan foto kerja staf.
            </p>
          </div>

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition-colors flex items-center gap-2"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan Lokasi'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
