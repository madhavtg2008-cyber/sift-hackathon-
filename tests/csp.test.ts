import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/csp";

describe("Content-Security-Policy", () => {
  const prod = buildCsp("abc123");
  it("allows scripts only with the per-request nonce (no unsafe-inline / unsafe-eval)", () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(prod).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(prod).not.toContain("unsafe-eval");
  });
  it("only lets the page talk to its own origin", () => expect(prod).toContain("connect-src 'self';"));
  it("forbids plugins, framing and base-tag hijacking", () => {
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("base-uri 'self'");
  });
  it("relaxes only what Next.js dev mode needs", () => {
    const dev = buildCsp("x", true);
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
});
