import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RefreshCw,
  Copy,
  Check,
  Building2,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { apiAskAiAnalytics } from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  model?: string;
  timestamp: string;
}

interface AiAnalyticsChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  currentUserName?: string;
}

const PRESET_QUERIES = [
  {
    icon: Clock,
    label: 'Keterlambatan Hari Ini',
    query: 'Apakah ada staf outsourcing yang hadir terlambat atau belum presensi hari ini?',
  },
  {
    icon: AlertTriangle,
    label: 'Kepatuhan Geofence',
    query: 'Tampilkan staf yang presensi di luar radius aman geofence kantor/tugas.',
  },
  {
    icon: TrendingUp,
    label: 'Evaluasi Skor KPI',
    query: 'Tampilkan analisis performa staf dengan capaian KPI di bawah standar (< 70).',
  },
  {
    icon: Building2,
    label: 'Ringkasan Unit & Laporan',
    query: 'Bagaimana rekapitulasi status persetujuan laporan kerja harian staf di tiap bidang?',
  },
];

export const AiAnalyticsChatModal: React.FC<AiAnalyticsChatModalProps> = ({
  isOpen,
  onClose,
  currentUserName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Halo, **${currentUserName || 'Bapak/Ibu Pimpinan'}**! 👋\n\nSaya adalah **Asisten AI Analitik Data Kinerja Disdik HST**. Saya siap memberikan analisis presensi, pemantauan geofence, dan evaluasi KPI tenaga alih daya secara *real-time* berbasis data database instansi.\n\nSilakan pilih pertanyaan ringkas di bawah atau ketikkan pertanyaan Anda sendiri:`,
      model: 'Gemini 3.6 Flash',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await apiAskAiAnalytics(query);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.reply,
        model: response.model || 'Gemini 3.6 Flash',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **Maaf, terjadi kendala saat memproses analisis data:**\n${err?.message || 'Gagal tersambung ke engine AI. Silakan coba kembali beberapa saat lagi.'}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-welcome-reset',
        sender: 'ai',
        text: `Riwayat percakapan telah dibersihkan. Silakan ajukan pertanyaan analitik baru seputar data tenaga outsourcing Disdik HST:`,
        model: 'Gemini 3.6 Flash',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl h-[88vh] max-h-[760px] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header Drawer */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                  Gemini Data Analytics
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Live SQLite Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Analisis Kinerja & Presensi Tenaga Alih Daya Disdik Kab. HST
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Bersihkan Percakapan"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Query Pills */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
            Pertanyaan Populer:
          </span>
          {PRESET_QUERIES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSend(item.query)}
                className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 transition-all flex items-center gap-1.5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-600"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>{item.label}</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>
            );
          })}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-line break-words space-y-1.5">
                  {msg.text}
                </div>

                <div
                  className={`flex items-center justify-between gap-3 mt-2.5 pt-2 border-t text-[10px] ${
                    msg.sender === 'user'
                      ? 'border-indigo-500/40 text-indigo-100'
                      : 'border-slate-200/60 dark:border-slate-700/60 text-slate-400 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {msg.model && (
                      <span className="font-mono bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                        {msg.model}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'ai' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Salin jawaban"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-3.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                </div>
                <span>Menganalisis data presensi & KPI Disdik HST...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Tanyakan analisis presensi, keterlambatan, atau skor KPI staf..."
              disabled={isLoading}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1">
            <span>Model Aktif: Google Gemini (Multimodal Analysis)</span>
            <span>Terkoneksi langsung ke data dev.db Disdik HST</span>
          </div>
        </div>

      </div>
    </div>
  );
};
