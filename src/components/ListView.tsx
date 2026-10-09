"use client";

import { useMemo, useState } from "react";
import type { Insight, ItemState, Kind } from "@/lib/types";
import { InsightCard, type InsightActions } from "./InsightCard";
import { Empty, KIND_META } from "./ui";

export type ListFilter = "action" | "deadline" | "decision" | "mention" | "question";

const TITLES: Record<ListFilter, [string, string]> = {
  action: ["Tasks", "Things people asked you (or everyone) to do, and things you promised."],
  deadline: ["Deadlines", "Every date and time mentioned alongside a task, decision or callout."],
  decision: ["Decisions", "What groups agreed on, so you don't re-open settled topics."],
  mention: ["Mentions", "Where you were tagged by name or called out with the whole group."],
  question: ["Questions", "Questions directed at you. Unanswered ones rank higher."],
};

export function ListView({
  filter,
  all,
  items,
  actions,
  showReasons,
}: {
  showReasons?: boolean;
  filter: ListFilter;
  all: Insight[];
  items: Record<string, ItemState>;
  actions: InsightActions;
}) {
  const [scope, setScope] = useState<"me" | "all">(filter === "decision" ? "all" : "me");
  const [showDone, setShowDone] = useState(false);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [sort, setSort] = useState<"priority" | "due" | "recent">(filter === "deadline" ? "due" : "priority");
  const now = Date.now();

  const base = useMemo(() => all.filter((i) => i.kinds.includes(filter as Kind) && !items[i.key]?.dismissed), [all, filter, items]);
  const snoozedCount = base.filter((i) => (items[i.key]?.snoozedUntil ?? 0) > now).length;
  const doneCount = base.filter((i) => items[i.key]?.done).length;

  const list = base
    .filter((i) => scope === "all" || i.forMe)
    .filter((i) => showDone || !items[i.key]?.done)
    .filter((i) => showSnoozed || (items[i.key]?.snoozedUntil ?? 0) <= now)
    .sort((a, b) =>
      sort === "priority" ? b.score - a.score : sort === "recent" ? b.ts - a.ts : (a.due?.ts ?? Infinity) - (b.due?.ts ?? Infinity),
    );

  const [title, desc] = TITLES[filter];
  const meta = KIND_META[filter as Kind];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="font-display text-4xl">
        <span style={{ color: meta.color }} className="mr-2 font-mono text-2xl align-middle">
          {meta.icon}
        </span>
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted">{desc}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex gap-0.5 rounded-lg bg-panel p-0.5">
          {(
            [
              ["me", "For me"],
              ["all", "Everything"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setScope(k)}
              className={`rounded-md px-2.5 py-1 ${scope === k ? "bg-panel2 text-ink" : "text-muted hover:text-ink"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-7 rounded-lg border border-line2 bg-panel px-2 text-xs text-ink outline-none"
          aria-label="Sort"
        >
          <option value="priority">Sort: priority</option>
          <option value="due">Sort: due date</option>
          <option value="recent">Sort: most recent</option>
        </select>
        <label className="ml-auto flex items-center gap-1.5 text-muted">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Show done ({doneCount})
        </label>
        {snoozedCount > 0 && (
          <label className="flex items-center gap-1.5 text-muted">
            <input
              type="checkbox"
              checked={showSnoozed}
              onChange={(e) => setShowSnoozed(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            Snoozed ({snoozedCount})
          </label>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {list.length ? (
          list.map((i, idx) => (
            <InsightCard key={i.key} insight={i} state={items[i.key]} actions={actions} index={idx} showReasons={showReasons} />
          ))
        ) : (
          <Empty
            title="All clear"
            body={
              scope === "me"
                ? "Nothing here for you. Switch to “Everything” to see the whole group's items."
                : "No items found in your chats."
            }
          />
        )}
      </div>
    </div>
  );
}
