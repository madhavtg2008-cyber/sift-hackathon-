import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LEXICON } from "@/lib/lexicon";

/**
 * Versioned rule pack for the on-device engine. The client downloads the rules and applies
 * them locally — conversations are never uploaded. Supports ETag revalidation (304).
 */
const BODY = JSON.stringify(DEFAULT_LEXICON);
const ETAG = `"rules-${DEFAULT_LEXICON.version}"`;

export function GET(req: NextRequest) {
  const headers = {
    ETag: ETAG,
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (req.headers.get("if-none-match") === ETAG) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(BODY, { status: 200, headers });
}
