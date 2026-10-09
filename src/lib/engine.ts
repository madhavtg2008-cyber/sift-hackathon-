import type { ConvAnalysis, Conversation, Insight, ItemState, Kind, Lexicon, Priority, Profile } from "./types";
import { parseDue } from "./dates";
import { escapeRegex } from "./util";

/**
 * Sift's local analysis engine. Pure functions, runs entirely in the browser:
 * nothing in here touches the network.
 */

export function priorityOf(score: number): Priority {
  if (score >= 70) return "critical";
  if (score >= 48) return "high";
  if (score >= 28) return "medium";
  return "low";
}

function phraseRe(list: string[]) {
  const parts = list.map((p) => escapeRegex(p.toLowerCase()).replace(/\\ /g, "\\s+"));
  return new RegExp(`(?:^|[^a-z0-9@])(${parts.join("|")})(?=$|[^a-z0-9])`, "i");
}

interface Ctx {
  lex: Lexicon;
  urgentRe: RegExp;
  actionRe: RegExp;
  decisionRe: RegExp;
  calloutRe: RegExp;
  meRe: RegExp | null;
  isMe: (author: string) => boolean;
  vips: string[];
  keywords: string[];
  now: number;
}

export function buildContext(profile: Profile | null, lex: Lexicon, now = Date.now()): Ctx {
  const names = profile
    ? Array.from(
        new Set(
          [profile.name, profile.name.split(/\s+/)[0], ...profile.aliases]
            .map((n) => n.trim())
            .filter((n) => n.length >= 2),
        ),
      )
    : [];
  const meRe = names.length
    ? new RegExp(`(?:^|[^a-z0-9])@?(${names.map(escapeRegex).join("|")})(?=$|[^a-z0-9])`, "i")
    : null;
  const lowerNames = names.map((n) => n.toLowerCase());
  return {
    lex,
    urgentRe: phraseRe(lex.urgent),
    actionRe: phraseRe(lex.action),
    decisionRe: phraseRe(lex.decision),
    calloutRe: phraseRe(lex.groupCallouts),
    meRe,
    isMe: (author: string) => {
      const a = author.toLowerCase().trim();
      return a === "you" || a === "me" || lowerNames.some((n) => a === n || a.split(/\s+/)[0] === n);
    },
    vips: (profile?.vips ?? []).map((v) => v.toLowerCase().trim()).filter(Boolean),
    keywords: (profile?.keywords ?? []).map((v) => v.toLowerCase().trim()).filter(Boolean),
    now,
  };
}

const QUESTION_START =
  /^(what|when|where|who|whom|which|why|how|can|could|will|would|is|are|do|does|did|should|shall|have|has|any update|kya|kab|kaun|kahan|kaise|kitna|kidhar)\b/i;
