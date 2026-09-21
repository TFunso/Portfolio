import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthNav } from "@/components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentRadar - Find the cheapest rentals near you",
  description: "Aggregated rental search that ranks results by total move-in cost.",
};

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold text-brand-700">
              RentRadar
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/dashboard">Search</Link>
              <Link href="/affordability">Affordability Calculator</Link>
              <Link href="/alerts">Alerts</Link>
              {clerkConfigured && <AuthNav />}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          RentRadar aggregates only from official APIs, licensed feeds, and sites that permit crawling. See
          docs/LEGAL_AND_DATA_SOURCES.md.
        </footer>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = <Shell>{children}</Shell>;
  // ClerkProvider throws without a publishableKey, so it's only mounted once
  // Clerk is actually configured -- keeps the app fully functional (minus
  // account features) with zero auth setup, same as every other integration
  // in this project (Mapbox, Twilio, SendGrid, HUD).
  return clerkConfigured ? <ClerkProvider>{body}</ClerkProvider> : body;
}
