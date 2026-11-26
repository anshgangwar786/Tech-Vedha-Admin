// Admin session timing. Shared by the auth API routes (server) and the
// SessionTimeout component (client), so keep this file free of server-only imports.

/** Signed out after this long with no mouse/keyboard/touch activity in any tab. */
export const SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours

/** The "you're about to be signed out" dialog opens this long before the idle timeout. */
export const SESSION_WARNING_MS = 60 * 1000; // 1 minute

/** Hard cap: a session can't be kept alive past this, however active the user is. */
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

/** While the user is active, the client re-extends the server session at most this often. */
export const SESSION_REFRESH_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * How long the server token outlives the client's own sign-out deadline (idle timeout or
 * SESSION_MAX_AGE_MS, whichever comes first). The client timer, which also covers the
 * refresh throttle, therefore always fires first and the user sees the warning dialog
 * instead of a silent 401.
 */
export const SESSION_GRACE_MS = 2 * SESSION_REFRESH_INTERVAL_MS;

/** Server token/cookie lifetime per refresh (see SESSION_GRACE_MS). */
export const SESSION_TOKEN_TTL_MS = SESSION_IDLE_TIMEOUT_MS + SESSION_GRACE_MS;

/**
 * Readable (not httpOnly) cookie holding the ms epoch at which the session hits
 * SESSION_MAX_AGE_MS. Set with the auth cookie, shared by every tab, so the client can
 * warn and sign out before the absolute cap instead of failing with a 401.
 */
export const SESSION_END_COOKIE = "sessionEndsAt";

/** Reads SESSION_END_COOKIE from a `document.cookie` string; null when absent or invalid. */
export function readSessionEnd(cookieHeader: string): number | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_END_COOKIE}=(\\d+)(?:;|$)`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * When the client must sign out: after SESSION_IDLE_TIMEOUT_MS without activity, or at the
 * session's absolute end, whichever comes first. `reason` picks the warning wording, since
 * activity can postpone an idle sign-out but never the absolute one.
 */
export function sessionDeadline(
  lastActivity: number,
  sessionEndsAt: number | null,
): { at: number; reason: "idle" | "max-age" } {
  const idleAt = lastActivity + SESSION_IDLE_TIMEOUT_MS;
  return sessionEndsAt !== null && sessionEndsAt < idleAt
    ? { at: sessionEndsAt, reason: "max-age" }
    : { at: idleAt, reason: "idle" };
}
