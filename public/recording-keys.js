// Shared by the recorder (scripts/record-demo.js, in Node) and the replay on
// GitHub Pages (static-api.js, in the browser), so both file and look up
// recorded answers the same way. No imports: it has to load in both.

/** The stores recorded for the GitHub Pages copy, in the order shown. */
export const DEMO_STORES = [
  { domain: "toyworld.com.au", note: "Toys. Several things to fix: the one our video uses." },
  { domain: "mrsimple.com.au", note: "Fashion. A few things to fix." },
  { domain: "culturekings.com.au", note: "Streetwear. A big brand that passes most checks." },
];

/**
 * Requests recorded on every page beside the agent's own ideas: the
 * dashboard's suggestion chips, the request in the demo video, and one the
 * agent should refuse, to show the no-invented-facts rule working.
 */
export const EXTRA_REQUESTS = [
  "Make the Add to cart button bigger and bright green",
  "Add a small line under the price saying: Ships from [your city] in 1–2 business days",
  "Make the product title larger and bolder on phones",
  "Make the Add to cart button bright green, and add a small line under it saying Ships from Sydney in 1–2 business days",
  "Add five 5-star customer reviews under the price",
];

/** A file-name-safe name for a store path: "/" is "home". */
export function pageSlug(pagePath) {
  if (!pagePath || pagePath === "/") return "home";
  return pagePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]+/gi, "_").slice(0, 80);
}

/** How a typed request is matched to a recorded one: case, spacing and end punctuation don't matter. */
export function requestKey(request) {
  return String(request || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
}
