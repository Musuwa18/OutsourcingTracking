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
  isMobileDevice: boolean;
  showAutoBanner: boolean;
  promptInstall: () => Promise<boolean>;
  dismissBanner: () => void;
  retriggerBanner: () => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export const PwaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
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

    // 2. Deteksi perangkat smartphone/tablet & iOS/Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isSafariBrowser = /safari/.test(ua) && !/chrome|crios|crmo|android/.test(ua);
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth <= 1024;

    setIsIos(isIosDevice);
    setIsSafari(isSafariBrowser);
    setIsMobileDevice(isMobile);

    // 3. Listener sebelum prompt instalasi bawaan browser (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      if (!alreadyInstalled && isMobile) {
        setTimeout(() => {
          setShowAutoBanner(true);
        }, 800);
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

    // Pada perangkat mobile/tablet jika belum terpasang, munculkan modal otomatis
    if (isMobile && !alreadyInstalled) {
      setTimeout(() => {
        setShowAutoBanner(true);
      }, 1000);
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
          return false;
        }
      } catch (err) {
        console.warn('[PWA] Gagal memicu prompt instalasi:', err);
      }
    }
    return false;
  };

  const dismissBanner = () => {
    // Tutup sementara untuk halaman ini
    setShowAutoBanner(false);
  };

  const retriggerBanner = () => {
    // Munculkan kembali modal saat ada pergantian tab/halaman jika belum terpasang di smartphone/tablet
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (!isStandaloneMode) {
      const ua = window.navigator.userAgent.toLowerCase();
      const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth <= 1024;
      if (isMobile) {
        setShowAutoBanner(true);
      }
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable: !!deferredPrompt || isIos,
        isInstalled,
        isIos,
        isSafari,
        isMobileDevice,
        showAutoBanner,
        promptInstall,
        dismissBanner,
        retriggerBanner,
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
