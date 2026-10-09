import { NextResponse } from "next/server";
import { DEFAULT_LEXICON } from "@/lib/lexicon";

/**
 * Rule packs for the on-device engine. The client downloads these rules and
 * applies them locally — the conversations themselves are never uploaded.
 */
export function GET() {
  return NextResponse.json(DEFAULT_LEXICON, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
  });
}
