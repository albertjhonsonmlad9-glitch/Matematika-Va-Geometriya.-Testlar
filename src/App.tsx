import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BookOpen,
  Cloud,
  CloudOff,
  History,
  Moon,
  Play,
  RefreshCw,
  Search,
  Sun,
  Trash2,
} from 'lucide-react';
import {CloudSyncPanel} from './components/CloudSyncPanel';
import {HistoryView} from './components/HistoryView';
import {MathBackground} from './components/MathBackground';
import {PWAInstallButton} from './components/PWAInstallButton';
import {TestResults} from './components/TestResults';
import {TestRunner} from './components/TestRunner';
import {MATH_TOPICS} from './data/mathTopics';
import {
  detectDevicePlatform,
  getDeviceLabel,
  getOrCreateDeviceId,
  useOnlineStatus,
} from './hooks/usePWAInstall';
import type {
  ActiveTestSession,
  ConnectedDevice,
  MathTopic,
  StudentProfile,
  SyncResponsePayload,
  TestMistake,
  TestRecord,
  ThemePreference,
  TopicGroup,
} from './types/math';

type AppTab = 'topics' | 'history' | 'sync';
type GroupFilter = 'all' | TopicGroup;

const LOCAL_STORAGE_KEY = 'matematika_vault_v1';

interface LocalVaultCache {
  profile: StudentProfile;
  history: TestRecord[];
  activeTest: ActiveTestSession | null;
  pendingChanges: boolean;
}

function loadLocalVault(): LocalVaultCache {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalVaultCache>;
      return {
        profile: parsed.profile || {firstName: '', lastName: '', preferredTheme: 'system', updatedAt: 0},
        history: Array.isArray(parsed.history) ? parsed.history : [],
        activeTest: parsed.activeTest || null,
        pendingChanges: Boolean(parsed.pendingChanges),
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    profile: {firstName: '', lastName: '', preferredTheme: 'system', updatedAt: 0},
    history: [],
    activeTest: null,
    pendingChanges: false,
  };
}

function saveLocalVault(cache: LocalVaultCache): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

