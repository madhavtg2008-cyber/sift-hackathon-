import { NextResponse } from "next/server";
import { DEFAULT_LEXICON } from "@/lib/lexicon";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "sift",
    rulesVersion: DEFAULT_LEXICON.version,
    time: new Date().toISOString(),
    privacy: "This server never receives, stores or logs conversation data. All analysis runs on your device.",
  });
}

/** The server refuses any payload outright and never reads or logs the body. */
export function POST() {
  return NextResponse.json({ ok: false, error: "Sift's server does not accept conversation data." }, { status: 403 });
}
