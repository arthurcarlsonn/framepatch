/** Shared HTTP helpers: timeouts, retries, per-host pacing, and a browser-ish UA. */

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Next free send slot per host. */
const nextSlotByHost = new Map();

/**
 * Keeps at least `gapMs` between calls to the same host, and does so correctly when several
 * callers are in flight at once.
 *
 * The obvious version — read the last call time, sleep the difference, then stamp the clock —
 * works only when one caller is ever waiting. Twenty concurrent callers all read the same
 * timestamp, all compute the same delay, all sleep in parallel, and all fire together: the
 * gap turns into a burst, which is exactly what a rate limiter counts.
 *
 * So each caller *reserves* its slot instead. The read-and-write happens with no `await`
 * between, which on a single-threaded runtime makes it atomic, so every caller gets its own
 * slot `gapMs` after the last one. That makes this a real limiter for the host — the size of
 * any worker pool above it changes throughput not at all.
 */
async function pace(url, gapMs) {
  const host = new URL(url).host;
  const now = Date.now();
  const slot = Math.max(now, nextSlotByHost.get(host) ?? 0);
  nextSlotByHost.set(host, slot + gapMs * (backoffByHost.get(host) ?? 1));
  if (slot > now) await sleep(slot - now);
}

/**
 * Adaptive pacing.
 *
 * A configured gap is a guess about someone else's rate limit, and the guess is usually
 * wrong: the published number may not match the enforced one, it can differ per endpoint,
 * and a burst can leave an account in a cooldown far longer than the window suggests. Rather
 * than tune a constant by trial and error, widen the gap whenever the host pushes back and
 * let it drift home while it does not.
 *
 * Multiplicative widening, gentle linear recovery — the same shape as TCP congestion control,
 * for the same reason: overshooting is expensive and cheap to avoid.
 */
const backoffByHost = new Map();
const streakByHost = new Map();

const MAX_BACKOFF = 12;
/** Successes needed before easing off, so recovery cannot outrun the limiter's window. */
const RECOVERY_STREAK = 25;

function widen(host) {
  streakByHost.set(host, 0);
  const next = Math.min((backoffByHost.get(host) ?? 1) * 1.6, MAX_BACKOFF);
  backoffByHost.set(host, next);
  // Push the queue out too, so callers already holding a slot do not pile straight back in.
  nextSlotByHost.set(host, Math.max(nextSlotByHost.get(host) ?? 0, Date.now() + 2_000));
}

function narrow(host) {
  const current = backoffByHost.get(host) ?? 1;
  if (current <= 1) return;
  const streak = (streakByHost.get(host) ?? 0) + 1;
  if (streak < RECOVERY_STREAK) {
    streakByHost.set(host, streak);
    return;
  }
  streakByHost.set(host, 0);
  backoffByHost.set(host, Math.max(1, current * 0.85));
}

/** Current gap multiplier per host — worth logging at the end of a long run. */
export function pacingState() {
  return Object.fromEntries([...backoffByHost].map(([host, mult]) => [host, Number(mult.toFixed(2))]));
}

export class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * How long a 429 wants us to wait, from the `Retry-After` header or from the delay APIs
 * often state in the body instead. Guessing an exponential backoff against a limiter that
 * has already told you the answer just burns the retries.
 */
function retryAfterMs(res, body) {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header, 120) * 1000;
  const stated = /retry after (\d+)\s*s/i.exec(body ?? "");
  if (stated) return Math.min(Number(stated[1]), 120) * 1000;
  return null;
}

/**
 * Fetch with retry on 429/5xx and network errors. Throws HttpError on a final 4xx so
 * callers can distinguish "this game has no entry" from "the source is down".
 */
export async function request(url, { method = "GET", headers = {}, body, gapMs = 250, timeoutMs = 20_000, retries = 3 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await pace(url, gapMs);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*", ...headers },
        body,
        signal: controller.signal,
      });
      if (res.ok) {
        narrow(new URL(url).host);
        return res;
      }
      const text = await res.text().catch(() => "");
      if (res.status === 429 || res.status >= 500) {
        lastError = new HttpError(res.status, url, text);
        if (res.status === 429) widen(new URL(url).host);
        await sleep(retryAfterMs(res, text) ?? 800 * (attempt + 1));
        continue;
      }
      throw new HttpError(res.status, url, text);
    } catch (error) {
      if (error instanceof HttpError && error.status < 500 && error.status !== 429) throw error;
      lastError = error;
      await sleep(600 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`Request failed: ${url}`);
}

export async function getJson(url, options) {
  return (await request(url, options)).json();
}

export async function getText(url, options) {
  return (await request(url, options)).text();
}

export async function postJson(url, payload, options = {}) {
  const res = await request(url, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** Pulls the JSON out of a Next.js `__NEXT_DATA__` script tag. */
export function parseNextData(html) {
  const match = /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html);
  if (!match) throw new Error("__NEXT_DATA__ not found — the storefront markup changed");
  return JSON.parse(match[1]);
}
