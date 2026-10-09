import { NextResponse, type NextRequest } from "next/server";
import type { Problem } from "@/lib/contracts";
import { createRateLimiter, type RateLimitResult } from "./rateLimit";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
}

export function requestId(req: NextRequest) {
  return req.headers.get("x-vercel-id") ?? crypto.randomUUID();
}

function rateHeaders(r: RateLimitResult): Record<string, string> {
  return { "RateLimit-Limit": String(r.limit), "RateLimit-Remaining": String(r.remaining), "RateLimit-Reset": String(r.resetSeconds) };
}

/** RFC 9457 problem+json error response. */
export function problem(req: NextRequest, status: number, title: string, detail?: string, headers: Record<string, string> = {}) {
  const body: Problem = { type: `https://sift.dev/problems/${status}`, title, status, detail, requestId: requestId(req) };
  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store", ...headers },
  });
}

/** Wraps a route handler with rate limiting, request IDs and safe error handling. */
export function handler(fn: (req: NextRequest) => Response | Promise<Response>) {
  return async (req: NextRequest) => {
    const rl = limiter(clientKey(req));
    if (!rl.ok)
      return problem(req, 429, "Too many requests", "Slow down and try again shortly.", {
        ...rateHeaders(rl),
        "Retry-After": String(rl.resetSeconds),
      });
    try {
      const res = await fn(req);
      for (const [k, v] of Object.entries(rateHeaders(rl))) res.headers.set(k, v);
      res.headers.set("X-Request-Id", requestId(req));
      return res;
    } catch {
      return problem(req, 500, "Internal error"); // never echo internals
    }
  };
}

/** Any method we don't support. */
export const methodNotAllowed = (allow: string) =>
  handler((req) => problem(req, 405, "Method not allowed", `Use ${allow}.`, { Allow: allow }));
