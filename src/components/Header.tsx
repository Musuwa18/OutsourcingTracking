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
  Download,
} from 'lucide-react';
import { UserRole, NotificationItem, AuthUser } from '../types';
import { usePwa } from '../context/PwaContext';

interface HeaderProps {
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenProfile?: () => void;
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
  onOpenAiChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUser,
  onLogout,
  onOpenProfile,
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
  onOpenAiChat,
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const { isInstallable, isInstalled, promptInstall } = usePwa();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleLabels: Record<UserRole, { title: string; subtitle: string; badge: string }> = {
    outsourcing: {
      title: currentUser?.name || 'Tenaga Alih Daya',
      subtitle: currentUser?.roleTitle || 'Tenaga Outsourcing Disdik HST',
      badge: 'Staf Lapangan',
    },
    supervisor: {
      title: currentUser?.name || 'Pejabat Penilai',
      subtitle: currentUser?.roleTitle || 'Atasan / Supervisor Operasional',
      badge: 'Supervisor',
    },
    admin: {
      title: currentUser?.name || 'Admin Sistem Disdik HST',
      subtitle: currentUser?.roleTitle || 'Super Administrator TI',
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
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 border border-white/30 shrink-0">
            OT
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                <span className="sm:hidden font-extrabold text-xs">OutsourceTrack</span>
                <span className="hidden sm:inline">OutsourceTrack & KPI Pro</span>
              </span>
              {glassMode && (
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  Glass
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight hidden sm:inline truncate">
              Sistem Kehadiran & Evaluasi Kinerja (Material Glass)
            </span>
          </div>
        </div>

        {/* Center / Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          
          {/* PWA Install Button in Header */}
          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={promptInstall}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer shadow-2xs"
              title="Pasang Aplikasi OutsourceTrack di Perangkat (PWA)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
              <span>Install App</span>
            </button>
          )}

          {/* Authenticated User Profile Chip (Clickable for Profile & Password) */}
          <button
            type="button"
            onClick={onOpenProfile}
            title="Klik untuk membuka Pengaturan Profil & Ganti Kata Sandi"
            className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-xs rounded-xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md shadow-2xs transition-all cursor-pointer text-left group shrink-0"
          >
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: currentUser?.avatarColor || '#4f46e5' }}
            >
              {currentUser?.initials || 'OT'}
            </span>
            <div className="text-left hidden md:block">
              <div className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                {currentUser?.name || currentRoleInfo.title}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {currentUser?.divisionName || currentRoleInfo.badge}
              </div>
            </div>
            <span className="hidden xs:inline md:hidden font-semibold text-slate-800 dark:text-slate-200 text-xs max-w-[65px] truncate">
              {currentUser?.name.split(' ')[0] || currentRoleInfo.badge}
            </span>
          </button>

          {/* Dedicated Logout Button (Desktop/Tablet sm:flex, di HP dialihkan ke menu titik tiga) */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Keluar dari Akun (Logout)"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Keluar</span>
            </button>
          )}

          {/* Gemini AI Analytics Chat Trigger Button (Desktop/Tablet sm:flex, di HP ada di menu titik tiga) */}
          {onOpenAiChat && (
            <button
              type="button"
              onClick={onOpenAiChat}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs shrink-0"
              title="Tanyakan Analisis Data Kinerja & Presensi ke Gemini AI"
              aria-label="Buka AI Analytics Chat"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span className="text-[11px] font-medium hidden xs:inline">AI Chat</span>
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
            className="p-1.5 sm:p-2 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Ganti Mode Gelap / Terang"
            aria-label="Toggle Tema Gelap"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Notification Button (Always Visible) */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-1.5 sm:p-2 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Notifikasi Sistem"
            aria-label="Buka Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Mobile More Options Dropdown Button (sm:hidden) */}
          <div className="relative sm:hidden shrink-0">
            <button
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
              title="Menu Pengaturan Cepat"
              aria-label="Buka Menu Lainnya"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-dock rounded-2xl shadow-2xl border border-white/60 dark:border-white/10 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Menu Tambahan</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                    {currentRoleInfo.badge}
                  </span>
                </div>

                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfile();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-white/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                  >
                    <User className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Profil & Ganti Kata Sandi</span>
                  </button>
                )}

                {onOpenAiChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAiChat();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-white/70 dark:hover:bg-white/10 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 cursor-pointer font-medium"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Gemini AI Analytics</span>
                  </button>
                )}

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

                {/* Tombol Logout Khusus HP */}
                {onLogout && (
                  <>
                    <div className="border-t border-slate-200/80 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer font-bold transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Keluar Akun (Logout)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
