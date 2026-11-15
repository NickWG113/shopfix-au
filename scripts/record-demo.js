// Saves a few stores' pages and checks for the online demo on GitHub Pages
// (docs/github-pages.md). No AI and no API key: the demo's agent is mocked
// in the browser (pages/mock-agent.js).
//
//   node scripts/record-demo.js                  every store in public/recording-keys.js
//   node scripts/record-demo.js toyworld.com.au
//
// What it saves, per store, in recording/<domain>/:
//   check.json                   the store and its checks (POST /api/check)
//   page-<slug>.html             the home and first product page, ready for
//   page-<slug>.noscripts.html   the preview frame with no changes on them
//
// It never touches agent.json. A store can have one, recorded once from the
// real agent; the online demo plays it back where it has an answer and uses
// the mock everywhere else.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inspectStore, fetchPage } from "../lib/store.js";
import { runChecks } from "../lib/checks.js";
import { renderPreview } from "../lib/preview.js";
import { DEMO_STORES, pageSlug } from "../public/recording-keys.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "recording");

async function recordStore(typed) {
  console.log(`== ${typed}`);
  const store = await inspectStore(typed);
  if (!store.shopify) throw new Error(`${typed} isn't a Shopify store`);
  // Filed under the name in DEMO_STORES, not the address the store redirects
  // to (culturekings.com.au answers from www.), because that is the name the
  // online demo looks up. The pages themselves still point at the real address.
  const dir = path.join(root, typed.replace(/^www\./, ""));
  await fs.mkdir(dir, { recursive: true });

  const home = await fetchPage(store.domain, "/");
  const product = store.firstProductPath ? await fetchPage(store.domain, store.firstProductPath).catch(() => null) : null;
  const checks = runChecks(store, { home: home.html, product: product?.html ?? null });
  await fs.writeFile(path.join(dir, "check.json"), JSON.stringify({ store, checks, recordedAt: new Date().toISOString() }));
  console.log(`  ${checks.filter((c) => c.status === "fail").length} to fix`);

  const pages = [["/", home]];
  if (product) pages.push([store.firstProductPath, product]);
  for (const [pagePath, page] of pages) {
    for (const scripts of [true, false]) {
      const html = renderPreview({ html: page.html, domain: store.domain, bundle: { css: "", js: "" }, scripts });
      await fs.writeFile(path.join(dir, `page-${pageSlug(pagePath)}${scripts ? "" : ".noscripts"}.html`), html);
    }
  }
}

const only = process.argv.slice(2);
for (const s of only.length ? only : DEMO_STORES.map((d) => d.domain)) {
  await recordStore(s).catch((err) => console.error(`  ${s} failed: ${err.message}`));
}
