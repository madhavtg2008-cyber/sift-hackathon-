"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { installNetguard, netguard } from "@/lib/netguard";
import { usePrefs } from "@/lib/prefs";
import { useAppData, useLexicon } from "@/lib/store";
import { ConversationView } from "./ConversationView";
import { Digest } from "./Digest";
import { ListView, type ListFilter } from "./ListView";
import { useNetEvents } from "@/hooks/useNetEvents";
import { SearchResults, searchChats } from "./SearchResults";
import { Sidebar, type View } from "./Sidebar";
import { SignIn } from "./SignIn";
import { UnlockScreen } from "./UnlockScreen";
import { Logo, ShieldIcon } from "./icons";
import { Button } from "./ui";
import { MobileTabs } from "./MobileTabs";
import { ToastStack, useToasts } from "./Toasts";
import { takeSharedChat, type LoadedChat } from "@/lib/share";
import type { ItemState } from "@/lib/types";

// Dialogs are code-split: their code is only downloaded when first opened.
const ImportModal = dynamic(() => import("./ImportModal").then((m) => m.ImportModal), { ssr: false });
const SettingsModal = dynamic(() => import("./SettingsModal").then((m) => m.SettingsModal), { ssr: false });
const ProfileModal = dynamic(() => import("./ProfileModal").then((m) => m.ProfileModal), { ssr: false });
const PrivacyPanel = dynamic(() => import("./PrivacyPanel").then((m) => m.PrivacyPanel), { ssr: false });

if (typeof window !== "undefined") installNetguard();

