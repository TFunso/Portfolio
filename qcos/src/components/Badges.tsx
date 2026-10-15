export function ImpactBadge({ level }: { level: string }) {
  const cls = level === "High" ? "badge-high" : level === "Medium" ? "badge-medium" : "badge-low";
  return <span className={`badge ${cls}`}>{level} impact</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  return <span className="badge badge-category">{category}</span>;
}

export function StatusDot({ status }: { status: "green" | "yellow" | "red" }) {
  const color = status === "green" ? "bg-status-green" : status === "yellow" ? "bg-status-yellow" : "bg-status-red";
  return <span className={`status-dot ${color}`} aria-label={`status: ${status}`} />;
}

const PACE_LABELS: Record<string, string> = {
  ahead: "Ahead of pace",
  "on-pace": "On pace",
  behind: "Behind pace",
  "too-early": "Too early to tell",
};

export function PaceBadge({ paceStatus }: { paceStatus: "ahead" | "on-pace" | "behind" | "too-early" }) {
  const cls =
    paceStatus === "ahead" || paceStatus === "on-pace"
      ? "badge-good"
      : paceStatus === "behind"
        ? "badge-medium"
        : "badge-low";
  return <span className={`badge ${cls}`}>{PACE_LABELS[paceStatus]}</span>;
}
