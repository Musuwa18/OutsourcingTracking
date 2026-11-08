import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  Sparkles,
  LogOut,
  Download,
  HelpCircle,
  Phone,
  X,
} from 'lucide-react';
import { UserRole, NotificationItem, AuthUser, HelpDeskConfig, DEFAULT_HELPDESK_CONFIG } from '../types';
import { usePwa } from '../context/PwaContext';
interface HeaderProps {
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  helpDeskConfig?: HelpDeskConfig;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onRoleChange: (role: UserRole) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  glassMode?: boolean;
  onToggleGlassMode?: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  onOpenCloudSync?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenAiChat?: () => void;
  institutionName?: string;
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
  helpDeskConfig,
  institutionName,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
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

  const roleLabels: Record<UserRole, { title: string; subtitle: string; badge: string; badgeColor: string }> = {
    outsourcing: {
      title: currentUser?.name || 'Tenaga Alih Daya',
      subtitle: currentUser?.roleTitle || 'Tenaga Outsourcing Disdik HST',
      badge: 'Staf Lapangan',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50',
    },
    coordinator: {
      title: currentUser?.name || 'Pengawas Lapangan',
      subtitle: `Pengawas Lapangan · ${currentUser?.vendorName || 'Vendor Disdik'}`,
      badge: 'Pengawas Lapangan',
      badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60',
    },
    supervisor: {
      title: currentUser?.name || 'Pejabat Penilai',
      subtitle: currentUser?.roleTitle || 'Atasan / Supervisor Operasional',
      badge: 'Supervisor',
      badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50',
    },
    admin: {
      title: currentUser?.name || 'Admin Sistem Disdik HST',
      subtitle: currentUser?.roleTitle || 'Super Administrator TI',
      badge: 'Administrator',
      badgeColor: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50',
    },
  };
  const currentRoleInfo = roleLabels[currentRole];

  return (
    <>
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
              {institutionName || 'Dinas Pendidikan Kab. Hulu Sungai Tengah'}
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
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${currentRoleInfo.badgeColor}`}>
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
                      setHelpModalOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer font-medium transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Pusat Bantuan & Kontak Admin</span>
                  </button>

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
      {/* Help & IT Support Modal */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-cyan-400 shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).subTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Kontak Admin / Helpdesk Resmi</span>
                </div>
                <div className="space-y-1.5 pl-5.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">WhatsApp Helpdesk:</span>{' '}
                    <a
                      href={`https://wa.me/${((helpDeskConfig || DEFAULT_HELPDESK_CONFIG).whatsapp || '62811518515').replace(/\D/g, '').replace(/^0/, '62')}?text=Halo%20Admin%20IT%20Disdik%20HST,%20saya%20membutuhkan%20bantuan%20terkait%20aplikasi%20OutsourceTrack`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-indigo-600 dark:text-cyan-400 hover:underline font-bold"
                    >
                      {(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).whatsapp} (Chat WhatsApp)
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Email Resmi:</span>{' '}
                    <span className="font-mono text-slate-700 dark:text-slate-300">{(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).email}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Alamat Kantor:</span>{' '}
                    <span>{(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).address}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <div className="font-bold text-indigo-950 dark:text-indigo-200">
                  Panduan Cepat Kendala Presensi & Laporan
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4 leading-relaxed">
                  <li><strong>Kendala Geofence:</strong> {(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).guideGeofence}</li>
                  <li><strong>Kendala Kamera WebRTC:</strong> {(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).guideCamera}</li>
                  <li><strong>Lupa Sandi / Masalah Akun:</strong> {(helpDeskConfig || DEFAULT_HELPDESK_CONFIG).guideAccount}</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Tutup Pusat Bantuan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