export default function App() {
  const { data, actions, vault } = useAppData();
  const { lex, source: rulesSource } = useLexicon();
  const { prefs, update: updatePrefs } = usePrefs();
  const [view, setView] = useState<View>({ kind: "digest" });
  const [now, setNow] = useState(() => Date.now());
  const [importOpen, setImportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [shared, setShared] = useState<LoadedChat | null>(null);
  const { toasts, show: toast, dismiss: dismissToast } = useToasts();
  const searchRef = useRef<HTMLInputElement>(null);
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

  const { ctx, analyses, busy: analysing } = useAnalysis(data, lex, now);

  // "Share to Sift": register the service worker, and pick up a chat it caught for us.
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (!new URLSearchParams(location.search).has("share")) return;
    history.replaceState(null, "", "/");
    takeSharedChat()
      .then((chat) => {
        if (!chat) return;
        setShared(chat);
        setImportOpen(true);
      })
      .catch(() => toast("Couldn't read the shared file."));
  }, [toast]);

  // Keyboard shortcuts: "/" search, "n" new chat, Esc clears search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if (e.key === "Escape" && el === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n") {
        e.preventDefault();
        setImportOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const navigate = useCallback((v: View) => {
    setView(v);
    setNavOpen(false);
  }, []);

  // Item changes (done / hide / snooze) get an undo toast.
  const setItem = actions.setItem;
  const setItemWithUndo = useCallback(
    (key: string, patch: Partial<ItemState>) => {
      const before = dataRef.current?.items[key] ?? {};
      setItem(key, patch);
      const restore = {
        label: "Undo",
        run: () => setItem(key, { done: before.done, dismissed: before.dismissed, snoozedUntil: before.snoozedUntil }),
      };
      if (patch.done) toast("Marked done", restore);
      else if (patch.dismissed) toast("Hidden — it won't show up again", restore);
      else if (patch.snoozedUntil)
        toast(
          `Snoozed until ${new Date(patch.snoozedUntil).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`,
          restore,
        );
    },
    [setItem, toast],
  );
  const insightActions = useMemo(() => ({ setItem: setItemWithUndo, open: openConv }), [setItemWithUndo, openConv]);

  // ---------- loading, unlock & onboarding ----------
  if (vault.locked) return <UnlockScreen onUnlock={vault.unlock} onWipe={actions.wipe} />;
  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="font-display text-3xl italic text-muted">sift</span>
      </div>
    );
  }

  if (!data.profile) return <SignIn savedChats={data.conversations.length} onSignIn={actions.setProfile} />;

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
  const searchResults = searchChats(data.conversations, query);
  const deleteChat = (id: string) => {
    const conv = data.conversations.find((c) => c.id === id);
    if (!conv) return;
    const items = Object.fromEntries(Object.entries(data.items).filter(([k]) => k.startsWith(id + ":")));
    actions.deleteConversation(id);
    if (view.kind === "conv" && view.id === id) setView({ kind: "digest" });
    toast(`Deleted “${conv.name}”`, { label: "Undo", run: () => actions.restoreConversation(conv, items) });
  };
  const markAllRead = () => {
    const before = Object.fromEntries(data.conversations.map((c) => [c.id, c.lastReadIndex]));
    actions.markAllRead();
    toast("Everything marked as read", { label: "Undo", run: () => actions.setReadIndexes(before) });
  };

  const nav = (
    <Sidebar
      view={view}
      counts={counts}
      convs={convs}
      analyses={analyses}
      totalUnread={totalUnread}
      now={now}
      profileName={data.profile.name}
      onNavigate={navigate}
      onOpenConv={openConv}
      onImport={() => setImportOpen(true)}
      onRename={actions.renameConversation}
      onDelete={deleteChat}
      onOpenProfile={() => {
        setAccountOpen(true);
        setNavOpen(false);
      }}
      onOpenSettings={() => {
        setProfileOpen(true);
        setNavOpen(false);
      }}
    />
  );

  return (
    <div className="grain flex h-dvh flex-col">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
        <button
          onClick={() => setNavOpen(true)}
          className="rounded-md px-2 py-1 text-muted hover:bg-panel2 lg:hidden"
          aria-label="Open menu"
        >
          ☰
        </button>
        <button onClick={() => setView({ kind: "digest" })} aria-label="Home">
          <Logo />
        </button>
        <div className="relative mx-auto w-full max-w-md">
          <input
            ref={searchRef}
            aria-label="Search all chats (press / to focus)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all chats…  /"
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
          {analysing ? "Analysing on device…" : "On-device"}
          {blockedCount ? ` · ${blockedCount} blocked` : ""}
        </button>
        <button onClick={() => setPrivacyOpen(true)} className="text-accent sm:hidden" aria-label="Privacy">
          <ShieldIcon />
        </button>
        {vault.enabled && (
          <Button size="sm" variant="ghost" onClick={vault.lock} title="Lock your encrypted chats" className="shrink-0">
            🔒 <span className="hidden sm:inline">Lock</span>
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={() => setImportOpen(true)} className="shrink-0">
          + Add chat
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-line lg:block">{nav}</aside>
        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setNavOpen(false)}>
            <div className="absolute inset-0 bg-[var(--overlay)]" />
            <aside
              className="rise absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r border-line bg-panel"
              onClick={(e) => e.stopPropagation()}
            >
              {nav}
            </aside>
          </div>
        )}

        <main className={`min-h-0 flex-1 overflow-y-auto ${view.kind === "conv" ? "" : "pb-16 lg:pb-0"}`}>
          {q.length >= 2 ? (
            <SearchResults query={query} results={searchResults} now={now} onOpen={openConv} />
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
                deleteConversation: deleteChat,
                setItem: setItemWithUndo,
              }}
              onBack={() => setView({ kind: "digest" })}
            />
          ) : view.kind === "list" ? (
            <ListView
              key={view.filter}
              filter={view.filter}
              all={allInsights}
              items={data.items}
              actions={insightActions}
              showReasons={prefs.showReasons}
            />
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
              markAllRead={markAllRead}
              onImport={() => setImportOpen(true)}
              showReasons={prefs.showReasons}
            />
          )}
        </main>
      </div>

      {view.kind !== "conv" && (
        <MobileTabs
          view={view}
          tasks={counts.action}
          unread={totalUnread}
          onNavigate={navigate}
          onChats={() => setNavOpen(true)}
          onAdd={() => setImportOpen(true)}
          onSettings={() => setProfileOpen(true)}
        />
      )}
      <ToastStack toasts={toasts} dismiss={dismissToast} />
      {importOpen && (
        <ImportModal
          open={importOpen}
          initial={shared}
          onClose={() => {
            setImportOpen(false);
            setShared(null);
          }}
          myName={data.profile.name}
          onImport={(name, source, messages, readCount) => {
            const id = actions.addConversation(name, source, messages, readCount);
            openConv(id);
          }}
        />
      )}
      {profileOpen && (
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
      )}
      {accountOpen && (
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
      )}
      {privacyOpen && (
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
          vault={vault}
          rulesSource={`${lex.version}, ${rulesSource === "server" ? "updated from server" : rulesSource}`}
        />
      )}
    </div>
  );
}
