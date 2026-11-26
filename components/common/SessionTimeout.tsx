"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SESSION_MAX_AGE_MS,
  SESSION_REFRESH_INTERVAL_MS,
  SESSION_WARNING_MS,
  readSessionEnd,
  sessionDeadline,
} from "@/app/lib/constants/session";

const MAX_AGE_HOURS = Math.round(SESSION_MAX_AGE_MS / (60 * 60 * 1000));

// Shared across tabs via localStorage, so activity in one tab keeps the others alive.
const ACTIVITY_KEY = "tv-admin:lastActivity";
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "wheel"] as const;

function readLastActivity(): number {
  try {
    const v = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(v) && v > 0 ? v : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastActivity(t: number) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(t));
  } catch {
    /* storage blocked: this tab still tracks its own activity */
  }
}

/**
 * Signs the admin out after SESSION_IDLE_TIMEOUT_MS of inactivity, or when the session
 * reaches SESSION_MAX_AGE_MS (read from the session-end cookie), whichever comes first,
 * with a warning dialog SESSION_WARNING_MS beforehand. While the user is active the server
 * session is extended via /api/auth/refresh (at most once per SESSION_REFRESH_INTERVAL_MS).
 */
export default function SessionTimeout() {
  const router = useRouter();
  const lastActivity = useRef(0);
  const lastRefresh = useRef(0);
  const endedRef = useRef(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [warningReason, setWarningReason] = useState<"idle" | "max-age">("idle");
  // The max-age warning can't be postponed; once dismissed it stays closed until sign-out.
  const capWarningDismissed = useRef(false);
  const warningOpenRef = useRef(false);
  useEffect(() => {
    warningOpenRef.current = warningOpen;
  }, [warningOpen]);

  const endSession = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* cookie expires on its own shortly anyway */
    }
    router.replace("/login?reason=timeout");
  }, [router]);

  const refresh = useCallback(async () => {
    lastRefresh.current = Date.now();
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (res.status === 401) endSession(); // absolute cap reached or token invalid
    } catch {
      /* offline: try again on the next activity */
    }
  }, [endSession]);

  const markActive = useCallback(() => {
    if (endedRef.current) return;
    const now = Date.now();
    lastActivity.current = now;
    writeLastActivity(now);
    if (now - lastRefresh.current >= SESSION_REFRESH_INTERVAL_MS) refresh();
  }, [refresh]);

  useEffect(() => {
    lastActivity.current = Date.now();
    lastRefresh.current = Date.now(); // the page load itself came with a valid session
    writeLastActivity(lastActivity.current);

    // While the warning is shown, passive movement shouldn't silently dismiss it:
    // the user must click "Stay signed in".
    const onActivity = () => {
      if (!warningOpenRef.current) markActive();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY) lastActivity.current = Math.max(lastActivity.current, readLastActivity());
    };
    window.addEventListener("storage", onStorage);

    const tick = window.setInterval(() => {
      if (endedRef.current) return;
      const last = Math.max(lastActivity.current, readLastActivity());
      lastActivity.current = last;
      const deadline = sessionDeadline(last, readSessionEnd(document.cookie));
      const remaining = deadline.at - Date.now();
      if (remaining <= 0) {
        setWarningOpen(false);
        endSession();
      } else if (remaining <= SESSION_WARNING_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
        setWarningReason(deadline.reason);
        setWarningOpen(deadline.reason === "idle" || !capWarningDismissed.current);
      } else {
        setWarningOpen(false); // e.g. another tab extended the session
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("storage", onStorage);
      window.clearInterval(tick);
    };
  }, [markActive, endSession]);

  const staySignedIn = () => {
    lastRefresh.current = 0; // force a server refresh now
    markActive();
    setWarningOpen(false);
  };

  const dismissCapWarning = () => {
    capWarningDismissed.current = true;
    setWarningOpen(false);
  };

  const countdown = <span className="font-semibold text-foreground tabular-nums">{secondsLeft}s</span>;
  const isCap = warningReason === "max-age";

  return (
    <Dialog open={warningOpen} onOpenChange={(open) => !open && (isCap ? dismissCapWarning() : staySignedIn())}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCap ? "Session ending" : "Still there?"}</DialogTitle>
          <DialogDescription>
            {isCap ? (
              <>
                For security, a session lasts at most {MAX_AGE_HOURS} hours. You&apos;ll be signed out in {countdown}.
                Save your work, then sign in again.
              </>
            ) : (
              <>
                You&apos;ve been inactive for a while. For security you&apos;ll be signed out in {countdown}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setWarningOpen(false); endSession(); }}>
            {isCap ? "Sign in again" : "Log out"}
          </Button>
          {isCap ? <Button onClick={dismissCapWarning}>OK</Button> : <Button onClick={staySignedIn}>Stay signed in</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
