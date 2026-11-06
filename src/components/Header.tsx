import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Cloud,
  ChevronDown,
  User,
  Eye,
  Lock,
  Sparkles,
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { isInstallable, isInstalled, promptInstall } = usePwa();
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle click outside to close user profile popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

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
          ? 'glass-surface border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 border border-white/30 shrink-0">
            OT
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              <span className="sm:hidden font-extrabold text-xs">OutsourceTrack</span>
              <span className="hidden sm:inline">OutsourceTrack & KPI Pro</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight hidden sm:inline truncate font-medium">
              Dinas Pendidikan Kab. Hulu Sungai Tengah
            </span>
          </div>
        </div>

        {/* Streamlined Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Quick AI Analytics Chat Button */}
          {onOpenAiChat && (
            <button
              type="button"
              onClick={onOpenAiChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs shrink-0"
              title="Tanyakan Analisis Data Kinerja & Presensi ke AI"
              aria-label="Buka AI Analytics"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline text-xs font-medium">AI Analytics</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Ganti Mode Gelap / Terang"
            aria-label="Toggle Tema Gelap"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Notification Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Notifikasi Sistem"
            aria-label="Buka Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Unified User Profile & Quick Settings Menu Popover */}
          <div className="relative shrink-0" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-all cursor-pointer text-left group shrink-0"
              title="Menu Profil & Utilitas Pengguna"
              aria-expanded={profileMenuOpen}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: currentUser?.avatarColor || '#4f46e5' }}
              >
                {currentUser?.initials || 'AD'}
              </span>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[140px]">
                  {currentUser?.name || currentRoleInfo.title}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {currentUser?.divisionName || currentRoleInfo.badge}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                {/* Profile info card */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: currentUser?.avatarColor || '#4f46e5' }}
                    >
                      {currentUser?.initials || 'AD'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {currentUser?.name || currentRoleInfo.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {currentUser?.nip ? `NIP: ${currentUser.nip}` : currentUser?.roleTitle || currentRoleInfo.badge}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      {currentUser?.divisionName || 'Dinas Pendidikan Kab. HST'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold shrink-0">
                      {currentRoleInfo.badge}
                    </span>
                  </div>
                </div>

                {/* Utility Menu Items */}
                <div className="pt-1 space-y-0.5">
                  {onOpenProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer font-medium transition-colors"
                    >
                      <User className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Pengaturan Profil & Sandi</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onOpenSecurityModal();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer font-medium transition-colors"
                  >
                    <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Keamanan Akun & MFA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onOpenCloudSync();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer font-medium transition-colors"
                  >
                    <Cloud className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Sinkronisasi Cloud Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleHighContrast();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Mode Kontras Tinggi</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${highContrast ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {highContrast ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {onToggleGlassMode && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleGlassMode();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                        <span>Mode Material Glass</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${glassMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {glassMode ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  )}

                  {isInstallable && !isInstalled && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        promptInstall();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-cyan-400 cursor-pointer font-medium transition-colors"
                    >
                      <Download className="w-4 h-4 text-indigo-600 dark:text-cyan-400 shrink-0" />
                      <span>Pasang Aplikasi (PWA)</span>
                    </button>
                  )}
                </div>

                {onLogout && (
                  <>
                    <div className="border-t border-slate-200/80 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer font-semibold transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Keluar (Logout)</span>
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
