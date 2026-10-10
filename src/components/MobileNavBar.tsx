import React from 'react';
import {
  Home,
  ClipboardList,
  Clock,
  UserCheck,
  CalendarCheck2,
  FileCheck2,
  Star,
  BarChart3,
  Settings,
} from 'lucide-react';
import { UserRole } from '../types';

interface MobileNavBarProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingReportsCount?: number;
  geofenceBreachCount?: number;
  glassMode?: boolean;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentRole,
  activeTab,
  onTabChange,
  pendingReportsCount = 0,
  geofenceBreachCount = 0,
  glassMode = true,
}) => {
  // Adaptive tabs based on active role
  const getTabs = () => {
    if (currentRole === 'outsourcing') {
      return [
        { id: 'beranda', label: 'Presensi', icon: Home, badge: null, isAlert: false },
        { id: 'laporan', label: 'Laporan', icon: ClipboardList, badge: null, isAlert: false },
        { id: 'riwayat', label: 'Riwayat', icon: Clock, badge: null, isAlert: false },
        { id: 'profil', label: 'Profil', icon: UserCheck, badge: null, isAlert: false },
      ];
    }

    if (currentRole === 'supervisor') {
      return [
        {
          id: 'monitoring-presensi',
          label: 'Presensi',
          icon: CalendarCheck2,
          badge: geofenceBreachCount > 0 ? `${geofenceBreachCount}` : null,
          isAlert: true,
        },
        {
          id: 'persetujuan-laporan',
          label: 'Verifikasi',
          icon: FileCheck2,
          badge: pendingReportsCount > 0 ? `${pendingReportsCount}` : null,
          isAlert: false,
        },
        {
          id: 'evaluasi-mingguan',
          label: 'Evaluasi',
          icon: Star,
          badge: '4P',
          isAlert: false,
        },
        {
          id: 'analitik-bulanan',
          label: 'Rekap KPI',
          icon: BarChart3,
          badge: null,
          isAlert: false,
        },
      ];
    }

    // Admin Role (5 tabs)
    return [
      {
        id: 'monitoring-presensi',
        label: 'Presensi',
        icon: CalendarCheck2,
        badge: geofenceBreachCount > 0 ? `${geofenceBreachCount}` : null,
        isAlert: true,
      },
      {
        id: 'persetujuan-laporan',
        label: 'Laporan',
        icon: FileCheck2,
        badge: pendingReportsCount > 0 ? `${pendingReportsCount}` : null,
        isAlert: false,
      },
      {
        id: 'evaluasi-mingguan',
        label: 'Evaluasi',
        icon: Star,
        badge: null,
        isAlert: false,
      },
      {
        id: 'analitik-bulanan',
        label: 'Analitik',
        icon: BarChart3,
        badge: null,
        isAlert: false,
      },
      {
        id: 'pengaturan-keamanan',
        label: 'Sistem',
        icon: Settings,
        badge: null,
        isAlert: false,
      },
    ];
  };

  const tabs = getTabs();
  const gridColsClass = tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <nav
      className={`md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-lg mx-auto rounded-2xl transition-all shadow-2xl ${
        glassMode
          ? 'glass-dock border border-white/70 dark:border-white/15'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800'
      }`}
      aria-label="Navigasi Bawah Seluler"
    >
      <div className={`grid ${gridColsClass} items-center h-15 px-1 sm:px-2`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all cursor-pointer rounded-xl relative ${
                isActive
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 drop-shadow-sm' : ''
                  }`}
                />
                
                {/* Badge indicator */}
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2 px-1 py-0.2 min-w-3.5 text-[9px] font-extrabold rounded-full text-white text-center leading-tight shadow-xs ${
                      tab.isAlert ? 'bg-rose-500 animate-pulse' : 'bg-indigo-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Active neon dot */}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400 shadow-sm shadow-indigo-500/50" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
