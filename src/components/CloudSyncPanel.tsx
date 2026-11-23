import React, {useState} from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Laptop,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import type {ConnectedDevice, DevicePlatform} from '../types/math';

interface CloudSyncPanelProps {
  username: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: boolean;
  lastSyncedAt: string | null;
  serverRevision: number;
  integrityHash: string | null;
  devices: ConnectedDevice[];
  currentDeviceId: string;
  currentPlatform: DevicePlatform;
  errorMessage: string | null;
  onRegister: (username: string, password: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  onSyncNow: () => Promise<void>;
  onSignOut: () => void;
  onRemoveDevice: (deviceId: string) => Promise<void>;
}

function DeviceIcon({platform}: {platform: DevicePlatform}) {
  if (platform === 'iOS') return <Smartphone className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
  if (platform === 'Android') return <Tablet className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
  return <Laptop className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  username,
  isOnline,
  isSyncing,
  pendingChanges,
  lastSyncedAt,
  serverRevision,
  integrityHash,
  devices,
  currentDeviceId,
  currentPlatform,
  errorMessage,
  onRegister,
  onLogin,
  onSyncNow,
  onSignOut,
  onRemoveDevice,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanUser = inputUsername.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(cleanUser)) {
      setFormError('Sinxronizatsiya nomi 3–32 ta harf, raqam, nuqta yoki chiziqchadan iborat boʻlishi kerak.');
      return;
    }
    if (inputPassword.length < 6) {
      setFormError('Parol kamida 6 ta belgidan iborat boʻlishi kerak.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await onRegister(cleanUser, inputPassword);
      } else {
        await onLogin(cleanUser, inputPassword);
      }
      setInputPassword('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sinxronizatsiya xatosi yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!username) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Xavfsiz bulutli sinxronizatsiya
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                iOS (iPhone/iPad) va Android qurilmalaringiz oʻrtasida oʻquvchi profilingiz, faol test jarayoni va barcha natijalar tarixini bir xil saqlang.
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setFormError(null);
              }}
              className={`min-h-[40px] px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hisobga kirish
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setFormError(null);
              }}
              className={`min-h-[40px] px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yangi hisob yaratish
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="sync-username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Sinxronizatsiya nomi (Login)
              </label>
              <input
                id="sync-username"
                type="text"
                autoComplete="username"
                placeholder="masalan: ali.karimov"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="sync-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Parol (kamida 6 ta belgi)
              </label>
              <input
                id="sync-password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {(formError || errorMessage) && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 font-medium">
                {formError || errorMessage}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Joriy qurilma: {currentPlatform} · Scrypt + HMAC-SHA256 himoyasi</span>
              </div>
              <button
                type="submit"
                disabled={submitting || !isOnline}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
              >
                {submitting
                  ? 'Bajarilmoqda...'
                  : mode === 'register'
                  ? 'Hisob yaratish va sinxronlash'
                  : 'Kirish va yuklash'}
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Oflayn navbat</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Internet yoʻq boʻlsa ham test yechishda davom eting; tarmoq tiklanishi bilan natijalar bulutga uzatiladi.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Ziddiyatsiz birlashtirish</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Har bir urinish va profil oʻzgarishi vaqt belgisi asosida iOS va Android qurilmalarda aniq birlashtiriladi.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Yaxlitlik nazorati</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Har bir sinxronlash paketi SHA-256 nazorat yigʻindisi bilan tasdiqlanadi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center shrink-0">
              {isOnline ? (
                <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <CloudOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{username}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {pendingChanges ? 'Oʻzgarishlar saqlanmoqda' : 'Bulut bilan sinxronlangan'}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    Oflayn rejim · Oʻzgarishlar navbatda
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">Rev #{serverRevision}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onSyncNow()}
              disabled={!isOnline || isSyncing}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinxronlanmoqda...' : 'Hozir sinxronlash'}</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-b border-slate-200 dark:border-slate-800 text-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Oxirgi sinxronlash</span>
            <span className="mt-0.5 font-medium text-slate-900 dark:text-white tabular-nums block">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('uz-UZ') : 'Hali bajarilmagan'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Yaxlitlik nazorati (SHA-256)</span>
            <span className="mt-0.5 font-mono-tabular text-slate-900 dark:text-white block">
              {integrityHash || '—'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Faol platforma</span>
            <span className="mt-0.5 font-medium text-slate-900 dark:text-white block">{currentPlatform}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Ulangan qurilmalar ({devices.length})
          </h3>
          {devices.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Ulangan qurilmalar topilmadi.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {devices.map((d) => {
                const isCurrent = d.deviceId === currentDeviceId;
                return (
                  <div
                    key={d.deviceId}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                        <DeviceIcon platform={d.platform} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {d.deviceName} {isCurrent ? '(Joriy qurilma)' : ''}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {d.platform} · Oxirgi faollik: {new Date(d.lastSeenAt).toLocaleString('uz-UZ')}
                        </p>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => void onRemoveDevice(d.deviceId)}
                        aria-label="Qurilmani uzish"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
