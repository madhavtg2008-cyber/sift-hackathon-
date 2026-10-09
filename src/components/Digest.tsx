"use client";

import type { ConvAnalysis, Conversation, Insight, ItemState, Profile } from "@/lib/types";
import { relTime } from "@/lib/util";
import { InsightCard, type InsightActions } from "./InsightCard";
import { Button, Empty } from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Digest({
  profile,
  conversations,
  analyses,
  visible,
  items,
  actions,
  openList,
  markAllRead,
  onImport,
  showReasons,
}: {
  profile: Profile;
  conversations: Conversation[];
  analyses: Map<string, ConvAnalysis>;
  visible: Insight[];
  items: Record<string, ItemState>;
  actions: InsightActions;
  openConv: (id: string) => void;
  openList: (f: "action" | "deadline" | "decision" | "mention" | "question") => void;
  markAllRead: () => void;
  onImport: () => void;
  showReasons?: boolean;
}) {
  if (!conversations.length)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Empty
          title="Nothing to sift yet"
          body="Upload a WhatsApp export or paste a chat to get started. Everything is analysed on this device and never uploaded."
          action={
            <Button variant="primary" onClick={onImport}>
              + Add your first chat
            </Button>
          }
        />
      </div>
    );

  const now = Date.now();
  const open = visible.filter((i) => !items[i.key]?.done);
  const unreadTotal = [...analyses.values()].reduce((n, a) => n + a.unread, 0);
  const unreadChats = [...analyses.values()].filter((a) => a.unread > 0).length;
  const needsYou = open.filter((i) => i.forMe && i.score >= 48).sort((a, b) => b.score - a.score);
  const needReply = open.filter(
    (i) => i.kinds.includes("question") && i.forMe && !i.answered && !i.reasons.includes("Question to the group"),
  );
  const deadlines = open
    .filter((i) => i.due && (i.forMe || i.kinds.includes("action") || i.kinds.includes("decision") || i.kinds.includes("urgent")))
    .filter((i) => i.due!.ts > now - 3 * 86_400_000 && i.due!.ts < now + 14 * 86_400_000)
    .sort((a, b) => a.due!.ts - b.due!.ts);
  const due48 = deadlines.filter((i) => i.due!.ts - now < 48 * 3_600_000).length;
  const decisions = open.filter((i) => i.kinds.includes("decision")).sort((a, b) => b.ts - a.ts);
  const missed = open.filter((i) => i.kinds.includes("mention") && !i.answered && i.forMe).sort((a, b) => b.ts - a.ts);

  // reading-time estimate: unread words vs. the surfaced items' words, at 200 wpm
  const unreadWords = conversations.reduce(
    (n, c) => n + c.messages.slice(c.lastReadIndex + 1).reduce((w, m) => w + m.text.split(/\s+/).length, 0),
    0,
  );
  const unreadHighlights = open.filter((i) => i.unread);
  const highlightWords = unreadHighlights.reduce((w, i) => w + i.text.split(/\s+/).length, 0);
  const savedMin = Math.max(0, (unreadWords - highlightWords) / 200 + (unreadTotal - unreadHighlights.length) * 0.05);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="rise">
        <p className="text-sm text-muted">
          {greeting()}, {profile.name}.
        </p>
        <h1 className="mt-1 font-display text-[2.125rem] leading-[1.1] sm:text-[2.75rem]">
          {needsYou.length ? (
            <>
              <span className="italic text-accent">{needsYou.length}</span> thing{needsYou.length === 1 ? "" : "s"} need you
              {unreadTotal ? (
                <span className="text-muted">
                  {" "}
                  out of {unreadTotal} unread message{unreadTotal === 1 ? "" : "s"}.
                </span>
              ) : (
                "."
              )}
            </>
          ) : unreadTotal ? (
            <>
              {unreadTotal} unread, <span className="italic text-accent">nothing urgent.</span>
            </>
          ) : (
            <>
              You&apos;re <span className="italic text-accent">all caught up.</span>
            </>
          )}
        </h1>
        {unreadTotal > 0 && (
          <p className="mt-2 text-sm text-muted">
            Sift read {unreadTotal} messages across {unreadChats} chat{unreadChats === 1 ? "" : "s"} and kept {unreadHighlights.length} that
            matter — about <span className="text-ink">{savedMin < 1 ? "<1" : Math.round(savedMin)} min</span> of scrolling saved.{" "}
            <button onClick={markAllRead} className="text-muted underline decoration-line2 underline-offset-2 hover:text-ink">
              Mark everything read
            </button>
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(
          [
            ["Need your reply", needReply.length, "question", "var(--color-k-question)"],
            ["Tasks for you", open.filter((i) => i.kinds.includes("action") && i.forMe).length, "action", "var(--color-k-action)"],
            ["Due in 48h", due48, "deadline", "var(--color-k-deadline)"],
            ["Decisions made", decisions.length, "decision", "var(--color-k-decision)"],
          ] as const
        ).map(([label, n, f, color]) => (
          <button
            key={label}
            onClick={() => openList(f)}
            className="rise group rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-line2"
          >
            <p className="text-xs text-muted group-hover:text-ink">{label} →</p>
            <p className="mt-1 font-mono text-3xl" style={{ color: n ? color : "var(--color-faint)" }}>
              {n}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Needs you now</h2>
            <span className="text-xs text-faint">sorted by urgency × relevance</span>
          </div>
          {needsYou.length ? (
            <div className="space-y-2.5">
              {needsYou.slice(0, 5).map((i, idx) => (
                <InsightCard key={i.key} insight={i} state={items[i.key]} actions={actions} index={idx} showReasons={showReasons} />
              ))}
              {needsYou.length > 5 && (
                <button
                  onClick={() => openList("action")}
                  className="w-full rounded-xl py-2 text-sm text-muted hover:bg-panel hover:text-ink"
                >
                  See {needsYou.length - 5} more →
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line2 p-6 text-center text-sm text-muted">
              Nothing high-priority is waiting on you. 🎉
            </p>
          )}

          {missed.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Mentions you may have missed</h2>
              <div className="space-y-2.5">
                {missed
                  .filter((i) => !needsYou.slice(0, 5).includes(i))
                  .slice(0, 3)
                  .map((i, idx) => (
                    <InsightCard key={i.key} insight={i} state={items[i.key]} actions={actions} index={idx} showReasons={showReasons} />
                  ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Timeline</h2>
            {deadlines.length ? (
              <ol className="relative space-y-3 border-l border-line pl-4">
                {deadlines.slice(0, 5).map((i) => (
                  <li key={i.key} className="relative">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg"
                      style={{ background: i.due!.overdue ? "var(--color-crit)" : "var(--color-k-deadline)" }}
                    />
                    <button onClick={() => actions.open(i.convId, i.msgId)} className="text-left">
                      <p className={`font-mono text-[0.6875rem] ${i.due!.overdue ? "text-crit" : "text-k-deadline"}`}>
                        {i.due!.overdue ? "OVERDUE · " : ""}
                        {i.due!.label}
                      </p>
                      <p className="line-clamp-2 text-[0.8125rem] leading-snug hover:text-accent">{i.text}</p>
                      <p className="text-[0.6875rem] text-faint">{i.convName}</p>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-faint">No upcoming deadlines found.</p>
            )}
          </section>

          {decisions.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Decisions</h2>
              <ul className="space-y-2">
                {decisions.slice(0, 3).map((i) => (
                  <li key={i.key}>
                    <button
                      onClick={() => actions.open(i.convId, i.msgId)}
                      className="w-full rounded-xl border border-line bg-panel p-3 text-left hover:border-line2"
                    >
                      <p className="line-clamp-3 text-[0.8125rem] leading-snug">
                        <span className="text-k-decision">◆ </span>
                        {i.text}
                      </p>
                      <p className="mt-1 text-[0.6875rem] text-faint">
                        {i.author} · {i.convName} · {relTime(i.ts)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
