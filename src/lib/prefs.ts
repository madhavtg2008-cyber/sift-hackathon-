"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PREFS, PREFS_KEY as KEY, applyPrefs, readPrefs, type UiPrefs } from "./prefs-shared";

export * from "./prefs-shared";

export function usePrefs() {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    setPrefs(readPrefs());
  }, []);
  const update = (patch: Partial<UiPrefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      applyPrefs(next);
      return next;
    });
  return { prefs, update };
}

