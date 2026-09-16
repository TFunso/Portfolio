import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentRadar - Find the cheapest rentals near you",
  description: "Aggregated rental search that ranks results by total move-in cost.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold text-brand-700">
              RentRadar
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-slate-600">
              <Link href="/dashboard">Search</Link>
              <Link href="/affordability">Affordability Calculator</Link>
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
