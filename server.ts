import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type {NextFunction, Request, Response} from 'express';

dotenv.config();

type DevicePlatform = 'iOS' | 'Android' | 'Web';
type ThemePreference = 'light' | 'dark' | 'system';

interface StudentProfile {
  firstName: string;
  lastName: string;
  preferredTheme: ThemePreference;
  updatedAt: number;
}

interface TestMistake {
  index: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
}

interface TestRecord {
  id: string;
  topicId: string;
  topicTitle: string;
  topicSection: string;
  group: 'Algebra va arifmetika' | 'Geometriya';
  studentName: string;
  score: number;
  total: number;
  percentage: number;
  durationSeconds: number;
  completedAt: string;
  updatedAt: number;
  devicePlatform: DevicePlatform;
  mistakes: TestMistake[];
}

interface ActiveTestSession {
  id: string;
  topicId: string;
  topicTitle: string;
  topicSection: string;
  group: 'Algebra va arifmetika' | 'Geometriya';
  studentFirstName: string;
  studentLastName: string;
  questions: Array<{q: string; o: Array<{t: string; c: boolean}>}>;
  answers: number[];
  currentIndex: number;
  remainingSeconds: number;
  startedAt: number;
  updatedAt: number;
  devicePlatform: DevicePlatform;
}

interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  platform: DevicePlatform;
  lastSeenAt: string;
}

interface CloudVaultData {
  profile: StudentProfile;
  history: TestRecord[];
  activeTest: ActiveTestSession | null;
}

interface StoredAccount {
  username: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  lastSyncedAt: string;
  serverRevision: number;
  devices: ConnectedDevice[];
  data: CloudVaultData;
}

interface VaultStoreFile {
  accounts: Record<string, StoredAccount>;
}

interface AuthenticatedRequest extends Request {
  authUsername?: string;
}

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(process.cwd(), '.data');
const VAULT_FILE = path.resolve(DATA_DIR, 'sync-vault.json');

// Session signing key from environment or ephemeral runtime secret
const TOKEN_SECRET = process.env.SYNC_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;
const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{4,64}$/;
const RECORD_ID_RE = /^[a-zA-Z0-9_-]{4,80}$/;

let writeLock: Promise<void> = Promise.resolve();

function assertSafeDataPath(target: string): void {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Unsafe storage path');
  }
}

async function readVaultStore(): Promise<VaultStoreFile> {
  assertSafeDataPath(VAULT_FILE);
  try {
    const raw = await fs.readFile(VAULT_FILE, 'utf8');
    const parsed = JSON.parse(raw) as VaultStoreFile;
    if (parsed && typeof parsed === 'object' && parsed.accounts && typeof parsed.accounts === 'object') {
      return parsed;
    }
    return {accounts: {}};
  } catch {
    return {accounts: {}};
  }
}

async function writeVaultStore(store: VaultStoreFile): Promise<void> {
  assertSafeDataPath(VAULT_FILE);
  await fs.mkdir(DATA_DIR, {recursive: true});
  const tempFile = path.resolve(DATA_DIR, `sync-vault.${crypto.randomBytes(6).toString('hex')}.tmp`);
  assertSafeDataPath(tempFile);
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tempFile, VAULT_FILE);
}

