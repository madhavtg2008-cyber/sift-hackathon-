/**
 * On-device AI via Chrome's built-in Gemini Nano (Summarizer / Prompt API).
 * The model runs inside the browser — text is never sent to any server.
 * Falls back gracefully when the browser doesn't support it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Availability = "unavailable" | "downloadable" | "downloading" | "available" | "unsupported";

const g = () => (typeof self !== "undefined" ? (self as any) : undefined);

export async function onDeviceStatus(): Promise<{ summarizer: Availability; prompt: Availability }> {
  const s = g();
  const check = async (api: any, opts?: object): Promise<Availability> => {
    if (!api?.availability) return "unsupported";
    try {
      return (await api.availability(opts)) as Availability;
    } catch {
      return "unavailable";
    }
  };
  return {
    summarizer: await check(s?.Summarizer, { type: "key-points", format: "plain-text", length: "medium" }),
    prompt: await check(s?.LanguageModel, { expectedOutputs: [{ type: "text", languages: ["en"] }] }),
  };
}

function clip(text: string, max = 3800) {
  return text.length > max ? text.slice(text.length - max) : text;
}

/** Reject outputs that are empty or just echo the input back. */
function sane(out: unknown, input: string) {
  const text = String(out ?? "").trim();
  if (!text) throw new Error("The model returned an empty summary");
  if (input.length > 400 && text.length > input.length * 0.8) throw new Error("The model didn't produce a summary");
  return text;
}

export async function onDeviceSummarize(
  transcript: string,
  myName: string,
  onProgress?: (pct: number) => void,
): Promise<{ text: string; engine: string }> {
  const s = g();
  const monitor = (m: any) =>
    m.addEventListener?.("downloadprogress", (e: any) => onProgress?.(Math.round((e.loaded ?? 0) * 100)));

  const input = clip(transcript);
  let lastErr: unknown;

  if (s?.LanguageModel?.create) {
    try {
    const avail = await s.LanguageModel.availability({ expectedOutputs: [{ type: "text", languages: ["en"] }] }).catch(() => "unavailable");
    if (avail !== "unavailable") {
      const session = await s.LanguageModel.create({
        monitor,
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [
          {
            role: "system",
            content:
              `You triage chat conversations for ${myName || "the user"}. Reply in plain text, max 6 short bullet lines starting with "• ". ` +
              `Cover: what happened, decisions made, tasks or questions for ${myName || "the user"}, and deadlines. No preamble.`,
          },
        ],
      });
      try {
        const text = await session.prompt(`Conversation:\n${input}`);
        return { text: sane(text, input), engine: "Gemini Nano · Prompt API (on-device)" };
      } finally {
        session.destroy?.();
      }
    }
    } catch (e) {
      lastErr = e; // fall through to the Summarizer API
    }
  }
  if (s?.Summarizer?.create) {
    const summarizer = await s.Summarizer.create({
      type: "key-points",
      format: "plain-text",
      length: "medium",
      sharedContext: `A group chat. The reader is ${myName || "a participant"}; highlight tasks, decisions and deadlines.`,
      monitor,
    });
    try {
      const text = await summarizer.summarize(input);
      return { text: sane(text, input), engine: "Gemini Nano · Summarizer API (on-device)" };
    } finally {
      summarizer.destroy?.();
    }
  }
  if (lastErr) throw lastErr;
  throw new Error("unsupported");
}
