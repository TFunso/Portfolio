import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Auth is entirely optional: the app runs fully signed-out (search, dashboard,
// affordability calculator) whether or not Clerk is configured. Only
// account-specific features (saved searches, alerts) require a session, and
// only once CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are set --
// see .env.example. Without them this middleware is a pure passthrough so
// the rest of the site (including CI builds, which carry no secrets) is
// unaffected.
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const isProtectedRoute = createRouteMatcher([
  "/api/saved-searches(.*)",
  "/api/alerts(.*)",
  "/alerts(.*)",
  "/saved(.*)",
]);

export default clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth().protect();
      }
    })
  : function passthroughMiddleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
