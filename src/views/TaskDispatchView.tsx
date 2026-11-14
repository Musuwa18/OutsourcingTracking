import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Plus,
  Users,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Camera,
  Compass,
  ArrowRight,
  Check,
  X,
  FileText,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { VisualMapPicker } from '../components/VisualMapPicker';
import { LocationAutoSuggestInput } from '../components/LocationAutoSuggestInput';
import {
  AuthUser,
  StaffProfile,
  OfficeLocation,
  TaskAssignment,
  TaskAssigneeItem,
  TaskPriority,
  TaskStatus,
} from '../types';
import {
  apiGetTasks,
  apiCreateTask,
  apiUpdateTaskStatus,
  apiDeleteTask,
} from '../services/api';
import { PRIMARY_OFFICES, formatDistance } from '../utils/geo';
import { getTodayDateStr } from '../utils/date';

interface TaskDispatchViewProps {
  currentUser?: AuthUser | null;
  staffList: StaffProfile[];
  locations?: OfficeLocation[];
  onNavigateToReports?: () => void;
}

export const TaskDispatchView: React.FC<TaskDispatchViewProps> = ({
  currentUser,
  staffList,
  locations = [],
  onNavigateToReports,
}) => {
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [detailModalTask, setDetailModalTask] = useState<TaskAssignment | null>(null);
  const [selectedProofAssignee, setSelectedProofAssignee] = useState<TaskAssigneeItem | null>(null);

  // Form create state
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Monitoring & Lapangan');
  const [formPriority, setFormPriority] = useState<TaskPriority>('NORMAL');
  const [formStartDate, setFormStartDate] = useState<string>(getTodayDateStr());
  const [formEndDate, setFormEndDate] = useState<string>(getTodayDateStr());
  const [formStartTime, setFormStartTime] = useState<string>('08:00');
  const [formEndTime, setFormEndTime] = useState<string>('16:00');
  const [formLocationName, setFormLocationName] = useState<string>('');
  const [formLatitude, setFormLatitude] = useState<number>(-2.591159);
  const [formLongitude, setFormLongitude] = useState<number>(115.373524);
  const [formRadius, setFormRadius] = useState<number>(100);
  const [formDescription, setFormDescription] = useState<string>('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Available locations
  const allLocations = useMemo(() => {
    return locations && locations.length > 0 ? locations : PRIMARY_OFFICES;
  }, [locations]);

  // Load tasks
  const loadTasks = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await apiGetTasks();
      setTasks(data);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setErrorMsg(err.message || 'Gagal memuat daftar penugasan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterDate && (t.startDate > filterDate || t.endDate < filterDate)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchLoc = t.locationName.toLowerCase().includes(q);
        const matchSupervisor = t.supervisorName.toLowerCase().includes(q);
        const matchStaff = t.assignees?.some((a) => a.staffName.toLowerCase().includes(q));
        if (!matchTitle && !matchLoc && !matchSupervisor && !matchStaff) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterDate, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const totalStaffAssigned = new Set(
      tasks.flatMap((t) => (t.assignees || []).map((a) => a.staffId))
    ).size;
    return { total, open, completed, totalStaffAssigned };
  }, [tasks]);

  // Handle Preset Location selection
  const handleSelectPresetLocation = (locId: string) => {
    if (!locId) return;
    const loc = allLocations.find((l) => l.id === locId);
    if (loc) {
      setFormLocationName(loc.name);
      setFormLatitude(loc.latitude);
      setFormLongitude(loc.longitude);
      setFormRadius(loc.radiusMeters || 100);
    }
  };

  // Staff list for multi-select
  const availableStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (!staffSearchQuery.trim()) return true;
      const q = staffSearchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.nip && s.nip.toLowerCase().includes(q)) ||
        (s.division && s.division.toLowerCase().includes(q)) ||
        (s.roleTitle && s.roleTitle.toLowerCase().includes(q))
      );
    });
  }, [staffList, staffSearchQuery]);

  // Toggle staff selection
  const handleToggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStaff = () => {
    setSelectedStaffIds(availableStaff.map((s) => s.id));
  };

  const handleDeselectAllStaff = () => {
    setSelectedStaffIds([]);
  };

  // Submit Create Task
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Judul penugasan wajib diisi.');
      return;
    }
    if (!formLocationName.trim()) {
      alert('Nama titik lokasi penugasan wajib diisi.');
      return;
    }
    if (selectedStaffIds.length === 0) {
      alert('Pilih minimal 1 orang personil penerima tugas.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const assigneesPayload = selectedStaffIds.map((sid) => {
        const staffObj = staffList.find((s) => s.id === sid);
        return {
          staffId: sid,
          staffName: staffObj?.name || 'Staf Disdik',
          staffNip: staffObj?.nip || '',
          divisionName: staffObj?.division || '',
        };
      });

      await apiCreateTask({
        supervisorId: currentUser?.id || 'admin',
        supervisorName: currentUser?.name || 'Supervisor / Atasan Langsung',
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        priority: formPriority,
        startDate: formStartDate,
        endDate: formEndDate,
        startTime: formStartTime,
        endTime: formEndTime,
        locationName: formLocationName.trim(),
        latitude: Number(formLatitude),
        longitude: Number(formLongitude),
        radiusMeters: Number(formRadius),
        assignees: assigneesPayload,
      });

      setSuccessMsg(`Perintah tugas "${formTitle}" berhasil diterbitkan ke ${selectedStaffIds.length} personil.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setCreateModalOpen(false);
      resetForm();
      loadTasks();
    } catch (err: any) {
      console.error('Create task failed:', err);
      alert(err.message || 'Gagal menerbitkan penugasan.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('Monitoring & Lapangan');
    setFormPriority('NORMAL');
    setFormStartDate(getTodayDateStr());
    setFormEndDate(getTodayDateStr());
    setFormStartTime('08:00');
    setFormEndTime('16:00');
    setFormLocationName('');
    setFormLatitude(-2.591159);
    setFormLongitude(115.373524);
    setFormRadius(100);
    setFormDescription('');
    setSelectedStaffIds([]);
    setStaffSearchQuery('');
  };

  // Change task status
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await apiUpdateTaskStatus(taskId, newStatus);
      loadTasks();
      if (detailModalTask && detailModalTask.id === taskId) {
        setDetailModalTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status tugas.');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Hapus perintah penugasan "${title}"? Data presensi dan check-in terkait akan terhapus.`)) return;
    try {
      await apiDeleteTask(taskId);
      loadTasks();
      if (detailModalTask?.id === taskId) setDetailModalTask(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus penugasan.');
    }
  };

  // Priority helper badge
  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> Mendesak
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Penting
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            Normal
          </span>
        );
    }
  };

  // Status helper badge
  const renderStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Berjalan
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Baru
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Disposisi & Penugasan Lapangan
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Terbitkan instruksi tugas dinas luar atau monitoring ke personil outsourcing/magang dengan penentuan titik GPS, radius verifikasi kamera selfie, dan pelacakan kehadiran real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Terbitkan Tugas Baru</span>
        </button>
      </div>

      {/* 2. Success/Error Alert */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. KPI Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Penugasan</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Semua perintah tugas</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-sky-500 uppercase tracking-wider">Sedang Berjalan</div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{stats.open}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Tugas aktif di lapangan</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Selesai Bertugas</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.completed}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Tervalidasi lengkap</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Personil Diterjunkan</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.totalStaffAssigned}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Staf unik yang bertugas</div>
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul tugas, titik lokasi, atasan, atau nama personil..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shrink-0"
          >
            <option value="ALL">Semua Status</option>
            <option value="OPEN">Tugas Baru (OPEN)</option>
            <option value="IN_PROGRESS">Sedang Berjalan</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shrink-0"
          />

          {(searchQuery || filterStatus !== 'ALL' || filterDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('ALL');
                setFilterDate('');
              }}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5. Assignment Cards List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat data penugasan lapangan...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Compass className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Penugasan Lapangan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Klik tombol "+ Terbitkan Tugas Baru" di atas untuk memilih personil dan menentukan titik lokasi tujuan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const assignees = task.assignees || [];
            const checkedInCount = assignees.filter(
              (a) => a.status === 'CHECKED_IN' || a.status === 'DONE'
            ).length;
            const progressPercent = assignees.length > 0 ? Math.round((checkedInCount / assignees.length) * 100) : 0;

            return (
              <div
                key={task.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {task.category}
                      </span>
                      {renderPriorityBadge(task.priority)}
                    </div>
                    {renderStatusBadge(task.status)}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Location & Time info */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {task.locationName}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${task.latitude},${task.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        Buka Peta <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>
                        {task.startDate === task.endDate
                          ? task.startDate
                          : `${task.startDate} s.d. ${task.endDate}`}{' '}
                        · ({task.startTime || '08:00'} - {task.endTime || '16:00'} WITA)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>Diterbitkan oleh: <strong className="text-slate-700 dark:text-slate-300">{task.supervisorName}</strong></span>
                    </div>
                  </div>

                  {/* Assignees Avatars & Progress */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Kehadiran Personil di Lokasi:
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {checkedInCount} / {assignees.length} Hadir ({progressPercent}%)
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Assignees list chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {assignees.map((a) => {
                        const isDone = a.status === 'CHECKED_IN' || a.status === 'DONE';
                        return (
                          <div
                            key={a.id}
                            className={`px-2 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border transition-all ${
                              isDone
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isDone ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                              }`}
                            />
                            <span className="truncate max-w-[120px]">{a.staffName}</span>
                            {isDone && a.checkinDistanceMeters !== undefined && (
                              <span className="text-[9px] text-emerald-600 font-bold">
                                ({a.checkinDistanceMeters}m)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {task.status !== 'COMPLETED' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors"
                      >
                        ✓ Selesaikan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                      >
                        Buka Kembali
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Hapus Penugasan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailModalTask(task)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detail & Bukti Lapangan</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: FORM TERBITKAN PENUGASAN BARU                   */}
      {/* ======================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Compass className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Terbitkan Perintah Tugas Lapangan Baru
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih target lokasi penugasan dan multi-pilih personil yang ditugaskan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateTaskSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Judul Perintah Tugas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Perintah Tugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Monitoring Sarpras SDN 1 Barabai / Pengantaran Berkas"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Kategori & Prioritas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Tugas
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Monitoring & Lapangan">Monitoring & Lapangan</option>
                    <option value="Pengantaran Dokumen & Surat">Pengantaran Dokumen & Surat</option>
                    <option value="Perbaikan Sarpras & IT">Perbaikan Sarpras & IT</option>
                    <option value="Pengawalan / Kebersihan Acara">Pengawalan / Kebersihan Acara</option>
                    <option value="Dinas Luar Daerah">Dinas Luar Daerah</option>
                    <option value="Tugas Khusus Lainnya">Tugas Khusus Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prioritas Penugasan
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NORMAL">Normal (Biasa)</option>
                    <option value="HIGH">Penting (High Priority)</option>
                    <option value="URGENT">Mendesak (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* Tanggal & Waktu Pelaksanaan */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai (WITA)
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Selesai (WITA)
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Titik Lokasi Penugasan (Studio Peta Interaktif & Radar Geofence) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 text-white border border-indigo-500/30 shadow-2xl space-y-4 relative overflow-hidden">
                {/* Glowing radial accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                      <Compass className="w-4 h-4 text-cyan-300 animate-spin-slow" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                        <span>Peta Interaktif & Radar Geofence Penugasan</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold">
                          Live Leaflet · OSM & Satelit
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Geser pin penanda, klik sembarang titik pada peta, atau tempel tautan/koordinat dari Google Maps.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Preset Location Chips Carousel */}
                <div className="space-y-1.5 relative z-10">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-300 uppercase tracking-wider">
                      Pilihan Cepat Master Kantor / Sekolah Disdik HST:
                    </span>
                    <span className="text-slate-400 text-[10px]">Klik untuk langsung terbang ke lokasi</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {allLocations.slice(0, 10).map((loc) => {
                      const isSelected =
                        Math.abs(formLatitude - loc.latitude) < 0.0001 &&
                        Math.abs(formLongitude - loc.longitude) < 0.0001;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            setFormLocationName(loc.name);
                            setFormLatitude(loc.latitude);
                            setFormLongitude(loc.longitude);
                            setFormRadius(loc.radiusMeters || 100);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 scale-105 font-bold'
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
                          }`}
                        >
                          <Building2 className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{loc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nama Lokasi Input dengan Live AutoSuggest & Geocoding */}
                <div className="space-y-1 relative z-20">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Nama Lokasi / Tempat Bertugas <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Cari koordinat otomatis saat diketik</span>
                    </span>
                  </div>
                  <LocationAutoSuggestInput
                    value={formLocationName}
                    onChange={(val) => setFormLocationName(val)}
                    onSelectLocation={(loc) => {
                      setFormLocationName(loc.name);
                      setFormLatitude(loc.latitude);
                      setFormLongitude(loc.longitude);
                    }}
                    placeholder="Ketik nama tempat (contoh: SDN 1 Barabai / RSUD Damanhuri / Kantor Disdik)"
                    presetLocations={allLocations}
                    required
                  />
                </div>

                {/* Interactive Leaflet Map Picker Component */}
                <div className="relative z-10 rounded-2xl overflow-hidden border border-indigo-500/30 bg-slate-950 shadow-inner">
                  <VisualMapPicker
                    latitude={formLatitude}
                    longitude={formLongitude}
                    radiusMeters={formRadius}
                    locationName={formLocationName || 'Titik Penugasan Lapangan'}
                    onChangeCoordinates={(lat, lng) => {
                      setFormLatitude(lat);
                      setFormLongitude(lng);
                    }}
                    onChangeRadius={(r) => setFormRadius(r)}
                    onAddressFound={(addr) => {
                      if (!formLocationName || formLocationName === 'Titik Tugas Khusus' || formLocationName.startsWith('Titik Lapangan')) {
                        setFormLocationName(addr);
                      }
                    }}
                    minRadius={20}
                    maxRadius={500}
                  />
                </div>

                {/* Live HUD Bottom Status Bar */}
                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-slate-300 font-mono text-[11px]">
                      Koordinat Terkunci: <strong className="text-cyan-300">{formLatitude.toFixed(6)}, {formLongitude.toFixed(6)}</strong> (Radius: <strong className="text-white">{formRadius}m</strong>)
                    </span>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${formLatitude},${formLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 self-end sm:self-auto shrink-0"
                  >
                    <span>Cek Rute Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Multi-Select Personil Penerima Tugas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pilih Personil Penerima Tugas <span className="text-rose-500">*</span>
                    <span className="ml-2 text-indigo-600 dark:text-cyan-400 font-bold">
                      ({selectedStaffIds.length} personil terpilih)
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllStaff}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-cyan-400 hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllStaff}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline"
                    >
                      Batal Semua
                    </button>
                  </div>
                </div>

                {/* Filter Personil */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Saring staf berdasarkan nama, divisi, formasi..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                {/* Checkbox List */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/40">
                  {availableStaff.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tidak ada data staf yang cocok.
                    </div>
                  ) : (
                    availableStaff.map((staff) => {
                      const isSelected = selectedStaffIds.includes(staff.id);
                      return (
                        <div
                          key={staff.id}
                          onClick={() => handleToggleStaff(staff.id)}
                          className={`p-2 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div
                              className="w-4 h-4 rounded-md accent-indigo-600 shrink-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {staff.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {staff.division || 'Umum'} · {staff.roleTitle || staff.vendorName}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-cyan-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0">
                              Terpilih
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Uraian Instruksi / SOP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Uraian Tugas & Instruksi Khusus (SOP)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan petunjuk teknis pelaksanaan tugas, hal yang wajib dicek, dokumen yang dibawa, dan batas waktu penyelesaian..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menerbitkan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Terbitkan & Kirim ke Beranda Staf</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DETAIL PENUGASAN & BUKTI KEHADIRAN PERSONIL     */}
      {/* ======================================================== */}
      {detailModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400">
                    {detailModalTask.category}
                  </span>
                  {renderPriorityBadge(detailModalTask.priority)}
                  {renderStatusBadge(detailModalTask.status)}
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {detailModalTask.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalTask(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Lokasi & Geofence Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>{detailModalTask.locationName}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${detailModalTask.latitude},${detailModalTask.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    Buka Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Koordinat: {detailModalTask.latitude}, {detailModalTask.longitude} · Radius Toleransi: {detailModalTask.radiusMeters} meter
                </div>
                {detailModalTask.description && (
                  <div className="text-xs text-slate-700 dark:text-slate-300 mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">Instruksi / SOP:</strong>
                    {detailModalTask.description}
                  </div>
                )}
              </div>

              {/* Daftar Personil Bertugas & Bukti Check-in */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Daftar Personil ({detailModalTask.assignees?.length || 0} Orang)</span>
                  <span className="text-indigo-600 dark:text-cyan-400 text-xs font-bold lowercase">
                    {detailModalTask.assignees?.filter((a) => a.status === 'CHECKED_IN' || a.status === 'DONE').length || 0} telah hadir di lokasi
                  </span>
                </h3>

                <div className="space-y-2">
                  {(detailModalTask.assignees || []).map((assignee) => {
                    const isCheckedIn = assignee.status === 'CHECKED_IN' || assignee.status === 'DONE';

                    return (
                      <div
                        key={assignee.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isCheckedIn
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCheckedIn
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isCheckedIn ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{assignee.staffName}</span>
                              {assignee.staffNip && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({assignee.staffNip})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {assignee.divisionName || 'Dinas Pendidikan'}
                            </div>

                            {isCheckedIn ? (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1.5 flex-wrap">
                                <span>Check-in: {assignee.checkinTime} WITA</span>
                                <span>·</span>
                                <span>Jarak: {assignee.checkinDistanceMeters ?? 0}m dari titik tugas</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                Belum check-in di lokasi tugas
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Foto Selfie Proof */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {isCheckedIn && assignee.checkinSelfieUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedProofAssignee(assignee)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                            >
                              <Camera className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Lihat Foto Check-in</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Menunggu personil tiba
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ID Tugas: <code className="font-mono">{detailModalTask.id}</code>
              </span>
              <button
                type="button"
                onClick={() => setDetailModalTask(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PREVIEW FOTO SELFIE CHECK-IN BUKTI TUGAS        */}
      {/* ======================================================== */}
      {selectedProofAssignee && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Bukti WebRTC Check-in Lapangan
                </h4>
                <p className="text-[10px] text-slate-500">
                  {selectedProofAssignee.staffName} · {selectedProofAssignee.checkinTime} WITA
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofAssignee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center">
              <img
                src={selectedProofAssignee.checkinSelfieUrl}
                alt={`Check-in ${selectedProofAssignee.staffName}`}
                className="w-full aspect-4/3 object-cover rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md"
              />

              <div className="w-full mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verifikasi Koordinat Valid</span>
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  Jarak ke Titik Tugas: {selectedProofAssignee.checkinDistanceMeters ?? 0} meter
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setSelectedProofAssignee(null)}
                className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
