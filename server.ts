import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.DEFAULT_APP_PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(__dirname, '.data');
const STORE_PATH = path.join(DATA_DIR, 'academy-store.json');
const SESSION_COOKIE_NAME = 'ejen_session';
const RECOVERY_SECRET_CODE = 'BESTARI2026';

interface StoredProfile {
  name: string;
  className: string;
  codenameBadge: string;
  agentId: string;
  verifiedAt: string;
}

interface StoredAccount {
  username: string;
  passwordSalt: string;
  passwordHash: string;
  role: string;
  referenceNo: string;
  createdAt: string;
  profile: StoredProfile | null;
}

interface AcademyStore {
  secretKey: string;
  accounts: Record<string, StoredAccount>;
}

interface SessionPayload {
  username: string;
  exp: number;
}

function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function createSeedStore(): AcademyStore {
  const ejenCreds = hashPassword('Bestari#2026');
  const mentorCreds = hashPassword('Akademi#2026');
  return {
    secretKey: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    accounts: {
      'ejen.bestari': {
        username: 'ejen.bestari',
        passwordSalt: ejenCreds.salt,
        passwordHash: ejenCreds.hash,
        role: 'Anggota Penyiasat · Sekolah Seri Bestari',
        referenceNo: 'REF-SB-001',
        createdAt: new Date().toISOString(),
        profile: null,
      },
      'profesor.nurin': {
        username: 'profesor.nurin',
        passwordSalt: mentorCreds.salt,
        passwordHash: mentorCreds.hash,
        role: 'Pembimbing Operasi · Akademi Ejen Rahsia',
        referenceNo: 'REF-SB-000',
        createdAt: new Date().toISOString(),
        profile: {
          name: 'Profesor Nurin',
          className: '6 Bestari',
          codenameBadge: 'Kanta Ilmu',
          agentId: 'SB-26-0001',
          verifiedAt: new Date().toISOString(),
        },
      },
    },
  };
}

let memoryStore!: AcademyStore;

function loadStore(): AcademyStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as AcademyStore;
      if (parsed && parsed.secretKey && parsed.accounts) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed store
  }
  const seeded = createSeedStore();
  saveStore(seeded);
  return seeded;
}

memoryStore = loadStore();

function saveStore(store: AcademyStore): void {
  memoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Graceful fallback to in-memory store if disk write is restricted
  }
}

function signSession(payload: SessionPayload, secretKey: string): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secretKey).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifySession(token: string, secretKey: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', secretKey).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.username || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(headerValue: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headerValue) return out;
  for (const part of headerValue.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) out[key] = val;
  }
  return out;
}

function setSessionCookie(res: Response, req: Request, token: string, maxAgeMs: number): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: maxAgeMs,
  });
}

function clearSessionCookie(res: Response, req: Request): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  });
}

function sanitizeUserResponse(account: StoredAccount) {
  return {
    username: account.username,
    role: account.role,
    referenceNo: account.referenceNo,
    accessStatus: 'AKSES DIBENARKAN',
    organization: 'SEKOLAH SERI BESTARI',
    profile: account.profile,
  };
}

