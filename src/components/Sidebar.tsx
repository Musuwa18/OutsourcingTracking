import React from 'react';
import {
  Users,
  CalendarCheck2,
  FileCheck2,
  Star,
  BarChart3,
  ShieldAlert,
  Settings,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentRole: UserRole;
  pendingReportsCount: number;
  geofenceBreachCount?: number;
  glassMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  currentRole,
  pendingReportsCount,
  geofenceBreachCount = 0,
  glassMode = true,
}) => {
  const adminNavItems = [
    {
      id: 'monitoring-presensi',
      label: 'Monitoring Presensi',
      icon: CalendarCheck2,
      badge: geofenceBreachCount > 0 ? `${geofenceBreachCount} Alert` : null,
      isAlertBadge: geofenceBreachCount > 0,
    },
    {
      id: 'persetujuan-laporan',
      label: 'Feed & Verifikasi Laporan',
      icon: FileCheck2,
      badge: pendingReportsCount > 0 ? `${pendingReportsCount}` : null,
      isAlertBadge: false,
    },
    {
      id: 'evaluasi-mingguan',
      label: 'Evaluasi Mingguan (Jumat)',
      icon: Star,
      badge: '4 Pilar',
      isAlertBadge: false,
    },
    {
      id: 'analitik-bulanan',
      label: 'Analitik & Rekap KPI',
      icon: BarChart3,
      badge: null,
      isAlertBadge: false,
    },
    {
      id: 'audit-log',
      label: 'Log Aktivitas Sistem',
      icon: ShieldAlert,
      badge: null,
      isAlertBadge: false,
    },
    {
      id: 'pengaturan-keamanan',
      label: 'Pusat Pengaturan Sistem',
      icon: Settings,
      badge: 'Admin',
      isAlertBadge: false,
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col w-64 shrink-0 h-[calc(100vh-3.75rem)] sticky top-15 overflow-y-auto z-10 transition-all ${
        glassMode
          ? 'glass-surface border-r border-white/40 dark:border-white/10 shadow-sm'
          : 'border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      <div className="p-4 space-y-6">
        
        {/* Navigation Group */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            {currentRole === 'admin' ? 'Konsol Administrasi' : 'Menu Supervisi'}
          </div>
          <nav className="space-y-1.5">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 border border-white/25 active:scale-[0.99]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono flex items-center gap-1 ${
                        item.isAlertBadge
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold animate-pulse'
                          : isActive
                          ? 'bg-white/20 text-white font-bold'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      }`}
                    >
                      {item.isAlertBadge && <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" />}
                      <span>{item.badge}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Info Card / Friday reminder */}
        <div className="p-3.5 rounded-2xl glass-card text-xs space-y-2 border border-white/50 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Siklus Evaluasi Jumat</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Form penilaian 11 kompetensi terbuka setiap hari Jumat untuk rekapitulasi performa mingguan seluruh staf alih daya.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto p-4 border-t border-white/30 dark:border-white/10 text-[11px] text-slate-400 dark:text-slate-500">
        <div className="font-medium text-slate-600 dark:text-slate-300">OutsourceTrack v2.4</div>
        <div className="text-[10px] text-slate-400">Material Glass UI · Geofence & WebRTC</div>
      </div>
    </aside>
  );
};
