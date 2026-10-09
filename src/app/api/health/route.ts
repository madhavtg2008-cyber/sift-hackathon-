import { NextResponse, type NextRequest } from "next/server";

/** Legacy path — permanently redirects to the versioned API (308 keeps the method). */
const redirect = (req: NextRequest) => NextResponse.redirect(new URL("/api/v1/health", req.url), 308);
export const GET = redirect;
export const POST = redirect;
