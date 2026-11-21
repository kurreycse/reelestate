export const AUTH_INACTIVITY_MS = 5 * 60 * 1000;

const LAST_ACTIVITY_KEY = "reelestate-last-auth-activity";

export function startAuthInactivityTimer(onInactive: () => void | Promise<void>) {
  let timer: number | undefined;
  let stopped = false;

  const readLastActivity = () => {
    const stored = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : Date.now();
  };

  const clearStoredActivity = () => {
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  };

  const expireIfInactive = () => {
    if (stopped) return;
    const remaining = AUTH_INACTIVITY_MS - (Date.now() - readLastActivity());
    if (remaining > 0) {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(expireIfInactive, remaining);
      return;
    }
    clearStoredActivity();
    void onInactive();
  };

  const recordActivity = () => {
    if (stopped) return;
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(expireIfInactive, AUTH_INACTIVITY_MS);
  };

  const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
  events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
  document.addEventListener("visibilitychange", expireIfInactive);

  recordActivity();

  return () => {
    stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
    events.forEach((event) => window.removeEventListener(event, recordActivity));
    document.removeEventListener("visibilitychange", expireIfInactive);
    clearStoredActivity();
  };
}
