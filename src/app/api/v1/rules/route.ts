import { NextResponse, type NextRequest } from "next/server";
import { LexiconSchema, RulesQuery } from "@/lib/contracts";
import { getRulePack } from "@/server/rulePacks";
import { handler, methodNotAllowed, problem } from "@/server/http";

/**
 * GET /api/v1/rules?pack=en|en+hinglish
 * Versioned detection rule pack for the on-device engine. Conversations are never uploaded:
 * the client downloads the rules and applies them locally. Supports ETag revalidation (304).
 */
export const GET = handler((req: NextRequest) => {
  const query = RulesQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) return problem(req, 400, "Invalid query", "pack must be one of: en, en+hinglish");
  const pack = LexiconSchema.parse(getRulePack(query.data.pack)); // validate our own output too
  const etag = `"rules-${pack.version}"`;
  const headers = { ETag: etag, "Cache-Control": "public, max-age=300, stale-while-revalidate=86400", Vary: "Accept-Encoding" };
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  return NextResponse.json(pack, { headers });
});

export const POST = methodNotAllowed("GET");
export const PUT = POST;
export const DELETE = POST;
