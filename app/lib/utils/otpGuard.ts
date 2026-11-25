import { createHmac } from "node:crypto";

// Password-reset code helpers, shared by request-otp and verify-otp.
//
// • Codes are stored as an HMAC, never in plain text: reading the otps table
//   does not let anyone reset a password.
// • Wrong guesses are counted BEFORE the guess is checked, synchronously, so
//   a burst of parallel requests cannot test more than MAX_OTP_ATTEMPTS codes.
//   The counter is in memory (per server process; on serverless each instance
//   keeps its own), kept on globalThis so every route sees the same map.

export const MAX_OTP_ATTEMPTS = 5;
/** Matches the code lifetime in request-otp, so a counter never outlives its code. */
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_KEYS = 5000;

/** HMAC of an email + code pair, as stored in otps.otp (64 hex chars). */
export function hashOtp(email: string, code: string): string {
  return createHmac("sha256", process.env.JWT_SECRET!)
    .update(`password-reset-otp:${email.toLowerCase()}:${code}`)
    .digest("hex");
}

type Attempts = { count: number; since: number };
const globalStore = globalThis as unknown as { __otpAttempts?: Map<string, Attempts> };
const attempts = (globalStore.__otpAttempts ??= new Map<string, Attempts>());

/**
 * Reserves one guess for `email`. Returns false when the limit is already
 * used up (the caller must not check the code). Must be called before any
 * await in the request so parallel requests are counted one by one.
 */
export function reserveOtpAttempt(email: string): { allowed: boolean; last: boolean } {
  const key = email.toLowerCase();
  const now = Date.now();
  let entry = attempts.get(key);
  if (!entry || now - entry.since >= ATTEMPT_WINDOW_MS) entry = { count: 0, since: now };
  if (entry.count >= MAX_OTP_ATTEMPTS) {
    attempts.set(key, entry);
    return { allowed: false, last: true };
  }
  entry.count += 1;
  attempts.set(key, entry);
  if (attempts.size > MAX_KEYS) {
    for (const [k, v] of attempts) if (now - v.since >= ATTEMPT_WINDOW_MS) attempts.delete(k);
  }
  return { allowed: true, last: entry.count >= MAX_OTP_ATTEMPTS };
}

/** Clears the counter: after a correct code, or when a new code is issued. */
export function resetOtpAttempts(email: string): void {
  attempts.delete(email.toLowerCase());
}
