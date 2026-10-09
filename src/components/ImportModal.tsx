"use client";

import { useMemo, useRef, useState } from "react";
import { nameFromFile, parseChat } from "@/lib/parser";
import type { Message, Source } from "@/lib/types";
import { Button, Field, inputCls, Modal } from "./ui";

type Tab = "paste" | "file" | "demo";

const EXAMPLE = `Arjun: @Madhav can you push the API routes by 3pm?
Priya: We decided to use Supabase, final hai
Kabir: lol
Priya: Pitch deck due tomorrow 10am, everyone add your slide
Arjun: URGENT the portal closes at 5pm today`;

export function ImportModal({
  open,
  onClose,
  onImport,
  onLoadDemo,
  myName,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (name: string, source: Source, messages: Omit<Message, "id">[], readCount: number) => void;
  onLoadDemo: () => Promise<number>;
  myName: string;
}) {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [allUnread, setAllUnread] = useState(true);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [demoState, setDemoState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (text.trim() ? parseChat(text) : null), [text]);
  const participants = useMemo(
    () => (parsed ? Array.from(new Set(parsed.messages.map((m) => m.author))) : []),
    [parsed],
  );

  const reset = () => {
    setText("");
    setName("");
    setFileName("");
    setError("");
    setDemoState("idle");
  };

  const readFile = async (file: File) => {
    setError("");
    if (file.size > 8 * 1024 * 1024) return setError("That file is over 8 MB. Export a shorter chat (without media).");
    // File is read locally with the File API — it is never uploaded.
    const content = await file.text();
    setText(content);
    setFileName(file.name);
    if (!name) setName(nameFromFile(file.name));
  };

  const submit = () => {
    if (!parsed?.messages.length) return;
    const readCount = allUnread ? 0 : Math.max(0, parsed.messages.length - 10);
    onImport(
      name.trim() || (participants.length <= 2 ? participants.find((p) => p !== myName) ?? "New chat" : "New group chat"),
      parsed.format,
      parsed.messages.map(({ author, text, ts }) => ({ author, text, ts })),
      readCount,
    );
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a conversation"
      wide
    >
      <div className="mb-4 flex gap-1 rounded-lg bg-bg p-1 text-sm" role="tablist">
        {(
          [
            ["paste", "Paste text"],
            ["file", "Upload export"],
            ["demo", "Demo chats"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md px-3 py-1.5 transition ${tab === k ? "bg-panel2 text-ink" : "text-muted hover:text-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "demo" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Loads 5 realistic chats (hackathon team, freelance client, class group, family, flatmates) with ~70 messages.
            The demo text comes from Sift&apos;s server; your name is filled in on this device only.
          </p>
          <Button
            variant="primary"
            disabled={demoState === "loading"}
            onClick={async () => {
              setDemoState("loading");
              try {
                await onLoadDemo();
                reset();
                onClose();
              } catch {
                setDemoState("error");
              }
            }}
          >
            {demoState === "loading" ? "Loading…" : "Load demo chats"}
          </Button>
          {demoState === "error" && <p className="text-sm text-crit">Couldn&apos;t reach the server. Try pasting a chat instead.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {tab === "paste" ? (
            <Field label="Chat text" hint="WhatsApp exports, Slack/JSON exports, or simple “Name: message” lines all work.">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder={EXAMPLE}
                className={`${inputCls} font-mono text-[0.7812rem] leading-relaxed`}
              />
            </Field>
          ) : (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) readFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragging ? "border-accent bg-accent/5" : "border-line2 hover:border-muted"
                }`}
              >
                <span className="text-2xl">⇪</span>
                <p className="mt-2 text-sm">{fileName ? fileName : "Drop a .txt or .json chat export, or click to choose"}</p>
                <p className="mt-1 text-xs text-faint">Read locally in your browser — never uploaded.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.json,text/plain,application/json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
                />
              </div>
              <details className="mt-3 text-xs text-muted">
                <summary className="cursor-pointer hover:text-ink">How do I export a WhatsApp chat?</summary>
                <p className="mt-2 leading-relaxed">
                  Open the chat → tap the name (or ⋮ menu) → <b>Export chat</b> → <b>Without media</b>. Save the .txt file and drop it here.
                </p>
                <a href="/sample-whatsapp-chat.txt" download className="mt-2 inline-block text-accent underline underline-offset-2">
                  Download a sample WhatsApp export to try
                </a>
              </details>
            </div>
          )}

          {error && <p className="text-sm text-crit">{error}</p>}

          {parsed && (
            <div className="rounded-lg border border-line bg-bg px-3 py-2.5 text-xs">
              {parsed.messages.length ? (
                <p className="text-muted">
                  Detected <span className="text-ink">{parsed.formatLabel}</span> ·{" "}
                  <span className="text-ink">{parsed.messages.length}</span> messages ·{" "}
                  <span className="text-ink">{participants.length}</span> people ({participants.slice(0, 4).join(", ")}
                  {participants.length > 4 ? "…" : ""}){parsed.skipped ? ` · ${parsed.skipped} system lines skipped` : ""}
                </p>
              ) : (
                <p className="text-crit">Couldn&apos;t find any messages. Use “Name: message” on each line.</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Conversation name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Project team" className={inputCls} />
            </Field>
            <label className="flex h-9 items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={allUnread} onChange={(e) => setAllUnread(e.target.checked)} className="accent-[var(--color-accent)]" />
              Treat all as unread
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {tab === "paste" && !text && (
              <Button variant="ghost" onClick={() => setText(EXAMPLE.replaceAll("Madhav", myName || "Madhav"))}>
                Use example
              </Button>
            )}
            <Button variant="primary" disabled={!parsed?.messages.length} onClick={submit}>
              Analyze on device
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
