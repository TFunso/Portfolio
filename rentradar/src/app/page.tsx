import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Find the <span className="text-brand-600">cheapest</span> rental near you
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          RentRadar aggregates apartments, rooms, house shares, and income-restricted housing from every legally
          accessible source, then ranks results by total move-in cost -- not just sticker rent.
        </p>
      </section>
      <SearchForm />
      <section className="grid gap-6 sm:grid-cols-3">
        <Feature title="Cheapest-first ranking" body="Rent + deposit + fees, sorted so the true bottom line wins." />
        <Feature title="Affordable housing built in" body="Section 8, income-restricted, senior, and workforce housing alongside market listings." />
        <Feature title="Anti-scam screening" body="Every listing is scored for scam risk before it reaches your results." />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
