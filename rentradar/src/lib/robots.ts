// Minimal robots.txt checker used by any adapter that crawls a public website
// directly (as opposed to calling a licensed/official API). Fails closed:
// on any network or parse error, crawling is treated as disallowed.

interface RobotsRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelaySeconds?: number;
}

function parseRobotsTxt(text: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let current: RobotsRule | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      current = { userAgent: value, disallow: [], allow: [] };
      rules.push(current);
    } else if (current) {
      if (key === "disallow" && value) current.disallow.push(value);
      else if (key === "allow" && value) current.allow.push(value);
      else if (key === "crawl-delay") current.crawlDelaySeconds = Number(value) || undefined;
    }
  }
  return rules;
}

function matchesAgent(rule: RobotsRule, userAgent: string): boolean {
  return rule.userAgent === "*" || rule.userAgent.toLowerCase() === userAgent.toLowerCase();
}

export interface RobotsCheckResult {
  allowed: boolean;
  crawlDelaySeconds?: number;
  reason: string;
}

export async function checkRobotsTxt(
  baseUrl: string,
  path: string,
  userAgent = "RentRadarBot",
): Promise<RobotsCheckResult> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const res = await fetch(robotsUrl, { headers: { "User-Agent": userAgent } });
    if (!res.ok) {
      return { allowed: false, reason: `robots.txt fetch failed with ${res.status}` };
    }
    const rules = parseRobotsTxt(await res.text());
    const applicable = rules.filter((r) => matchesAgent(r, userAgent));
    if (applicable.length === 0) {
      return { allowed: true, reason: "no rules for this user agent; default allow" };
    }

    let allowed = true;
    let bestMatchLength = -1;
    let crawlDelaySeconds: number | undefined;

    for (const rule of applicable) {
      crawlDelaySeconds = rule.crawlDelaySeconds ?? crawlDelaySeconds;
      for (const rulePath of rule.disallow) {
        if (rulePath === "" ) continue;
        if (path.startsWith(rulePath) && rulePath.length > bestMatchLength) {
          allowed = false;
          bestMatchLength = rulePath.length;
        }
      }
      for (const rulePath of rule.allow) {
        if (path.startsWith(rulePath) && rulePath.length > bestMatchLength) {
          allowed = true;
          bestMatchLength = rulePath.length;
        }
      }
    }

    return { allowed, crawlDelaySeconds, reason: allowed ? "permitted by robots.txt" : "disallowed by robots.txt" };
  } catch (err) {
    return { allowed: false, reason: `error checking robots.txt: ${(err as Error).message}` };
  }
}
