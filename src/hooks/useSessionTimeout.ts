import { useState, useEffect, useRef, useCallback } from 'react';

// Durasi protokol keamanan kedinasan: 15 menit (900.000 ms)
// Jendela dialog peringatan: 60 detik terakhir (840.000 ms s.d. 900.000 ms)
export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const WARNING_DURATION_MS = 60 * 1000;
export const STORAGE_KEY_LAST_ACTIVITY = 'ot_last_activity';
export const STORAGE_KEY_TIMEOUT_REASON = 'ot_session_timeout_reason';

interface UseSessionTimeoutOptions {
  enabled: boolean;
  timeoutMs?: number;
  warningDurationMs?: number;
  onTimeout: () => void;
}

export interface UseSessionTimeoutReturn {
  isWarningOpen: boolean;
  remainingSeconds: number;
  extendSession: () => void;
  logoutNow: () => void;
}

/**
 * Hook pemantau aktivitas pengguna dan pemicu auto-logout saat inaktif selama 15 menit.
 * Dilengkapi sinkronisasi multi-tab via localStorage dan throttling efisien.
 */
export function useSessionTimeout({
  enabled,
  timeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  warningDurationMs = WARNING_DURATION_MS,
  onTimeout,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.ceil(warningDurationMs / 1000)
  );

  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);
  const throttleTimeoutRef = useRef<any>(null);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));
    } catch {
      // Fallback jika localStorage tidak tersedia
    }
  }, []);

  const extendSession = useCallback(() => {
    recordActivity();
    setIsWarningOpen(false);
    setRemainingSeconds(Math.ceil(warningDurationMs / 1000));
  }, [recordActivity, warningDurationMs]);

  const logoutNow = useCallback(() => {
    setIsWarningOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY_TIMEOUT_REASON, 'true');
    } catch {
      // ignore
    }
    onTimeout();
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) {
      setIsWarningOpen(false);
      return;
    }

    recordActivity();

    // Handler interaksi pengguna dengan throttling 1000ms untuk efisiensi CPU
    const handleUserInteraction = () => {
      if (!throttleTimeoutRef.current) {
        recordActivity();
        throttleTimeoutRef.current = setTimeout(() => {
          throttleTimeoutRef.current = null;
        }, 1000);
      }
    };

    // Sinkronisasi antar-tab peramban
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LAST_ACTIVITY && e.newValue) {
        const val = Number(e.newValue);
        if (!isNaN(val) && val > lastActivityRef.current) {
          lastActivityRef.current = val;
          setIsWarningOpen(false);
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });
    window.addEventListener('storage', handleStorageChange);

    // Interval pemeriksaan inaktivitas setiap 1 detik
    const warningThresholdMs = timeoutMs - warningDurationMs;

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        clearInterval(timerIntervalRef.current);
        logoutNow();
      } else if (elapsed >= warningThresholdMs) {
        setIsWarningOpen(true);
        const remMs = timeoutMs - elapsed;
        setRemainingSeconds(Math.max(1, Math.ceil(remMs / 1000)));
      } else {
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener('storage', handleStorageChange);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [enabled, timeoutMs, warningDurationMs, logoutNow, recordActivity]);

  return {
    isWarningOpen,
    remainingSeconds,
    extendSession,
    logoutNow,
  };
}
