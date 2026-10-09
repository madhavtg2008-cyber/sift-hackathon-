import type { Due } from "./types";
import { dayLabel } from "./util";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WD_RE =
  /\b(?:(by|on|this|next|before|till|until|coming)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|(?:sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b)/;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
const DATE_DM = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\b`);
const DATE_MD = new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`);
const DATE_NUM = /\b(?:by|on|due|before|till|until|deadline|date)[:\s]+(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/;
const DATE_ORD = /\b(?:by|on|before|due|till|until)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/;
const BAJE = /\b(\d{1,2})\s*baje\b/;
const TIME_AMPM = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/;
const TIME_24 = /\b(?:at|by|@|before|till)\s*([01]?\d|2[0-3])[:.]([0-5]\d)\b/;
const IN_REL = /\bin\s+(\d{1,3}|an?|one|two|three)\s*(min|mins|minutes|hr|hrs|hour|hours|day|days)\b/;

const word2n: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Extract a due date/time from free text, relative to when the message was sent.
 * Handles English + common Hinglish (aaj, kal, parso).
 */
export function parseDue(raw: string, refTs: number, now = Date.now()): (Due & { phrase: string }) | undefined {
  const t = raw.toLowerCase();
  const ref = new Date(refTs);
  let day: Date | undefined;
  let phrase = "";
  let hasTime = false;
  let hour = 23, minute = 59;

  // ---- relative offsets ("in 2 hours")
  const rel = IN_REL.exec(t);
  if (rel) {
    const n = /^\d+$/.test(rel[1]) ? parseInt(rel[1], 10) : word2n[rel[1]] ?? 1;
    const unit = rel[2];
    const ms = unit.startsWith("min") ? 60_000 : unit.startsWith("h") ? 3_600_000 : 86_400_000;
    const ts = refTs + n * ms;
    return finish(ts, true, rel[0]);
  }

  // ---- day words
  if (/\b(day after tomorrow|parso|parson)\b/.test(t)) {
    day = startOfDay(ref); day.setDate(day.getDate() + 2); phrase = "day after tomorrow";
  } else if (/\b(tomorrow|tmrw|tmr|tomo|kal tak|kal subah|kal shaam|kal ko|kal)\b/.test(t)) {
    day = startOfDay(ref); day.setDate(day.getDate() + 1); phrase = "tomorrow";
  } else if (/\b(today|tonight|aaj|eod|end of (the )?day|by evening|this evening|this afternoon)\b/.test(t)) {
    day = startOfDay(ref); phrase = "today";
  } else if (/\b(eow|end of (the )?week|this week|by weekend|before the weekend)\b/.test(t)) {
    day = startOfDay(ref);
    const add = (5 - day.getDay() + 7) % 7;
    day.setDate(day.getDate() + add); phrase = "end of week"; hour = 18; minute = 0; hasTime = true;
  } else if (/\bnext week\b/.test(t)) {
    day = startOfDay(ref);
    const add = ((1 - day.getDay() + 7) % 7) || 7;
    day.setDate(day.getDate() + add); phrase = "next week"; hour = 10; minute = 0; hasTime = true;
  } else if (/\b(eom|end of (the )?month)\b/.test(t)) {
    day = new Date(ref.getFullYear(), ref.getMonth() + 1, 0); phrase = "end of month";
  }

  // ---- weekdays
  if (!day) {
    const wd = WD_RE.exec(t);
    // short forms like "sat"/"sun" only count with a preposition
    if (wd && (wd[1] || wd[2].length > 5 || WEEKDAYS.includes(wd[2]))) {
      const name = wd[2];
      const target = WEEKDAYS.findIndex((w) => w.startsWith(name.slice(0, 3)));
      if (target >= 0) {
        day = startOfDay(ref);
        let add = (target - day.getDay() + 7) % 7;
        if (add === 0) add = wd[1] === "this" ? 0 : 7;
        if (wd[1] === "next" && add <= 2) add += 7;
        day.setDate(day.getDate() + add);
        phrase = wd[0];
      }
    }
  }

  // ---- explicit dates
  if (!day) {
    let d: number | undefined, m: number | undefined, y: number | undefined;
    let mm = DATE_DM.exec(t);
    if (mm) { d = parseInt(mm[1], 10); m = MONTHS.indexOf(mm[2].slice(0, 3)); phrase = mm[0]; }
    else if ((mm = DATE_MD.exec(t))) { d = parseInt(mm[2], 10); m = MONTHS.indexOf(mm[1].slice(0, 3)); phrase = mm[0]; }
    else if ((mm = DATE_NUM.exec(t))) {
      d = parseInt(mm[1], 10); m = parseInt(mm[2], 10) - 1; phrase = mm[0];
      if (mm[3]) { y = parseInt(mm[3], 10); if (y < 100) y += 2000; }
    }
    else if ((mm = DATE_ORD.exec(t))) {
      // "due on the 10th" -> this month, or next month if already past
      d = parseInt(mm[1], 10); m = ref.getMonth(); phrase = mm[0];
      if (d < ref.getDate()) m += 1;
      if (m > 11) { m = 0; y = ref.getFullYear() + 1; }
    }
    if (d !== undefined && m !== undefined && m >= 0 && m < 12 && d >= 1 && d <= 31) {
      day = new Date(y ?? ref.getFullYear(), m, d);
      if (!y && day.getTime() < startOfDay(ref).getTime() - 30 * 86_400_000) day.setFullYear(day.getFullYear() + 1);
    }
  }

  // ---- time of day
  const am = TIME_AMPM.exec(t);
  const h24 = am ? null : TIME_24.exec(t);
  let mm2: RegExpExecArray | null = null;
  if (am) {
    hour = parseInt(am[1], 10) % 12 + (am[3] === "pm" ? 12 : 0);
    minute = am[2] ? parseInt(am[2], 10) : 0;
    hasTime = hour < 24 && minute < 60;
    phrase = phrase ? `${phrase} ${am[0]}` : am[0];
  } else if (h24) {
    hour = parseInt(h24[1], 10); minute = parseInt(h24[2], 10); hasTime = true;
    phrase = phrase ? `${phrase} ${h24[0]}` : h24[0];
  } else if ((mm2 = BAJE.exec(t))) {
    // Hinglish "8 baje" — shaam/raat means pm
    hour = parseInt(mm2[1], 10) % 12 + (/\b(shaam|raat|evening|night)\b/.test(t) ? 12 : 0);
    minute = 0; hasTime = true;
    phrase = phrase ? `${phrase} ${mm2[0]}` : mm2[0];
  } else if (/\b(noon|lunch)\b/.test(t)) { hour = 12; minute = 0; hasTime = true; }
  else if (/\bmidnight\b/.test(t)) { hour = 23; minute = 59; hasTime = true; }
  else if (/\b(eod|end of (the )?day|evening|shaam)\b/.test(t)) { hour = 18; minute = 0; hasTime = true; }
  else if (/\btonight\b/.test(t)) { hour = 21; minute = 0; hasTime = true; }
  else if (/\b(morning|subah)\b/.test(t) && day) { hour = 10; minute = 0; hasTime = true; }

  if (!day && !hasTime) return undefined;
  if (!day) {
    // time only: same day as message, or next day if already passed at send time
    day = startOfDay(ref);
    const cand = new Date(day); cand.setHours(hour, minute, 0, 0);
    if (cand.getTime() < refTs - 30 * 60_000) day.setDate(day.getDate() + 1);
  }
  const due = new Date(day);
  due.setHours(hour, minute, 0, 0);
  return finish(due.getTime(), hasTime, phrase);

  function finish(ts: number, withTime: boolean, ph: string) {
    const label = withTime
      ? `${dayLabel(ts)}, ${new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
      : dayLabel(ts);
    return { ts, label, overdue: ts < now, phrase: ph.trim() };
  }
}
