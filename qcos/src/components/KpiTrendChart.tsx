import type { KpiTrendPoint } from "@/lib/kpiTrend";

const CHART_HEIGHT = 160;
const BAR_GAP = 14;
const SEGMENT_GAP = 2;

export default function KpiTrendChart({ points }: { points: KpiTrendPoint[] }) {
  const maxTotal = Math.max(1, ...points.map((p) => p.total));
  const barWidth = points.length > 0 ? Math.max(18, Math.min(48, 480 / points.length - BAR_GAP)) : 24;
  const width = points.length * (barWidth + BAR_GAP) + BAR_GAP;

  function barHeight(count: number) {
    return maxTotal === 0 ? 0 : (count / maxTotal) * (CHART_HEIGHT - 28);
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT + 32}`}
          width={width}
          height={CHART_HEIGHT + 32}
          role="img"
          aria-label="Monthly KPI trend, captured versus reported"
          className="min-w-full"
        >
          {/* baseline */}
          <line
            x1={0}
            y1={CHART_HEIGHT + 4}
            x2={width}
            y2={CHART_HEIGHT + 4}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={1}
          />
          {points.map((p, i) => {
            const x = BAR_GAP + i * (barWidth + BAR_GAP);
            const capturedH = barHeight(p.captured);
            const reportedH = barHeight(p.reported);
            const capturedY = CHART_HEIGHT + 4 - capturedH;
            const reportedY = capturedY - (reportedH > 0 ? reportedH + SEGMENT_GAP : 0);

            return (
              <g key={p.monthKey}>
                {p.captured > 0 && (
                  <rect
                    x={x}
                    y={capturedY}
                    width={barWidth}
                    height={capturedH}
                    rx={3}
                    className="fill-brand-500 dark:fill-[#5c86ff]"
                  >
                    <title>
                      {p.monthLabel}: {p.captured} captured (auto-detected)
                    </title>
                  </rect>
                )}
                {p.reported > 0 && (
                  <rect
                    x={x}
                    y={reportedY}
                    width={barWidth}
                    height={reportedH}
                    rx={3}
                    className="fill-[#ca8a04] dark:fill-[#d97706]"
                  >
                    <title>
                      {p.monthLabel}: {p.reported} reported (manual)
                    </title>
                  </rect>
                )}
                {p.total === 0 && (
                  <rect
                    x={x}
                    y={CHART_HEIGHT + 2}
                    width={barWidth}
                    height={2}
                    rx={1}
                    className="fill-slate-200 dark:fill-slate-800"
                  />
                )}
                {p.total > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={Math.min(capturedY, reportedY) - 6}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] dark:fill-slate-400"
                  >
                    {p.total}
                  </text>
                )}
                <text
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] dark:fill-slate-400"
                >
                  {p.monthLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-500 dark:bg-[#5c86ff]" />
          Captured (auto-detected from entries)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#ca8a04] dark:bg-[#d97706]" />
          Reported (logged manually)
        </span>
      </div>
    </div>
  );
}
