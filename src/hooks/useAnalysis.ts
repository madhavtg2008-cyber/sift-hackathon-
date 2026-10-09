"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeConversation, buildContext } from "@/lib/engine";
import type { AppData, ConvAnalysis, Conversation, ItemState, Lexicon, Profile } from "@/lib/types";

export interface AnalyzeRequest {
  job: number;
  conversations: Conversation[];
  items: Record<string, ItemState>;
  profile: Profile | null;
  lex: Lexicon;
  now: number;
}
export interface AnalyzeResponse {
  job: number;
  result: (readonly [string, ConvAnalysis])[];
  ms: number;
}

/** Below this many messages analysis is instant, so it runs inline; above it, in a Web Worker. */
export const WORKER_THRESHOLD = 1500;

function analyzeSync(req: Omit<AnalyzeRequest, "job">) {
  const context = buildContext(req.profile, req.lex, req.now);
  return new Map(req.conversations.map((c) => [c.id, analyzeConversation(c, context, req.items)]));
}

/**
 * Computes per-conversation analysis. Small inboxes are analysed synchronously; large ones
 * are sent to a dedicated Web Worker (falls back to inline if workers are unavailable).
 */
export function useAnalysis(data: AppData | null, lex: Lexicon, now: number) {
  const profile = data?.profile ?? null;
  const conversations = data?.conversations;
  const items = data?.items;
  const ctx = useMemo(() => buildContext(profile, lex, now), [profile, lex, now]);
  const totalMessages = useMemo(() => (conversations ?? []).reduce((n, c) => n + c.messages.length, 0), [conversations]);

  const workerRef = useRef<Worker | null>(null);
  const jobRef = useRef(0);
  const [workerOk, setWorkerOk] = useState(true);
  const [fromWorker, setFromWorker] = useState<{ map: Map<string, ConvAnalysis>; ms: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let w: Worker | null = null;
    try {
      w = new Worker(new URL("../workers/analyze.worker.ts", import.meta.url));
      w.onmessage = (e: MessageEvent<AnalyzeResponse>) => {
        if (e.data.job !== jobRef.current) return; // a newer job superseded this one
        setFromWorker({ map: new Map(e.data.result), ms: e.data.ms });
        setBusy(false);
      };
      w.onerror = () => {
        setWorkerOk(false);
        setBusy(false);
      };
      workerRef.current = w;
    } catch {
      setWorkerOk(false);
    }
    return () => w?.terminate();
  }, []);

  const offload = workerOk && totalMessages > WORKER_THRESHOLD;

  const inline = useMemo(
    () => (offload || !conversations ? null : analyzeSync({ conversations, items: items ?? {}, profile, lex, now })),
    [offload, conversations, items, profile, lex, now],
  );

  useEffect(() => {
    if (!offload || !conversations || !workerRef.current) return;
    const job = ++jobRef.current;
    setBusy(true);
    const req: AnalyzeRequest = { job, conversations, items: items ?? {}, profile, lex, now };
    workerRef.current.postMessage(req);
  }, [offload, conversations, items, profile, lex, now]);

  const analyses = inline ?? fromWorker?.map ?? new Map<string, ConvAnalysis>();
  return { ctx, analyses, busy: offload && busy, mode: offload ? ("worker" as const) : ("inline" as const), totalMessages };
}
