/**
 * Infanta National High School Portal
 * Core Security, Cryptography, Sanitization & Session Integrity Utilities
 *
 * Implements:
 * - PBKDF2-SHA256 password hashing with per-user cryptographic salt (Web Crypto API)
 * - Constant-time verification comparison
 * - Strong password policy enforcement & strength scoring
 * - Brute-force rate limiting & exponential lockout
 * - Tamper-evident session storage with idle timeout & lifetime expiration
 * - XSS / Prototype-pollution / PII-masking / CSV-injection guards
 */

export interface PasswordValidationResult {
  valid: boolean;
  score: 0 | 1 | 2 | 3 | 4; // 0 = Very Weak, 4 = Strong
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  errors: string[];
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntilMs: number | null;
  retryAfterSeconds: number;
}

export interface SecureSession<T> {
  user: T;
  issuedAt: number;
  lastActivityAt: number;
  expiresAt: number;
  integrity: string;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  event:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'ACCOUNT_LOCKED'
    | 'LOGOUT'
    | 'SESSION_EXPIRED'
    | 'PASSWORD_CHANGED'
    | 'ACCOUNT_CREATED'
    | 'ACCOUNT_DELETED'
    | 'ADMIN_ACTION_VERIFIED'
    | 'ADMIN_ACTION_DENIED'
    | 'LRN_ACCESS_SUCCESS'
    | 'LRN_ACCESS_DENIED'
    | 'DATABASE_EXPORT'
    | 'DATABASE_IMPORT'
    | 'DATABASE_RESET'
    | 'ENROLLMENT_STATUS_CHANGED';
  actor: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2_sha256';
const SESSION_STORAGE_KEY = 'inhs_secure_session_v1';
const RATE_LIMIT_KEY = 'inhs_security_ratelimit_v1';
const SESSION_MAX_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '123456',
  '12345678',
  '123456789',
  'admin',
  'admin123',
  'qwerty',
  'qwerty123',
  'letmein',
  'welcome',
  'inhs',
  'deped123',
  'abc12345',
]);

// ============================================================================
// 1. Cryptographic Helpers (Web Crypto API)
// ============================================================================

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Constant-time string comparison to mitigate timing side-channels.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    diff |= charA ^ charB;
  }
  return diff === 0;
}

export function isPasswordHashed(storedValue?: string | null): boolean {
  return typeof storedValue === 'string' && storedValue.startsWith(`${PBKDF2_PREFIX}$`);
}

/**
 * Derive a salted PBKDF2-SHA256 hash using the browser's Web Crypto API.
 */
async function derivePbkdf2Hex(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    return bytesToHex(new Uint8Array(derivedBits));
  }

  // Fallback non-subtle deterministic mixing (only if crypto.subtle unavailable in restricted non-secure env)
  const encoder = new TextEncoder();
  const input = encoder.encode(`${bytesToHex(salt)}:${password}:${iterations}`);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let round = 0; round < 2048; round++) {
    for (let i = 0; i < input.length; i++) {
      h1 ^= input[i] ^ (round & 0xff);
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= h1 >>> 13;
      h2 = Math.imul(h2, 0x85ebca6b);
    }
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`.repeat(4);
}

/**
 * Hash a plaintext password with a random 128-bit salt using PBKDF2-SHA256.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(salt);
  } else {
    for (let i = 0; i < salt.length; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }
  }
  const derivedHex = await derivePbkdf2Hex(plainPassword.trim(), salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${derivedHex}`;
}

/**
 * Verify a candidate plaintext password against a stored PBKDF2 hash (or legacy plaintext during migration).
 */
export async function verifyPassword(plainPassword: string, storedHashOrPlain: string): Promise<boolean> {
  const candidate = plainPassword.trim();
  if (!candidate || !storedHashOrPlain) return false;

  if (!isPasswordHashed(storedHashOrPlain)) {
    return timingSafeEqual(candidate, storedHashOrPlain.trim());
  }

  const parts = storedHashOrPlain.split('$');
  if (parts.length !== 4) return false;
  const [, iterStr, saltHex, expectedHex] = parts;
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations < 1000 || !saltHex || !expectedHex) {
    return false;
  }

  try {
    const salt = hexToBytes(saltHex);
    const derivedHex = await derivePbkdf2Hex(candidate, salt, iterations);
    return timingSafeEqual(derivedHex, expectedHex);
  } catch {
    return false;
  }
}