function withVaultWrite<T>(fn: (store: VaultStoreFile) => Promise<T> | T): Promise<T> {
  const next = writeLock.then(async () => {
    const store = await readVaultStore();
    const result = await fn(store);
    await writeVaultStore(store);
    return result;
  });
  writeLock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function hashPassword(password: string, saltHex?: string): {salt: string; hash: string} {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return {salt, hash: derived};
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function signToken(username: string): string {
  const payload = {
    sub: username,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest();
  let actualSig: Buffer;
  try {
    actualSig = Buffer.from(sigB64, 'base64url');
  } catch {
    return null;
  }
  if (actualSig.length !== expectedSig.length || !crypto.timingSafeEqual(actualSig, expectedSig)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (
      typeof decoded.sub !== 'string' ||
      !USERNAME_RE.test(decoded.sub) ||
      typeof decoded.exp !== 'number' ||
      decoded.exp < Date.now()
    ) {
      return null;
    }
    return decoded.sub;
  } catch {
    return null;
  }
}

function computeIntegrityHash(data: CloudVaultData): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

function sanitizePlatform(val: unknown): DevicePlatform {
  if (val === 'iOS' || val === 'Android' || val === 'Web') return val;
  return 'Web';
}

function sanitizeTheme(val: unknown): ThemePreference {
  if (val === 'light' || val === 'dark' || val === 'system') return val;
  return 'system';
}

function sanitizeGroup(val: unknown): 'Algebra va arifmetika' | 'Geometriya' {
  return val === 'Geometriya' ? 'Geometriya' : 'Algebra va arifmetika';
}

function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function sanitizeProfile(input: unknown): StudentProfile | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  const updatedAt = typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) ? obj.updatedAt : Date.now();
  return {
    firstName: clampString(obj.firstName, 60),
    lastName: clampString(obj.lastName, 60),
    preferredTheme: sanitizeTheme(obj.preferredTheme),
    updatedAt,
  };
}

function sanitizeHistory(input: unknown): TestRecord[] {
  if (!Array.isArray(input)) return [];
  const clean: TestRecord[] = [];
  for (const item of input.slice(0, 200)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || !RECORD_ID_RE.test(r.id)) continue;
    const mistakesRaw = Array.isArray(r.mistakes) ? r.mistakes.slice(0, 50) : [];
    const mistakes: TestMistake[] = [];
    for (const m of mistakesRaw) {
      if (!m || typeof m !== 'object') continue;
      const mo = m as Record<string, unknown>;
      mistakes.push({
        index: typeof mo.index === 'number' ? Math.max(0, Math.min(50, Math.floor(mo.index))) : 0,
        question: clampString(mo.question, 300),
        userAnswer: clampString(mo.userAnswer, 120),
        correctAnswer: clampString(mo.correctAnswer, 120),
      });
    }
    const total = typeof r.total === 'number' && r.total > 0 ? Math.min(100, Math.floor(r.total)) : 50;
    const score = typeof r.score === 'number' ? Math.max(0, Math.min(total, Math.floor(r.score))) : 0;
    const percentage =
      typeof r.percentage === 'number'
        ? Math.max(0, Math.min(100, Math.round(r.percentage)))
        : Math.round((score / total) * 100);

    clean.push({
      id: r.id,
      topicId: clampString(r.topicId, 60),
      topicTitle: clampString(r.topicTitle, 120),
      topicSection: clampString(r.topicSection, 40),
      group: sanitizeGroup(r.group),
      studentName: clampString(r.studentName, 120),
      score,
      total,
      percentage,
      durationSeconds:
        typeof r.durationSeconds === 'number' && Number.isFinite(r.durationSeconds)
          ? Math.max(0, Math.min(7200, Math.floor(r.durationSeconds)))
          : 0,
      completedAt: clampString(r.completedAt, 64) || new Date().toISOString(),
      updatedAt:
        typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : Date.now(),
      devicePlatform: sanitizePlatform(r.devicePlatform),
      mistakes,
    });
  }
  return clean;
}

