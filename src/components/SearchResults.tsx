"use client";

import type { Conversation, Message } from "@/lib/types";
import { relTime } from "@/lib/util";

export function searchChats(conversations: Conversation[], query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return conversations.flatMap((c) =>
    c.messages.filter((m) => m.text.toLowerCase().includes(q) || m.author.toLowerCase().includes(q)).map((m) => ({ c, m })),
  );
}

export function SearchResults({
  query,
  results,
  now,
  onOpen,
}: {
  query: string;
  results: { c: Conversation; m: Message }[];
  now: number;
  onOpen: (convId: string, msgId: string) => void;
}) {
  const q = query.trim().toLowerCase();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <p className="text-sm text-muted">
        {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
      </p>
      <div className="mt-4 space-y-2">
        {results.slice(0, 60).map(({ c, m }) => (
          <button
            key={m.id}
            onClick={() => onOpen(c.id, m.id)}
            className="block w-full rounded-xl border border-line bg-panel p-3 text-left hover:border-line2"
          >
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
