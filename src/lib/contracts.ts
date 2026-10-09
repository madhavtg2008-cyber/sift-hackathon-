/**
 * API contracts shared by the server (validation of requests/responses) and the client
 * (validation of what it downloads). One source of truth, enforced at runtime with zod.
 */
import { z } from "zod";

export const API_VERSION = "1.0.0";

export const RULE_PACKS = ["en", "en+hinglish"] as const;
export type RulePackId = (typeof RULE_PACKS)[number];

export const RulesQuery = z.object({
  pack: z.enum(RULE_PACKS).default("en+hinglish"),
});

const terms = z.array(z.string().min(1).max(40)).max(500);

export const LexiconSchema = z.object({
  version: z.string().min(1).max(60),
  urgent: terms,
  action: terms,
  actionStarts: terms,
  decision: terms,
  groupCallouts: terms,
  stopwords: terms,
});

export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("sift"),
  apiVersion: z.string(),
  rulesVersion: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  time: z.string(),
  privacy: z.string(),
});

/** RFC 9457 "problem details" error body. */
export const Problem = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  requestId: z.string(),
});
export type Problem = z.infer<typeof Problem>;