const COMMITMENT = /\b(i'?ll|i will|i'm on it|im on it|on it|will do|i can do|i'll handle|leave it to me|main kar|mai kar|kar dunga|kar dungi|bhej dunga|bhej dungi)\b/i;

export function analyzeConversation(
  conv: Conversation,
  ctx: Ctx,
  items: Record<string, ItemState> = {},
): ConvAnalysis {
  const others = Array.from(new Set(conv.messages.map((m) => m.author).filter((a) => !ctx.isMe(a))));
  const oneToOne = others.length === 1;
  const smallGroup = others.length > 1 && others.length <= 3; // in tiny groups, unaddressed asks usually include you
  const participants = Array.from(new Set(conv.messages.map((m) => m.author)));

  // last index at which "I" spoke — used to know whether a question got answered
  const myReplyIdx: number[] = [];
  conv.messages.forEach((m, i) => ctx.isMe(m.author) && myReplyIdx.push(i));

  const insights: Insight[] = [];
  conv.messages.forEach((msg, idx) => {
    const text = msg.text;
    const lower = text.toLowerCase();
    const fromMe = ctx.isMe(msg.author);
    const unread = idx > conv.lastReadIndex && !fromMe;
    const kinds = new Set<Kind>();
    const reasons: string[] = [];
    let score = 0;

    const mentioned = !fromMe && !!ctx.meRe?.test(text);
    const wordCount = text.trim().split(/\s+/).length;
    const callout = !fromMe && wordCount >= 4 && ctx.calloutRe.test(lower); // ignore "good morning everyone"
    const directed = mentioned || (oneToOne && !fromMe);
    const forGroup = callout && !mentioned;
    const mentionsSomeoneElse = /(^|\s)@[a-z]/i.test(text) && !mentioned && !callout;

    if (mentioned) { kinds.add("mention"); score += 30; reasons.push("Mentions you"); }
    else if (forGroup) { kinds.add("mention"); score += 15; reasons.push("Group callout"); }

    const answered = myReplyIdx.some((i) => i > idx);

    // Questions
    const isQuestion = text.includes("?") || QUESTION_START.test(text.trim());
    if (isQuestion && !fromMe && (directed || forGroup) && !/^\s*(ok|okay|right|really|lol|haha)\b.*\?$/i.test(text)) {
      kinds.add("question");
      score += 18;
      reasons.push(directed ? "Asks you a question" : "Question to the group");
      if (!answered && directed) { score += 12; reasons.push("You haven't replied"); }
    }

    // Action items
    const firstWord = lower.replace(/^(@\S+\s*|[a-z]+[,:]\s+)/, "").split(/\s+/)[0]?.replace(/[^a-z]/g, "");
    const actionHit = ctx.actionRe.exec(lower);
    const startsImperative = !!firstWord && ctx.lex.actionStarts.includes(firstWord);
    const commitment = fromMe && COMMITMENT.test(text);
    let forMe = directed || forGroup || commitment;
    if (commitment) {
      kinds.add("action"); score += 22; reasons.push("You committed to this");
    } else if (!fromMe && (actionHit || startsImperative)) {
      kinds.add("action");
      if (directed || forGroup) { score += directed ? 25 : 16; reasons.push(directed ? "Action item for you" : "Action item for everyone"); }
      else if (smallGroup && !mentionsSomeoneElse) { score += 14; forMe = true; reasons.push("Ask to the group (small chat)"); }
      else { score += 6; reasons.push(mentionsSomeoneElse ? "Task for someone else" : "Action item"); forMe = false; }
    }

    // Decisions
    if (ctx.decisionRe.test(lower)) { kinds.add("decision"); score += 18; reasons.push("Decision"); }

    // Deadlines
    const due = parseDue(text, msg.ts, ctx.now);
    if (due) {
      kinds.add("deadline");
      score += 10;
      const relevant = forMe || kinds.has("action") || kinds.has("decision");
      const left = due.ts - ctx.now;
      const st = items[`${conv.id}:${msg.id}`];
      if (relevant && !st?.done) {
        if (due.overdue) { score += 25; reasons.push(`Overdue (${due.label})`); }
        else if (left < 24 * 3_600_000) { score += 22; reasons.push(`Due ${due.label}`); }
        else if (left < 72 * 3_600_000) { score += 12; reasons.push(`Due ${due.label}`); }
        else reasons.push(`Due ${due.label}`);
      } else {
        reasons.push(due.overdue ? `Was due ${due.label}` : `Mentions ${due.label}`);
      }
    }

    // Urgency
    const letters = text.replace(/[^A-Za-z]/g, "");
    const shouting = letters.length > 8 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7;
    if (!fromMe && (ctx.urgentRe.test(lower) || /!!/.test(text) || shouting)) {
      kinds.add("urgent"); score += 18; reasons.push("Urgent tone");
    }

    // a date on its own in chit-chat ("fest tonight?") isn't worth surfacing
    if (kinds.size === 1 && kinds.has("deadline") && !forMe && !ctx.keywords.some((k) => lower.includes(k))) return;

    if (!kinds.size) {
      // keyword relevance alone can still surface a message
      const kw = ctx.keywords.filter((k) => lower.includes(k));
      if (!kw.length || fromMe) return;
    }

    const author = msg.author.toLowerCase();
    if (ctx.vips.some((v) => author === v || author.split(/\s+/)[0] === v)) { score += 10; reasons.push(`From VIP`); }
    const kw = ctx.keywords.filter((k) => lower.includes(k));
    if (kw.length) { score += Math.min(16, kw.length * 8); reasons.push(`Keyword: ${kw.slice(0, 2).join(", ")}`); }
    if (unread) score += 8;
    if (!unread && ctx.now - msg.ts > 7 * 86_400_000) score -= 10;
    if (!forMe && !kinds.has("decision") && !kinds.has("urgent")) score -= 5;

    score = Math.max(1, Math.min(100, Math.round(score)));
    insights.push({
      key: `${conv.id}:${msg.id}`,
      convId: conv.id,
      convName: conv.name,
      msgId: msg.id,
      author: msg.author,
      text,
      ts: msg.ts,
      unread,
      kinds: Array.from(kinds),
      score,
      priority: priorityOf(score),
      reasons,
      due: due ? { ts: due.ts, label: due.label, overdue: due.overdue } : undefined,
      forMe,
      answered,
    });
  });

  const unreadCount = conv.messages.filter((m, i) => i > conv.lastReadIndex && !ctx.isMe(m.author)).length;
  const open = insights.filter((i) => !items[i.key]?.done && !items[i.key]?.dismissed);
  const top = open.reduce((m, i) => Math.max(m, i.score), 0);
  const highCount = open.filter((i) => i.score >= 48 && i.unread).length;
  const score = Math.min(100, top + highCount * 3 + (unreadCount ? 4 : 0));
  const needsReply = open.filter((i) => i.kinds.includes("question") && i.forMe && !i.answered && !i.reasons.includes("Question to the group")).length;

  return {
    convId: conv.id,
    insights,
    unread: unreadCount,
    score,
    priority: priorityOf(score),
    participants,
    topics: topics(conv, ctx),
    summary: summarize(conv, open, unreadCount, participants, ctx),
    needsReply,
  };
}

function topics(conv: Conversation, ctx: Ctx) {
  const stop = new Set(ctx.lex.stopwords);
  const names = new Set(conv.messages.flatMap((m) => m.author.toLowerCase().split(/\s+/)));
  const counts = new Map<string, number>();
  const slice = conv.messages.slice(Math.max(0, conv.lastReadIndex - 10));
  for (const m of slice) {
    const seen = new Set<string>();
    for (const w of m.text.toLowerCase().replace(/https?:\/\/\S+/g, "").split(/[^a-z0-9#+]+/)) {
      if (w.length < 4 || stop.has(w) || names.has(w) || /^\d+$/.test(w) || seen.has(w) || ctx.meRe?.test(w)) continue;
      seen.add(w);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

function trim(s: string, n = 110) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
}

function summarize(conv: Conversation, open: Insight[], unread: number, participants: string[], ctx: Ctx): string[] {
  const out: string[] = [];
  const unreadMsgs = conv.messages.filter((m, i) => i > conv.lastReadIndex && !ctx.isMe(m.author));
  if (unread) {
    const who = Array.from(new Set(unreadMsgs.map((m) => m.author)));
    out.push(
      `${unread} unread message${unread === 1 ? "" : "s"} from ${who.slice(0, 3).join(", ")}${who.length > 3 ? ` +${who.length - 3} more` : ""}.`,
    );
  } else {
    out.push(`All caught up — ${conv.messages.length} messages from ${participants.length} people.`);
  }
  const decisions = open.filter((i) => i.kinds.includes("decision")).slice(-2);
  for (const d of decisions) out.push(`Decided: ${trim(d.text)} — ${d.author}`);
  const mine = open
    .filter((i) => i.forMe && (i.kinds.includes("action") || i.kinds.includes("question")))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  for (const a of mine) {
    const lead = a.kinds.includes("question") && !a.answered ? "Waiting on your reply" : "For you";
    out.push(`${lead}: ${trim(a.text)}${a.due ? ` (due ${a.due.label})` : ""} — ${a.author}`);
  }
  const deadlines = open.filter((i) => i.due && !i.due.overdue && !mine.includes(i)).slice(0, 2);
  for (const d of deadlines) out.push(`Upcoming: ${trim(d.text, 90)} — ${d.due!.label}`);
  if (out.length === 1 && unreadMsgs.length) out.push(`Latest: ${trim(unreadMsgs[unreadMsgs.length - 1].text)}`);
  return out;
}

/** Plain transcript used as input to the on-device language model. */
export function transcript(conv: Conversation, max = 80) {
  const start = Math.max(0, Math.min(conv.lastReadIndex - 5, conv.messages.length - max));
  return conv.messages
    .slice(Math.max(0, start))
    .map((m) => `${m.author}: ${m.text.replace(/\s+/g, " ")}`)
    .join("\n");
}
