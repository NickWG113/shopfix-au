// Records what the server would answer for a few stores, so the copy of
// QuickLift on GitHub Pages can replay it with no server (docs/github-pages.md).
//
//   node --env-file=.env scripts/record-demo.js            all stores
//   node --env-file=.env scripts/record-demo.js frankbody.com
//
// What it saves, per store, in recording/<domain>/:
//   check.json          the store and its checks (POST /api/check)
//   page-<slug>.html    the home and first product page, ready for the
//   page-<slug>.noscripts.html   preview frame with no changes on them
//   agent.json          the agent's ideas for each page, and its change for
//                       every idea and every suggested request
//
// The agent's answers are real Claude answers to the real page; they are
// only frozen in time. Re-running skips anything already recorded, so a
// failure part-way costs nothing to retry. Delete a file to record it again.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inspectStore, fetchPage } from "../lib/store.js";
import { runChecks } from "../lib/checks.js";
import { PRESETS } from "../lib/fixes.js";
import { renderPreview, pageOutline } from "../lib/preview.js";
import { generateChange, generateIdeas } from "../lib/ai.js";
import { DEMO_STORES, EXTRA_REQUESTS, pageSlug, requestKey } from "../public/recording-keys.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "recording");
const only = process.argv.slice(2);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

// A few calls at a time: fast enough, and gentle on the API's rate limits.
async function pool(tasks, size = 4) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]().catch((err) => ({ error: err }));
    }
  }
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

async function recordStore(typed) {
  console.log(`\n== ${typed}`);
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
  console.log(`  checks: ${checks.filter((c) => c.status === "fix").length} to fix`);

  const pages = [["/", home]];
  if (product) pages.push([store.firstProductPath, product]);

  for (const [pagePath, page] of pages) {
    const slug = pageSlug(pagePath);
    for (const scripts of [true, false]) {
      const html = renderPreview({ html: page.html, domain: store.domain, bundle: { css: "", js: "" }, scripts });
      await fs.writeFile(path.join(dir, `page-${slug}${scripts ? "" : ".noscripts"}.html`), html);
    }
  }

  const agentFile = path.join(dir, "agent.json");
  const agent = await readJson(agentFile, { ideas: {}, changes: {} });
  const save = () => fs.writeFile(agentFile, JSON.stringify(agent, null, 1));

  for (const [pagePath, page] of pages) {
    const outline = pageOutline(page.html);
    if (!agent.ideas[pagePath]) {
      console.log(`  ideas for ${pagePath}…`);
      agent.ideas[pagePath] = await generateIdeas(outline, {
        domain: store.domain,
        path: pagePath,
        covered: Object.values(PRESETS).map((p) => p.label),
      });
      await save();
    }
    agent.changes[pagePath] ||= {};
    const requests = [...agent.ideas[pagePath].map((i) => i.request), ...EXTRA_REQUESTS];
    const todo = requests.filter((r) => !agent.changes[pagePath][requestKey(r)]);
    console.log(`  ${pagePath}: ${todo.length} changes to record`);
    const results = await pool(
      todo.map((request) => async () => {
        const change = await generateChange(request, outline, { domain: store.domain, path: pagePath, existing: [] });
        agent.changes[pagePath][requestKey(request)] = { ...change, request };
        await save();
        process.stdout.write(".");
      }),
    );
    const failed = results.filter((r) => r?.error);
    if (failed.length) console.log(`\n  ${failed.length} failed (re-run to retry): ${failed[0].error.message}`);
    else console.log("");
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Needs ANTHROPIC_API_KEY (run with --env-file=.env).");
  process.exit(1);
}
const stores = only.length ? only : DEMO_STORES.map((s) => s.domain);
for (const s of stores) {
  try {
    await recordStore(s);
  } catch (err) {
    console.error(`  ${s} failed: ${err.message}`);
  }
}
