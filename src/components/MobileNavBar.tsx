import React from 'react';
import { Home, ClipboardList, Clock, UserCheck } from 'lucide-react';

interface MobileNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  glassMode?: boolean;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onTabChange,
  glassMode = true,
}) => {
  const tabs = [
    { id: 'beranda', label: 'Presensi', icon: Home },
    { id: 'laporan', label: 'Laporan', icon: ClipboardList },
    { id: 'riwayat', label: 'Riwayat', icon: Clock },
    { id: 'profil', label: 'Akun & Tugas', icon: UserCheck },
  ];

  return (
    <nav
      className={`md:hidden fixed bottom-3 left-4 right-4 z-40 max-w-md mx-auto rounded-2xl transition-all shadow-xl ${
        glassMode
          ? 'glass-dock border border-white/60 dark:border-white/15'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800'
      }`}
      aria-label="Navigasi Bawah Seluler"
    >
      <div className="grid grid-cols-4 items-center h-15 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all cursor-pointer rounded-xl ${
                isActive
                  ? 'text-indigo-700 dark:text-cyan-400 font-bold'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 drop-shadow-sm' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400 shadow-sm shadow-indigo-500/50" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
