import type { Metadata } from "next";
import "./globals.css";
import DarkModeToggle from "@/components/DarkModeToggle";
import NavLink from "@/components/NavLink";

export const metadata: Metadata = {
  title: "QCOS - Quality Career Operating System",
  description: "Capture daily work, surface hidden achievements, and build evidence-based performance reviews.",
};

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/did-this-count", label: "Did This Count?" },
  { href: "/evidence-vault", label: "Evidence Vault" },
  { href: "/goals", label: "Goals" },
  { href: "/cross-functional", label: "Cross-Functional" },
  { href: "/reflection", label: "Reflection" },
  { href: "/review", label: "Year-End Review" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <a href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">QCOS</span>
                <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
                  Quality Career Operating System
                </span>
              </a>
              <nav className="flex flex-wrap items-center gap-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.href} href={item.href}>
                    {item.label}
                  </NavLink>
                ))}
                <DarkModeToggle />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-600">
            Local-first evidence, not employee surveillance. Every insight here comes only from what you chose to log.
          </footer>
        </div>
      </body>
    </html>
  );
}
