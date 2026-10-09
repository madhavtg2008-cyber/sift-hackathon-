"use client";

import { useEffect } from "react";
import type { Insight, ItemState } from "@/lib/types";

const LEAD_MS = 30 * 60_000;
const SEEN_KEY = "sift:reminded";

/**
 * Local deadline reminders: schedules a browser notification 30 minutes before each of
 * your open deadlines (next 24 h). Timers and notifications are created on this device —
 * no push server is involved, so nothing is sent anywhere.
 */
export function useReminders(insights: Insight[], items: Record<string, ItemState>, enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    } catch {
      /* ignore */
    }
    const now = Date.now();
    const timers = insights
      .filter((i) => i.due && i.forMe && !items[i.key]?.done && !items[i.key]?.dismissed && !seen.includes(i.key))
      .filter((i) => i.due!.ts > now && i.due!.ts - now <= 24 * 3_600_000)
      .map((i) =>
        setTimeout(
          () => {
            const mins = Math.max(1, Math.round((i.due!.ts - Date.now()) / 60_000));
            new Notification(`Due in ${mins} min · ${i.convName}`, { body: i.text.slice(0, 120), tag: i.key, icon: "/icon-192.png" });
            seen.push(i.key);
            try {
              sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
            } catch {
              /* ignore */
            }
          },
          Math.max(0, i.due!.ts - LEAD_MS - now),
        ),
      );
    return () => timers.forEach(clearTimeout);
  }, [insights, items, enabled]);
}
