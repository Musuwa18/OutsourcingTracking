import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Cloud,
  ShieldCheck,
  ChevronDown,
  User,
  Users,
  Eye,
  Lock,
  Sparkles,
} from 'lucide-react';
import { UserRole, NotificationItem } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  glassMode?: boolean;
  onToggleGlassMode?: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  onOpenCloudSync: () => void;
  onOpenSecurityModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  darkMode,
  onToggleDarkMode,
  highContrast,
  onToggleHighContrast,
  glassMode = true,
  onToggleGlassMode,
  notifications,
  onOpenNotifications,
  onOpenCloudSync,
  onOpenSecurityModal,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleLabels: Record<UserRole, { title: string; subtitle: string; badge: string }> = {
    outsourcing: {
      title: 'Budi Santoso',
      subtitle: 'Tenaga Outsourcing (IT Support)',
      badge: 'Staf Lapangan',
    },
    supervisor: {
      title: 'Hendra Wijaya, S.T.',
      subtitle: 'Atasan / Supervisor Operasional',
      badge: 'Supervisor',
    },
    admin: {
      title: 'Dian Paramita, S.Kom.',
      subtitle: 'Admin Utama & HR Governance',
      badge: 'Administrator',
    },
  };

  const currentRoleInfo = roleLabels[currentRole];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        glassMode
          ? 'glass-surface border-b border-white/50 dark:border-white/10 shadow-xs'
          : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 border border-white/30 shrink-0">
            OT
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                OutsourceTrack & KPI Pro
              </span>
              {glassMode && (
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Glass
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight hidden sm:inline">
              Sistem Kehadiran & Evaluasi Kinerja (Material Glass)
            </span>
          </div>
        </div>

        {/* Center / Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Quick Role Switcher Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-800 backdrop-blur-md transition-all cursor-pointer shadow-xs"
              aria-label="Pilih Peran Pengguna"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <div className="text-left hidden md:block">
                <div className="font-semibold text-slate-800 dark:text-slate-200 leading-none">
                  {currentRoleInfo.title}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentRoleInfo.badge}
                </div>
              </div>
              <span className="md:hidden font-medium text-slate-700 dark:text-slate-300">
                {currentRoleInfo.badge}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 glass-dock rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Ganti Akun & Hak Akses
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onRoleChange('outsourcing');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                    currentRole === 'outsourcing'
                      ? 'bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-900 dark:text-indigo-200 font-semibold border border-indigo-500/20'
                      : 'hover:bg-white/40 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <User className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <div>Budi Santoso</div>
                    <div className="text-[10px] text-slate-400 font-normal">Tenaga Outsourcing (Mobile View)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRoleChange('supervisor');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                    currentRole === 'supervisor'
                      ? 'bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-900 dark:text-indigo-200 font-semibold border border-indigo-500/20'
                      : 'hover:bg-white/40 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div>Hendra Wijaya, S.T.</div>
                    <div className="text-[10px] text-slate-400 font-normal">Atasan / Supervisor Operasional</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRoleChange('admin');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                    currentRole === 'admin'
                      ? 'bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-900 dark:text-indigo-200 font-semibold border border-indigo-500/20'
                      : 'hover:bg-white/40 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div>Dian Paramita, S.Kom.</div>
                    <div className="text-[10px] text-slate-400 font-normal">Admin Utama & HR Governance</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Material Glass Aesthetic Toggle Button */}
          {onToggleGlassMode && (
            <button
              type="button"
              onClick={onToggleGlassMode}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                glassMode
                  ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 text-indigo-700 dark:text-cyan-300 border border-indigo-400/35 dark:border-cyan-400/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Aktifkan / Nonaktifkan Tampilan Material Glass & Ambient Glow"
              aria-label="Toggle Tampilan Material Glass"
            >
              <Sparkles className={`w-3.5 h-3.5 ${glassMode ? 'text-indigo-500 dark:text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden lg:inline text-[11px]">Material Glass</span>
            </button>
          )}

          {/* Cloud Sync Button */}
          <button
            type="button"
            onClick={onOpenCloudSync}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            title="Sinkronisasi Google Drive Cloud"
            aria-label="Google Drive Cloud Sync"
          >
            <Cloud className="w-4 h-4" />
          </button>

          {/* Security & MFA Settings Modal Trigger */}
          <button
            type="button"
            onClick={onOpenSecurityModal}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            title="Autentikasi Google & Pengaturan Keamanan MFA"
            aria-label="Pengaturan Keamanan dan MFA"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Accessibility High Contrast Mode */}
          <button
            type="button"
            onClick={onToggleHighContrast}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              highContrast
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
            title="Mode Kontras Tinggi (Aksesibilitas)"
            aria-label="Toggle Mode Kontras Tinggi"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            title="Ganti Mode Gelap / Terang"
            aria-label="Toggle Tema Gelap"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notification Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            title="Notifikasi Sistem"
            aria-label="Buka Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
