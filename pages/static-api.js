// The server, replayed. Loaded first on every page of the GitHub Pages copy
// of QuickLift (scripts/build-pages.js adds it), where there is no server:
// it answers the pages' calls to api/... from what scripts/record-demo.js
// saved, so the same front end runs unchanged.
//
// What is real and what is replayed, said plainly in the banner too:
// - The stores' pages and checks were read for real, on the date recorded.
// - The ready-made fixes run for real: lib/fixes.js is loaded here and
//   builds the same code the server would, applied to the recorded page.
// - The agent's ideas and changes are Claude's real answers to those pages,
//   recorded once. Only requests that were recorded can be replayed, so the
//   pages show those requests to click.
// - Publish needs a store's admin token, so it only works in the full app.
(function () {
  "use strict";

  const realFetch = window.fetch.bind(window);
  const here = (p) => new URL(p, document.baseURI).href;
  const modules = Promise.all([import(here("fixes.js")), import(here("recording-keys.js"))]);
  const cache = new Map();
  const REPO = "https://github.com/NickWG113/shopfix-au";

  async function getJson(file) {
    if (!cache.has(file)) {
      cache.set(
        file,
        realFetch(here(file)).then((r) => (r.ok ? r.json() : null)),
      );
    }
    return cache.get(file);
  }

  function reply(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  }
  class Shown extends Error {}

  function cleanDomain(input) {
    return String(input || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0];
  }

  async function recordedStore(domain) {
    const { DEMO_STORES } = (await modules)[1];
    const want = cleanDomain(domain);
    const hit = DEMO_STORES.find((s) => s.domain === want);
    if (!hit) {
      throw new Shown(
        `This online demo has ${DEMO_STORES.length} stores recorded: ${DEMO_STORES.map((s) => s.domain).join(", ")}. ` +
          `Pick one of those, or run QuickLift on your own computer to check any store (see the README on GitHub).`,
      );
    }
    return hit.domain;
  }

  async function agentFor(domain) {
    const agent = await getJson(`recording/${await recordedStore(domain)}/agent.json`);
    if (agent && Object.keys(agent.ideas || {}).length) return agent;
    const withAgent = ((await getJson("recording/manifest.json")) || []).filter((m) => m.agent).map((m) => m.domain);
    throw new Shown(
      withAgent.length
        ? `The agent's answers weren't recorded for this store. Try the agent on ${withAgent.join(" or ")}. The ready-made fixes work here.`
        : "The agent's answers weren't recorded for this online demo.",
    );
  }

  const routes = {
    async config() {
      const { PRESETS } = (await modules)[0];
      return {
        ai: true,
        publishStore: null,
        presets: Object.fromEntries(
          Object.entries(PRESETS).map(([id, p]) => [id, { label: p.label, describe: p.describe, defaultText: p.defaultText }]),
        ),
      };
    },

    async check(body) {
      const domain = await recordedStore(body.domain);
      const data = await getJson(`recording/${domain}/check.json`);
      if (!data) throw new Shown(`The recording for ${domain} is missing.`);
      return { store: data.store, checks: data.checks };
    },

    async preview(body) {
      const [{ buildChangeBundle }, { pageSlug }] = await modules;
      const domain = await recordedStore(body.domain);
      const variant = body.scripts === false ? ".noscripts" : "";
      const res = await realFetch(here(`recording/${domain}/page-${pageSlug(body.path)}${variant}.html`));
      if (!res.ok) {
        throw new Shown(
          "Only the home page and one product page of each store are in this online demo. Use the Home and Product buttons above the preview.",
        );
      }
      let html = await res.text();
      // The same additions renderPreview (lib/preview.js) makes on the server,
      // in the same places: CSS and the highlight at the end of <head>, the
      // script at the end of <body>.
      const bundle = body.original ? { css: "", js: "" } : buildChangeBundle(body.presets, body.custom);
      let head = "";
      if (bundle.css) head += `<style id="shopfix-css">${bundle.css.replace(/<\/style/gi, "<\\/style")}</style>`;
      if (body.highlight) {
        head += `<style>[data-shopfix],[data-shopfix-ai]{outline:2px dashed #3b2fc9!important;outline-offset:3px}</style>`;
      }
      if (head) html = html.replace(/<\/head>/i, `${head}</head>`);
      if (bundle.js) {
        const tag = `<script id="shopfix-js">${bundle.js.replace(/<\/script/gi, "<\\/script")}</script>`;
        const at = html.toLowerCase().lastIndexOf("</body>");
        html = at === -1 ? html + tag : html.slice(0, at) + tag + html.slice(at);
      }
      return { html, status: 200 };
    },

    async bundle(body) {
      const { buildChangeBundle } = (await modules)[0];
      return buildChangeBundle(body.presets, body.custom);
    },

    async ideas(body) {
      const agent = await agentFor(body.domain);
      const ideas = agent.ideas[body.path || "/"];
      if (!ideas) throw new Shown("The agent's ideas were recorded for the home page and one product page only.");
      return { ideas };
    },

    async "ai-change"(body) {
      const { requestKey } = (await modules)[1];
      const request = String(body.request || "").trim();
      if (!request) throw new Shown("Describe the change you want.");
      const agent = await agentFor(body.domain);
      const change = agent.changes[body.path || "/"]?.[requestKey(request)];
      if (!change) {
        throw new Shown(
          "This online demo replays the agent's recorded answers, so it only knows the requests shown under the box and the ideas for this page. Run QuickLift on your own computer to ask for anything.",
        );
      }
      // A short pause so the change doesn't land before the button has said
      // it's working. The real agent takes about ten seconds; we don't pretend.
      await new Promise((r) => setTimeout(r, 900));
      return { ...change, request };
    },

    async publish() {
      throw new Shown("Publishing writes into a real store's theme, so it needs the full app running with that store's token. This online copy can't publish.");
    },
    async undo() {
      throw new Shown("Nothing was published from this online copy.");
    },
  };

  window.fetch = function (input, init) {
    const url = new URL(typeof input === "string" ? input : input.url, document.baseURI);
    const m = url.pathname.match(/\/api\/([\w-]+)$/);
    if (!m || !routes[m[1]]) return realFetch(input, init);
    let body = {};
    try {
      body = init?.body ? JSON.parse(init.body) : {};
    } catch {
      // Not JSON: the routes treat it as empty.
    }
    return routes[m[1]](body).then(
      (data) => reply(data),
      (err) => {
        if (!(err instanceof Shown)) console.error(err);
        return reply({ error: err instanceof Shown ? err.message : "Something went wrong in the online demo." }, 400);
      },
    );
  };

  // ---------- what the page says about being a recording ----------

  function banner() {
    const bar = document.createElement("div");
    bar.className = "ql-recorded";
    bar.innerHTML =
      `<strong>Online demo.</strong> Four Australian stores, recorded 15 November 2026. ` +
      `The fixes run live on the recorded pages; the agent's real answers are played back from the recording. ` +
      `<a href="${REPO}#readme" target="_blank" rel="noopener">Run the full app</a>`;
    const style = document.createElement("style");
    style.textContent = `
.ql-recorded{background:#efedfc;color:#2a2194;font:14px/1.45 "Funnel Sans",system-ui,sans-serif;padding:8px 16px;text-align:center;border-bottom:1px solid #d9d5f7}
.ql-recorded a{color:#2a2194;font-weight:600}
.ql-try{margin:10px 0 0;font:14px/1.6 "Funnel Sans",system-ui,sans-serif;color:inherit;opacity:.85}
.ql-try a{color:inherit;font-weight:600;margin-right:10px;white-space:nowrap}
.ql-replay{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.ql-replay p{flex-basis:100%;margin:0;font-size:13px;color:#5b5d57}
.ql-replay button{border:1px solid #e4e4ee;background:#fff;border-radius:999px;padding:6px 10px;font:13px "Funnel Sans",system-ui,sans-serif;cursor:pointer;text-align:left}
.ql-replay button:hover{border-color:#3b2fc9}`;
    document.head.appendChild(style);
    document.body.prepend(bar);
  }

  async function storeLinks() {
    const { DEMO_STORES } = (await modules)[1];
    for (const form of document.querySelectorAll("form.rp-scan")) {
      const p = document.createElement("p");
      p.className = "ql-try";
      p.innerHTML =
        "In this online demo, try: " +
        DEMO_STORES.map((s) => `<a href="dashboard?store=${encodeURIComponent(s.domain)}" title="${s.note}">${s.domain}</a>`).join("");
      form.after(p);
    }
  }

  async function replayChips() {
    const form = document.getElementById("ai-form") || document.getElementById("ask-form");
    if (!form) return;
    const { EXTRA_REQUESTS } = (await modules)[1];
    const box = document.createElement("div");
    box.className = "ql-replay";
    box.innerHTML = `<p>Recorded requests (or switch on one of the agent's ideas):</p>`;
    for (const r of EXTRA_REQUESTS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = r;
      b.addEventListener("click", () => {
        const field = form.querySelector("textarea, input[type=text]");
        if (field) field.value = r;
        form.requestSubmit();
      });
      box.appendChild(b);
    }
    form.after(box);
  }

  function ready() {
    banner();
    storeLinks();
    replayChips();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
