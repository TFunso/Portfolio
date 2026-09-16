import { AffordabilityCalculator } from "@/components/AffordabilityCalculator";

export default function AffordabilityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rental Affordability Calculator</h1>
        <p className="text-sm text-slate-500">
          See a recommended rent ceiling based on your income, plus estimated move-in and monthly housing costs.
        </p>
      </div>
      <AffordabilityCalculator />
    </div>
  );
}
