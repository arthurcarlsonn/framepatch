/**
 * The extractor — sources in, structured frame rate data out.
 *
 * The one rule everything else depends on: **never infer a frame rate**. The model is not
 * asked "what does this game run at", it is asked "what do these pages state". A PS5 title
 * with no source naming a figure comes back with nothing, and stays undocumented on the site.
 * Guessing 30 FPS because a game is old is exactly the failure this pipeline exists to avoid.
 *
 * Output is constrained by a JSON schema rather than parsed out of prose, and every mode has
 * to carry the sentence and the URL that established it — a claim with no quote is dropped
 * downstream in scripts/lib/fps-record.mjs.
 *
 * Runs on OpenRouter so the model is a config line rather than a rewrite. Default is
 * `openai/gpt-5.6-luna` — cheap, 1M context, and native strict structured outputs, which is
 * the whole requirement here. Override with FRAMEPATCH_EXTRACT_MODEL.
 */
import { HttpError, request } from "../lib/http.mjs";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-5.6-luna";

export class ExtractorAuthError extends Error {}

/** OpenRouter reports the exact dollar cost of every call; a run reports what it spent. */
let spent = 0;

export function dollarsSpent() {
  return spent;
}

const MODELS = ["ps5", "ps5-pro", "series-x", "series-s", "switch-2", "switch"];

/** Enough of each page for the figures, without pushing whole review articles through. */
const PER_SOURCE_CHARS = 6_000;
const MAX_SOURCES = 8;

/** Structured outputs support `anyOf`, not `["string", "null"]` type arrays. */
const nullable = (type, description) => ({
  anyOf: [{ type }, { type: "null" }],
  ...(description ? { description } : {}),
});

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["entries", "patch", "verdict", "note"],
  properties: {
    entries: {
      type: "array",
      description: "One entry per console model a source explicitly names. Omit models nothing states a figure for.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["model", "appType", "confidence", "modes"],
        properties: {
          model: { type: "string", enum: MODELS },
          appType: {
            type: "string",
            enum: ["native", "backcompat", "unknown"],
            description:
              "native = a current-gen build of the game. backcompat = the last-gen app running on current-gen hardware. unknown unless a source says.",
          },
          confidence: {
            type: "string",
            enum: ["official", "measured", "reported", "unknown"],
            description:
              "official = publisher or platform holder states it. measured = a technical analysis measured it. reported = press restating it. unknown = nobody states it.",
          },
          modes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "targetFps", "resolution", "unlocked", "vrr", "note", "quote", "sourceUrl"],
              properties: {
                name: { type: "string", description: 'The mode as the source names it: "Performance", "Quality", "Default".' },
                targetFps: nullable(
                  "integer",
                  "The stated target. null when the source names the mode but never its frame rate.",
                ),
                resolution: nullable("string"),
                unlocked: { type: "boolean", description: "true when the source says uncapped or unlocked rather than a locked target." },
                vrr: { type: "boolean", description: "true only when the figure requires VRR or a 120Hz display." },
                note: nullable("string", "One short caveat, e.g. drops in cities, split screen halves it."),
                quote: {
                  type: "string",
                  description: "The sentence from the source that states this. Verbatim, under 200 characters.",
                },
                sourceUrl: { type: "string", description: "Which supplied source the quote is from. Must be one of the URLs given." },
              },
            },
          },
        },
      },
    },
    patch: {
      type: "object",
      additionalProperties: false,
      required: ["found", "version", "date", "previousFps", "newFps", "changedFps", "url", "publisher", "quote"],
      properties: {
        found: { type: "boolean", description: "true only when a source describes an update that changed performance." },
        version: nullable("string"),
        date: nullable(
          "string",
          "YYYY-MM-DD. Use the source's own publication date if it is the patch announcement.",
        ),
        previousFps: nullable("integer", "Only when a source states what it ran at before."),
        newFps: nullable("integer"),
        changedFps: { type: "boolean", description: "true only when a source says the update changed the frame rate." },
        url: nullable("string", "The most official of the supplied URLs describing this update."),
        publisher: nullable("string"),
        quote: nullable("string"),
      },
    },
    verdict: nullable(
      "string",
      "Two sentences at most, describing what the sources establish. null when they establish nothing. No speculation, no marketing.",
    ),
    note: nullable(
      "string",
      'Card footer label, at most four words: "Performance Mode", "Updated Aug 2026", "No frame rate patch".',
    ),
  },
};

