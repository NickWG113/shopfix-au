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
 * The suggested requests by the agent box: the small everyday edits an owner
 * makes to their shop (seasonal wording, a colour, a note, a phone number), and one the agent should refuse, to show the
 * no-invented-facts rule working. (A store with an agent.json has answers
 * recorded for these too.)
 */
export const EXTRA_REQUESTS = [
  "Change the announcement bar to say Order by 18 December for Christmas delivery",
  "Make the announcement bar red",
  "Change the Add to cart button to say Add to bag",
  "Add a small line under the price saying: Gift wrapping available at checkout",
  "Add a small line under the Add to cart button saying: Questions? Call us on [your phone number]",
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
