import { NextResponse } from "next/server";
import { API_VERSION, RULE_PACKS } from "@/lib/contracts";

/** GET /api/v1/openapi.json — machine-readable API description (OpenAPI 3.1). */
export function GET() {
  const problem = { $ref: "#/components/schemas/Problem" };
  const rateLimited = {
    description: "Rate limited (60 requests/min per IP)",
    content: { "application/problem+json": { schema: problem } },
  };
  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: {
        title: "Sift API",
        version: API_VERSION,
        description:
          "Public API for Sift. By design it never receives conversation data: it serves rule packs that the browser applies locally. Errors use RFC 9457 problem+json; every response carries RateLimit-* and X-Request-Id headers.",
      },
      paths: {
        "/api/v1/rules": {
          get: {
            summary: "Get a detection rule pack",
            parameters: [{ name: "pack", in: "query", schema: { type: "string", enum: RULE_PACKS, default: "en+hinglish" } }],
            responses: {
              "200": {
                description: "Rule pack",
                headers: { ETag: { schema: { type: "string" } } },
                content: { "application/json": { schema: { $ref: "#/components/schemas/Lexicon" } } },
              },
              "304": { description: "Not modified (If-None-Match matched)" },
              "400": { description: "Invalid query", content: { "application/problem+json": { schema: problem } } },
              "429": rateLimited,
            },
          },
        },
        "/api/v1/health": {
          get: { summary: "Liveness and version", responses: { "200": { description: "Healthy" }, "429": rateLimited } },
          post: {
            summary: "Always refused — the server accepts no content",
            responses: { "403": { description: "Refused", content: { "application/problem+json": { schema: problem } } } },
          },
        },
      },
      components: {
        schemas: {
          Lexicon: {
            type: "object",
            required: ["version", "urgent", "action", "actionStarts", "decision", "groupCallouts", "stopwords"],
            properties: {
              version: { type: "string" },
              ...Object.fromEntries(
                ["urgent", "action", "actionStarts", "decision", "groupCallouts", "stopwords"].map((k) => [
                  k,
                  { type: "array", items: { type: "string" } },
                ]),
              ),
            },
          },
          Problem: {
            type: "object",
            required: ["type", "title", "status", "requestId"],
            properties: {
              type: { type: "string" },
              title: { type: "string" },
              status: { type: "integer" },
              detail: { type: "string" },
              requestId: { type: "string" },
            },
          },
        },
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
