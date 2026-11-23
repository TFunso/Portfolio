// ---------------------------------------------------------------------------
// Measurable results. Reviews reward results, not activity - "cut CMM setup
// time" lands harder as "saved 3 hours a week". These five fields live on
// EvidenceRecord and are totaled per review period.
//
// extractMetrics() picks numbers out of what you already typed, so most
// results are captured with zero extra effort. It is deliberately
// conservative and deterministic (same rule-engine philosophy as the
// classifier): counts of work done ("6 lots", "2 defects") are taken as
// stated, but hours / days / dollars only count when a savings word is
// nearby ("saved 3 hours", "avoided a 2-day delay", "$5k in scrap avoided")
// - "spent 2 hours on hot sheets" is not hours saved.
//
// Pure module - safe to import from client components.
// ---------------------------------------------------------------------------

export const RESULT_METRICS = [
  { key: "hoursSaved", label: "Hours saved", unit: "hours saved", integer: false },
  { key: "unitsHandled", label: "Lots / parts", unit: "lots/parts", integer: true },
  { key: "defectsCaught", label: "Defects caught", unit: "defects caught", integer: true },
  { key: "delayDaysAvoided", label: "Days of delay avoided", unit: "days of delay avoided", integer: false },
  { key: "costAvoided", label: "$ saved / avoided", unit: "saved/avoided", integer: true },
] as const;

export type ResultMetricKey = (typeof RESULT_METRICS)[number]["key"];
export type ResultMetrics = { [K in ResultMetricKey]?: number | null };

export const RESULT_METRIC_KEYS = RESULT_METRICS.map((m) => m.key) as ResultMetricKey[];

const NUMBER_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  half: "0.5",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half)\b/g, (w) => NUMBER_WORDS[w])
    .replace(/(\d),(\d{3})\b/g, "$1$2"); // 1,200 -> 1200
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const SAVINGS_WORD = String.raw`(?:sav(?:e|ed|es|ing)|cut|cuts|reduc(?:e|ed|es|ing)|free(?:d)? up|eliminat(?:e|ed|es|ing)|shav(?:e|ed))`;
const AVOID_WORD = String.raw`(?:avoid(?:ed|s|ing)?|avert(?:ed)?|prevent(?:ed|s|ing)?|sav(?:e|ed|ing)|recover(?:ed)?|pull(?:ed)? in)`;

function firstNumber(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) {
      const value = Number(m[1]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

function extractHours(text: string): number | null {
  const hourPatterns = [
    new RegExp(String.raw`${SAVINGS_WORD}\b[^.;]{0,40}?${NUM}\s*(?:hours?|hrs?)\b`),
    new RegExp(String.raw`${NUM}\s*(?:hours?|hrs?)\s+(?:saved|faster|less|reduced|of (?:time )?sav)`),
  ];
  const hours = firstNumber(text, hourPatterns);
  if (hours !== null) return hours;

  const minutePatterns = [
    new RegExp(String.raw`${SAVINGS_WORD}\b[^.;]{0,40}?${NUM}\s*(?:minutes?|mins?)\b`),
    new RegExp(String.raw`${NUM}\s*(?:minutes?|mins?)\s+(?:saved|faster|less|reduced)`),
  ];
  const minutes = firstNumber(text, minutePatterns);
  return minutes !== null ? Math.round((minutes / 60) * 100) / 100 : null;
}

function extractDelayDays(text: string): number | null {
  return firstNumber(text, [
    new RegExp(String.raw`${AVOID_WORD}\b[^.;]{0,40}?${NUM}[-\s]?days?\b`),
    new RegExp(String.raw`${NUM}[-\s]?days?\s+(?:of\s+)?(?:delay|slip|late|downtime|early)`),
  ]);
}

function extractCost(text: string): number | null {
  // Only sentences that talk about saving/avoiding money count.
  for (const sentence of text.split(/[.;\n]/)) {
    if (!/(sav|avoid|prevent|scrap|rework|credit|recover|cost|reduc)/.test(sentence)) continue;
    const m = /\$\s?(\d+(?:\.\d+)?)\s*(k|m)?\b/.exec(sentence);
    if (m) {
      const multiplier = m[2] === "k" ? 1000 : m[2] === "m" ? 1_000_000 : 1;
      const value = Math.round(Number(m[1]) * multiplier);
      if (value > 0) return value;
    }
  }
  return null;
}

function extractUnits(text: string): number | null {
  return firstNumber(text, [
    /(\d+)\s+(?:lots?|parts?|pieces?|pcs|units?|assembl(?:y|ies)|work orders?|serials?|serial numbers?|receivers?|kits?|shipments?)\b/,
  ]);
}

function extractDefects(text: string): number | null {
  return firstNumber(text, [
    /(\d+)\s+(?:defects?|defective parts?|non-?conformanc(?:e|es)|ncrs?|escapes?|discrepanc(?:y|ies)|rejects?|bad parts?|issues caught)\b/,
  ]);
}

export function extractMetrics(text: string): ResultMetrics {
  const t = normalize(text);
  const out: ResultMetrics = {};
  const hours = extractHours(t);
  const units = extractUnits(t);
  const defects = extractDefects(t);
  const days = extractDelayDays(t);
  const cost = extractCost(t);
  if (hours !== null) out.hoursSaved = hours;
  if (units !== null) out.unitsHandled = Math.round(units);
  if (defects !== null) out.defectsCaught = Math.round(defects);
  if (days !== null) out.delayDaysAvoided = days;
  if (cost !== null) out.costAvoided = cost;
  return out;
}

export function hasMetrics(m: ResultMetrics | null | undefined): boolean {
  if (!m) return false;
  return RESULT_METRIC_KEYS.some((k) => typeof m[k] === "number" && (m[k] as number) > 0);
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function formatMetricValue(key: ResultMetricKey, value: number): string {
  if (key === "costAvoided") return `$${formatNumber(value)}`;
  return formatNumber(value);
}

// "3 hours saved · 6 lots/parts · $5,000 saved/avoided"
export function formatMetrics(m: ResultMetrics | null | undefined): string {
  if (!m) return "";
  return RESULT_METRICS.filter((def) => typeof m[def.key] === "number" && (m[def.key] as number) > 0)
    .map((def) => `${formatMetricValue(def.key, m[def.key] as number)} ${def.unit}`)
    .join(" · ");
}

export function sumMetrics(records: ResultMetrics[]): Record<ResultMetricKey, number> {
  const totals = Object.fromEntries(RESULT_METRIC_KEYS.map((k) => [k, 0])) as Record<ResultMetricKey, number>;
  for (const r of records) {
    for (const k of RESULT_METRIC_KEYS) {
      const v = r[k];
      if (typeof v === "number" && v > 0) totals[k] += v;
    }
  }
  for (const k of RESULT_METRIC_KEYS) totals[k] = Math.round(totals[k] * 10) / 10;
  return totals;
}

// Pick only the metric fields off a record-like object (e.g. a Prisma row).
export function metricsOf(record: ResultMetrics): ResultMetrics {
  const out: ResultMetrics = {};
  for (const k of RESULT_METRIC_KEYS) out[k] = record[k] ?? null;
  return out;
}
