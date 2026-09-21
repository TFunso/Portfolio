import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Resolves the signed-in user to RentRadar's internal User.id, lazily
 * creating the local row on first sight of a Clerk session (no webhook
 * needed for an app this size). Returns null when there's no session, or
 * when Clerk isn't configured at all -- callers already treat null as
 * "unauthenticated" so auth-optional routes degrade the same way either way.
 */
export async function requireUserId(): Promise<string | null> {
  if (!process.env.CLERK_SECRET_KEY) return null;

  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: (await currentUser())?.emailAddresses[0]?.emailAddress ?? `${clerkId}@unknown.invalid`,
    },
  });

  return user.id;
}