function sanitizeActiveTest(input: unknown): ActiveTestSession | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as Record<string, unknown>;
  if (typeof s.id !== 'string' || !RECORD_ID_RE.test(s.id)) return null;
  if (!Array.isArray(s.questions) || s.questions.length === 0 || s.questions.length > 50) return null;
  if (!Array.isArray(s.answers) || s.answers.length !== s.questions.length) return null;

  const questions: Array<{q: string; o: Array<{t: string; c: boolean}>}> = [];
  for (const qItem of s.questions) {
    if (!qItem || typeof qItem !== 'object') return null;
    const qo = qItem as Record<string, unknown>;
    if (typeof qo.q !== 'string' || !Array.isArray(qo.o) || qo.o.length !== 4) return null;
    const opts = qo.o.map((opt) => {
      const oo = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
      return {
        t: clampString(oo.t, 120),
        c: Boolean(oo.c),
      };
    });
    questions.push({
      q: clampString(qo.q, 320),
      o: opts,
    });
  }

  const answers = s.answers.map((a) =>
    typeof a === 'number' && Number.isInteger(a) && a >= -1 && a <= 3 ? a : -1,
  );

  return {
    id: s.id,
    topicId: clampString(s.topicId, 60),
    topicTitle: clampString(s.topicTitle, 120),
    topicSection: clampString(s.topicSection, 40),
    group: sanitizeGroup(s.group),
    studentFirstName: clampString(s.studentFirstName, 60),
    studentLastName: clampString(s.studentLastName, 60),
    questions,
    answers,
    currentIndex:
      typeof s.currentIndex === 'number' && Number.isInteger(s.currentIndex)
        ? Math.max(0, Math.min(questions.length - 1, s.currentIndex))
        : 0,
    remainingSeconds:
      typeof s.remainingSeconds === 'number' && Number.isFinite(s.remainingSeconds)
        ? Math.max(0, Math.min(3600, Math.floor(s.remainingSeconds)))
        : 3600,
    startedAt: typeof s.startedAt === 'number' && Number.isFinite(s.startedAt) ? s.startedAt : Date.now(),
    updatedAt: typeof s.updatedAt === 'number' && Number.isFinite(s.updatedAt) ? s.updatedAt : Date.now(),
    devicePlatform: sanitizePlatform(s.devicePlatform),
  };
}

function upsertDevice(
  devices: ConnectedDevice[],
  deviceId: string,
  deviceName: string,
  platform: DevicePlatform,
): ConnectedDevice[] {
  const now = new Date().toISOString();
  const filtered = devices.filter((d) => d.deviceId !== deviceId);
  const updated: ConnectedDevice = {
    deviceId,
    deviceName: clampString(deviceName, 64) || `${platform} qurilmasi`,
    platform,
    lastSeenAt: now,
  };
  return [updated, ...filtered].slice(0, 10);
}

function mergeVaultData(existing: CloudVaultData, incoming: CloudVaultData): CloudVaultData {
  const profile =
    incoming.profile.updatedAt >= existing.profile.updatedAt ? incoming.profile : existing.profile;

  const historyMap = new Map<string, TestRecord>();
  for (const rec of existing.history) {
    historyMap.set(rec.id, rec);
  }
  for (const rec of incoming.history) {
    const prev = historyMap.get(rec.id);
    if (!prev || rec.updatedAt >= prev.updatedAt) {
      historyMap.set(rec.id, rec);
    }
  }
  const history = Array.from(historyMap.values())
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 200);

  let activeTest: ActiveTestSession | null = null;
  if (existing.activeTest && incoming.activeTest) {
    activeTest =
      incoming.activeTest.updatedAt >= existing.activeTest.updatedAt
        ? incoming.activeTest
        : existing.activeTest;
  } else {
    activeTest = incoming.activeTest || existing.activeTest;
  }

  // If the active test ID is already in completed history, clear it
  if (activeTest && historyMap.has(activeTest.id)) {
    activeTest = null;
  }

  return {profile, history, activeTest};
}

function formatSyncResponse(account: StoredAccount) {
  return {
    username: account.username,
    serverRevision: account.serverRevision,
    lastSyncedAt: account.lastSyncedAt,
    integrityHash: computeIntegrityHash(account.data),
    data: account.data,
    devices: account.devices,
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({error: 'Avtorizatsiya talab qilinadi.'});
    return;
  }
  const token = authHeader.slice(7).trim();
  const username = verifyToken(token);
  if (!username) {
    res.status(401).json({error: 'Sessiya muddati tugagan yoki yaroqsiz token.'});
    return;
  }
  req.authUsername = username;
  next();
}

