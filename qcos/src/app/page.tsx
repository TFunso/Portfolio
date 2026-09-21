"use client";

import { useCallback, useEffect, useState } from "react";
import BrainDumpForm from "@/components/BrainDumpForm";
import PromotionReadinessSnapshot from "@/components/PromotionReadinessSnapshot";
import GoalDashboard from "@/components/GoalDashboard";
import ThingsThatCounted, { type CountedThing } from "@/components/ThingsThatCounted";
import RecentEntries, { type RecentEntry } from "@/components/RecentEntries";
import EvidenceHighlights, { type EvidenceHighlight } from "@/components/EvidenceHighlights";
import type { GoalMetricStatus } from "@/types";

interface DashboardData {
  promotionReadiness: {
    score: number;
    label: string;
    goalsOnTrack: number;
    goalsTotal: number;
    evidenceCountThisYear: number;
    highImpactCount: number;
  };
  goalDashboard: { metrics: GoalMetricStatus[] };
  thingsThatCounted: CountedThing[];
  recentEntries: RecentEntry[];
  evidenceHighlights: EvidenceHighlight[];
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <BrainDumpForm onSaved={load} />

      {loading || !data ? (
        <div className="card animate-pulse text-sm text-slate-400">Loading your dashboard…</div>
      ) : (
        <>
          <PromotionReadinessSnapshot {...data.promotionReadiness} />
          <GoalDashboard metrics={data.goalDashboard.metrics} />
          <ThingsThatCounted items={data.thingsThatCounted} />
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentEntries entries={data.recentEntries} />
            <EvidenceHighlights records={data.evidenceHighlights} />
          </div>
        </>
      )}
    </div>
  );
}
