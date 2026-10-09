/**
 * Sliding-window rate limiter keyed by client IP. In-memory per server instance —
 * appropriate here because the API serves only small public, cacheable data.
 */
export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return function check(key: string, now = Date.now()): RateLimitResult {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const ok = recent.length < limit;
    if (ok) recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.delete(hits.keys().next().value as string); // bound memory
    const oldest = recent[0] ?? now;
    return { ok, limit, remaining: Math.max(0, limit - recent.length), resetSeconds: Math.ceil((oldest + windowMs - now) / 1000) };
  };
}
