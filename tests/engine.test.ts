import { describe, expect, it } from "vitest";
import { analyzeConversation, buildContext, priorityOf } from "@/lib/engine";
import { DEFAULT_LEXICON } from "@/lib/lexicon";
import type { Conversation, Profile } from "@/lib/types";

const NOW = new Date(2026, 9, 9, 13, 0).getTime();
const ME: Profile = { name: "Madhav", aliases: ["Maddy"], vips: ["Mom"], keywords: ["invoice"] };
const ctx = buildContext(ME, DEFAULT_LEXICON, NOW);

function conv(rows: [string, string][], lastReadIndex = -1): Conversation {
  return {
    id: "c1",
    name: "Test",
    source: "paste",
    createdAt: NOW,
    lastReadIndex,
    messages: rows.map(([author, text], i) => ({ id: `m${i}`, author, text, ts: NOW - (rows.length - i) * 60_000 })),
  };
}
const kindsOf = (a: ReturnType<typeof analyzeConversation>, i: number) => a.insights.find((x) => x.msgId === `m${i}`)?.kinds ?? [];

describe("priorityOf", () => {
  it("buckets scores", () => {
    expect([priorityOf(80), priorityOf(50), priorityOf(30), priorityOf(5)]).toEqual(["critical", "high", "medium", "low"]);
  });
});

describe("analyzeConversation", () => {
  const group = conv([
    ["Arjun", "Good morning everyone"],
    ["Arjun", "@Madhav can you set up the repo before 2pm?"],
    ["Priya", "we decided: going with Next.js, final hai"],
    ["Kabir", "lol"],
    ["Priya", "URGENT: portal closes at 5pm today!!"],
    ["Kabir", "anyone going to the fest tonight?"],
    ["Neha", "Maddy please share the invoice by Monday"],
  ]);
  const a = analyzeConversation(group, ctx);

  it("flags a direct mention with a question, task and deadline", () => {
    expect(kindsOf(a, 1)).toEqual(expect.arrayContaining(["mention", "question", "action", "deadline"]));
    expect(a.insights.find((i) => i.msgId === "m1")?.priority).toBe("critical");
  });
  it("detects decisions, including Hinglish", () => expect(kindsOf(a, 2)).toContain("decision"));
  it("detects urgency", () => expect(kindsOf(a, 4)).toContain("urgent"));
  it("ignores small talk and greetings", () => {
    expect(kindsOf(a, 0)).toEqual([]);
    expect(kindsOf(a, 3)).toEqual([]);
    expect(kindsOf(a, 5)).toEqual([]);
  });
  it("matches nicknames and boosts keywords", () => {
    const i = a.insights.find((x) => x.msgId === "m6");
    expect(i?.kinds).toContain("mention");
    expect(i?.reasons.join(" ")).toMatch(/Keyword: invoice/);
  });
  it("counts unread messages from others", () => expect(a.unread).toBe(7));
  it("ranks the conversation as critical", () => expect(a.priority).toBe("critical"));
});

describe("reply tracking", () => {
  it("marks a question answered once I reply", () => {
    const before = analyzeConversation(conv([["Rohan", "can you change the prices?"]]), ctx);
    const after = analyzeConversation(
      conv([
        ["Rohan", "can you change the prices?"],
        ["Madhav", "done"],
      ]),
      ctx,
    );
    expect(before.needsReply).toBe(1);
    expect(after.needsReply).toBe(0);
  });
  it("records my own commitments as tasks", () => {
    const a = analyzeConversation(
      conv([
        ["Arjun", "who does frontend?"],
        ["Madhav", "I'll handle the frontend"],
      ]),
      ctx,
    );
    expect(a.insights.find((i) => i.msgId === "m1")?.reasons).toContain("You committed to this");
  });
  it("does not count my own messages as unread", () => {
    expect(
      analyzeConversation(
        conv([
          ["Madhav", "hi"],
          ["Rohan", "hello"],
        ]),
        ctx,
      ).unread,
    ).toBe(1);
  });
});

describe("item state", () => {
  it("drops done items from the conversation score", () => {
    const c = conv([["Rohan", "@Madhav urgent!! can you fix the site by 5pm?"]], 0);
    const open = analyzeConversation(c, ctx);
    const done = analyzeConversation(c, ctx, { "c1:m0": { done: true } });
    expect(done.score).toBeLessThan(open.score);
  });
});
