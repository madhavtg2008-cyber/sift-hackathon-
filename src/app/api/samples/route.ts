import { NextResponse } from "next/server";
import { SAMPLES } from "@/lib/samples";

export const dynamic = "force-dynamic";

/** Demo conversations with timestamps relative to "now", so deadlines look live. */
export function GET() {
  const now = Date.now();
  const conversations = SAMPLES.map((s) => ({
    name: s.name,
    readCount: s.readCount,
    messages: s.rows.map(([minsAgo, author, text]) => ({ author, text, ts: now - minsAgo * 60_000 })),
  }));
  return NextResponse.json({ generatedAt: now, conversations }, { headers: { "Cache-Control": "no-store" } });
}
