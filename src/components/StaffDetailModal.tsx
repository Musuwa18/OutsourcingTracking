import React from 'react';
import {
  X,
  User,
  MapPin,
  Building2,
  Briefcase,
  UserCheck,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  FileText,
  Radio,
} from 'lucide-react';
import { UserAccount } from '../types';

export interface StaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  supervisorName?: string;
  onEditAssignment?: (user: UserAccount) => void;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  supervisorName,
  onEditAssignment,
}) => {
  if (!isOpen || !user) return null;

  const resolvedSupervisor = supervisorName || (user.supervisorId ? user.supervisorId : 'Belum Ditetapkan');
  const activeLocation = user.customLocation || user.assignedLocation;
  const locationName = activeLocation?.name || 'Kantor Disdik HST';
  const radiusMeters = activeLocation?.radiusMeters ?? 80;

  const deviceBindingModel =
    user.deviceBinding?.deviceModel ||
    user.deviceId ||
    'Bebas / Belum Terkunci';

  const isAccountActive = user.status === 'Aktif';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Profil */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-md ring-2 ring-slate-700/60"
              style={{ backgroundColor: user.avatarColor || '#6366f1' }}
            >
              {user.initials || user.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {user.name}
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                    user.role === 'admin'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      : user.role === 'supervisor'
                      ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                      : user.role === 'coordinator'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  {user.roleTitle || user.role}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-slate-500 font-sans text-[11px]">NIP / ID:</span>
                <span className="text-slate-200 font-semibold">{user.nip || '-'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Penugasan & Atasan Langsung */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Penugasan & Atasan Langsung
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                Sub Bagian / Divisi
              </span>
              <p className="font-semibold text-slate-200">
                {user.divisionName || 'Dinas Pendidikan HST'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                Formasi / Pekerjaan Baku
              </span>
              <p className="font-semibold text-slate-200">
                {user.roleTitle || 'Tenaga Outsourcing'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 sm:col-span-2">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                Titik Tugas & Lokasi Bekerja
              </span>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-semibold text-slate-100">
                  {locationName}
                </p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-mono text-[10px]">
                  <Radio className="w-3 h-3" />
                  ±{radiusMeters} meter
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 sm:col-span-2">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-indigo-400" />
                Atasan Langsung (Penilai KPI)
              </span>
              <p className={`font-semibold ${resolvedSupervisor === 'Belum Ditetapkan' ? 'text-amber-400 italic' : 'text-indigo-300 font-bold'}`}>
                {resolvedSupervisor}
              </p>
            </div>

            {user.workspaceNote && (
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/50 sm:col-span-2">
                <span className="text-[11px] text-indigo-300 block mb-1 flex items-center gap-1 font-medium">
                  <FileText className="w-3 h-3 text-indigo-400" />
                  Catatan Ruang Kerja / Penugasan Khusus
                </span>
                <p className="text-slate-300 italic text-[11px]">
                  &ldquo;{user.workspaceNote}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Kontak & Kredensial */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Kontak & Kredensial
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" />
                Email Aktif
              </span>
              <p className="font-semibold text-slate-200 truncate" title={user.email}>
                {user.email || '-'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                Nomor WhatsApp / HP
              </span>
              <p className="font-semibold text-slate-200">
                {user.phone || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Kemitraan & Perangkat */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            Kemitraan & Perangkat
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                Mitra Vendor / Kelompok
              </span>
              <p className="font-semibold text-slate-200">
                {user.vendorName || '-'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isAccountActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                Status Akun
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAccountActive ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span>{user.status || 'Aktif'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 sm:col-span-2">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-indigo-400" />
                Kunci Perangkat / Device Binding ID
              </span>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-mono text-slate-200 text-xs">
                  {deviceBindingModel}
                </p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    user.deviceBinding?.registered
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      : 'bg-slate-700/70 text-slate-300'
                  }`}
                >
                  {user.deviceBinding?.registered ? 'Terkunci Resmi' : 'Belum Binding'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {onEditAssignment && (
            <button
              type="button"
              onClick={() => onEditAssignment(user)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Edit Penugasan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
