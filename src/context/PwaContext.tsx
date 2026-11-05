import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isSafari: boolean;
  showAutoBanner: boolean;
  promptInstall: () => Promise<boolean>;
  dismissBanner: (days?: number) => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

const DISMISSED_KEY = 'ot_pwa_dismissed_until';

export const PwaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [showAutoBanner, setShowAutoBanner] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Cek apakah sedang berjalan dalam mode standalone (aplikasi terpasang)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsInstalled(isStandaloneMode);
      return isStandaloneMode;
    };

    const alreadyInstalled = checkStandalone();

    // 2. Deteksi perangkat iOS & Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isSafariBrowser = /safari/.test(ua) && !/chrome|crios|crmo|android/.test(ua);
    setIsIos(isIosDevice);
    setIsSafari(isSafariBrowser);

    // 3. Listener sebelum prompt instalasi bawaan browser (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      const snoozeUntil = localStorage.getItem(DISMISSED_KEY);
      const isSnoozed = snoozeUntil && parseInt(snoozeUntil, 10) > Date.now();

      if (!alreadyInstalled && !isSnoozed) {
        setTimeout(() => {
          setShowAutoBanner(true);
        }, 1500);
      }
    };

    // 4. Listener saat aplikasi berhasil dipasang
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowAutoBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (isIosDevice && !alreadyInstalled) {
      const snoozeUntil = localStorage.getItem(DISMISSED_KEY);
      const isSnoozed = snoozeUntil && parseInt(snoozeUntil, 10) > Date.now();
      if (!isSnoozed) {
        setTimeout(() => {
          setShowAutoBanner(true);
        }, 2000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setShowAutoBanner(false);
          setDeferredPrompt(null);
          return true;
        } else {
          setShowAutoBanner(false);
          dismissBanner(1);
          return false;
        }
      } catch (err) {
        console.warn('[PWA] Gagal memicu prompt instalasi:', err);
      }
    }
    return false;
  };

  const dismissBanner = (days: number = 3) => {
    setShowAutoBanner(false);
    const expireTime = Date.now() + days * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(DISMISSED_KEY, String(expireTime));
    } catch {}
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable: !!deferredPrompt || isIos,
        isInstalled,
        isIos,
        isSafari,
        showAutoBanner,
        promptInstall,
        dismissBanner,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = (): PwaContextType => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa harus digunakan di dalam PwaProvider');
  }
  return context;
};
