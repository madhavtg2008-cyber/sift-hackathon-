import { NextResponse, type NextRequest } from "next/server";
import { API_VERSION, HealthResponse } from "@/lib/contracts";
import { DEFAULT_LEXICON } from "@/lib/lexicon";
import { handler, problem } from "@/server/http";

export const dynamic = "force-dynamic";
const started = Date.now();

/** GET /api/v1/health — liveness + version info. */
export const GET = handler(() =>
  NextResponse.json(
    HealthResponse.parse({
      ok: true,
      service: "sift",
      apiVersion: API_VERSION,
      rulesVersion: DEFAULT_LEXICON.version,
      uptimeSeconds: Math.round((Date.now() - started) / 1000),
      time: new Date().toISOString(),
      privacy: "This server never receives, stores or logs conversation data. All analysis runs on your device.",
    }),
    { headers: { "Cache-Control": "no-store" } },
  ),
);

/**
 * Any write is refused without reading the body — the server accepts no user content.
 * (The in-app leak test targets this endpoint.)
 */
export const POST = handler((req: NextRequest) =>
  problem(req, 403, "Uploads are not accepted", "Sift's server never accepts conversation data."),
);
export const PUT = POST;
export const PATCH = POST;
