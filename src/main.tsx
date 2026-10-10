import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h1 className="text-lg font-bold text-white">Terjadi Kendala Memuat Aplikasi</h1>
            <p className="text-xs text-slate-400 leading-relaxed font-mono p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Terjadi kesalahan sistem saat inisialisasi aplikasi.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('ot_session_user');
                  localStorage.removeItem('ot_session_token');
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                Reset Sesi
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
