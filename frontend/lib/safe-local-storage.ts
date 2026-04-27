let warnedUnavailable = false;

function warnOnce(message: string) {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(message);
  }
}

export const safeLocalStorage = {
  get(key: string): string | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch (err) {
      warnOnce("[safeLocalStorage] localStorage unavailable; continuing without persistence.");
      return null;
    }
  },

  set(key: string, value: string): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      warnOnce("[safeLocalStorage] localStorage unavailable; continuing without persistence.");
      return false;
    }
  },
};

