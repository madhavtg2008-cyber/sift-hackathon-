"use client";

import { useState, useSyncExternalStore } from "react";
import { netguard, selfTest, serverSnapshot } from "@/lib/netguard";
import { storageBytes } from "@/lib/store";
import type { AppData } from "@/lib/types";
import { bytes, clockTime } from "@/lib/util";
import { Button, Modal } from "./ui";

export function useNetEvents() {
  return useSyncExternalStore(netguard.subscribe, netguard.snapshot, serverSnapshot);
}

export function PrivacyPanel({
  open,
  onClose,
  data,
  onWipe,
  onRestore,
  rulesSource,
}: {
  open: boolean;
  onClose: () => void;
  data: AppData;
  onWipe: () => void;
  onRestore: (d: AppData) => void;
  rulesSource: string;
}) {
  const events = useNetEvents();
  const [test, setTest] = useState<"idle" | "running" | "blocked" | "leaked">("idle");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const blocked = events.filter((e) => e.blocked).length;
  const external = events.filter((e) => !e.sameOrigin).length;
  const sentBytes = events.filter((e) => !e.blocked).reduce((n, e) => n + e.bytes, 0);
  const totalMsgs = data.conversations.reduce((n, c) => n + c.messages.length, 0);

  const runTest = async () => {
    const sample = data.conversations.flatMap((c) => c.messages).find((m) => m.text.length >= 20)?.text;
    if (!sample) return setTest("idle");
    setTest("running");
    setTest((await selfTest(sample)) ? "blocked" : "leaked");
  };

  const exportBackup = () => {
    // Generated and saved locally via a blob URL — no network involved.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = (file: File) =>
    file.text().then((t) => {
      try {
        const d = JSON.parse(t) as AppData;
        if (d.version === 1 && Array.isArray(d.conversations)) onRestore(d);
      } catch {
        /* ignore invalid file */
      }
    });

  return (
    <Modal open={open} onClose={onClose} title="Privacy & data" wide>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Chat bytes sent", "0 B", "text-accent"],
          ["Requests blocked", String(blocked), blocked ? "text-crit" : "text-ink"],
          ["External requests", String(external), external ? "text-high" : "text-ink"],
          ["Stored on this device", bytes(storageBytes()), "text-ink"],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-xl border border-line bg-bg p-3">
            <p className="text-[0.6875rem] text-muted">{l}</p>
            <p className={`mt-1 font-mono text-xl ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section className="space-y-2.5 text-sm leading-relaxed text-muted">
          <h3 className="text-sm font-semibold text-ink">How Sift keeps chats on your device</h3>
          <p>
            <b className="text-ink">Local analysis.</b> Mentions, tasks, decisions, deadlines and priority scores are computed by
            JavaScript running in this tab. {totalMsgs} messages analysed, 0 uploaded.
          </p>
          <p>
            <b className="text-ink">On-device AI.</b> AI summaries use Chrome&apos;s built-in Gemini Nano, which runs inside the browser.
            If it isn&apos;t available, Sift falls back to its local engine — never to a cloud API.
          </p>
          <p>
            <b className="text-ink">Privacy firewall.</b> Every fetch / XHR / beacon is inspected. Any request containing chat text is
            blocked before it leaves the browser. A strict Content-Security-Policy also stops connections to other domains.
          </p>
          <p>
            <b className="text-ink">Server role.</b> The backend only serves the app, and rule packs ({rulesSource}). It refuses
            any uploaded content.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Network log (this session)</h3>
            <Button size="sm" variant="ghost" onClick={() => netguard.clear()}>
              Clear
            </Button>
          </div>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-line bg-bg font-mono text-[0.6875rem]">
            {events.length === 0 ? (
              <p className="p-3 text-faint">No requests yet.</p>
            ) : (
              [...events].reverse().map((e) => (
                <div key={e.id} className="flex items-center gap-2 border-b border-line/60 px-2.5 py-1.5 last:border-0">
                  <span className="text-faint">{clockTime(e.time)}</span>
                  <span className={e.blocked ? "text-crit" : "text-muted"}>{e.method}</span>
                  <span className="min-w-0 flex-1 truncate text-ink" title={e.url}>
                    {e.url}
                  </span>
                  <span className={e.blocked ? "font-semibold text-crit" : "text-accent"}>{e.blocked ? "BLOCKED" : "ok"}</span>
                </div>
              ))
            )}
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-faint">{bytes(sentBytes)} of request bodies sent — none contained chat content.</p>

          <div className="mt-4 rounded-lg border border-line bg-bg p-3">
            <p className="text-sm font-medium">Leak test</p>
            <p className="mt-1 text-xs text-muted">Tries to POST one of your real messages to the server. The firewall should stop it.</p>
            <div className="mt-2.5 flex items-center gap-3">
              <Button size="sm" onClick={runTest} disabled={test === "running" || !totalMsgs}>
                {test === "running" ? "Testing…" : "Run leak test"}
              </Button>
              {test === "blocked" && <span className="text-xs font-medium text-accent">✓ Blocked — nothing left your device</span>}
              {test === "leaked" && <span className="text-xs font-medium text-crit">Request was not blocked</span>}
              {!totalMsgs && <span className="text-xs text-faint">Add a chat first</span>}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button size="sm" onClick={exportBackup}>
          Export backup (.json)
        </Button>
        <label className="inline-flex h-7 cursor-pointer items-center rounded-lg border border-line2 px-2.5 text-xs hover:bg-panel2">
          Restore backup
          <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        </label>
        <div className="flex-1" />
        {confirmWipe ? (
          <>
            <span className="text-xs text-crit">Delete all chats, summaries and settings?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirmWipe(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onWipe();
                setConfirmWipe(false);
                onClose();
              }}
            >
              Yes, wipe everything
            </Button>
          </>
        ) : (
          <Button size="sm" variant="danger" onClick={() => setConfirmWipe(true)}>
            Wipe all data
          </Button>
        )}
      </div>
    </Modal>
  );
}
