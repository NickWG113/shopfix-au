// The online demo, on your own computer: builds the GitHub Pages copy
// (scripts/build-pages.js) and serves it at http://localhost:4010.
//
//   npm run demo
//
// Everything is mocked, as on GitHub Pages: saved store pages, the fixes
// running in the browser and a mocked agent, so it needs no API key and
// spends no API credit. For the real app (live stores, Claude), use npm start.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
await import("./build-pages.js");

const port = Number(process.env.DEMO_PORT) || 4010;
const app = express();
// Pages are linked without ".html" (dashboard, preview, results), as on GitHub Pages.
app.use(express.static(path.join(root, "_site"), { extensions: ["html"] }));
app.listen(port, () => console.log(`QuickLift demo (mocked) on http://localhost:${port}`));