async function createAppServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({limit: '512kb'}));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ok: true, timestamp: new Date().toISOString()});
  });

  app.post('/api/sync/register', async (req, res) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
      const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim() : '';
      const platform = sanitizePlatform(body.platform);

      if (!USERNAME_RE.test(username)) {
        res.status(400).json({error: 'Foydalanuvchi nomi 3–32 ta harf, raqam, nuqta yoki chiziqchadan iborat boʻlishi kerak.'});
        return;
      }
      if (password.length < 6 || password.length > 128) {
        res.status(400).json({error: 'Parol kamida 6 ta belgidan iborat boʻlishi kerak.'});
        return;
      }
      if (!DEVICE_ID_RE.test(deviceId)) {
        res.status(400).json({error: 'Qurilma identifikatori yaroqsiz.'});
        return;
      }

      const incomingProfile = sanitizeProfile(body.initialData && (body.initialData as Record<string, unknown>).profile) || {
        firstName: '',
        lastName: '',
        preferredTheme: 'system' as ThemePreference,
        updatedAt: Date.now(),
      };
      const incomingHistory = sanitizeHistory(body.initialData && (body.initialData as Record<string, unknown>).history);
      const incomingActiveTest = sanitizeActiveTest(body.initialData && (body.initialData as Record<string, unknown>).activeTest);

      const {salt, hash} = hashPassword(password);

      const account = await withVaultWrite((store) => {
        if (store.accounts[username]) {
          throw new Error('USERNAME_EXISTS');
        }
        const now = new Date().toISOString();
        const created: StoredAccount = {
          username,
          passwordSalt: salt,
          passwordHash: hash,
          createdAt: now,
          lastSyncedAt: now,
          serverRevision: 1,
          devices: upsertDevice([], deviceId, deviceName, platform),
          data: {
            profile: incomingProfile,
            history: incomingHistory,
            activeTest: incomingActiveTest,
          },
        };
        store.accounts[username] = created;
        return created;
      });

      const token = signToken(account.username);
      res.status(201).json({token, ...formatSyncResponse(account)});
    } catch (err) {
      if (err instanceof Error && err.message === 'USERNAME_EXISTS') {
        res.status(409).json({error: 'Bu sinxronizatsiya nomi band. Boshqa nom tanlang yoki tizimga kiring.'});
        return;
      }
      res.status(500).json({error: 'Hisob yaratishda xatolik yuz berdi.'});
    }
  });

  app.post('/api/sync/login', async (req, res) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
      const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim() : '';
      const platform = sanitizePlatform(body.platform);

      if (!USERNAME_RE.test(username) || password.length < 6 || password.length > 128) {
        res.status(400).json({error: 'Login yoki parol notoʻgʻri formatda.'});
        return;
      }
      if (!DEVICE_ID_RE.test(deviceId)) {
        res.status(400).json({error: 'Qurilma identifikatori yaroqsiz.'});
        return;
      }

      const account = await withVaultWrite((store) => {
        const existing = store.accounts[username];
        if (!existing || !verifyPassword(password, existing.passwordSalt, existing.passwordHash)) {
          throw new Error('INVALID_CREDENTIALS');
        }
        existing.devices = upsertDevice(existing.devices, deviceId, deviceName, platform);
        return existing;
      });

      const token = signToken(account.username);
      res.json({token, ...formatSyncResponse(account)});
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
        res.status(401).json({error: 'Foydalanuvchi nomi yoki parol notoʻgʻri.'});
        return;
      }
      res.status(500).json({error: 'Tizimga kirishda xatolik yuz berdi.'});
    }
  });

  app.get('/api/sync/pull', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const username = req.authUsername!;
      const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId.trim() : '';
      const deviceName = typeof req.query.deviceName === 'string' ? req.query.deviceName.trim() : '';
      const platform = sanitizePlatform(req.query.platform);

      const account = await withVaultWrite((store) => {
        const existing = store.accounts[username];
        if (!existing) {
          throw new Error('NOT_FOUND');
        }
        if (DEVICE_ID_RE.test(deviceId)) {
          existing.devices = upsertDevice(existing.devices, deviceId, deviceName, platform);
        }
        return existing;
      });

      res.json(formatSyncResponse(account));
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        res.status(404).json({error: 'Hisob topilmadi.'});
        return;
      }
      res.status(500).json({error: 'Maʼlumotlarni yuklashda xatolik yuz berdi.'});
    }
  });

  app.post('/api/sync/push', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const username = req.authUsername!;
      const body = (req.body || {}) as Record<string, unknown>;
      const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
      const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim() : '';
      const platform = sanitizePlatform(body.platform);

      if (!DEVICE_ID_RE.test(deviceId)) {
        res.status(400).json({error: 'Qurilma identifikatori yaroqsiz.'});
        return;
      }

      const incomingProfile = sanitizeProfile(body.profile);
      if (!incomingProfile) {
        res.status(400).json({error: 'Profil maʼlumotlari yaroqsiz.'});
        return;
      }

      const incomingData: CloudVaultData = {
        profile: incomingProfile,
        history: sanitizeHistory(body.history),
        activeTest: sanitizeActiveTest(body.activeTest),
      };

      const account = await withVaultWrite((store) => {
        const existing = store.accounts[username];
        if (!existing) {
          throw new Error('NOT_FOUND');
        }
        existing.data = mergeVaultData(existing.data, incomingData);
        existing.serverRevision += 1;
        existing.lastSyncedAt = new Date().toISOString();
        existing.devices = upsertDevice(existing.devices, deviceId, deviceName, platform);
        return existing;
      });

      res.json(formatSyncResponse(account));
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        res.status(404).json({error: 'Hisob topilmadi.'});
        return;
      }
      res.status(500).json({error: 'Bulutga saqlashda xatolik yuz berdi.'});
    }
  });

  app.delete('/api/sync/active-test', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const username = req.authUsername!;
      const account = await withVaultWrite((store) => {
        const existing = store.accounts[username];
        if (!existing) {
          throw new Error('NOT_FOUND');
        }
        existing.data.activeTest = null;
        existing.serverRevision += 1;
        existing.lastSyncedAt = new Date().toISOString();
        return existing;
      });
      res.json(formatSyncResponse(account));
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        res.status(404).json({error: 'Hisob topilmadi.'});
        return;
      }
      res.status(500).json({error: 'Faol testni tozalashda xatolik yuz berdi.'});
    }
  });

  app.post('/api/sync/logout-device', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const username = req.authUsername!;
      const body = (req.body || {}) as Record<string, unknown>;
      const targetDeviceId = typeof body.targetDeviceId === 'string' ? body.targetDeviceId.trim() : '';
      if (!DEVICE_ID_RE.test(targetDeviceId)) {
        res.status(400).json({error: 'Qurilma identifikatori yaroqsiz.'});
        return;
      }
      const account = await withVaultWrite((store) => {
        const existing = store.accounts[username];
        if (!existing) {
          throw new Error('NOT_FOUND');
        }
        existing.devices = existing.devices.filter((d) => d.deviceId !== targetDeviceId);
        return existing;
      });
      res.json(formatSyncResponse(account));
    } catch {
      res.status(500).json({error: 'Qurilmani oʻchirishda xatolik yuz berdi.'});
    }
  });

  const httpServer = http.createServer(app);

  if (!IS_PROD) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : true,
        ws: {server: httpServer},
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Matematika Testi server listening on http://0.0.0.0:${PORT}`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
