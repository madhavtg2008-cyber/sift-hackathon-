import { describe, expect, it } from "vitest";
import { nameFromFile, parseChat } from "@/lib/parser";

describe("parseChat — WhatsApp Android", () => {
  const text = [
    "12/10/24, 9:41 pm - Messages and calls are end-to-end encrypted.",
    "12/10/24, 9:41 pm - Arjun: @Madhav can you deploy by 5pm?",
    "12/10/24, 9:43 pm - Priya: we decided on blue",
    "second line here",
    "13/10/24, 10:02 am - Kabir: <Media omitted>",
    "13/10/24, 10:05 am - Kabir: ok",
  ].join("\n");
  const r = parseChat(text);

  it("detects the format", () => expect(r.format).toBe("whatsapp"));
  it("skips system lines and media placeholders", () => {
    expect(r.messages.map((m) => m.author)).toEqual(["Arjun", "Priya", "Kabir"]);
    expect(r.skipped).toBe(1);
  });
  it("joins multi-line messages", () => expect(r.messages[1].text).toBe("we decided on blue\nsecond line here"));
  it("reads DD/MM dates and 12-hour times", () => {
    expect(r.messages[0].ts).toBe(new Date(2024, 9, 12, 21, 41).getTime());
  });
});

describe("parseChat — WhatsApp iOS", () => {
  it("parses bracketed timestamps with seconds", () => {
    const r = parseChat("[12/10/24, 9:41:22 PM] Arjun: hello\n[12/10/24, 9:42:01 PM] Priya: urgent pls check");
    expect(r.format).toBe("whatsapp");
    expect(r.messages).toHaveLength(2);
    expect(r.messages[1].ts).toBe(new Date(2024, 9, 12, 21, 42, 1).getTime());
  });
  it("switches to MM/DD when the second number exceeds 12", () => {
    const r = parseChat("[10/13/24, 9:00 AM] A: one\n[10/14/24, 9:00 AM] B: two");
    expect(new Date(r.messages[0].ts).getDate()).toBe(13);
  });
});

describe("parseChat — JSON / Slack", () => {
  it("reads Slack-style exports with second-based timestamps", () => {
    const r = parseChat(JSON.stringify({ messages: [{ user: "a", text: "hi", ts: "1728540000.0001" }] }));
    expect(r.format).toBe("json");
    expect(r.messages[0]).toMatchObject({ author: "a", text: "hi", ts: 1728540000000 });
  });
  it("reads nested author objects and ISO dates, sorted by time", () => {
    const r = parseChat(
      JSON.stringify([
        { from: { name: "B" }, message: "second", date: "2026-10-09T10:00:00Z" },
        { from: { name: "A" }, message: "first", date: "2026-10-09T09:00:00Z" },
      ]),
    );
    expect(r.messages.map((m) => m.text)).toEqual(["first", "second"]);
  });
  it("skips entries without author or text", () => {
    const r = parseChat(JSON.stringify([{ text: "no author" }, { author: "A", text: "ok" }]));
    expect(r.messages).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });
});

describe("parseChat — plain text", () => {
  it("parses Name: message lines and continuations", () => {
    const r = parseChat("Arjun: hi\nPriya: hello there\n  continued");
    expect(r.format).toBe("paste");
    expect(r.messages[1].text).toBe("hello there\ncontinued");
  });
  it("keeps messages in chronological order", () => {
    const r = parseChat("A: one\nB: two\nC: three");
    const ts = r.messages.map((m) => m.ts);
    expect([...ts].sort((x, y) => x - y)).toEqual(ts);
  });
  it("returns nothing for empty input", () => {
    expect(parseChat("   ").messages).toHaveLength(0);
  });
});

describe("nameFromFile", () => {
  it("strips the WhatsApp prefix and extension", () => expect(nameFromFile("WhatsApp Chat with Team X.txt")).toBe("Team X"));
});
