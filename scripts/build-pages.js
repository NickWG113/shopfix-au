// Builds the GitHub Pages copy of QuickLift into _site/ (docs/github-pages.md).
//
//   node scripts/build-pages.js
//
// No network and no API key: it only copies files. The pages are the same
// ones the server sends (public/), plus pages/static-api.js, which answers
// their api/... calls from the recording made by scripts/record-demo.js and
// the mocked agent in pages/mock-agent.js.
// GitHub Actions runs this on every push to main (.github/workflows/pages.yml).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "_site");

// The sign-in page belongs to the server; a static site has nothing to sign into.
const SKIP = new Set(["login.html"]);

await fs.rm(out, { recursive: true, force: true });
await fs.cp(path.join(root, "public"), out, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
await fs.copyFile(path.join(root, "lib", "fixes.js"), path.join(out, "fixes.js"));
// One version per build: the commit GitHub is building, or the time here.
// Every page's own files are linked with it (below), and static-api.js adds
// it to what it loads, so a browser holding files from an older build
// fetches the new ones rather than mixing the two.
const VERSION = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 10);
const api = await fs.readFile(path.join(root, "pages", "static-api.js"), "utf8");
await fs.writeFile(path.join(out, "static-api.js"), api.replace('"__BUILD__"', JSON.stringify(VERSION)));
await fs.copyFile(path.join(root, "pages", "mock-agent.js"), path.join(out, "mock-agent.js"));
await fs.cp(path.join(root, "recording"), path.join(out, "recording"), { recursive: true });
// GitHub Pages would otherwise run Jekyll, which skips some files.
await fs.writeFile(path.join(out, ".nojekyll"), "");

// Scripts that import each other (dashboard.js imports results-view.js) get
// the version on the import too.
for (const name of await fs.readdir(out)) {
  if (!name.endsWith(".js")) continue;
  const file = path.join(out, name);
  const js = await fs.readFile(file, "utf8");
  const stamped = js.replace(/(from "\.\/[\w-]+\.js)"/g, `$1?v=${VERSION}"`);
  if (stamped !== js) await fs.writeFile(file, stamped);
}

// The replay goes first in <head>, before the pages' own scripts can call api/.
let pages = 0;
for (const name of await fs.readdir(out)) {
  if (!name.endsWith(".html")) continue;
  const file = path.join(out, name);
  const html = await fs.readFile(file, "utf8");
  if (!/<head>/i.test(html)) throw new Error(`${name} has no <head> to add the replay to`);
  const stamped = html.replace(/((?:href|src)=")([\w-]+\.(?:css|js))"/g, `$1$2?v=${VERSION}"`);
  await fs.writeFile(file, stamped.replace(/<head>/i, `<head>\n  <script src="static-api.js?v=${VERSION}"></script>`));
  pages++;
}

const stores = (await fs.readdir(path.join(out, "recording"))).length;
console.log(`_site/ built: ${pages} pages, ${stores} recorded stores, mocked agent.`);
