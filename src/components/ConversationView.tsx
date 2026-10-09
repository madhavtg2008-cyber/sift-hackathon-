"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { transcript } from "@/lib/engine";
import { onDeviceStatus, onDeviceSummarize } from "@/lib/ondevice";
import { parseChat } from "@/lib/parser";
import type { ConvAnalysis, Conversation, Insight, ItemState, Message, Profile } from "@/lib/types";
import { clockTime, dayLabel, hueFor } from "@/lib/util";
import { Avatar, Button, inputCls, KIND_META, KindChip, PriorityPill } from "./ui";

interface Props {
  conv: Conversation;
  analysis: ConvAnalysis;
  items: Record<string, ItemState>;
  profile: Profile;
  focusMsgId?: string;
  isMe: (author: string) => boolean;
  focusMode?: boolean;
  actions: {
    markRead: (id: string, upTo?: number) => void;
    markUnread: (id: string) => void;
    appendMessages: (id: string, m: Omit<Message, "id">[]) => void;
    deleteConversation: (id: string) => void;
    togglePin: (id: string) => void;
    renameConversation: (id: string, name: string) => void;
    setItem: (key: string, patch: Partial<ItemState>) => void;
  };
  onBack: () => void;
}

type AiState =
  | { s: "idle" }
  | { s: "running"; pct?: number }
  | { s: "done"; text: string; engine: string }
  | { s: "unsupported" }
  | { s: "error"; msg: string };