const SYSTEM = `You extract console frame rate facts from supplied web sources for FramePatch, a site that answers "does this game run at 60 FPS on my console".

Absolute rules:
1. Never infer, estimate, or reason from what is typical. Report only what a supplied source states in words.
2. If no source states a frame rate for a console model, do not emit an entry for that model. An empty result is correct and expected — it renders as "awaiting verification", which is honest. Assuming 30 FPS because a game is old, or 60 because it is new, is the single worst thing you can do here.
3. Every mode must carry a verbatim quote from a supplied source and the URL it came from. If you cannot quote it, you cannot report it.
4. Do not carry a figure across console models. "60 FPS on PS5" says nothing about PS5 Pro or Series S. Only emit the model the source names. A source that says "PS5 and Xbox Series X" names both.
5. Backwards-compatible PS4 or Xbox One titles running on current-gen hardware belong to the current-gen model they run on, with appType "backcompat".
6. Sources may discuss a different game, a PC version, or a different entry in the same series. Ignore anything that is not the game named in the request on the console named.
7. "Unlocked", "uncapped", "up to 60", and "targets 60" are not the same as a locked 60. Set unlocked true and put the caveat in note.
8. confidence reflects who is speaking, not how sure you are: official for the publisher or platform holder, measured for a technical analysis that captured it, reported for press restating someone else.
9. targetFps is the frame rate a mode aims at, not a number someone measured. If a source only reports measured performance ("averages 31.5fps", "hovers around 50"), put that in note and set targetFps to the target the source names, or null if it names none.
10. Report only what a normal player gets by buying the game and pressing play on retail hardware. Ignore mods, jailbroken or exploited consoles, custom firmware, homebrew, emulators, PC builds, and updates that are rumoured or hypothetical rather than released. Sources discuss these often; a frame rate that needs any of them is not this game's frame rate.`;

/**
 * Checked before the first search runs, so a missing key costs nothing rather than a whole
 * run's Firecrawl credits.
 */
export function ensureExtractor() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new ExtractorAuthError("OPENROUTER_API_KEY is not set in .env.local");
  return key;
}

export function extractorModel() {
  return process.env.FRAMEPATCH_EXTRACT_MODEL || DEFAULT_MODEL;
}

function sourceBlock(source, index) {
  const body = (source.text || source.snippet || "").slice(0, PER_SOURCE_CHARS).trim();
  return [
    `<source index="${index + 1}">`,
    `url: ${source.url}`,
    source.title ? `title: ${source.title}` : null,
    source.publisher ? `publisher: ${source.publisher} (tier ${source.tier})` : null,
    "",
    body,
    "</source>",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Runs one extraction.
 *
 * `sources` are search hits already ranked and classified by scripts/lib/evidence.mjs, best
 * first. `patchHint` is what the tracker saw, so the model can tie a claim to a version.
 */
export async function extractFps({ title, releaseYear, consoles, sources, patchHint }) {
  const usable = sources.filter((s) => (s.text || s.snippet || "").trim().length > 200).slice(0, MAX_SOURCES);
  if (usable.length === 0) return null;

  const prompt = [
    `Game: ${title}${releaseYear ? ` (${releaseYear})` : ""}`,
    `Consoles FramePatch tracks this on: ${consoles.join(", ") || "unknown"}`,
    patchHint?.latestVersion
      ? `A patch tracker reports the latest PlayStation patch as ${patchHint.latestVersion}, seen ${patchHint.latestDate ?? "recently"}. Tie the patch fields to that update only if a source below actually describes it.`
      : null,
    "",
    "Sources:",
    "",
    ...usable.map(sourceBlock),
    "",
    "Extract only what these sources state. Emit nothing for a console model none of them names.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const key = ensureExtractor();

  let res;
  try {
    res = await request(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // OpenRouter attributes usage to an app when these are set.
        "HTTP-Referer": "https://framepatch.app",
        "X-Title": "FramePatch",
      },
      body: JSON.stringify({
        model: extractorModel(),
        max_tokens: 8_000,
        // `strict` is what makes the schema a guarantee rather than a suggestion.
        response_format: { type: "json_schema", json_schema: { name: "fps_extraction", strict: true, schema: SCHEMA } },
        // Extraction, not reasoning — the rules do the work, so buy depth only where it pays.
        reasoning: { effort: "low" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
      gapMs: 400,
      timeoutMs: 120_000,
      retries: 2,
    });
  } catch (error) {
    if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
      throw new ExtractorAuthError(`OpenRouter rejected the API key (HTTP ${error.status})`);
    }
    if (error instanceof HttpError && error.status === 402) {
      throw new ExtractorAuthError("OpenRouter reports no credit left on this account");
    }
    throw error;
  }

  const response = await res.json();
  if (response.error) throw new Error(`OpenRouter: ${response.error.message ?? "unknown error"}`);
  spent += response.usage?.cost ?? 0;

  const choice = response.choices?.[0];

  // Throwing rather than returning null matters: syncEntries caches a null as "this source has
  // nothing for this game" and stops retrying it, while an error keeps the title in the queue.
  if (choice?.finish_reason === "length") {
    throw new Error("extractor hit the token cap before closing the JSON");
  }

  const text = choice?.message?.content;
  if (!text) throw new Error(`extractor returned no content (finish_reason ${choice?.finish_reason})`);

  try {
    return { ...JSON.parse(text), cost: response.usage?.cost ?? 0 };
  } catch {
    throw new Error("extractor returned text that is not the requested JSON");
  }
}

export { MODELS as CONSOLE_MODELS };
