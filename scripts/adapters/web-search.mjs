/**
 * Firecrawl — the discovery layer.
 *
 * A patch tracker tells us a game was updated; it never tells us what changed. This is how we
 * go and find out. Firecrawl searches and scrapes in one call, returning the page as markdown,
 * so the extractor gets the actual patch-notes text rather than a search snippet.
 *
 * Two passes per title. The first pins the query to a short list of high-tier domains with
 * `site:` operators — that is what surfaces a publisher's own patch notes instead of an
 * aggregator quoting them. The second is open, which is how publisher domains we do not have
 * in the ranking table still get found.
 *
 * Metered: roughly one credit per search plus one per page scraped. A run is capped by
 * `--budget` so a loose loop cannot eat the month.
 */
import { HttpError, request } from "../lib/http.mjs";

const ENDPOINT = "https://api.firecrawl.dev/v2/search";
const CREDIT_ENDPOINT = "https://api.firecrawl.dev/v2/team/credit-usage";

export class SearchAuthError extends Error {}
export class SearchBudgetError extends Error {}

let creditsUsed = 0;
let budget = Infinity;

export function setSearchBudget(credits) {
  budget = Number.isFinite(credits) ? credits : Infinity;
}

export function creditsSpent() {
  return creditsUsed;
}

export function searchBudgetLeft() {
  return budget === Infinity ? Infinity : Math.max(0, budget - creditsUsed);
}

export function hasSearchKey() {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

function key() {
  const value = process.env.FIRECRAWL_API_KEY;
  if (!value) throw new SearchAuthError("FIRECRAWL_API_KEY is not set in .env.local");
  return value;
}

/** What the plan has left, so a run can say up front whether it can finish. */
export async function remainingCredits() {
  try {
    const res = await request(CREDIT_ENDPOINT, {
      headers: { Authorization: `Bearer ${key()}` },
      gapMs: 200,
      retries: 1,
    });
    return (await res.json())?.data?.remainingCredits ?? null;
  } catch {
    // A failed balance check is not a reason to skip the run.
    return null;
  }
}

/**
 * Restricts a query to specific domains. Firecrawl passes the query through to a search
 * engine, so the `site:` operator works — and an OR group is the only way to name more than
 * one. Verified against the engine rather than assumed.
 */
export function siteFilter(domains) {
  if (!domains?.length) return "";
  return ` (${domains.map((d) => `site:${d}`).join(" OR ")})`;
}

/**
 * One search, with each result scraped to markdown.
 *
 * `scrape: false` halves the cost and is right when the query is only being used to find out
 * whether a page exists at all.
 */
export async function search(query, { limit = 6, scrape = true } = {}) {
  if (searchBudgetLeft() <= 0) throw new SearchBudgetError(`search budget of ${budget} credits spent`);

  const payload = {
    query,
    limit,
    ...(scrape
      ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true, timeout: 20_000 } }
      : {}),
  };

  let res;
  try {
    res = await request(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // This plan's limiter allows 57 requests a minute and says so in its 429 body. The
      // per-host pacing in lib/http.mjs is a global rate limiter for this endpoint, so the
      // gap — not the size of the worker pool — is what keeps a concurrent run legal.
      // 1,400ms leaves headroom at ~42/min; raising concurrency does not change the rate.
      gapMs: 1_400,
      timeoutMs: 120_000,
      retries: 3,
    });
  } catch (error) {
    if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
      throw new SearchAuthError(`Firecrawl rejected the API key (HTTP ${error.status})`);
    }
    if (error instanceof HttpError && error.status === 402) {
      creditsUsed = budget;
      throw new SearchBudgetError("Firecrawl reports no credits remaining on this plan");
    }
    throw error;
  }

  const body = await res.json();
  creditsUsed += body?.creditsUsed ?? limit;

  // v2 groups results by source; older responses were a bare array.
  const results = Array.isArray(body.data) ? body.data : (body.data?.web ?? []);

  return results.map((result) => ({
    url: result.url,
    title: result.title ?? null,
    /** The search engine's own blurb. */
    snippet: result.description ?? "",
    /** The scraped page, when Firecrawl could read it. */
    text: result.markdown || null,
    score: 0,
  }));
}
