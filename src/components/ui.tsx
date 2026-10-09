"use client";

import { useEffect, type ReactNode } from "react";
import type { Kind, Priority } from "@/lib/types";
import { hueFor, initials } from "@/lib/util";

export const KIND_META: Record<Kind, { label: string; color: string; icon: string }> = {
  mention: { label: "Mention", color: "var(--color-k-mention)", icon: "@" },
  question: { label: "Question", color: "var(--color-k-question)", icon: "?" },
  action: { label: "Task", color: "var(--color-k-action)", icon: "✓" },
  decision: { label: "Decision", color: "var(--color-k-decision)", icon: "◆" },
  deadline: { label: "Deadline", color: "var(--color-k-deadline)", icon: "◷" },
  urgent: { label: "Urgent", color: "var(--color-k-urgent)", icon: "!" },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "var(--color-crit)" },
  high: { label: "High", color: "var(--color-high)" },
  medium: { label: "Medium", color: "var(--color-med)" },
  low: { label: "Low", color: "var(--color-low)" },
};

export function KindChip({ kind, compact }: { kind: Kind; compact?: boolean }) {
  const m = KIND_META[kind];
  return (
    <span
      title={m.label}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium leading-none"
      style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 13%, transparent)` }}
    >
      <span className="font-mono text-[0.625rem]">{m.icon}</span>
      {!compact && m.label}
    </span>
  );
}

export function PriorityPill({ priority, score }: { priority: Priority; score?: number }) {
  const m = PRIORITY_META[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium"
      style={{ color: m.color, borderColor: `color-mix(in srgb, ${m.color} 35%, transparent)` }}
      title={score !== undefined ? `Priority score ${score}/100` : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
      {score !== undefined && <span className="font-mono opacity-70">{score}</span>}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${priority === "critical" ? "pulse-dot" : ""}`}
      style={{ background: PRIORITY_META[priority].color }}
      aria-label={`${PRIORITY_META[priority].label} priority`}
    />
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const h = hueFor(name);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `hsl(${h} 45% var(--av-bg-l))`,
        color: `hsl(${h} 70% var(--av-fg-l))`,
      }}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}

type BtnVariant = "primary" | "ghost" | "outline" | "danger";
export function Button({
  children,
  onClick,
  variant = "outline",
  size = "md",
  disabled,
  type = "button",
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-accent text-accent-ink hover:brightness-110 font-semibold",
    ghost: "text-muted hover:text-ink hover:bg-panel2",
    outline: "border border-line2 text-ink hover:bg-panel2",
    danger: "border border-crit/40 text-crit hover:bg-crit/10",
  };
  const s = size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm";
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${v[variant]} ${s} ${className}`}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-5 py-3.5">
          <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-muted hover:bg-panel2 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.6875rem] text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line2 bg-bg px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15";

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line2 px-6 py-12 text-center">
      <p className="font-display text-2xl italic text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
