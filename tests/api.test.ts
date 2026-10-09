import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getRules, POST as postRules } from "@/app/api/v1/rules/route";
import { GET as getHealth, POST as postHealth } from "@/app/api/v1/health/route";
import { GET as getSpec } from "@/app/api/v1/openapi.json/route";
import { HealthResponse, LexiconSchema, Problem } from "@/lib/contracts";
import { createRateLimiter } from "@/server/rateLimit";

let ip = 0;
const req = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(new URL(path, "http://localhost"), {
    method: init.method ?? "GET",
    headers: { "x-forwarded-for": `10.0.0.${++ip}`, ...init.headers },
  });

describe("GET /api/v1/rules", () => {
  it("returns a valid rule pack with ETag and rate-limit headers", async () => {
    const res = await getRules(req("/api/v1/rules"));
    expect(res.status).toBe(200);
    expect(LexiconSchema.safeParse(await res.json()).success).toBe(true);
    expect(res.headers.get("etag")).toMatch(/^"rules-/);
    expect(res.headers.get("ratelimit-limit")).toBe("60");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
  it("serves an English-only pack without Hinglish terms", async () => {
    const en = await (await getRules(req("/api/v1/rules?pack=en"))).json();
    const all = await (await getRules(req("/api/v1/rules?pack=" + encodeURIComponent("en+hinglish")))).json();
    expect(en.urgent).not.toContain("jaldi");
    expect(all.urgent).toContain("jaldi");
    expect(en.version).not.toBe(all.version);
  });
  it("answers 304 when the ETag matches", async () => {
    const first = await getRules(req("/api/v1/rules"));
    const res = await getRules(req("/api/v1/rules", { headers: { "if-none-match": first.headers.get("etag")! } }));
    expect(res.status).toBe(304);
  });
  it("rejects invalid input with an RFC 9457 problem", async () => {
    const res = await getRules(req("/api/v1/rules?pack=klingon"));
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(Problem.safeParse(await res.json()).success).toBe(true);
  });
  it("refuses other methods with 405", async () => {
    const res = await postRules(req("/api/v1/rules", { method: "POST" }));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET");
  });
});

describe("/api/v1/health", () => {
  it("reports health in the documented shape", async () => {
    const res = await getHealth(req("/api/v1/health"));
    expect(HealthResponse.safeParse(await res.json()).success).toBe(true);
  });
  it("refuses any upload with 403", async () => {
    const res = await postHealth(req("/api/v1/health", { method: "POST" }));
    expect(res.status).toBe(403);
    expect((await res.json()).title).toMatch(/not accepted/);
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After after 60 requests a minute from one IP", async () => {
    const hit = () => getRules(req("/api/v1/rules", { headers: { "x-forwarded-for": "203.0.113.9" } }));
    for (let i = 0; i < 60; i++) expect((await hit()).status).toBe(200);
    const res = await hit();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
  it("frees capacity once the window passes", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 10).ok).toBe(true);
    expect(check("a", 20).ok).toBe(false);
    expect(check("a", 1015).ok).toBe(true);
  });
});

describe("GET /api/v1/openapi.json", () => {
  it("publishes an OpenAPI 3.1 document covering every route", async () => {
    const spec = await getSpec().json();
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths)).toEqual(["/api/v1/rules", "/api/v1/health"]);
  });
});

describe("legacy routes", () => {
  it("permanently redirect to /api/v1, keeping the query", async () => {
    const { GET } = await import("@/app/api/rules/route");
    const res = GET(req("/api/rules?pack=en"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/api/v1/rules?pack=en");
  });
  it("redirect health checks with 308 so POST stays POST", async () => {
    const { POST } = await import("@/app/api/health/route");
    const res = POST(req("/api/health", { method: "POST" }));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/api/v1/health");
  });
});
