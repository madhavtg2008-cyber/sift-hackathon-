"use client";

import { useState } from "react";
import { ACCENTS, THEMES, type Headline, type TextSize, type UiPrefs } from "@/lib/prefs";
import { Modal } from "./ui";

type Tab = "look" | "reading";

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg bg-bg p-0.5 text-xs">
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-md px-3 py-1.5 transition ${value === v ? "bg-panel2 text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-line bg-bg p-3.5 text-left hover:border-line2"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{hint}</span>
      </span>
      <span className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-line2"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function SettingsModal({
  open,
  onClose,
  prefs,
  onPrefs,
  onOpenPrivacy,
}: {
  open: boolean;
  onClose: () => void;
  prefs: UiPrefs;
  onPrefs: (p: Partial<UiPrefs>) => void;
  onOpenPrivacy: () => void;
}) {
  const [tab, setTab] = useState<Tab>("look");
  const mode = THEMES.find((t) => t.id === prefs.theme)?.mode ?? "dark";

  return (
    <Modal open={open} onClose={onClose} title="Settings" wide>
      <div className="mb-5 flex gap-1 border-b border-line text-sm" role="tablist">
        {(
          [
            ["look", "Appearance"],
            ["reading", "Reading"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 pb-2.5 transition ${tab === k ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "look" && (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Theme</h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {THEMES.map((t) => {
                const [bg, panel, accent, ink] = t.swatch;
                const active = prefs.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onPrefs({ theme: t.id })}
                    aria-pressed={active}
                    className={`overflow-hidden rounded-xl border-2 text-left transition ${active ? "border-accent" : "border-line hover:border-line2"}`}
                  >
                    {/* mini preview of the app in that theme */}
                    <div className="flex h-20 gap-1.5 p-2" style={{ background: bg }}>
                      <div className="w-1/3 space-y-1 rounded-md p-1.5" style={{ background: panel }}>
                        <div className="h-1.5 w-3/4 rounded-full" style={{ background: accent }} />
                        <div className="h-1 w-full rounded-full opacity-40" style={{ background: ink }} />
                        <div className="h-1 w-2/3 rounded-full opacity-40" style={{ background: ink }} />
                      </div>
                      <div className="flex-1 space-y-1.5 rounded-md p-1.5" style={{ background: panel }}>
                        <div className="h-2 w-1/2 rounded-full" style={{ background: ink, opacity: 0.85 }} />
                        <div className="h-1 w-full rounded-full opacity-30" style={{ background: ink }} />
                        <div className="h-3 w-8 rounded" style={{ background: accent }} />
                      </div>
                    </div>
                    <div className="bg-panel px-2.5 py-2">
                      <p className="text-sm font-medium">
                        {t.name} {active && <span className="text-accent">✓</span>}
                      </p>
                      <p className="text-[0.7rem] text-muted">{t.blurb}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Accent colour</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onPrefs({ accent: "theme" })}
                className={`h-8 rounded-full border px-3 text-xs ${prefs.accent === "theme" ? "border-accent text-ink" : "border-line2 text-muted hover:text-ink"}`}
              >
                Theme default
              </button>
              {ACCENTS.map((a) => {
                const c = mode === "light" ? a.light : a.dark;
                const active = prefs.accent === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => onPrefs({ accent: a.id })}
                    title={a.name}
                    aria-label={`${a.name} accent`}
                    aria-pressed={active}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110"
                    style={{ background: c, boxShadow: active ? `0 0 0 2px var(--color-panel), 0 0 0 4px ${c}` : undefined }}
                  />
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Headings</h3>
              <Segmented<Headline>
                value={prefs.headline}
                onChange={(v) => onPrefs({ headline: v })}
                options={[
                  ["serif", "Editorial"],
                  ["sans", "Clean"],
                  ["mono", "Code"],
                ]}
              />
            </div>
            <div>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Text size</h3>
              <Segmented<TextSize>
                value={prefs.textSize}
                onChange={(v) => onPrefs({ textSize: v })}
                options={[
                  ["s", "Small"],
                  ["m", "Medium"],
                  ["l", "Large"],
                ]}
              />
            </div>
          </section>
        </div>
      )}

      {tab === "reading" && (
        <div className="space-y-2.5">
          <Toggle
            checked={prefs.focusMode}
            onChange={(v) => onPrefs({ focusMode: v })}
            label="Focus mode in chats"
            hint="Open chats with only the important messages shown. Small talk is collapsed."
          />
          <Toggle
            checked={prefs.showReasons}
            onChange={(v) => onPrefs({ showReasons: v })}
            label="Always show why"
            hint="Show the score and reasons on every card instead of behind “why?”."
          />
          <button onClick={onOpenPrivacy} className="mt-2 text-sm text-muted underline decoration-line2 underline-offset-4 hover:text-ink">
            Privacy, backups & wipe data →
          </button>
        </div>
      )}
    </Modal>
  );
}
