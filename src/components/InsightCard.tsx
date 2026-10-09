"use client";

import { useState } from "react";
import type { Insight, ItemState } from "@/lib/types";
import { downloadIcs } from "@/lib/calendar";
import { relTime } from "@/lib/util";
import { Avatar, KindChip, PriorityPill } from "./ui";

export interface InsightActions {
  setItem: (key: string, patch: Partial<ItemState>) => void;
  open: (convId: string, msgId: string) => void;
}

function snoozeTargets(now = new Date()) {
  const inHour = now.getTime() + 3_600_000;
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);
  if (tonight.getTime() <= now.getTime()) tonight.setDate(tonight.getDate() + 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return [
    { label: "1 hour", ts: inHour },
    { label: "Tonight 8 PM", ts: tonight.getTime() },
    { label: "Tomorrow 9 AM", ts: tomorrow.getTime() },
  ];
}

export function InsightCard({
  insight: i,
  state,
  actions,
  showConv = true,
  index = 0,
  showReasons = false,
}: {
  insight: Insight;
  state?: ItemState;
  actions: InsightActions;
  showConv?: boolean;
  index?: number;
  showReasons?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [why, setWhy] = useState(showReasons);
  const done = !!state?.done;
  const snoozed = state?.snoozedUntil && state.snoozedUntil > Date.now();
  return (
    <article
      className={`rise group relative rounded-xl border bg-panel p-3.5 transition hover:border-line2 ${done ? "border-line opacity-55" : "border-line"}`}
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => actions.setItem(i.key, { done: !done })}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          title={done ? "Mark as not done" : "Mark done"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[0.6875rem] transition ${
            done ? "border-accent bg-accent text-accent-ink" : "border-line2 text-transparent hover:border-accent hover:text-accent"
          }`}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <Avatar name={i.author} size={18} />
            <span className="font-medium text-ink">{i.author}</span>
            {showConv && (
              <>
                <span className="text-faint">in</span>
                <button onClick={() => actions.open(i.convId, i.msgId)} className="truncate hover:text-ink hover:underline">
                  {i.convName}
                </button>
              </>
            )}
            <span className="text-faint">· {relTime(i.ts)}</span>
            {i.unread && <span className="rounded bg-accent/15 px-1.5 py-px text-[0.625rem] font-semibold text-accent">NEW</span>}
          </div>
          <p className={`mt-1.5 whitespace-pre-wrap break-words text-[0.875rem] leading-relaxed ${done ? "line-through" : ""}`}>{i.text}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <PriorityPill priority={i.priority} />
            {i.kinds.map((k) => (
              <KindChip key={k} kind={k} compact />
            ))}
            {i.due && (
              <span
                className={`rounded-md px-1.5 py-0.5 font-mono text-[0.6875rem] ${i.due.overdue ? "bg-crit/15 text-crit" : "bg-panel2 text-k-deadline"}`}
              >
                {i.due.overdue ? "overdue · " : "due · "}
                {i.due.label}
              </span>
            )}
            {snoozed && (
              <span className="rounded-md bg-panel2 px-1.5 py-0.5 text-[0.6875rem] text-muted">
                snoozed till {new Date(state!.snoozedUntil!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => setWhy((w) => !w)}
              className="ml-auto rounded px-1.5 text-[0.6875rem] text-faint hover:text-ink"
              aria-expanded={why}
            >
              {why ? "hide why" : "why?"}
            </button>
          </div>
          {why && (
            <p className="rise mt-2 text-[0.7188rem] text-faint">
              Score {i.score}/100 · {i.reasons.filter((r) => !r.startsWith("Due ")).join(" · ")}
            </p>
          )}
        </div>
        <div className="relative flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
          <button
            onClick={() => actions.open(i.convId, i.msgId)}
            className="rounded-md px-2 py-1 text-xs text-muted hover:bg-panel2 hover:text-ink"
            title="Open in conversation"
          >
            Open ↗
          </button>
          <button
            onClick={() => setMenu((m) => !m)}
            className="rounded-md px-2 py-1 text-xs text-muted hover:bg-panel2 hover:text-ink"
            aria-haspopup="menu"
            aria-expanded={menu}
          >
            ⋯
          </button>
          {menu && (
            <div
              role="menu"
              className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg border border-line2 bg-panel2 py-1 text-sm shadow-xl"
              onMouseLeave={() => setMenu(false)}
            >
              <p className="px-3 pb-1 pt-1.5 text-[0.625rem] uppercase tracking-wider text-faint">Snooze until</p>
              {snoozeTargets().map((s) => (
                <button
                  key={s.label}
                  role="menuitem"
                  className="block w-full px-3 py-1.5 text-left hover:bg-line"
                  onClick={() => {
                    actions.setItem(i.key, { snoozedUntil: s.ts });
                    setMenu(false);
                  }}
                >
                  {s.label}
                </button>
              ))}
              {snoozed && (
                <button
                  role="menuitem"
                  className="block w-full px-3 py-1.5 text-left hover:bg-line"
                  onClick={() => {
                    actions.setItem(i.key, { snoozedUntil: undefined });
                    setMenu(false);
                  }}
                >
                  Unsnooze
                </button>
              )}
              <div className="my-1 border-t border-line" />
              <button
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-muted hover:bg-line hover:text-ink"
                onClick={() => {
                  actions.setItem(i.key, { dismissed: true });
                  setMenu(false);
                }}
              >
                Not important — hide
              </button>
              {i.due && !i.due.overdue && (
                <button
                  role="menuitem"
                  className="block w-full px-3 py-1.5 text-left text-muted hover:bg-line hover:text-ink"
                  onClick={() => {
                    downloadIcs(
                      [
                        {
                          id: i.key,
                          title: i.text.length > 80 ? i.text.slice(0, 79) + "…" : i.text,
                          description: `${i.author} in ${i.convName}`,
                          start: i.due!.ts,
                        },
                      ],
                      "sift-deadline.ics",
                    );
                    setMenu(false);
                  }}
                >
                  Add to calendar
                </button>
              )}
              <button
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-muted hover:bg-line hover:text-ink"
                onClick={() => {
                  navigator.clipboard?.writeText(`${i.text}${i.due ? ` (due ${i.due.label})` : ""} — ${i.author}, ${i.convName}`);
                  setMenu(false);
                }}
              >
                Copy as task
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
