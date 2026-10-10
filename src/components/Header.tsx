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
  MoreVertical,
  LogOut,
} from 'lucide-react';
import { UserRole, NotificationItem, AuthUser } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
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
  currentUser,
  onLogout,
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

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
          
          {/* Authenticated User Profile Chip */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs rounded-xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-2xs">
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-2xs shrink-0"
              style={{ backgroundColor: currentUser?.avatarColor || '#4f46e5' }}
            >
              {currentUser?.initials || 'OT'}
            </span>
            <div className="text-left hidden md:block">
              <div className="font-bold text-slate-900 dark:text-white leading-tight">
                {currentUser?.name || currentRoleInfo.title}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {currentUser?.divisionName || currentRoleInfo.badge}
              </div>
            </div>
            <span className="md:hidden font-semibold text-slate-800 dark:text-slate-200">
              {currentUser?.name.split(' ')[0] || currentRoleInfo.badge}
            </span>
          </div>

          {/* Dedicated Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Keluar dari Akun (Logout)"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}

          {/* Desktop-only secondary utility buttons */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
            {/* Material Glass Aesthetic Toggle Button */}
            {onToggleGlassMode && (
              <button
                type="button"
                onClick={onToggleGlassMode}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  glassMode
                    ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 text-indigo-700 dark:text-cyan-300 border border-indigo-400/35 dark:border-cyan-400/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60'
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
          </div>

          {/* Dark Mode Toggle (Always Visible) */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
            title="Ganti Mode Gelap / Terang"
            aria-label="Toggle Tema Gelap"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Notification Button (Always Visible) */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
            title="Notifikasi Sistem"
            aria-label="Buka Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Mobile More Options Dropdown Button (sm:hidden) */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
              title="Menu Pengaturan Cepat"
              aria-label="Buka Menu Lainnya"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-dock rounded-2xl shadow-2xl border border-white/60 dark:border-white/10 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Pengaturan Cepat
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onOpenCloudSync();
                    setMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-white/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                >
                  <Cloud className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Google Drive Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSecurityModal();
                    setMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-white/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                >
                  <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Keamanan & MFA</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleHighContrast();
                    setMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-white/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Kontras Tinggi</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${highContrast ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {highContrast ? 'ON' : 'OFF'}
                  </span>
                </button>

                {onToggleGlassMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleGlassMode();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-white/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Material Glass</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${glassMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                      {glassMode ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
