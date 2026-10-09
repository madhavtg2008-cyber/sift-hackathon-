import { describe, expect, it } from "vitest";
import { parseDue } from "@/lib/dates";

// Reference: Friday 9 Oct 2026, 1:00 PM local time
const REF = new Date(2026, 9, 9, 13, 0).getTime();
const at = (d: number, h: number, m = 0, month = 9, y = 2026) => new Date(y, month, d, h, m).getTime();
const due = (text: string) => parseDue(text, REF, REF);

describe("parseDue — English", () => {
  it("returns undefined when no date or time is mentioned", () => {
    expect(due("lol nice one")).toBeUndefined();
  });
  it("parses a time today", () => {
    expect(due("submit by 5pm")?.ts).toBe(at(9, 17));
  });
  it("parses 'today' with minutes", () => {
    expect(due("deploy by 4:30 pm today")?.ts).toBe(at(9, 16, 30));
  });
  it("rolls a passed time to the next day", () => {
    expect(due("call at 9am")?.ts).toBe(at(10, 9));
  });
  it("parses tomorrow with a time", () => {
    expect(due("plumber coming tomorrow 11am")?.ts).toBe(at(10, 11));
  });
  it("parses EOD as 6 PM", () => {
    expect(due("fill the form before EOD")?.ts).toBe(at(9, 18));
  });
  it("parses tonight as 9 PM", () => {
    expect(due("send it tonight")?.ts).toBe(at(9, 21));
  });
  it("parses a weekday as the next occurrence", () => {
    expect(due("invoice by Monday")?.ts).toBe(at(12, 23, 59));
  });
  it("treats the same weekday as next week", () => {
    expect(due("pay by Friday")?.ts).toBe(at(16, 23, 59));
  });
  it("ignores short weekday words without a preposition", () => {
    expect(due("the sun is out")).toBeUndefined();
  });
  it("parses day + month names", () => {
    expect(due("deadline is 14th Oct, 11:59 pm")?.ts).toBe(at(14, 23, 59));
  });
  it("parses month + day names", () => {
    expect(due("launch on Nov 3")?.ts).toBe(at(3, 23, 59, 10));
  });
  it("parses numeric DD/MM after a keyword", () => {
    expect(due("due 20/10")?.ts).toBe(at(20, 23, 59));
  });
  it("parses ordinal days of the month", () => {
    expect(due("rent is due on the 10th")?.ts).toBe(at(10, 23, 59));
  });
  it("parses relative offsets", () => {
    expect(due("back in 2 hours")?.ts).toBe(REF + 2 * 3_600_000);
  });
  it("parses end of week as Friday 6 PM", () => {
    expect(due("finish by end of week")?.ts).toBe(at(9, 18));
  });
  it("parses next week as Monday 10 AM", () => {
    expect(due("let's meet next week")?.ts).toBe(at(12, 10));
  });
  it("flags overdue deadlines", () => {
    const d = parseDue("submit by 11am", at(9, 9), REF);
    expect(d?.overdue).toBe(true);
  });
});

describe("parseDue — Hinglish", () => {
  it("parses 'kal' as tomorrow", () => {
    expect(due("kal tak bhej do")?.ts).toBe(at(10, 23, 59));
  });
  it("parses 'kal subah 8 baje'", () => {
    expect(due("kal subah 8 baje dentist hai")?.ts).toBe(at(10, 8));
  });
  it("parses 'shaam 7 baje' as PM", () => {
    expect(due("aaj shaam 7 baje milte hai")?.ts).toBe(at(9, 19));
  });
  it("parses 'parso' as the day after tomorrow", () => {
    expect(due("parso submit karna hai")?.ts).toBe(at(11, 23, 59));
  });
});
