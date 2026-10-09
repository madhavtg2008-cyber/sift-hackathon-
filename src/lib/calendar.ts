/**
 * Builds an iCalendar (.ics, RFC 5545) file from deadlines, generated on the device
 * and saved as a download — works with Google Calendar, Apple Calendar and Outlook.
 */
export interface CalendarItem {
  id: string;
  title: string;
  description: string;
  start: number; // epoch ms
  durationMin?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};
/** RFC 5545 text escaping. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** RFC 5545 line folding at 75 octets. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(items: CalendarItem[], now = Date.now()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sift//Chat deadlines//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const it of items) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${it.id}@sift.local`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(it.start - (it.durationMin ?? 30) * 60_000)}`,
      `DTEND:${stamp(it.start)}`,
      `SUMMARY:${esc(it.title)}`,
      `DESCRIPTION:${esc(it.description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-PT30M",
      `DESCRIPTION:${esc(it.title)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Saves the file locally via a blob URL — no network involved. */
export function downloadIcs(items: CalendarItem[], filename = "sift-deadlines.ics") {
  const url = URL.createObjectURL(new Blob([buildIcs(items)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