function generateUniqueAgentId(existingIds: Set<string>): string {
  for (let i = 0; i < 20; i++) {
    const code = crypto.randomInt(1000, 9999);
    const candidate = `SB-26-${code}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `SB-26-${String(Date.now()).slice(-4)}`;
}

interface AuthedRequest extends Request {
  authAccount?: StoredAccount;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) {
    res.status(401).json({
      authenticated: false,
      error: 'Akses disekat. Sila log masuk terlebih dahulu untuk memasuki sistem.',
    });
    return;
  }
  const verified = verifySession(rawToken, memoryStore.secretKey);
  if (!verified) {
    res.status(401).json({
      authenticated: false,
      error: 'Sesi anda telah tamat tempoh atau tidak sah. Sila log masuk semula.',
    });
    return;
  }
  const account = memoryStore.accounts[verified.username];
  if (!account) {
    res.status(401).json({
      authenticated: false,
      error: 'Akaun ejen tidak ditemui. Sila log masuk semula.',
    });
    return;
  }
  req.authAccount = account;
  next();
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'akademi-ejen-rahsia-seri-bestari' });
  });

  app.get('/api/auth/session', (req: AuthedRequest, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const rawToken = cookies[SESSION_COOKIE_NAME];
    if (!rawToken) {
      res.json({ authenticated: false });
      return;
    }
    const verified = verifySession(rawToken, memoryStore.secretKey);
    if (!verified) {
      res.json({ authenticated: false });
      return;
    }
    const account = memoryStore.accounts[verified.username];
    if (!account) {
      res.json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      user: sanitizeUserResponse(account),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const usernameRaw = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const rememberMe = Boolean(req.body?.rememberMe);

    if (usernameRaw.length < 3 || password.length < 4) {
      res.status(400).json({
        error: 'Sila masukkan Nama Pengguna / ID Ejen dan Kata Laluan yang lengkap.',
      });
      return;
    }

    const account = memoryStore.accounts[usernameRaw];
    if (!account || !verifyPassword(password, account.passwordSalt, account.passwordHash)) {
      res.status(401).json({
        error: 'Nama pengguna / ID Ejen atau kata laluan tidak tepat. Sila semak dan cuba semula.',
      });
      return;
    }

    const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    const token = signSession(
      { username: account.username, exp: Date.now() + ttlMs },
      memoryStore.secretKey
    );
    setSessionCookie(res, req, token, ttlMs);

    res.json({
      authenticated: true,
      user: sanitizeUserResponse(account),
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const usernameRaw = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const rememberMe = Boolean(req.body?.rememberMe);

    if (!/^[a-z0-9._-]{3,32}$/.test(usernameRaw)) {
      res.status(400).json({
        error: 'Nama pengguna mesti 3–32 aksara (huruf kecil, nombor, titik, sengkang atau garis bawah).',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.',
      });
      return;
    }

    if (memoryStore.accounts[usernameRaw]) {
      res.status(409).json({
        error: 'ID Ejen ini telah didaftarkan. Sila log masuk atau pilih ID lain.',
      });
      return;
    }

    const { salt, hash } = hashPassword(password);
    const refNumber = `REF-SB-${String(Object.keys(memoryStore.accounts).length + 1).padStart(3, '0')}`;
    const newAccount: StoredAccount = {
      username: usernameRaw,
      passwordSalt: salt,
      passwordHash: hash,
      role: 'Anggota Pelatih · Sekolah Seri Bestari',
      referenceNo: refNumber,
      createdAt: new Date().toISOString(),
      profile: null,
    };

    memoryStore.accounts[usernameRaw] = newAccount;
    saveStore(memoryStore);

    const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    const token = signSession(
      { username: newAccount.username, exp: Date.now() + ttlMs },
      memoryStore.secretKey
    );
    setSessionCookie(res, req, token, ttlMs);

    res.status(201).json({
      authenticated: true,
      user: sanitizeUserResponse(newAccount),
    });
  });

  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const usernameRaw = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const recoveryCode = typeof req.body?.recoveryCode === 'string' ? req.body.recoveryCode.trim().toUpperCase() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    const account = memoryStore.accounts[usernameRaw];
    if (!account) {
      res.status(404).json({
        error: 'Nama pengguna / ID Ejen tidak ditemui dalam rekod akademi.',
      });
      return;
    }

    if (recoveryCode !== RECOVERY_SECRET_CODE) {
      res.status(403).json({
        error: 'Kod keselamatan akademi tidak sah. Sila rujuk Pembimbing Operasi.',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.',
      });
      return;
    }

    const { salt, hash } = hashPassword(newPassword);
    account.passwordSalt = salt;
    account.passwordHash = hash;
    saveStore(memoryStore);

    res.json({
      ok: true,
      message: 'Kata laluan berjaya ditetapkan semula. Anda kini boleh log masuk dengan kata laluan baharu.',
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(res, req);
    res.json({ ok: true });
  });

  app.get('/api/agent/profile', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({
      user: sanitizeUserResponse(req.authAccount!),
    });
  });

  app.post('/api/agent/profile', requireAuth, (req: AuthedRequest, res: Response) => {
    const account = req.authAccount!;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const className = typeof req.body?.className === 'string' ? req.body.className.trim() : '';
    const codenameBadge = typeof req.body?.codenameBadge === 'string' ? req.body.codenameBadge.trim() : '';

    if (name.length < 2) {
      res.status(400).json({
        error: 'Sila masukkan Nama Penuh Ejen (sekurang-kurangnya 2 huruf).',
      });
      return;
    }

    const allowedClasses = ['5 Bestari', '5 Cemerlang', '6 Bestari', '6 Harmoni'];
    if (!allowedClasses.includes(className) && className.length < 2) {
      res.status(400).json({
        error: 'Sila pilih kelas yang sah (5 Bestari, 5 Cemerlang, 6 Bestari atau 6 Harmoni).',
      });
      return;
    }

    const allowedBadges = ['Helang Bestari', 'Kanta Ilmu', 'Pena Emas', 'Arkitek Muda'];
    if (!allowedBadges.includes(codenameBadge)) {
      res.status(400).json({
        error: 'Sila pilih salah satu daripada 4 gelaran pasukan rasmi.',
      });
      return;
    }

    const existingIds = new Set(
      Object.values(memoryStore.accounts)
        .map((acc) => acc.profile?.agentId)
        .filter((id): id is string => Boolean(id))
    );

    const agentId = account.profile?.agentId || generateUniqueAgentId(existingIds);
    const verifiedAt = new Date().toISOString();

    account.profile = {
      name,
      className,
      codenameBadge,
      agentId,
      verifiedAt,
    };
    saveStore(memoryStore);

    res.json({
      user: sanitizeUserResponse(account),
      profile: account.profile,
    });
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Akademi Ejen Rahsia server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