export function ConversationView({ conv, analysis, items, profile, focusMsgId, isMe, focusMode = false, actions, onBack }: Props) {
  const [highlightsOnly, setHighlightsOnly] = useState(focusMode && !focusMsgId);
  const [ai, setAi] = useState<AiState>({ s: "idle" });
  const [aiAvail, setAiAvail] = useState<string>("checking");
  const [composer, setComposer] = useState<"reply" | "paste">("reply");
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(conv.name);

  const byMsg = useMemo(() => new Map<string, Insight>(analysis.insights.map((i) => [i.msgId, i])), [analysis]);

  useEffect(() => {
    setAi({ s: "idle" });
    setConfirmDelete(false);
    setNameDraft(conv.name);
  }, [conv.id, conv.name]);

  useEffect(() => {
    onDeviceStatus().then((s) => {
      const best = [s.prompt, s.summarizer].find((x) => x === "available") ?? [s.prompt, s.summarizer].find((x) => x === "downloadable" || x === "downloading");
      setAiAvail(best ?? "unsupported");
    });
  }, []);

  // Like a messaging app: open at the latest message, and follow new messages as they're added
  const scrollRef = useRef<HTMLDivElement>(null);
  const toBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };
  useEffect(() => {
    if (focusMsgId) return;
    toBottom();
    const t = setTimeout(() => toBottom(), 80); // after fonts/layout settle
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id]);
  const msgCount = conv.messages.length;
  const prevCount = useRef(msgCount);
  useEffect(() => {
    if (msgCount > prevCount.current) setTimeout(() => toBottom(true), 30);
    prevCount.current = msgCount;
  }, [msgCount]);

  useEffect(() => {
    if (!focusMsgId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`m-${focusMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("flash");
        void el.offsetWidth;
        el.classList.add("flash");
      }
    }, 60);
    return () => clearTimeout(t);
  }, [focusMsgId, conv.id]);

  const runAi = async () => {
    setAi({ s: "running" });
    try {
      const r = await onDeviceSummarize(transcript(conv), profile.name, (pct) => setAi({ s: "running", pct }));
      setAi({ s: "done", ...r });
    } catch (e) {
      if (e instanceof Error && e.message === "unsupported") setAi({ s: "unsupported" });
      else setAi({ s: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
    }
  };

  const submitComposer = () => {
    const text = draft.trim();
    if (!text) return;
    if (composer === "reply") {
      actions.appendMessages(conv.id, [{ author: profile.name, text, ts: Date.now() }]);
      actions.markRead(conv.id, conv.messages.length); // replying means you've read the chat
    } else {
      const parsed = parseChat(text);
      if (!parsed.messages.length) return;
      // pasted messages are newer than anything already in the chat, so they count as unread
      const lastTs = conv.messages[conv.messages.length - 1]?.ts ?? 0;
      const base = Math.max(Date.now() - parsed.messages.length * 1000, lastTs + 1000);
      actions.appendMessages(
        conv.id,
        parsed.messages.map((m, i) => ({ author: m.author, text: m.text, ts: parsed.format === "paste" ? base + i * 1000 : m.ts })),
      );
    }
    setDraft("");
  };

  let prevDay = "";
  let hiddenRun = 0;
  const firstUnread = conv.lastReadIndex + 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <button onClick={onBack} className="rounded-md px-1.5 py-1 text-muted hover:bg-panel2 hover:text-ink lg:hidden" aria-label="Back">
          ←
        </button>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nameDraft.trim()) actions.renameConversation(conv.id, nameDraft.trim());
                setEditingName(false);
              }}
            >
              <input
                autoFocus
                value={nameDraft}
                maxLength={60}
                aria-label="Chat name"
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && (setNameDraft(conv.name), setEditingName(false))}
                onBlur={() => {
                  if (nameDraft.trim() && nameDraft.trim() !== conv.name) actions.renameConversation(conv.id, nameDraft.trim());
                  setEditingName(false);
                }}
                className={`${inputCls} h-8 py-1`}
              />
            </form>
          ) : (
            <button onClick={() => setEditingName(true)} className="group/name flex max-w-full items-center gap-2 text-left" title="Rename chat">
              <span className="truncate text-lg font-semibold">{conv.name}</span>
              <span className="shrink-0 rounded-md px-1 text-sm text-faint transition group-hover/name:bg-panel2 group-hover/name:text-ink" aria-hidden>
                ✎
              </span>
            </button>
          )}
          <p className="text-xs text-muted">
            {analysis.participants.length} people · {conv.messages.length} messages · {analysis.unread} unread
          </p>
        </div>
        <PriorityPill priority={analysis.priority} score={analysis.score} />
        <div className="flex items-center gap-1">
          {analysis.unread > 0 ? (
            <Button size="sm" onClick={() => actions.markRead(conv.id)}>
              Mark all read
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => actions.markUnread(conv.id)}>
              Mark unread
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => actions.togglePin(conv.id)} title={conv.pinned ? "Unpin" : "Pin to top"}>
            {conv.pinned ? "★" : "☆"}
          </Button>
          {confirmDelete ? (
            <>
              <Button size="sm" variant="danger" onClick={() => actions.deleteConversation(conv.id)}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} title="Delete conversation">
              🗑
            </Button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* summary */}
        <section className="mx-4 mt-4 rounded-2xl border border-line bg-panel p-4 sm:mx-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl italic">Catch-up</h3>
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-faint">
                {aiAvail === "available"
                  ? "On-device Gemini Nano ready"
                  : aiAvail === "downloadable" || aiAvail === "downloading"
                    ? "On-device model can be downloaded"
                    : aiAvail === "checking"
                      ? ""
                      : "Local engine"}
              </span>
              <Button size="sm" variant={ai.s === "done" ? "ghost" : "outline"} onClick={runAi} disabled={ai.s === "running"}>
                ✦ {ai.s === "running" ? (ai.pct !== undefined && ai.pct < 100 ? `Downloading model ${ai.pct}%` : "Summarizing…") : "AI summary (on-device)"}
              </Button>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {analysis.summary.map((s, idx) => (
              <li key={idx} className="flex gap-2 leading-relaxed">
                <span className="text-accent">›</span>
                <span className={idx === 0 ? "text-ink" : "text-muted"}>{s}</span>
              </li>
            ))}
          </ul>
          {analysis.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[0.6875rem] text-faint">Topics</span>
              {analysis.topics.map((t) => (
                <span key={t} className="rounded-md bg-panel2 px-1.5 py-0.5 text-[0.6875rem] text-muted">
                  #{t}
                </span>
              ))}
            </div>
          )}
          {ai.s === "done" && (
            <div className="rise mt-4 rounded-xl border border-accent/25 bg-accent/5 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ai.text}</p>
              <p className="mt-2 text-[0.6875rem] text-faint">Generated by {ai.engine} · nothing was sent over the network</p>
            </div>
          )}
          {ai.s === "unsupported" && (
            <p className="mt-3 rounded-lg bg-panel2 p-3 text-xs leading-relaxed text-muted">
              This browser doesn&apos;t expose an on-device model, so Sift is using its local rules engine (above) — it never falls back to a
              cloud AI. For Gemini Nano, use desktop Chrome 138+ (the Summarizer API is built in).
            </p>
          )}
          {ai.s === "error" && (
            <p className="mt-3 rounded-lg bg-panel2 p-3 text-xs text-muted">
              The on-device model couldn&apos;t summarise this chat ({ai.msg}). Sift&apos;s local summary above is still accurate — nothing was sent anywhere.
            </p>
          )}
        </section>

        {/* thread controls */}
        <div className="sticky top-0 z-10 mx-4 mt-4 flex items-center justify-between gap-2 bg-bg/90 py-2 backdrop-blur sm:mx-6">
          <div className="flex gap-1 rounded-lg bg-panel p-0.5 text-xs">
            {[
              [false, "All messages"],
              [true, `Highlights (${analysis.insights.length})`],
            ].map(([v, l]) => (
              <button
                key={String(v)}
                onClick={() => setHighlightsOnly(v as boolean)}
                className={`rounded-md px-2.5 py-1 ${highlightsOnly === v ? "bg-panel2 text-ink" : "text-muted hover:text-ink"}`}
              >
                {l as string}
              </button>
            ))}
          </div>

        </div>

        {/* thread */}
        <ol className="space-y-1 px-4 pb-6 sm:px-6">
          {conv.messages.map((m, idx) => {
            const ins = byMsg.get(m.id);
            const st = ins ? items[ins.key] : undefined;
            const mine = isMe(m.author);
            const day = dayLabel(m.ts);
            const showDay = day !== prevDay;
            prevDay = day;
            const hide = highlightsOnly && !ins;
            const nodes: React.ReactNode[] = [];
            if (hide) {
              hiddenRun++;
              const next = conv.messages[idx + 1];
              if (!next || byMsg.has(next.id))
                nodes.push(
                  <li key={`h-${m.id}`} className="py-1 text-center text-[0.6875rem] text-faint">
                    · · · {hiddenRun} low-signal message{hiddenRun === 1 ? "" : "s"} hidden · · ·
                  </li>,
                );
              if (!next || byMsg.has(next.id)) hiddenRun = 0;
              return <Fragment key={m.id}>{nodes}</Fragment>;
            }
            if (showDay && !highlightsOnly)
              nodes.push(
                <li key={`d-${m.id}`} className="pb-1 pt-4 text-center text-[0.6875rem] font-medium uppercase tracking-wider text-faint">
                  {day}
                </li>,
              );
            if (idx === firstUnread && analysis.unread > 0)
              nodes.push(
                <li key={`u-${m.id}`} id="unread-divider" className="flex items-center gap-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-accent">
                  <span className="h-px flex-1 bg-accent/40" /> New messages <span className="h-px flex-1 bg-accent/40" />
                </li>,
              );
            const accent = ins ? KIND_META[ins.kinds[0]]?.color : undefined;
            nodes.push(
              <li key={m.id} id={`m-${m.id}`} className={`group flex gap-2.5 rounded-xl px-2 py-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                {!mine && <Avatar name={m.author} size={28} />}
                <div className={`flex max-w-[85%] flex-col sm:max-w-[72%] ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-[0.875rem] leading-relaxed ${
                      mine ? "rounded-tr-sm bg-accent/15 text-ink" : "rounded-tl-sm bg-panel"
                    } ${ins && st?.done ? "opacity-60" : ""}`}
                    style={ins ? { boxShadow: `inset 3px 0 0 ${accent}`, background: !mine ? `color-mix(in srgb, ${accent} 7%, var(--color-panel))` : undefined } : undefined}
                  >
                    {!mine && <p className="mb-0.5 text-[0.75rem] font-semibold" style={{ color: `hsl(${hueFor(m.author)} 65% calc(var(--av-fg-l) - 4%))` }}>{m.author}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
                    <span className="text-[0.6562rem] text-faint">{clockTime(m.ts)}</span>
                    {ins && (
                      <>
                        {ins.kinds.map((k) => (
                          <KindChip key={k} kind={k} compact />
                        ))}
                        {ins.due && <span className={`font-mono text-[0.6562rem] ${ins.due.overdue ? "text-crit" : "text-k-deadline"}`}>{ins.due.label}</span>}
                        <button
                          onClick={() => actions.setItem(ins.key, { done: !st?.done })}
                          className={`rounded px-1.5 text-[0.6562rem] ${st?.done ? "text-accent" : "text-faint hover:text-ink"}`}
                        >
                          {st?.done ? "✓ done" : "mark done"}
                        </button>
                      </>
                    )}
                    {idx >= firstUnread && !mine && (
                      <button onClick={() => actions.markRead(conv.id, idx)} className="hidden text-[0.6562rem] text-faint hover:text-ink group-hover:inline">
                        read up to here
                      </button>
                    )}
                  </div>
                </div>
              </li>,
            );
            return <Fragment key={m.id}>{nodes}</Fragment>;
          })}
        </ol>
      </div>

      {/* composer */}
      <div className="border-t border-line bg-panel px-4 py-3 sm:px-6">
        <div className="mb-2 flex gap-3 text-xs">
          {(
            [
              ["reply", "Log my reply"],
              ["paste", "Paste new messages"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setComposer(k)} className={composer === k ? "font-semibold text-ink" : "text-muted hover:text-ink"}>
              {l}
            </button>
          ))}
          <span className="ml-auto hidden text-faint sm:inline">Stored only in this browser</span>
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitComposer();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && composer === "reply") {
                e.preventDefault();
                submitComposer();
              }
            }}
            rows={composer === "paste" ? 3 : 1}
            placeholder={composer === "reply" ? `Note what you replied, as ${profile.name}… (marks questions answered)` : "Name: message — one per line. Added as unread."}
            className={`${inputCls} resize-none`}
          />
          <Button variant="primary" type="submit" disabled={!draft.trim()}>
            {composer === "reply" ? "Add" : "Analyze"}
          </Button>
        </form>
      </div>
    </div>
  );
}
