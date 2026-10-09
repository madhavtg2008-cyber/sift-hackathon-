import { describe, expect, it } from "vitest";
import { bytes, escapeRegex, hueFor, initials, relTime, uid } from "@/lib/util";

describe("util", () => {
  it("escapes regex metacharacters", () => expect(new RegExp(escapeRegex("a.b*(c)")).test("a.b*(c)")).toBe(true));
  it("makes initials", () => {
    expect(initials("Neha (CR)")).toBe("N(");
    expect(initials("madhav tg")).toBe("MT");
  });
  it("gives a stable hue per name", () => expect(hueFor("Arjun")).toBe(hueFor("Arjun")));
  it("formats byte sizes", () => {
    expect(bytes(512)).toBe("512 B");
    expect(bytes(2048)).toBe("2.0 KB");
    expect(bytes(3 * 1024 * 1024)).toBe("3.00 MB");
  });
  it("formats relative times", () => {
    const now = Date.now();
    expect(relTime(now - 10_000, now)).toBe("just now");
    expect(relTime(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(relTime(now + 2 * 3_600_000, now)).toBe("in 2 hours");
  });
  it("generates unique ids", () => expect(new Set(Array.from({ length: 200 }, uid)).size).toBe(200));
});
