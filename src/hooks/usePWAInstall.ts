import {useEffect, useState} from 'react';
import type {DevicePlatform} from '../types/math';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'Web';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('mac') && 'ontouchend' in document)) {
    return 'iOS';
  }
  if (/android/.test(ua)) {
    return 'Android';
  }
  return 'Web';
}

export function getDeviceLabel(platform: DevicePlatform): string {
  if (typeof window === 'undefined') return 'Brauzer';
  const ua = window.navigator.userAgent;
  if (platform === 'iOS') {
    return /ipad/i.test(ua) ? 'iPad · iOS Safari' : 'iPhone · iOS Safari';
  }
  if (platform === 'Android') {
    return /mobile/i.test(ua) ? 'Android Telefon' : 'Android Planshet';
  }
  if (/mac/i.test(ua)) return 'Mac · Desktop';
  if (/win/i.test(ua)) return 'Windows · Desktop';
  return 'Web Brauzer';
}

export function getOrCreateDeviceId(): string {
  const key = 'matematika_device_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing)) {
      return existing;
    }
    const randomPart =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        : Math.random().toString(36).slice(2, 14);
    const created = `dev_${randomPart}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return 'dev_ephemeral_01';
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [platform, setPlatform] = useState<DevicePlatform>('Web');

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone === true;
    setIsInstalled(isStandalone);

    const detected = detectDevicePlatform();
    setPlatform(detected);
    setIsIOS(detected === 'iOS');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    platform,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
