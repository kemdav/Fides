import { NextResponse } from "next/server";

/** Liveness probe used by hosting health checks. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "fides",
    timestamp: new Date().toISOString(),
  });
}