function generateId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${rand}`;
}

export default function App() {
  const initialCache = useMemo(() => loadLocalVault(), []);
  const isOnline = useOnlineStatus();
  const currentPlatform = useMemo(() => detectDevicePlatform(), []);
  const currentDeviceId = useMemo(() => getOrCreateDeviceId(), []);
  const currentDeviceName = useMemo(() => getDeviceLabel(currentPlatform), [currentPlatform]);

  const [tab, setTab] = useState<AppTab>('topics');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [profile, setProfile] = useState<StudentProfile>(initialCache.profile);
  const [history, setHistory] = useState<TestRecord[]>(initialCache.history);
  const [activeTest, setActiveTest] = useState<ActiveTestSession | null>(initialCache.activeTest);
  const [runningTest, setRunningTest] = useState(false);
  const [latestResult, setLatestResult] = useState<TestRecord | null>(null);
  const [nameError, setNameError] = useState(false);

  // Cloud sync auth & status (Bearer token strictly kept in React memory)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [syncUsername, setSyncUsername] = useState<string | null>(null);
  const [serverRevision, setServerRevision] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [integrityHash, setIntegrityHash] = useState<string | null>(null);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(initialCache.pendingChanges);
  const [syncError, setSyncError] = useState<string | null>(null);

  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const finishTestRef = useRef<() => void>(() => {});

  // Resolve active dark mode
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark =
    profile.preferredTheme === 'dark' || (profile.preferredTheme === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Persist local vault cache on any state update
  useEffect(() => {
    saveLocalVault({profile, history, activeTest, pendingChanges});
  }, [profile, history, activeTest, pendingChanges]);

  const applyServerSnapshot = useCallback((payload: SyncResponsePayload) => {
    setSyncUsername(payload.username);
    setServerRevision(payload.serverRevision);
    setLastSyncedAt(payload.lastSyncedAt);
    setIntegrityHash(payload.integrityHash);
    setDevices(payload.devices || []);
    setProfile(payload.data.profile);
    setHistory(payload.data.history);
    setActiveTest((prev) => {
      if (runningTest && prev) return prev;
      return payload.data.activeTest;
    });
    setPendingChanges(false);
    setSyncError(null);
  }, [runningTest]);

  const pushToCloud = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride || authToken;
      if (!token || !isOnline) return;
      setIsSyncing(true);
      setSyncError(null);
      try {
        const res = await fetch('/api/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceId: currentDeviceId,
            deviceName: currentDeviceName,
            platform: currentPlatform,
            profile,
            history,
            activeTest,
          }),
        });
        const data = (await res.json()) as SyncResponsePayload & {error?: string};
        if (!res.ok) {
          throw new Error(data.error || 'Sinxronlashda xatolik yuz berdi.');
        }
        applyServerSnapshot(data);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Tarmoq xatosi.');
      } finally {
        setIsSyncing(false);
      }
    },
    [
      authToken,
      isOnline,
      currentDeviceId,
      currentDeviceName,
      currentPlatform,
      profile,
      history,
      activeTest,
      applyServerSnapshot,
    ],
  );

  // Auto-sync debounced when authenticated and online with pending changes
  useEffect(() => {
    if (!authToken || !isOnline || !pendingChanges || isSyncing) return;
    const timer = window.setTimeout(() => {
      void pushToCloud();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [authToken, isOnline, pendingChanges, isSyncing, pushToCloud]);

  const handleRegister = async (username: string, password: string) => {
    const res = await fetch('/api/sync/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        username,
        password,
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
        platform: currentPlatform,
        initialData: {profile, history, activeTest},
      }),
    });
    const data = (await res.json()) as SyncResponsePayload & {token?: string; error?: string};
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Hisob yaratib boʻlmadi.');
    }
    setAuthToken(data.token);
    applyServerSnapshot(data);
  };

  const handleLogin = async (username: string, password: string) => {
    const res = await fetch('/api/sync/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        username,
        password,
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
        platform: currentPlatform,
      }),
    });
    const data = (await res.json()) as SyncResponsePayload & {token?: string; error?: string};
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Kirish muvaffaqiyatsiz.');
    }
    setAuthToken(data.token);
    // Merge local offline records with cloud right after login
    setIsSyncing(true);
    try {
      const pushRes = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({
          deviceId: currentDeviceId,
          deviceName: currentDeviceName,
          platform: currentPlatform,
          profile,
          history,
          activeTest,
        }),
      });
      const merged = (await pushRes.json()) as SyncResponsePayload & {error?: string};
      if (pushRes.ok) {
        applyServerSnapshot(merged);
      } else {
        applyServerSnapshot(data);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    if (!authToken || !isOnline) return;
    if (pendingChanges) {
      await pushToCloud();
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const params = new URLSearchParams({
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
        platform: currentPlatform,
      });
      const res = await fetch(`/api/sync/pull?${params.toString()}`, {
        headers: {Authorization: `Bearer ${authToken}`},
      });
      const data = (await res.json()) as SyncResponsePayload & {error?: string};
      if (!res.ok) {
        throw new Error(data.error || 'Maʼlumotlarni yuklab boʻlmadi.');
      }
      applyServerSnapshot(data);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sinxronlash xatosi.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!authToken) return;
    const res = await fetch('/api/sync/logout-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({targetDeviceId: deviceId}),
    });
    const data = (await res.json()) as SyncResponsePayload & {error?: string};
    if (res.ok) {
      applyServerSnapshot(data);
    }
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setSyncUsername(null);
    setDevices([]);
    setServerRevision(0);
    setLastSyncedAt(null);
    setIntegrityHash(null);
    setSyncError(null);
  };

  const updateProfile = (patch: Partial<StudentProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...patch,
      updatedAt: Date.now(),
    }));
    setPendingChanges(true);
  };

  const toggleTheme = () => {
    const nextTheme: ThemePreference = isDark ? 'light' : 'dark';
    updateProfile({preferredTheme: nextTheme});
  };

  const startTopicTest = (topic: MathTopic) => {
    const f = profile.firstName.trim();
    const l = profile.lastName.trim();
    if (!f || !l) {
      setNameError(true);
      if (!f) firstNameRef.current?.focus();
      else lastNameRef.current?.focus();
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    setNameError(false);
    const questions = topic.generate();
    const now = Date.now();
    const session: ActiveTestSession = {
      id: generateId('test'),
      topicId: topic.id,
      topicTitle: topic.en,
      topicSection: topic.sec,
      group: topic.grp,
      studentFirstName: f,
      studentLastName: l,
      questions,
      answers: questions.map(() => -1),
      currentIndex: 0,
      remainingSeconds: 3600,
      startedAt: now,
      updatedAt: now,
      devicePlatform: currentPlatform,
    };
    setActiveTest(session);
    setLatestResult(null);
    setRunningTest(true);
    setPendingChanges(true);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const finishActiveTest = useCallback(() => {
    if (!activeTest) return;
    let score = 0;
    const mistakes: TestMistake[] = [];
    activeTest.questions.forEach((q, idx) => {
      const selected = activeTest.answers[idx];
      if (selected >= 0 && q.o[selected]?.c) {
        score += 1;
      } else {
        const correctOpt = q.o.find((o) => o.c)?.t || '';
        const userAns = selected < 0 ? 'javob berilmagan' : q.o[selected]?.t || 'javob berilmagan';
        mistakes.push({
          index: idx + 1,
          question: q.q,
          userAnswer: userAns,
          correctAnswer: correctOpt,
        });
      }
    });

    const total = activeTest.questions.length;
    const percentage = Math.round((score / total) * 100);
    const record: TestRecord = {
      id: activeTest.id,
      topicId: activeTest.topicId,
      topicTitle: activeTest.topicTitle,
      topicSection: activeTest.topicSection,
      group: activeTest.group,
      studentName: `${activeTest.studentFirstName} ${activeTest.studentLastName}`.trim(),
      score,
      total,
      percentage,
      durationSeconds: Math.max(0, 3600 - activeTest.remainingSeconds),
      completedAt: new Date().toISOString(),
      updatedAt: Date.now(),
      devicePlatform: currentPlatform,
      mistakes,
    };

    setHistory((prev) => [record, ...prev.filter((r) => r.id !== record.id)].slice(0, 200));
    setActiveTest(null);
    setRunningTest(false);
    setLatestResult(record);
    setPendingChanges(true);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, [activeTest, currentPlatform]);

  useEffect(() => {
    finishTestRef.current = finishActiveTest;
  }, [finishActiveTest]);

  // 1-second test countdown timer
  useEffect(() => {
    if (!runningTest || !activeTest) return;
    const interval = window.setInterval(() => {
      setActiveTest((prev) => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          window.setTimeout(() => finishTestRef.current(), 0);
          return {...prev, remainingSeconds: 0, updatedAt: Date.now()};
        }
        return {...prev, remainingSeconds: prev.remainingSeconds - 1, updatedAt: Date.now()};
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [runningTest, activeTest !== null]);

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setActiveTest((prev) => {
      if (!prev) return null;
      const nextAnswers = prev.answers.slice();
      nextAnswers[qIdx] = optIdx;
      return {...prev, answers: nextAnswers, updatedAt: Date.now(), devicePlatform: currentPlatform};
    });
    setPendingChanges(true);
  };

  const handleNavigateQuestion = (qIdx: number) => {
    setActiveTest((prev) => {
      if (!prev) return null;
      return {...prev, currentIndex: qIdx, updatedAt: Date.now()};
    });
  };

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MATH_TOPICS.filter((t) => {
      const matchesGroup = groupFilter === 'all' || t.grp === groupFilter;
      const matchesQuery =
        !q || t.en.toLowerCase().includes(q) || t.sec.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [groupFilter, searchQuery]);

  const algebraTopics = useMemo(
    () => filteredTopics.filter((t) => t.grp === 'Algebra va arifmetika'),
    [filteredTopics],
  );
  const geometryTopics = useMemo(
    () => filteredTopics.filter((t) => t.grp === 'Geometriya'),
    [filteredTopics],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative">
      <MathBackground isDark={isDark} />

      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 no-print">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setRunningTest(false);
              setLatestResult(null);
              setTab('topics');
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Matematika Testi
          </button>

          {/* Zone 2: Concise single-line desktop nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setRunningTest(false);
                setLatestResult(null);
                setTab('topics');
              }}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                tab === 'topics' && !runningTest
                  ? 'border-indigo-600 text-slate-900 dark:border-indigo-400 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mavzular
            </button>
            <button
              type="button"
              onClick={() => {
                setRunningTest(false);
                setLatestResult(null);
                setTab('history');
              }}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                tab === 'history' && !runningTest
                  ? 'border-indigo-600 text-slate-900 dark:border-indigo-400 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Natijalar ({history.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setRunningTest(false);
                setLatestResult(null);
                setTab('sync');
              }}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                tab === 'sync' && !runningTest
                  ? 'border-indigo-600 text-slate-900 dark:border-indigo-400 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulutli sinxronlash
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                if (syncUsername && isOnline && !runningTest) {
                  void handleSyncNow();
                } else {
                  setRunningTest(false);
                  setLatestResult(null);
                  setTab('sync');
                }
              }}
              className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isOnline ? (
                <Cloud className="w-3.5 h-3.5" />
              ) : (
                <CloudOff className="w-3.5 h-3.5" />
              )}
              <span>{syncUsername ? syncUsername : 'Bulutga kirish'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 md:pb-14">
        {runningTest && activeTest ? (
          <TestRunner
            session={activeTest}
            onSelectAnswer={handleSelectAnswer}
            onNavigate={handleNavigateQuestion}
            onFinish={finishActiveTest}
            onPauseExit={() => {
              setRunningTest(false);
              setPendingChanges(true);
            }}
          />
        ) : latestResult ? (
          <TestResults
            record={latestResult}
            onBackHome={() => {
              setLatestResult(null);
              setTab('topics');
            }}
          />
        ) : tab === 'history' ? (
          <HistoryView
            history={history}
            onGoTopics={() => setTab('topics')}
          />
        ) : tab === 'sync' ? (
          <CloudSyncPanel
            username={syncUsername}
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingChanges={pendingChanges}
            lastSyncedAt={lastSyncedAt}
            serverRevision={serverRevision}
            integrityHash={integrityHash}
            devices={devices}
            currentDeviceId={currentDeviceId}
            currentPlatform={currentPlatform}
            errorMessage={syncError}
            onRegister={handleRegister}
            onLogin={handleLogin}
            onSyncNow={handleSyncNow}
            onSignOut={handleSignOut}
            onRemoveDevice={handleRemoveDevice}
          />
        ) : (
          <div className="space-y-8">
            {/* Hero / Student Info Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-3">
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08] text-balance">
                  Matematika va geometriya testi
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  M. Usmonovning «Matematika» va «Geometriya» kitoblaridagi mavzular asosida. Ismingizni kiriting, mavzuni tanlang va 60 daqiqa ichida 50 ta savolga javob bering. Har safar yangi savollar tuziladi.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <PWAInstallButton />
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                    <span>{isDark ? 'Yorugʻ rejim' : 'Tungi rejim'}</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Oʻquvchi maʼlumotlari
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="student-fn" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Ism
                    </label>
                    <input
                      ref={firstNameRef}
                      id="student-fn"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Ismingiz"
                      value={profile.firstName}
                      onChange={(e) => {
                        setNameError(false);
                        updateProfile({firstName: e.target.value});
                      }}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="student-ln" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Familiya
                    </label>
                    <input
                      ref={lastNameRef}
                      id="student-ln"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Familiyangiz"
                      value={profile.lastName}
                      onChange={(e) => {
                        setNameError(false);
                        updateProfile({lastName: e.target.value});
                      }}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {nameError && (
                  <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Iltimos, avval ism va familiyangizni kiriting.
                  </p>
                )}
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {syncUsername
                    ? `Sinxronlangan hisob: ${syncUsername} · ${currentPlatform}`
                    : `Joriy qurilma: ${currentPlatform} · Bulutga ulanish uchun «Bulutli sinxronlash» boʻlimidan foydalaning`}
                </p>
              </div>
            </section>

            {/* Cross-platform Resume Active Test Banner */}
            {activeTest && (
              <section className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    Tugallanmagan test ({activeTest.devicePlatform} qurilmasida boshlangan)
                  </p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {activeTest.topicTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
                    {activeTest.answers.filter((a) => a >= 0).length} / {activeTest.questions.length} javob berilgan ·{' '}
                    {Math.floor(activeTest.remainingSeconds / 60)} daqiqa qolgan
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRunningTest(true);
                      window.scrollTo({top: 0, behavior: 'smooth'});
                    }}
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Davom ettirish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTest(null);
                      setPendingChanges(true);
                    }}
                    aria-label="Tugallanmagan testni bekor qilish"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* Workspace Toolbar: Search + Group Filters */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start overflow-x-auto max-w-full">
                {(['all', 'Algebra va arifmetika', 'Geometriya'] as GroupFilter[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroupFilter(g)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      groupFilter === g
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {g === 'all' ? `Barchasi (${MATH_TOPICS.length})` : g}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Mavzu yoki § boʻyicha qidirish..."
                  aria-label="Mavzu qidirish"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </section>

            {/* Topics Grid */}
            {filteredTopics.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Qidiruv boʻyicha mavzu topilmadi.
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {algebraTopics.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Algebra va arifmetika
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {algebraTopics.length} ta mavzu
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {algebraTopics.map((topic) => {
                        const globalIdx = MATH_TOPICS.findIndex((m) => m.id === topic.id) + 1;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => startTopicTest(topic)}
                            className="group text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-500 dark:hover:border-indigo-500 hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[156px] cursor-pointer"
                          >
                            <div className="space-y-3">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 font-mono-tabular text-sm font-bold">
                                {globalIdx}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {topic.en}
                              </h3>
                            </div>
                            <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                              50 ta savol · {topic.sec}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {geometryTopics.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Geometriya
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {geometryTopics.length} ta mavzu
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {geometryTopics.map((topic) => {
                        const globalIdx = MATH_TOPICS.findIndex((m) => m.id === topic.id) + 1;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => startTopicTest(topic)}
                            className="group text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-500 dark:hover:border-indigo-500 hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[156px] cursor-pointer"
                          >
                            <div className="space-y-3">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 font-mono-tabular text-sm font-bold">
                                {globalIdx}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {topic.en}
                              </h3>
                            </div>
                            <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                              50 ta savol · {topic.sec}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Offline Toast */}
      {!isOnline && (
        <div className="fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 text-white px-3.5 py-2 text-xs font-semibold shadow-lg no-print">
          <CloudOff className="w-4 h-4 shrink-0" />
          <span>Oflayn rejim — keshlangan maʼlumotlar ishlatilmoqda</span>
        </div>
      )}

      {/* Mobile Bottom Thumb-Zone Tab Bar (hidden during active test & on desktop) */}
      {!runningTest && (
        <nav
          aria-label="Mobil navigatsiya"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe no-print"
        >
          <div className="grid grid-cols-3 h-14">
            <button
              type="button"
              onClick={() => {
                setLatestResult(null);
                setTab('topics');
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
                tab === 'topics'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Mavzular</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLatestResult(null);
                setTab('history');
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
                tab === 'history'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <History className="w-5 h-5" />
              <span>Natijalar ({history.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLatestResult(null);
                setTab('sync');
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
                tab === 'sync'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Cloud className="w-5 h-5" />
              <span>Bulut</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
