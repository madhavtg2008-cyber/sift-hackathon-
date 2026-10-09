"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeConversation, buildContext } from "@/lib/engine";
import { installNetguard, netguard } from "@/lib/netguard";
import { lastProfile, useAppData, useLexicon } from "@/lib/store";
import type { ConvAnalysis, Profile } from "@/lib/types";
import { relTime } from "@/lib/util";
import { ConversationView } from "./ConversationView";
import { Digest } from "./Digest";
import { ImportModal } from "./ImportModal";
import { ListView, type ListFilter } from "./ListView";
import { PrivacyPanel, useNetEvents } from "./PrivacyPanel";
import { ProfileForm } from "./ProfileForm";
import { SettingsModal } from "./SettingsModal";
import { ProfileModal } from "./ProfileModal";
import { Avatar, Button, KIND_META, PriorityDot } from "./ui";
import { usePrefs } from "@/lib/prefs";

if (typeof window !== "undefined") installNetguard();

type View = { kind: "digest" } | { kind: "list"; filter: ListFilter } | { kind: "conv"; id: string; focus?: string; nonce?: number };

export default function App() {
  const { data, actions } = useAppData();
  const { lex, source: rulesSource } = useLexicon();
  const { prefs, update: updatePrefs } = usePrefs();
  const [view, setView] = useState<View>({ kind: "digest" });
  const [now, setNow] = useState(() => Date.now());
  const [importOpen, setImportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [returning, setReturning] = useState<Profile | null>(null);
  useEffect(() => {
    if (data && !data.profile) setReturning(lastProfile());
  }, [data]);
  // collapsible sidebar sections, remembered per browser
  const [sections, setSections] = useState({ chats: true, catchup: false });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sift:sections") ?? "null");
      if (saved) setSections((s) => ({ ...s, ...saved }));
    } catch {
      /* ignore */
    }
  }, []);
  const toggleSection = (k: "chats" | "catchup") =>
    setSections((s) => {
      const next = { ...s, [k]: !s[k] };
      try {
        localStorage.setItem("sift:sections", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  const chatsOpen = sections.chats;
  const toggleChats = () => toggleSection("chats");
  // keep the categories open while one of them is the current page
  const catchupOpen = sections.catchup || view.kind === "list";
  const events = useNetEvents();
  const dataRef = useRef(data);
  dataRef.current = data;

  // Feed the privacy firewall with fingerprints of every message, so any request
  // that contains chat text gets blocked before it leaves the browser.
  useEffect(() => {
    netguard.setSensitiveSource(() =>
      (dataRef.current?.conversations ?? []).flatMap((c) =>
        c.messages.map((m) => m.text.toLowerCase().replace(/\s+/g, " ").slice(0, 40)).filter((s) => s.length >= 12),
      ),
    );
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const ctx = useMemo(() => buildContext(data?.profile ?? null, lex, now), [data?.profile, lex, now]);

  const analyses = useMemo(() => {
    const m = new Map<string, ConvAnalysis>();
    for (const c of data?.conversations ?? []) m.set(c.id, analyzeConversation(c, ctx, data?.items));
    return m;
  }, [data?.conversations, data?.items, ctx]);

  const allInsights = useMemo(() => [...analyses.values()].flatMap((a) => a.insights), [analyses]);
  const visible = useMemo(
    () => allInsights.filter((i) => !data?.items[i.key]?.dismissed && (data?.items[i.key]?.snoozedUntil ?? 0) <= now),
    [allInsights, data?.items, now],
  );

  const openConv = useCallback((id: string, focus?: string) => {
    setView({ kind: "conv", id, focus, nonce: Date.now() });
    setNavOpen(false);
    setQuery("");
  }, []);

  const insightActions = useMemo(() => ({ setItem: actions.setItem, open: openConv }), [actions.setItem, openConv]);

  const loadDemo = async () => {
    const res = await fetch("/api/samples");
    if (!res.ok) throw new Error("failed");
    const json = (await res.json()) as {
      conversations: { name: string; readCount: number; messages: { author: string; text: string; ts: number }[] }[];
    };
    const me = data?.profile?.name ?? "You";
    const fill = (s: string) => s.replaceAll("{{me}}", me);
    for (const c of json.conversations) {
      actions.addConversation(
        c.name,
        "sample",
        c.messages.map((m) => ({ author: fill(m.author), text: fill(m.text), ts: m.ts })),
        c.readCount,
      );
    }
    setView({ kind: "digest" });
    return json.conversations.length;
  };

  // ---------- loading & onboarding ----------
  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="font-display text-3xl italic text-muted">sift</span>
      </div>
    );
  }

  if (!data.profile) {
    return (
      <main className="grain flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="rise w-full max-w-md">
          <Logo />
          <h1 className="mt-8 font-display text-5xl leading-[1.05]">
            Too many chats. <span className="italic text-accent">Only what matters.</span>
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
            Sift reads your group chats and pulls out mentions, decisions, deadlines and tasks you missed — ranked by urgency.
            It runs entirely on this device: your conversations never touch a server.
          </p>
          <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
            {returning ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Welcome back</p>
                <button
                  onClick={() => actions.setProfile(returning)}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line2 p-3 text-left transition hover:border-accent"
                >
                  <Avatar name={returning.name} size={40} />
                  <span className="flex-1">
                    <span className="block font-medium">Continue as {returning.name}</span>
                    <span className="block text-xs text-muted">
                      {data.conversations.length} chat{data.conversations.length === 1 ? "" : "s"} saved on this device
                    </span>
                  </span>
                  <span className="text-accent">→</span>
                </button>
                <button onClick={() => setReturning(null)} className="mt-3 text-xs text-muted underline underline-offset-4 hover:text-ink">
                  Use a different name
                </button>
              </div>
            ) : (
              <ProfileForm initial={null} onSave={actions.setProfile} submitLabel="Sign in →" compact />
            )}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-faint">
            <ShieldIcon /> No password, no server. Your profile and chats live only in this browser.
          </p>
        </div>
      </main>
    );
  }

  const blockedCount = events.filter((e) => e.blocked).length;
  const totalUnread = [...analyses.values()].reduce((n, a) => n + a.unread, 0);
  const convs = [...data.conversations].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (analyses.get(b.id)?.score ?? 0) - (analyses.get(a.id)?.score ?? 0),
  );
  const currentConv = view.kind === "conv" ? data.conversations.find((c) => c.id === view.id) : undefined;
  const counts: Record<ListFilter, number> = {
    action: visible.filter((i) => i.kinds.includes("action") && i.forMe && !data.items[i.key]?.done).length,
    question: visible.filter((i) => i.kinds.includes("question") && i.forMe && !i.answered && !data.items[i.key]?.done).length,
    mention: visible.filter((i) => i.kinds.includes("mention") && i.unread && !data.items[i.key]?.done).length,
    deadline: visible.filter((i) => i.due && !i.due.overdue && i.forMe && !data.items[i.key]?.done).length,
    decision: visible.filter((i) => i.kinds.includes("decision")).length,
  };

  const q = query.trim().toLowerCase();
  const searchResults =
    q.length >= 2
      ? data.conversations.flatMap((c) =>
          c.messages.filter((m) => m.text.toLowerCase().includes(q) || m.author.toLowerCase().includes(q)).map((m) => ({ c, m })),
        )
      : [];

  const nav = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div>
        <div className="flex items-center gap-0.5">
          <div className="flex-1">
            <NavItem active={view.kind === "digest"} onClick={() => { setView({ kind: "digest" }); setNavOpen(false); }} icon="✦" label="Catch me up" />
          </div>
          <button
            onClick={() => toggleSection("catchup")}
            aria-expanded={catchupOpen}
            aria-label={catchupOpen ? "Collapse categories" : "Expand categories"}
            className="flex h-9 w-8 items-center justify-center rounded-lg text-faint hover:bg-panel2 hover:text-ink"
          >
            <span className={`inline-block text-xs transition-transform duration-300 ${catchupOpen ? "rotate-90" : ""}`}>▸</span>
          </button>
        </div>
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{ gridTemplateRows: catchupOpen ? "1fr" : "0fr", opacity: catchupOpen ? 1 : 0 }}
          aria-hidden={!catchupOpen}
          inert={!catchupOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-line pl-2">
              {(["action", "question", "deadline", "mention", "decision"] as ListFilter[]).map((f) => (
                <NavItem
                  key={f}
                  active={view.kind === "list" && view.filter === f}
                  onClick={() => { setView({ kind: "list", filter: f }); setNavOpen(false); }}
                  icon={KIND_META[f].icon}
                  iconColor={KIND_META[f].color}
                  label={{ action: "Tasks", question: "Questions", deadline: "Deadlines", mention: "Mentions", decision: "Decisions" }[f]}
                  count={counts[f]}
                  small
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-1 flex items-center justify-between px-1">
          <button
            onClick={() => toggleChats()}
            aria-expanded={chatsOpen}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-faint hover:text-ink"
          >
            <span className={`inline-block transition-transform duration-300 ${chatsOpen ? "rotate-90" : ""}`}>▸</span>
            Chats
            <span className="font-mono normal-case tracking-normal">({convs.length})</span>
            {!chatsOpen && totalUnread > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[0.625rem] font-bold normal-case tracking-normal text-accent-ink">{totalUnread}</span>
            )}
          </button>
          <button onClick={() => setImportOpen(true)} className="rounded-md px-1.5 text-sm text-muted hover:bg-panel2 hover:text-ink" aria-label="Add conversation">
            +
          </button>
        </div>
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{ gridTemplateRows: chatsOpen ? "1fr" : "0fr", opacity: chatsOpen ? 1 : 0 }}
          aria-hidden={!chatsOpen}
          inert={!chatsOpen}
        >
          <div className="min-h-0 space-y-0.5 overflow-hidden">
            {convs.map((c) => {
              const a = analyses.get(c.id);
              const last = c.messages[c.messages.length - 1];
              const active = view.kind === "conv" && view.id === c.id;
              if (confirmDel === c.id)
                return (
                  <div key={c.id} className="rounded-lg border border-crit/40 bg-crit/10 px-2.5 py-2">
                    <p className="truncate text-[0.8125rem]">
                      Delete <b>{c.name}</b>?
                    </p>
                    <p className="text-[0.6875rem] text-muted">Removes its messages and tasks from this device.</p>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        autoFocus
                        onClick={() => {
                          actions.deleteConversation(c.id);
                          if (active) setView({ kind: "digest" });
                          setConfirmDel(null);
                        }}
                        className="rounded-md bg-crit px-2.5 py-1 text-xs font-semibold text-white hover:brightness-110"
                      >
                        Yes, delete
                      </button>
                      <button onClick={() => setConfirmDel(null)} className="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-panel2 hover:text-ink">
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              return (
                <div
                  key={c.id}
                  className={`group relative flex w-full items-start gap-2.5 rounded-lg px-2 py-2 transition ${active ? "bg-panel2" : "hover:bg-panel2/60"}`}
                >
                  <button onClick={() => openConv(c.id)} className="absolute inset-0 rounded-lg" aria-label={`Open ${c.name}`} />
                  <Avatar name={c.name.replace(/[^\p{L}\s]/gu, "") || c.name} size={30} />
                  <span className="pointer-events-none min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {a && <PriorityDot priority={a.priority} />}
                      <span className={`truncate text-[0.8125rem] ${a?.unread ? "font-semibold text-ink" : "text-muted"}`}>{c.name}</span>
                      {c.pinned && <span className="text-[0.625rem] text-med">★</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.7188rem] text-faint">
                      {last ? `${last.author.split(" ")[0]}: ${last.text}` : "No messages"}
                    </span>
                  </span>
                  <span className="pointer-events-none flex shrink-0 flex-col items-end gap-1 group-hover:invisible">
                    <span className="text-[0.625rem] text-faint">{last ? relTime(last.ts, now) : ""}</span>
                    {!!a?.unread && <span className="rounded-full bg-accent px-1.5 text-[0.625rem] font-bold text-accent-ink">{a.unread}</span>}
                  </span>
                  <button
                    onClick={() => setConfirmDel(c.id)}
                    className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-muted opacity-0 transition hover:bg-crit/15 hover:text-crit focus:opacity-100 group-hover:opacity-100 max-lg:opacity-60"
                    aria-label={`Delete ${c.name}`}
                    title="Delete chat"
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
            {!convs.length && (
              <button onClick={() => setImportOpen(true)} className="w-full rounded-lg border border-dashed border-line2 px-3 py-4 text-xs text-muted hover:text-ink">
                + Add your first chat
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-2.5">
        <div className="flex items-center gap-2.5 px-1 pb-2.5">
          <span className="relative">
            <Avatar name={data.profile.name} size={34} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel bg-accent" title="Signed in on this device" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{data.profile.name}</span>
            <span className="block truncate text-[0.6875rem] text-faint">Signed in · this device</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              setAccountOpen(true);
              setNavOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-line2 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-ink"
          >
            <UserIcon /> Profile
          </button>
          <button
            onClick={() => {
              setProfileOpen(true);
              setNavOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-line2 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-ink"
          >
            <GearIcon /> Settings
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="grain flex h-dvh flex-col">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
        <button onClick={() => setNavOpen(true)} className="rounded-md px-2 py-1 text-muted hover:bg-panel2 lg:hidden" aria-label="Open menu">
          ☰
        </button>
        <button onClick={() => setView({ kind: "digest" })} aria-label="Home">
          <Logo />
        </button>
        <div className="relative mx-auto w-full max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all chats…"
            className="h-9 w-full rounded-lg border border-line bg-panel pl-8 pr-3 text-sm outline-none placeholder:text-faint focus:border-line2"
          />
          <span className="pointer-events-none absolute left-2.5 top-2 text-sm text-faint">⌕</span>
        </div>
        <button
          onClick={() => setPrivacyOpen(true)}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-accent/30 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 sm:flex"
          title="0 bytes of chat data have left this device. Click for details."
        >
          <ShieldIcon />
          On-device{blockedCount ? ` · ${blockedCount} blocked` : ""}
        </button>
        <button onClick={() => setPrivacyOpen(true)} className="text-accent sm:hidden" aria-label="Privacy">
          <ShieldIcon />
        </button>
        <Button size="sm" variant="primary" onClick={() => setImportOpen(true)} className="shrink-0">
          + Add chat
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-line lg:block">{nav}</aside>
        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setNavOpen(false)}>
            <div className="absolute inset-0 bg-[var(--overlay)]" />
            <aside className="rise absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r border-line bg-panel" onClick={(e) => e.stopPropagation()}>
              {nav}
            </aside>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto">
          {q.length >= 2 ? (
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
              <p className="text-sm text-muted">
                {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for “{query}”
              </p>
              <div className="mt-4 space-y-2">
                {searchResults.slice(0, 60).map(({ c, m }) => (
                  <button key={m.id} onClick={() => openConv(c.id, m.id)} className="block w-full rounded-xl border border-line bg-panel p-3 text-left hover:border-line2">
                    <p className="text-xs text-muted">
                      <span className="text-ink">{m.author}</span> in {c.name} · {relTime(m.ts, now)}
                    </p>
                    <p className="mt-1 text-sm">
                      <Highlight text={m.text} q={q} />
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : view.kind === "conv" && currentConv && analyses.get(currentConv.id) ? (
            <ConversationView
              key={currentConv.id}
              conv={currentConv}
              analysis={analyses.get(currentConv.id)!}
              items={data.items}
              profile={data.profile}
              focusMsgId={view.focus ? `${view.focus}` : undefined}
              isMe={ctx.isMe}
              focusMode={prefs.focusMode}
              actions={{
                ...actions,
                deleteConversation: (id) => {
                  actions.deleteConversation(id);
                  setView({ kind: "digest" });
                },
              }}
              onBack={() => setView({ kind: "digest" })}
            />
          ) : view.kind === "list" ? (
            <ListView key={view.filter} filter={view.filter} all={allInsights} items={data.items} actions={insightActions} showReasons={prefs.showReasons} />
          ) : (
            <Digest
              profile={data.profile}
              conversations={data.conversations}
              analyses={analyses}
              visible={visible}
              items={data.items}
              actions={insightActions}
              openConv={openConv}
              openList={(f) => setView({ kind: "list", filter: f })}
              markAllRead={actions.markAllRead}
              onImport={() => setImportOpen(true)}
              onDemo={() => void loadDemo().catch(() => setImportOpen(true))}
              showReasons={prefs.showReasons}
            />
          )}
        </main>
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        myName={data.profile.name}
        onImport={(name, source, messages, readCount) => {
          const id = actions.addConversation(name, source, messages, readCount);
          openConv(id);
        }}
        onLoadDemo={loadDemo}
      />
      <SettingsModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        prefs={prefs}
        onPrefs={updatePrefs}
        onOpenPrivacy={() => {
          setProfileOpen(false);
          setPrivacyOpen(true);
        }}
      />
      <ProfileModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        profile={data.profile}
        stats={{
          chats: data.conversations.length,
          messages: data.conversations.reduce((n, c) => n + c.messages.length, 0),
          done: Object.values(data.items).filter((i) => i.done).length,
        }}
        onSave={actions.setProfile}
        onLogout={() => {
          setAccountOpen(false);
          setView({ kind: "digest" });
          actions.logout();
        }}
      />
      <PrivacyPanel
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        data={data}
        onWipe={() => {
          actions.wipe();
          setView({ kind: "digest" });
        }}
        onRestore={(d) => {
          actions.importBackup(d);
          setPrivacyOpen(false);
        }}
        rulesSource={`${lex.version}, ${rulesSource === "server" ? "updated from server" : rulesSource}`}
      />
    </div>
  );
}

function NavItem({ active, onClick, icon, iconColor, label, count, small }: { active: boolean; onClick: () => void; icon: string; iconColor?: string; label: string; count?: number; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 ${small ? "py-1.5 text-[0.8125rem]" : "py-2 text-sm"} transition ${active ? "bg-panel2 text-ink" : "text-muted hover:bg-panel2/60 hover:text-ink"}`}
    >
      <span className="w-4 text-center font-mono text-xs" style={{ color: iconColor ?? "var(--color-accent)" }}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {!!count && <span className="font-mono text-[0.6875rem] text-faint">{count}</span>}
    </button>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-accent/25 px-0.5 text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-2xl italic leading-none">sift</span>
    </span>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

