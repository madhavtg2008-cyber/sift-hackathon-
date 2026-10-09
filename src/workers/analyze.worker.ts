/**
 * Runs Sift's analysis engine off the main thread so large chats never freeze the UI.
 * Like the rest of the app, this worker has no network access to chat data: it only
 * receives data from the page and posts results back.
 */
import { analyzeConversation, buildContext } from "../lib/engine";
import type { AnalyzeRequest, AnalyzeResponse } from "../hooks/useAnalysis";

// Typed minimally so the DOM and WebWorker type libraries don't clash in one project.
const ctx = self as unknown as { onmessage: ((e: MessageEvent<AnalyzeRequest>) => void) | null; postMessage: (m: AnalyzeResponse) => void };

ctx.onmessage = (e: MessageEvent<AnalyzeRequest>) => {
  const { job, conversations, items, profile, lex, now } = e.data;
  const context = buildContext(profile, lex, now);
  const started = performance.now();
  const result = conversations.map((c) => [c.id, analyzeConversation(c, context, items)] as const);
  const response: AnalyzeResponse = { job, result: [...result], ms: performance.now() - started };
  ctx.postMessage(response);
};
