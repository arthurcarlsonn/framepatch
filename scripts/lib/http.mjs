/** Shared HTTP helpers: timeouts, retries, per-host pacing, and a browser-ish UA. */

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lastCallByHost = new Map();

/** Keeps at least `gapMs` between calls to the same host so we stay a polite client. */
async function pace(url, gapMs) {
  const host = new URL(url).host;
  const wait = (lastCallByHost.get(host) ?? 0) + gapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallByHost.set(host, Date.now());
}

export class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
    this.body = body;
  }
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
      if (res.ok) return res;
      const text = await res.text().catch(() => "");
      if (res.status === 429 || res.status >= 500) {
        lastError = new HttpError(res.status, url, text);
        await sleep(800 * (attempt + 1));
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
