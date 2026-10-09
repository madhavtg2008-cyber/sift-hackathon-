import { NextResponse, type NextRequest } from "next/server";

/** Legacy path — permanently redirects to the versioned API. */
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL(`/api/v1/rules${req.nextUrl.search}`, req.url), 308);
}
