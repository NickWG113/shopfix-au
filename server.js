import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";

import { inspectStore, fetchPage, normaliseDomain, normalisePath } from "./lib/store.js";
import { runChecks } from "./lib/checks.js";
import { PRESETS, buildChangeBundle } from "./lib/fixes.js";
import { renderPreview, pageOutline } from "./lib/preview.js";
import { generateChange } from "./lib/ai.js";
import { publish, undo, publishConfigured } from "./lib/publish.js";

// This app's own .env, wherever it was started from. The lib modules read
// process.env when called, not when imported, so loading it here is in time.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, ".env"), quiet: true });

const app = express();
app.use(express.json({ limit: "1mb" }));
// Three pages: / (home), /dashboard (the owner's view of one store) and
// /preview (try changes on the store's real page, then approve them).
// `extensions` lets /dashboard find dashboard.html without a route each.
app.use(express.static(path.join(here, "public"), { extensions: ["html"] }));

// Errors we raise on purpose are written for the person using the app;
// anything else gets a generic line and the detail goes to the console.
function send(res, fn) {
  fn().then(
    (data) => res.json(data),
    (err) => {
      console.error(err);
      res.status(400).json({ error: err.message || "Something went wrong." });
    },
  );
}

app.get("/api/config", (_req, res) => {
  res.json({
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    publishStore: publishConfigured() ? process.env.SHOPIFY_STORE : null,
    presets: Object.fromEntries(
      Object.entries(PRESETS).map(([id, p]) => [id, { label: p.label, describe: p.describe, defaultText: p.defaultText }]),
    ),
  });
});

app.post("/api/check", (req, res) =>
  send(res, async () => {
    const store = await inspectStore(req.body.domain);
    if (!store.shopify) {
      throw new Error(`${store.domain} doesn't look like a Shopify store. This tool only reads Shopify stores.`);
    }
    const home = await fetchPage(store.domain, "/");
    const product = store.firstProductPath ? await fetchPage(store.domain, store.firstProductPath).catch(() => null) : null;
    const checks = runChecks(store, { home: home.html, product: product?.html ?? null });
    return { store, checks };
  }),
);

// The preview is returned as HTML for the frame's srcdoc, so the frame
// gets an opaque origin: changes can't reach our page or the store's cookies.
app.post("/api/preview", (req, res) =>
  send(res, async () => {
    const domain = normaliseDomain(req.body.domain);
    const pagePath = normalisePath(req.body.path);
    const page = await fetchPage(domain, pagePath);
    const bundle = req.body.original ? { css: "", js: "" } : buildChangeBundle(req.body.presets, req.body.custom);
    return {
      html: renderPreview({
        html: page.html,
        domain,
        bundle,
        highlight: Boolean(req.body.highlight),
        scripts: req.body.scripts !== false,
      }),
      status: page.status,
    };
  }),
);

app.post("/api/ai-change", (req, res) =>
  send(res, async () => {
    const request = String(req.body.request || "").trim().slice(0, 1000);
    if (!request) throw new Error("Describe the change you want.");
    const domain = normaliseDomain(req.body.domain);
    const pagePath = normalisePath(req.body.path);
    const page = await fetchPage(domain, pagePath);
    const change = await generateChange(request, pageOutline(page.html), {
      domain,
      path: pagePath,
      existing: (req.body.existing || []).map(String).slice(0, 20),
    });
    return { ...change, request };
  }),
);

app.post("/api/publish", (req, res) =>
  send(res, async () => {
    if (!publishConfigured()) throw new Error("Publishing isn't set up. Add SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN to .env.");
    // Changes are written against one store's theme; publishing them into a
    // different store would put code made for someone else's page live.
    if (String(req.body.shop || "").toLowerCase() !== process.env.SHOPIFY_STORE.toLowerCase()) {
      throw new Error(`Publishing only works on ${process.env.SHOPIFY_STORE}, the store this app has a token for.`);
    }
    return publish(buildChangeBundle(req.body.presets, req.body.custom));
  }),
);

app.post("/api/undo", (_req, res) =>
  send(res, async () => {
    if (!publishConfigured()) throw new Error("Publishing isn't set up.");
    return undo();
  }),
);

const port = Number(process.env.PORT) || 3010;
app.listen(port, () => {
  console.log(`QuickLift running at http://localhost:${port}`);
  if (!process.env.ANTHROPIC_API_KEY) console.log("  (no ANTHROPIC_API_KEY: AI changes are off)");
  if (!publishConfigured()) console.log("  (no SHOPIFY_STORE/SHOPIFY_ADMIN_TOKEN: Publish is off, preview still works)");
});
