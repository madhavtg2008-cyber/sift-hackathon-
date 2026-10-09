"use client";

import { useEffect, useState } from "react";
import type { ConvAnalysis, Conversation } from "@/lib/types";
import { relTime } from "@/lib/util";
import type { ListFilter } from "./ListView";
import { GearIcon, PencilIcon, TrashIcon, UserIcon } from "./icons";
import { Avatar, KIND_META, PriorityDot } from "./ui";

export type View = { kind: "digest" } | { kind: "list"; filter: ListFilter } | { kind: "conv"; id: string; focus?: string; nonce?: number };

type Section = "chats" | "catchup";

/** Collapsible sidebar sections, remembered per browser. */
function useSections() {
  const [sections, setSections] = useState<Record<Section, boolean>>({ chats: true, catchup: false });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sift:sections") ?? "null");
      if (saved) setSections((s) => ({ ...s, ...saved }));
    } catch {
      /* ignore */
    }
  }, []);
  const toggleSection = (k: Section) =>
    setSections((s) => {
      const next = { ...s, [k]: !s[k] };
      try {
        localStorage.setItem("sift:sections", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  return { sections, toggleSection };
}

export interface SidebarProps {
  view: View;
  counts: Record<ListFilter, number>;
  convs: Conversation[];
  analyses: Map<string, ConvAnalysis>;
  totalUnread: number;
  now: number;
  profileName: string;
  onNavigate: (v: View) => void;
  onOpenConv: (id: string) => void;
  onImport: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  view,
  counts,
  convs,
  analyses,
  totalUnread,
  now,
  profileName,
  onNavigate,
  onOpenConv,
  onImport,
  onRename,
  onDelete,
  onOpenProfile,
  onOpenSettings,
}: SidebarProps) {
  const { sections, toggleSection } = useSections();
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null);
  const chatsOpen = sections.chats;
  // keep the categories open while one of them is the current page
  const catchupOpen = sections.catchup || view.kind === "list";

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div>
        <div className="flex items-center gap-0.5">
          <div className="flex-1">
            <NavItem active={view.kind === "digest"} onClick={() => onNavigate({ kind: "digest" })} icon="✦" label="Catch me up" />
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
                  onClick={() => onNavigate({ kind: "list", filter: f })}
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
            onClick={() => toggleSection("chats")}
            aria-expanded={chatsOpen}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-faint hover:text-ink"
          >
            <span className={`inline-block transition-transform duration-300 ${chatsOpen ? "rotate-90" : ""}`}>▸</span>
            Chats
            <span className="font-mono normal-case tracking-normal">({convs.length})</span>
            {!chatsOpen && totalUnread > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[0.625rem] font-bold normal-case tracking-normal text-accent-ink">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => onImport()}
            className="rounded-md px-1.5 text-sm text-muted hover:bg-panel2 hover:text-ink"
            aria-label="Add conversation"
          >
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
              if (renaming?.id === c.id)
                return (
                  <form
                    key={c.id}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/50 bg-panel2 px-2 py-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (renaming.draft.trim()) onRename(c.id, renaming.draft.trim());
                      setRenaming(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={renaming.draft}
                      onChange={(e) => setRenaming({ id: c.id, draft: e.target.value })}
                      onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                      onFocus={(e) => e.target.select()}
                      maxLength={60}
                      aria-label="New chat name"
                      className="min-w-0 flex-1 bg-transparent px-1 text-[0.8125rem] text-ink outline-none"
                    />
                    <button type="submit" className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="rounded-md px-1.5 text-xs text-muted hover:text-ink"
                      aria-label="Cancel"
                    >
                      ✕
                    </button>
                  </form>
                );
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
                          onDelete(c.id);
                          setConfirmDel(null);
                        }}
                        className="rounded-md bg-crit px-2.5 py-1 text-xs font-semibold text-white hover:brightness-110"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDel(null)}
                        className="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-panel2 hover:text-ink"
                      >
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
                  <button onClick={() => onOpenConv(c.id)} className="absolute inset-0 rounded-lg" aria-label={`Open ${c.name}`} />
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
                    {!!a?.unread && (
                      <span className="rounded-full bg-accent px-1.5 text-[0.625rem] font-bold text-accent-ink">{a.unread}</span>
                    )}
                  </span>
                  <span className="absolute right-1.5 top-1/2 z-10 flex -translate-y-1/2 gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-60">
                    <button
                      onClick={() => {
                        setConfirmDel(null);
                        setRenaming({ id: c.id, draft: c.name });
                      }}
                      className="rounded-md p-1.5 text-muted hover:bg-panel2 hover:text-ink"
                      aria-label={`Rename ${c.name}`}
                      title="Rename chat"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => {
                        setRenaming(null);
                        setConfirmDel(c.id);
                      }}
                      className="rounded-md p-1.5 text-muted hover:bg-crit/15 hover:text-crit"
                      aria-label={`Delete ${c.name}`}
                      title="Delete chat"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </div>
              );
            })}
            {!convs.length && (
              <button
                onClick={() => onImport()}
                className="w-full rounded-lg border border-dashed border-line2 px-3 py-4 text-xs text-muted hover:text-ink"
              >
                + Add your first chat
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-2.5">
        <div className="flex items-center gap-2.5 px-1 pb-2.5">
          <span className="relative">
            <Avatar name={profileName} size={34} />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel bg-accent"
              title="Signed in on this device"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{profileName}</span>
            <span className="block truncate text-[0.6875rem] text-faint">Signed in · this device</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              onOpenProfile();
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-line2 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-ink"
          >
            <UserIcon /> Profile
          </button>
          <button
            onClick={() => {
              onOpenSettings();
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-line2 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-ink"
          >
            <GearIcon /> Settings
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  iconColor,
  label,
  count,
  small,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  iconColor?: string;
  label: string;
  count?: number;
  small?: boolean;
}) {
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
