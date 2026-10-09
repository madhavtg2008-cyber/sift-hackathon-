import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/calendar";

const due = Date.UTC(2026, 9, 9, 11, 30); // 5:00 PM IST
const ics = buildIcs(
  [{ id: "c1:m1", title: "Deploy the site, by 5pm", description: "Arjun in Team\nline two", start: due }],
  Date.UTC(2026, 9, 9, 6),
);

describe("buildIcs", () => {
  it("produces a valid VCALENDAR with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });
  it("ends the event at the deadline in UTC", () => {
    expect(ics).toContain("DTEND:20261009T113000Z");
    expect(ics).toContain("DTSTART:20261009T110000Z");
  });
  it("escapes commas and newlines per RFC 5545", () => {
    expect(ics).toContain("SUMMARY:Deploy the site\\, by 5pm");
    expect(ics).toContain("DESCRIPTION:Arjun in Team\\nline two");
  });
  it("adds a 30-minute reminder alarm", () => expect(ics).toContain("TRIGGER:-PT30M"));
  it("folds long lines at 75 octets", () => {
    const long = buildIcs([{ id: "x", title: "a".repeat(200), description: "", start: due }]);
    for (const line of long.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
