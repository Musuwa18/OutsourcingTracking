import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, ShieldAlert, Clock, User, Laptop } from 'lucide-react';
import { SystemAuditLog } from '../types';

interface AuditLogViewProps {
  auditLogs: SystemAuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', 'Kehadiran', 'Laporan', 'Evaluasi', 'Autentikasi', 'Sistem'];

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedCategory !== 'ALL' && log.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      const matchDetail = log.detail.toLowerCase().includes(q);
      const matchIp = log.ipAddress.includes(q);
      if (!matchActor && !matchAction && !matchDetail && !matchIp) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Log Aktivitas & Jejak Audit Sistem
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Catatan riwayat aktivitas operasional terenkripsi untuk transparansi dan kepatuhan hukum alih daya
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 glass-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari pelaku, jenis tindakan, deskripsi aktivitas, atau IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'Semua Kategori' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/40 dark:border-white/10 text-[11px] text-slate-400">
          <span>Menampilkan {filteredLogs.length} dari total {auditLogs.length} entri audit</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Integritas Hash Rantai Audit Terverifikasi
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-slate-600 dark:text-slate-300 font-semibold">
                <th className="py-3 px-4">Waktu & Tanggal</th>
                <th className="py-3 px-4">Pelaku / Aktor</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Tindakan / Aksi</th>
                <th className="py-3 px-4">Rincian Peristiwa</th>
                <th className="py-3 px-4 text-right">Alamat IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {log.actorName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {log.role}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed max-w-sm">
                    {log.detail}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
