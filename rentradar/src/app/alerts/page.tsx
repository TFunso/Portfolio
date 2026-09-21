import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AlertsManager } from "@/components/AlertsManager";

export default async function AlertsPage() {
  const userId = await requireUserId();

  if (!userId) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        <p>Sign in to create saved searches and alerts.</p>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <Link href="/sign-in" className="mt-2 inline-block font-medium text-brand-600">
            Sign in
          </Link>
        ) : (
          <p className="mt-2">Sign-in isn&apos;t configured on this deployment yet.</p>
        )}
      </div>
    );
  }

  const [savedSearches, alerts] = await Promise.all([
    prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.alert.findMany({ where: { userId }, include: { savedSearch: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saved Searches &amp; Alerts</h1>
        <p className="text-sm text-slate-500">
          Get notified by email when a new cheaper listing appears or rent drops on a saved search.
        </p>
      </div>
      <AlertsManager
        initialSavedSearches={savedSearches.map((s) => ({
          id: s.id,
          name: s.name,
          location: s.location,
          radiusMiles: s.radiusMiles,
          maxRentCents: s.maxRent,
          minBedrooms: s.minBedrooms,
        }))}
        initialAlerts={alerts.map((a) => ({
          id: a.id,
          channel: a.channel,
          triggerType: a.triggerType,
          savedSearchName: a.savedSearch?.name ?? null,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