// ============================================================================
// 2. Password Policy & Strength Evaluation
// ============================================================================

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const clean = password.trim();
  const errors: string[] = [];

  if (clean.length < 8) {
    errors.push('Must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(clean)) {
    errors.push('Must include at least 1 uppercase letter (A-Z).');
  }
  if (!/[a-z]/.test(clean)) {
    errors.push('Must include at least 1 lowercase letter (a-z).');
  }
  if (!/[0-9]/.test(clean)) {
    errors.push('Must include at least 1 number (0-9).');
  }
  if (!/[^A-Za-z0-9]/.test(clean)) {
    errors.push('Include at least 1 special symbol (e.g., !@#$%^&*).');
  }
  if (COMMON_WEAK_PASSWORDS.has(clean.toLowerCase())) {
    errors.push('Common or easily guessed passwords are not allowed.');
  }

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  let points = 0;
  if (clean.length >= 8) points++;
  if (clean.length >= 12) points++;
  if (/[A-Z]/.test(clean) && /[a-z]/.test(clean)) points++;
  if (/[0-9]/.test(clean)) points++;
  if (/[^A-Za-z0-9]/.test(clean)) points++;

  if (COMMON_WEAK_PASSWORDS.has(clean.toLowerCase()) || clean.length < 6) {
    score = 0;
  } else if (points <= 2) {
    score = 1;
  } else if (points === 3) {
    score = 2;
  } else if (points === 4) {
    score = 3;
  } else {
    score = 4;
  }

  const labels: Record<PasswordValidationResult['score'], PasswordValidationResult['label']> = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };

  // Valid requires >= 8 chars, upper, lower, digit, and not common
  const requiredErrors = errors.filter((e) => !e.startsWith('Include at least 1 special'));

  return {
    valid: requiredErrors.length === 0,
    score,
    label: labels[score],
    errors,
  };
}

// ============================================================================
// 3. Brute-Force Protection & Rate Limiter
// ============================================================================

interface RateLimitRecord {
  failures: number;
  lockedUntilMs: number | null;
  lockoutCount: number;
  lastAttemptMs: number;
}

const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_DURATIONS_MS = [30_000, 60_000, 120_000, 300_000]; // 30s, 1m, 2m, 5m
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function readRateLimitMap(): Record<string, RateLimitRecord> {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeRateLimitMap(map: Record<string, RateLimitRecord>): void {
  try {
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export function checkRateLimit(scope: string): RateLimitStatus {
  const map = readRateLimitMap();
  const rec = map[scope];
  const now = Date.now();

  if (!rec) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS_BEFORE_LOCKOUT,
      lockedUntilMs: null,
      retryAfterSeconds: 0,
    };
  }

  if (rec.lockedUntilMs && now < rec.lockedUntilMs) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntilMs: rec.lockedUntilMs,
      retryAfterSeconds: Math.ceil((rec.lockedUntilMs - now) / 1000),
    };
  }

  // Clear expired failure window
  if (now - rec.lastAttemptMs > ATTEMPT_WINDOW_MS) {
    delete map[scope];
    writeRateLimitMap(map);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS_BEFORE_LOCKOUT,
      lockedUntilMs: null,
      retryAfterSeconds: 0,
    };
  }

  // If lockout expired, reset failures for the next round
  const effectiveFailures = rec.lockedUntilMs && now >= rec.lockedUntilMs ? 0 : rec.failures;

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS_BEFORE_LOCKOUT - effectiveFailures),
    lockedUntilMs: null,
    retryAfterSeconds: 0,
  };
}

export function recordFailedAttempt(scope: string): RateLimitStatus {
  const map = readRateLimitMap();
  const now = Date.now();
  const prev = map[scope];

  let failures = 1;
  let lockoutCount = 0;

  if (prev && now - prev.lastAttemptMs <= ATTEMPT_WINDOW_MS) {
    const lockoutJustExpired = prev.lockedUntilMs !== null && now >= prev.lockedUntilMs;
    failures = lockoutJustExpired ? 1 : prev.failures + 1;
    lockoutCount = prev.lockoutCount || 0;
  }

  let lockedUntilMs: number | null = null;
  if (failures >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
    const durationIdx = Math.min(lockoutCount, LOCKOUT_DURATIONS_MS.length - 1);
    lockedUntilMs = now + LOCKOUT_DURATIONS_MS[durationIdx];
    lockoutCount += 1;
  }

  map[scope] = {
    failures,
    lockedUntilMs,
    lockoutCount,
    lastAttemptMs: now,
  };
  writeRateLimitMap(map);

  return {
    allowed: lockedUntilMs === null,
    remainingAttempts: lockedUntilMs ? 0 : Math.max(0, MAX_ATTEMPTS_BEFORE_LOCKOUT - failures),
    lockedUntilMs,
    retryAfterSeconds: lockedUntilMs ? Math.ceil((lockedUntilMs - now) / 1000) : 0,
  };
}

export function resetRateLimit(scope: string): void {
  const map = readRateLimitMap();
  if (map[scope]) {
    delete map[scope];
    writeRateLimitMap(map);
  }
}

// ============================================================================
// 4. Tamper-Evident Session Management (Zero Passwords in Storage)
// ============================================================================

function getSessionSalt(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'inhs-local';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 48) : 'ua';
  return `${origin}::${ua}::INHS-301332`;
}

