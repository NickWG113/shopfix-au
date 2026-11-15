// Builds the GitHub Pages copy of QuickLift into _site/ (docs/github-pages.md).
//
//   node scripts/build-pages.js
//
// No network and no API key: it only copies files. The pages are the same
// ones the server sends (public/), plus pages/static-api.js, which answers
// their api/... calls from the recording made by scripts/record-demo.js.
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
await fs.copyFile(path.join(root, "pages", "static-api.js"), path.join(out, "static-api.js"));
await fs.cp(path.join(root, "recording"), path.join(out, "recording"), { recursive: true });
// GitHub Pages would otherwise run Jekyll, which skips some files.
await fs.writeFile(path.join(out, ".nojekyll"), "");

// The replay goes first in <head>, before the pages' own scripts can call api/.
let pages = 0;
for (const name of await fs.readdir(out)) {
  if (!name.endsWith(".html")) continue;
  const file = path.join(out, name);
  const html = await fs.readFile(file, "utf8");
  if (!/<head>/i.test(html)) throw new Error(`${name} has no <head> to add the replay to`);
  await fs.writeFile(file, html.replace(/<head>/i, `<head>\n  <script src="static-api.js"></script>`));
  pages++;
}

// Which stores have the agent's answers recorded, so the replay can point
// someone to one that does rather than just failing.
const manifest = [];
for (const domain of await fs.readdir(path.join(out, "recording"))) {
  const agent = await fs
    .readFile(path.join(out, "recording", domain, "agent.json"), "utf8")
    .then((t) => Object.keys(JSON.parse(t).ideas || {}).length > 0)
    .catch(() => false);
  manifest.push({ domain, agent });
}
await fs.writeFile(path.join(out, "recording", "manifest.json"), JSON.stringify(manifest));

console.log(
  `_site/ built: ${pages} pages, ${manifest.length} recorded stores (agent recorded on ${manifest.filter((m) => m.agent).map((m) => m.domain).join(", ") || "none"}).`,
);
