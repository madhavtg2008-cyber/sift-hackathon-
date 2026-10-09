import type { Message, Source } from "./types";
import { uid } from "./util";

export interface ParseResult {
  messages: Message[];
  format: Source;
  formatLabel: string;
  skipped: number;
}

// Android: 12/10/24, 9:41 pm - Name: msg     iOS: [12/10/24, 9:41:22 PM] Name: msg
const WA_LINE =
  /^\[?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([aApP]\.?\s?[mM]\.?)?\]?\s*(?:-\s*)?([^:]{1,60}?):\s([\s\S]*)$/;
const WA_SYSTEM = /^\[?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})/;

// Generic: "[10:30] Name: msg", "Name (10:30): msg", "Name: msg"
const GENERIC_LINE =
  /^(?:\[?(\d{1,2}):(\d{2})\s*([aApP][mM])?\]?\s*[-–]?\s*)?([A-Za-z0-9 _.'@\-()]{1,40}?)(?:\s*\((\d{1,2}):(\d{2})\s*([aApP][mM])?\))?\s*:\s+(.+)$/;

function clean(s: string) {
  return s.replace(/[‎‏  ]/g, " ");
}

function to24(h: number, ampm?: string) {
  if (!ampm) return h;
  const pm = /p/i.test(ampm);
  if (pm && h < 12) return h + 12;
  if (!pm && h === 12) return 0;
  return h;
}

function parseWhatsApp(lines: string[]): ParseResult | null {
  const raw: { a: number; b: number; y: number; h: number; m: number; s: number; author: string; text: string }[] = [];
  let skipped = 0;
  let matched = 0;
  for (const line of lines) {
    const m = WA_LINE.exec(line);
    if (m) {
      matched++;
      let y = parseInt(m[3], 10);
      if (y < 100) y += 2000;
      raw.push({
        a: parseInt(m[1], 10),
        b: parseInt(m[2], 10),
        y,
        h: to24(parseInt(m[4], 10), m[7]),
        m: parseInt(m[5], 10),
        s: m[6] ? parseInt(m[6], 10) : 0,
        author: m[8].trim(),
        text: m[9],
      });
    } else if (WA_SYSTEM.test(line)) {
      skipped++; // system line: "Messages are end-to-end encrypted", joins, etc.
    } else if (raw.length && line.trim()) {
      raw[raw.length - 1].text += "\n" + line; // multi-line message continuation
    }
  }
  if (matched < 2 || matched < lines.filter((l) => l.trim()).length * 0.3) return null;

  // Decide DD/MM vs MM/DD. Default to DD/MM (India).
  const monthFirst = raw.some((r) => r.b > 12) && !raw.some((r) => r.a > 12);
  const messages: Message[] = raw
    .filter((r) => !/^<media omitted>$|^this message was deleted$|^null$/i.test(r.text.trim()))
    .map((r) => {
      const day = monthFirst ? r.b : r.a;
      const month = monthFirst ? r.a : r.b;
      return {
        id: uid(),
        author: r.author,
        text: r.text.trim(),
        ts: new Date(r.y, month - 1, day, r.h, r.m, r.s).getTime(),
      };
    });
  return { messages, format: "whatsapp", formatLabel: "WhatsApp export", skipped };
}

type JsonMsg = Record<string, unknown>;

function pickStr(o: JsonMsg, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
    if (v && typeof v === "object" && "name" in (v as JsonMsg) && typeof (v as JsonMsg).name === "string")
      return (v as JsonMsg).name as string;
  }
  return undefined;
}

function pickTs(o: JsonMsg): number | undefined {
  const t = rawTs(o);
  return t === undefined ? undefined : Math.round(t); // Slack "ts" values carry fractional seconds
}

function rawTs(o: JsonMsg): number | undefined {
  for (const k of ["ts", "timestamp", "time", "date", "created_at", "createdAt", "sent_at"]) {
    const v = o[k];
    if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && v.trim() !== "") return n < 1e12 ? n * 1000 : n;
      const d = Date.parse(v);
      if (!Number.isNaN(d)) return d;
    }
  }
  return undefined;
}

function parseJson(text: string): ParseResult | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  let arr: unknown = data;
  if (data && !Array.isArray(data) && typeof data === "object") {
    const o = data as JsonMsg;
    arr = o.messages ?? o.chats ?? o.data ?? o.items;
  }
  if (!Array.isArray(arr)) return null;
  let skipped = 0;
  const now = Date.now();
  const messages: Message[] = [];
  arr.forEach((item, i) => {
    if (!item || typeof item !== "object") return void skipped++;
    const o = item as JsonMsg;
    const author = pickStr(o, ["author", "from", "sender", "user_name", "username", "name", "user"]);
    const body = pickStr(o, ["text", "message", "content", "body", "msg"]);
    if (!author || !body) return void skipped++;
    messages.push({
      id: uid(),
      author: author.trim(),
      text: body.trim(),
      ts: pickTs(o) ?? now - (arr.length - i) * 60_000,
    });
  });
  if (!messages.length) return null;
  messages.sort((a, b) => a.ts - b.ts);
  return { messages, format: "json", formatLabel: "JSON / Slack export", skipped };
}

function parseGeneric(lines: string[]): ParseResult {
  type Raw = { author: string; text: string; h?: number; m?: number };
  const raw: Raw[] = [];
  let skipped = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = GENERIC_LINE.exec(line);
    if (m && !/^https?$/i.test(m[4].trim())) {
      const hh = m[1] ?? m[5];
      const mm = m[2] ?? m[6];
      const ap = m[3] ?? m[7];
      raw.push({
        author: m[4].trim(),
        text: m[8].trim(),
        h: hh ? to24(parseInt(hh, 10), ap) : undefined,
        m: mm ? parseInt(mm, 10) : undefined,
      });
    } else if (raw.length) {
      raw[raw.length - 1].text += "\n" + line.trim();
    } else {
      skipped++;
    }
  }
  const now = Date.now();
  const today = new Date();
  const messages: Message[] = raw.map((r, i) => {
    let ts = now - (raw.length - i) * 2 * 60_000;
    if (r.h !== undefined && r.m !== undefined) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), r.h, r.m);
      if (d.getTime() > now) d.setDate(d.getDate() - 1);
      ts = d.getTime();
    }
    return { id: uid(), author: r.author, text: r.text, ts };
  });
  return { messages, format: "paste", formatLabel: "Plain text (Name: message)", skipped };
}

export function parseChat(input: string): ParseResult {
  const text = clean(input).replace(/\r\n?/g, "\n").trim();
  if (!text) return { messages: [], format: "paste", formatLabel: "Empty", skipped: 0 };
  if (text.startsWith("{") || text.startsWith("[{") || text.startsWith("[\n")) {
    const j = parseJson(text);
    if (j) return j;
  }
  const lines = text.split("\n");
  return parseWhatsApp(lines) ?? parseGeneric(lines);
}

/** Guess a conversation title from a WhatsApp export filename like "WhatsApp Chat with Team X.txt". */
export function nameFromFile(filename: string) {
  return filename
    .replace(/\.(txt|json)$/i, "")
    .replace(/^WhatsApp Chat (with|-)\s*/i, "")
    .trim();
}
