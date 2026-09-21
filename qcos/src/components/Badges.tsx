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
