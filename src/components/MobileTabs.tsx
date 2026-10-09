"use client";

import type { View } from "./Sidebar";
import { GearIcon } from "./icons";

/** Bottom tab bar for phones (hidden on desktop and inside a chat). */
export function MobileTabs({
  view,
  tasks,
  unread,
  onNavigate,
  onChats,
  onAdd,
  onSettings,
}: {
  view: View;
  tasks: number;
  unread: number;
  onNavigate: (v: View) => void;
  onChats: () => void;
  onAdd: () => void;
  onSettings: () => void;
}) {
  const tab = (active: boolean) =>
    `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.6875rem] transition ${active ? "text-accent" : "text-muted"}`;
  const badge = (n: number) =>
    n > 0 && (
      <span className="absolute right-[calc(50%-1.4rem)] top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[0.5625rem] font-bold leading-4 text-accent-ink">
        {n > 99 ? "99+" : n}
      </span>
    );
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <button
        className={tab(view.kind === "digest")}
        onClick={() => onNavigate({ kind: "digest" })}
        aria-current={view.kind === "digest" ? "page" : undefined}
      >
        <span className="text-base leading-none">✦</span>
        Catch up
      </button>
      <button
        className={tab(view.kind === "list" && view.filter === "action")}
        onClick={() => onNavigate({ kind: "list", filter: "action" })}
        aria-current={view.kind === "list" && view.filter === "action" ? "page" : undefined}
      >
        <span className="text-base leading-none">✓</span>
        Tasks
        {badge(tasks)}
      </button>
      <button className={tab(false)} onClick={onAdd} aria-label="Add a chat">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-lg font-bold leading-none text-accent-ink">
          +
        </span>
      </button>
      <button className={tab(false)} onClick={onChats}>
        <span className="text-base leading-none">☰</span>
        Chats
        {badge(unread)}
      </button>
      <button className={tab(false)} onClick={onSettings}>
        <span className="flex h-4 items-center">
          <GearIcon />
        </span>
        Settings
      </button>
    </nav>
  );
}
