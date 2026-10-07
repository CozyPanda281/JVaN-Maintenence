/**
 * JVāN Security & Authentication Engine
 * Cryptographic SHA-256 hashing, session verification, and brute-force protection
 */

const AUTH_HASH_KEY = 'jvan_admin_pwd_hash';
const SESSION_AUTH_KEY = 'jvan_admin_authenticated';
const SESSION_EXPIRY_KEY = 'jvan_admin_session_expiry';
const FAILED_ATTEMPTS_KEY = 'jvan_auth_failed_attempts';
const LOCKOUT_TIMESTAMP_KEY = 'jvan_auth_lockout_until';

const DEFAULT_PASSCODE = 'jvan2026';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Computes a cryptographic SHA-256 hex string from plaintext
 */
export const hashPassword = async (plaintext) => {
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verifies entered passcode against stored or default hash
 */
export const verifyPasscode = async (enteredPasscode) => {
  // Check lockout
  if (isTerminalLocked()) {
    return { success: false, locked: true, remainingSec: getRemainingLockoutSec() };
  }

  const enteredHash = await hashPassword(enteredPasscode.trim());
  const storedHash = localStorage.getItem(AUTH_HASH_KEY);

  let isMatch = false;
  if (storedHash) {
    isMatch = (enteredHash === storedHash);
  } else {
    const defaultHash = await hashPassword(DEFAULT_PASSCODE);
    isMatch = (enteredHash === defaultHash);
  }

  if (isMatch) {
    // Reset failed counter
    resetFailedAttempts();
    // Set active session with expiry
    grantAdminSession();
    return { success: true };
  } else {
    // Record failure
    const attempts = recordFailedAttempt();
    if (attempts >= MAX_ATTEMPTS) {
      lockTerminal();
      return { success: false, locked: true, remainingSec: LOCKOUT_DURATION_MS / 1000 };
    }
    return { 
      success: false, 
      locked: false, 
      attemptsRemaining: MAX_ATTEMPTS - attempts 
    };
  }
};

/**
 * Updates master passcode to a new value
 */
export const updateMasterPasscode = async (currentPasscode, newPasscode) => {
  const verify = await verifyPasscode(currentPasscode);
  if (!verify.success) {
    return { success: false, message: "Current passcode is incorrect." };
  }

  if (!newPasscode || newPasscode.trim().length < 6) {
    return { success: false, message: "New passcode must be at least 6 characters." };
  }

  const newHash = await hashPassword(newPasscode.trim());
  localStorage.setItem(AUTH_HASH_KEY, newHash);
  return { success: true, message: "Passcode successfully updated." };
};

/**
 * Checks if current user has an active, unexpired admin session
 */
export const hasActiveAdminSession = () => {
  try {
    const isAuth = sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
    if (!isAuth) return false;
    const expiry = parseInt(sessionStorage.getItem(SESSION_EXPIRY_KEY) || '0', 10);
    if (Date.now() > expiry) {
      clearAdminSession();
      return false;
    }
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Grants an authenticated session
 */
export const grantAdminSession = () => {
  sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
  sessionStorage.setItem(SESSION_EXPIRY_KEY, (Date.now() + SESSION_DURATION_MS).toString());
};

/**
 * Clears current admin session (Logout)
 */
export const clearAdminSession = () => {
  sessionStorage.removeItem(SESSION_AUTH_KEY);
  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
};

// Rate-limiting & Lockout helpers
export const isTerminalLocked = () => {
  const until = parseInt(localStorage.getItem(LOCKOUT_TIMESTAMP_KEY) || '0', 10);
  return Date.now() < until;
};

export const getRemainingLockoutSec = () => {
  const until = parseInt(localStorage.getItem(LOCKOUT_TIMESTAMP_KEY) || '0', 10);
  const diff = until - Date.now();
  return Math.max(0, Math.ceil(diff / 1000));
};

const recordFailedAttempt = () => {
  const current = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, current.toString());
  return current;
};

const resetFailedAttempts = () => {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_TIMESTAMP_KEY);
};

const lockTerminal = () => {
  const until = Date.now() + LOCKOUT_DURATION_MS;
  localStorage.setItem(LOCKOUT_TIMESTAMP_KEY, until.toString());
};