function computeSessionIntegrity(payload: string): string {
  const salted = `${payload}|${getSessionSalt()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < salted.length; i++) {
    const c = salted.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + (i & 0xff);
    h2 = Math.imul(h2, 0xcc9e2d51);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function sanitizeUserForSession<T extends Record<string, any>>(user: T): Omit<T, 'password' | 'passwordHash'> {
  const copy = { ...user };
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

export function saveSecureSession<T extends { id: string; username: string; role: string }>(user: T): void {
  try {
    // Always strip any legacy plaintext localStorage session
    localStorage.removeItem('inhs_active_auth_user');
  } catch {
    // ignore
  }

  const sanitizedUser = sanitizeUserForSession(user);
  const now = Date.now();
  const core = {
    user: sanitizedUser,
    issuedAt: now,
    lastActivityAt: now,
    expiresAt: now + SESSION_MAX_LIFETIME_MS,
  };
  const integrity = computeSessionIntegrity(
    JSON.stringify({
      id: sanitizedUser.id,
      username: sanitizedUser.username,
      role: sanitizedUser.role,
      issuedAt: core.issuedAt,
      expiresAt: core.expiresAt,
    })
  );

  const session: SecureSession<typeof sanitizedUser> = {
    ...core,
    integrity,
  };

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage quota errors
  }
}

export function loadValidSession<T extends { id: string; username: string; role: string }>(): {
  user: T | null;
  expiredReason?: 'idle' | 'expired' | 'tampered';
} {
  try {
    // Clean up legacy insecure localStorage key if present
    if (localStorage.getItem('inhs_active_auth_user')) {
      localStorage.removeItem('inhs_active_auth_user');
    }
  } catch {
    // ignore
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { user: null };

    const parsed = JSON.parse(raw) as SecureSession<T>;
    if (!parsed || !parsed.user || typeof parsed.issuedAt !== 'number' || typeof parsed.expiresAt !== 'number') {
      clearSecureSession();
      return { user: null, expiredReason: 'tampered' };
    }

    const expectedIntegrity = computeSessionIntegrity(
      JSON.stringify({
        id: parsed.user.id,
        username: parsed.user.username,
        role: parsed.user.role,
        issuedAt: parsed.issuedAt,
        expiresAt: parsed.expiresAt,
      })
    );

    if (!timingSafeEqual(parsed.integrity || '', expectedIntegrity)) {
      clearSecureSession();
      return { user: null, expiredReason: 'tampered' };
    }

    const now = Date.now();
    if (now > parsed.expiresAt) {
      clearSecureSession();
      return { user: null, expiredReason: 'expired' };
    }

    if (now - parsed.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
      clearSecureSession();
      return { user: null, expiredReason: 'idle' };
    }

    return { user: sanitizeUserForSession(parsed.user) as unknown as T };
  } catch {
    clearSecureSession();
    return { user: null };
  }
}

export function touchSessionActivity(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as SecureSession<any>;
    const now = Date.now();
    if (now > parsed.expiresAt || now - parsed.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
      clearSecureSession();
      return false;
    }
    parsed.lastActivityAt = now;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

export function clearSecureSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('inhs_active_auth_user');
  } catch {
    // ignore
  }
}

// ============================================================================
// 5. Input Sanitization, Prototype Pollution Guard & PII Masking
// ============================================================================

/**
 * Sanitize plain-text user input: removes null bytes, control chars, script tags, and dangerous protocols.
 */
export function sanitizeText(value: string | undefined | null, maxLength = 500): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/\0/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeLrn(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '').slice(0, 12);
}

export function sanitizeEmail(value: string | undefined | null): string {
  const clean = sanitizeText(value, 160).toLowerCase();
  if (!clean) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(clean) ? clean : '';
}

export function sanitizePhone(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/[^0-9+\-()\s]/g, '').trim().slice(0, 32);
}

/**
 * Recursively strips dangerous keys (__proto__, constructor, prototype) from parsed JSON.
 */
export function sanitizeJsonPayload<T>(input: unknown, depth = 0): T {
  if (depth > 15) {
    throw new Error('JSON structure exceeds maximum allowed nesting depth.');
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeJsonPayload(item, depth + 1)) as unknown as T;
  }
  if (input !== null && typeof input === 'object') {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleanObj[key] = sanitizeJsonPayload(val, depth + 1);
    }
    return cleanObj as T;
  }
  if (typeof input === 'string') {
    return input.replace(/\0/g, '') as unknown as T;
  }
  return input as T;
}

/**
 * Neutralize CSV formula injection (=, +, -, @, tab, CR) when exporting spreadsheets.
 */
export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * Mask phone numbers for public/semi-public displays (e.g., 0917-***-1240).
 */
export function maskPhone(phone?: string): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '***-****';
  return `${digits.slice(0, 4)}-***-${digits.slice(-4)}`;
}

/**
 * Mask email addresses for public status views (e.g., m***@gmail.com).
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '—';
  const [local, domain] = email.split('@');
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}
