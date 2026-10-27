// "Describe a change" — turn a plain-English request into CSS and JS for
// one store page, using Claude.
//
// The model sees an outline of the real page so its selectors match the
// store's actual theme. It returns code we show in the preview; nothing is
// written to the store unless someone presses Publish.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const ChangeSchema = z.object({
  summary: z.string().describe("One short sentence a store owner understands, saying what changed."),
  css: z.string().describe("CSS to add. Empty string if none."),
  js: z.string().describe("Plain browser JavaScript to run once the page has loaded. Empty string if none."),
  warning: z.string().describe("Anything the owner should know (e.g. text you had to assume), stated plainly. No questions or offers to do more. Empty string if none."),
});

const SYSTEM = `You edit live Shopify storefront pages for Australian store owners.
You are given an outline of the page's HTML (structure, ids, classes, short text) and a request.
Reply with CSS and/or JavaScript that makes the change on this exact page.

Rules:
- Use selectors that exist in the outline. Prefer stable theme classes and ids.
- JavaScript runs after the page has loaded, in a normal browser, with no libraries. It must be safe to run twice (check before adding an element). Set a data-shopfix-ai attribute on every element you add or change, including elements you only restyle with CSS, so the owner can see what changed.
- No network requests, no cookies or storage, no redirects, no alert(), no external scripts, fonts or images unless the request gives a URL.
- Never invent facts about the business: no fake reviews, ratings, stock counts, countdown timers, discounts, awards or claims. If the request needs a fact you don't have, use a clearly editable placeholder like [your threshold] and say so in warning.
- Australian English and AUD in any text you write.
- Keep it as small as the request needs. Don't restyle things that weren't asked about.
- If the request isn't a change to this page (or can't be done with CSS/JS), return empty css and js and explain in warning.`;

let client;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Set ANTHROPIC_API_KEY in .env to use AI changes.");
  }
  client ??= new Anthropic();
  return client;
}

/**
 * @param request   what the owner typed
 * @param outline   pageOutline() of the current page
 * @param context   { domain, path, existing: [summary] }
 */
export async function generateChange(request, outline, context) {
  const existing = context.existing?.length
    ? `\n\nChanges already applied to this preview (build on them, don't repeat them):\n- ${context.existing.join("\n- ")}`
    : "";

  const response = await anthropic().messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // A live demo: speed matters more than depth for a CSS tweak.
    output_config: { effort: "low", format: zodOutputFormat(ChangeSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Store: ${context.domain}\nPage: ${context.path}${existing}\n\n<page_outline>\n${outline}\n</page_outline>\n\nRequest: ${request}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The AI declined that request. Try wording it as a page change.");
  }
  if (!response.parsed_output) {
    throw new Error("The AI's answer couldn't be read. Try again.");
  }
  return response.parsed_output;
}

// ---------------------------------------------------------------------------
// "More ideas for this page": the agent reads the page and suggests changes
// it could make, each worded as a request the owner can send straight back
// to generateChange with one click. The ready-made fixes cover the seven
// checks; these are everything else a good reviewer would notice.
// ---------------------------------------------------------------------------

const IdeasSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().describe("The change in a few plain words, at most 8, e.g. 'Make Add to cart stand out'."),
        why: z.string().describe("One short sentence a store owner understands on why it helps shoppers. No numbers or statistics."),
        request: z.string().describe("The instruction to give the page editor, in plain English, specific to this page."),
      }),
    )
    .describe("6 to 8 ideas, most useful first."),
});

const IDEAS_SYSTEM = `You review one page of an Australian Shopify store the way a first-time shopper on a phone would, and suggest changes that would help them buy.
You see an outline of the page's HTML (structure, ids, classes, short text).

Rules:
- Suggest 6 to 8 changes, most useful first, each specific to THIS page (name the actual button, heading or section).
- Every change must be doable on this page with CSS and JavaScript alone: layout, wording that doesn't state new facts, emphasis, ordering, spacing, showing information already on the page more clearly.
- Base each one on widely accepted ecommerce usability practice (the kind Baymard Institute and Nielsen Norman Group publish). Say why in plain words. Never quote numbers, percentages or studies.
- Never suggest fake reviews, ratings, stock counts, countdown timers, discounts, awards or claims, or anything that states a fact about the business the page doesn't already show. If an idea needs a fact only the owner knows, the request must use a clearly editable placeholder like [your returns window].
- Skip what the store's ready-made fixes already cover (listed in the request).
- Australian English.`;

/**
 * @param outline  pageOutline() of the page
 * @param context  { domain, path, covered: [ready-made fix labels] }
 */
export async function generateIdeas(outline, context) {
  const response = await anthropic().messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(IdeasSchema) },
    system: IDEAS_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Store: ${context.domain}\nPage: ${context.path}\nReady-made fixes already offered: ${context.covered.join("; ") || "none"}\n\n<page_outline>\n${outline}\n</page_outline>`,
      },
    ],
  });
  if (!response.parsed_output) throw new Error("The ideas couldn't be read. Try again.");
  return response.parsed_output.ideas.slice(0, 8);
}
