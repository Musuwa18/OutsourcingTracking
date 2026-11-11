import React from 'react';
import { X, Bell, CheckCircle2, Clock, Star, ShieldAlert, AlertTriangle, MapPin, User, Building2 } from 'lucide-react';
import { NotificationItem, UserRole } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  userRole?: UserRole;
  currentUserId?: string;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSimulatePushNotification: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  userRole,
  currentUserId,
  onMarkAsRead,
  onMarkAllAsRead,
  onSimulatePushNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'geofence_alert':
        return <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />;
      case 'approval':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'attendance':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'evaluation':
        return <Star className="w-4 h-4 text-indigo-500" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-blue-500" />;
    }
  };

  // Helper agar Admin/Supervisor melihat nama staf di isi pesan (bukan 'Clock In Anda')
  const formatNotificationMessage = (item: NotificationItem) => {
    const isManager = userRole === 'admin' || userRole === 'supervisor';
    const isSelf = currentUserId && (item.userId === currentUserId || item.staffId === currentUserId);

    if (isManager && !isSelf) {
      const displayName = item.staffName || 'Staf';
      if (item.message.includes('Clock In Anda')) {
        return item.message.replace('Clock In Anda', `${displayName} Clock In`);
      }
      if (item.message.includes('Clock Out tercatat')) {
        return item.message.replace('Clock Out tercatat', `${displayName} Clock Out tercatat`);
      }
    }
    return item.message;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-surface h-full shadow-2xl border-l border-white/40 dark:border-white/10 flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-white/40 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pusat Notifikasi Real-Time
              </h2>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0 ? `${unreadCount} pesan belum dibaca` : 'Semua pesan telah dibaca'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
          >
            Tandai Semua Telah Dibaca
          </button>

          {userRole === 'admin' && (
            <button
              type="button"
              onClick={onSimulatePushNotification}
              className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-medium transition-colors cursor-pointer"
            >
              + Uji Alert Geofence
            </button>
          )}
        </div>
        {/* List of notifications */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada notifikasi aktif.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => onMarkAsRead(item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                  item.type === 'geofence_alert'
                    ? item.read
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-80'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-sm'
                    : item.type === 'approval'
                    ? item.read
                      ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 opacity-75'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                    : item.read
                    ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 opacity-75'
                    : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getIcon(item.type)}
                    <span className={`text-xs font-bold ${
                      item.type === 'geofence_alert'
                        ? 'text-rose-900 dark:text-rose-200'
                        : item.type === 'approval'
                        ? 'text-emerald-900 dark:text-emerald-300'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {item.timestamp}
                  </span>
                </div>

                {/* Badge Identitas Staf & Divisi Pengirim (Opsi A) */}
                {item.staffName && (
                  <div className="pl-6 pt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-700 dark:text-cyan-300 border border-indigo-200/60 dark:border-indigo-800/50">
                      <User className="w-3 h-3 shrink-0" />
                      <span>{item.staffName}</span>
                    </span>
                    {item.divisionName && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 max-w-[200px] truncate">
                        <Building2 className="w-2.5 h-2.5 shrink-0" />
                        <span>{item.divisionName}</span>
                      </span>
                    )}
                  </div>
                )}

                <p className={`text-xs leading-relaxed pl-6 ${
                  item.type === 'geofence_alert'
                    ? 'text-rose-800 dark:text-rose-300 font-medium'
                    : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {formatNotificationMessage(item)}
                </p>
                {item.type === 'geofence_alert' && (
                  <div className="pl-6 pt-1 flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Luar Geofence ({item.distanceExceededMeters ? `${item.distanceExceededMeters}m` : '> Radius'})
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
          Notifikasi terhubung ke service worker browser (PWA Push Notification ready)
        </div>
      </div>
    </div>
  );
};

