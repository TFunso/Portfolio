import { NextRequest } from "next/server";

/**
 * Auth boundary. Production wiring is Clerk (see .env.example and
 * docs/ARCHITECTURE.md#authentication): swap this for
 * `auth().userId` from `@clerk/nextjs/server` and drop the header fallback.
 * Kept as a thin indirection so routes never import Clerk directly.
 */
export async function requireUserId(request: NextRequest): Promise<string | null> {
  return request.headers.get("x-rentradar-user-id");
}
