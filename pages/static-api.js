// The server, replayed. Loaded first on every page of the GitHub Pages copy
// of QuickLift (scripts/build-pages.js adds it), where there is no server:
// it answers the pages' calls to api/... from what scripts/record-demo.js
// saved, so the same front end runs unchanged.
//
// What is real and what is replayed, said plainly in the banner too:
// - The stores' pages and checks were read for real, on the date recorded.
// - The ready-made fixes run for real: lib/fixes.js is loaded here and
//   builds the same code the server would, applied to the recorded page.
// - The agent is mocked (mock-agent.js): no AI and no network, it writes
//   the change in the browser from what the request asks for. Where a
//   store has an agent.json, recorded once from the real agent, that
//   recorded answer is played back instead. (Frank Body had one; it was
//   taken out of the demo on 15 Nov, so none of the stores do now.)
// - Publish is acted out: Approve and publish says what would go live and
//   counts it on the dashboard (in this browser only), but nothing is
//   written to the real store. Real publishing needs the full app and the
//   store's admin token.
(function () {
  "use strict";

  const realFetch = window.fetch.bind(window);
  // Frank Body was taken out of the demo on 15 Nov. A browser that last
  // checked it would otherwise send every tab back to a store that's gone.
  try {
    if (localStorage.getItem("ql:lastStore") === "frankbody.com") localStorage.removeItem("ql:lastStore");
  } catch {
    // Storage blocked: nothing remembered.
  }
  // Each build stamps its own version here (scripts/build-pages.js), and
  // every file the demo loads carries it, so a browser can't mix files
  // cached from an older build with this one.
  const VERSION = "__BUILD__";
  const here = (p) => new URL(VERSION === "__BUILD__" ? p : `${p}${p.includes("?") ? "&" : "?"}v=${VERSION}`, document.baseURI).href;
  const modules = Promise.all([import(here("fixes.js")), import(here("recording-keys.js")), import(here("mock-agent.js"))]);
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

  // Recorded answers for this store, if any; empty when there are none, and
  // the mock answers instead.
  async function agentFor(domain) {
    return (await getJson(`recording/${await recordedStore(domain)}/agent.json`)) || { ideas: {}, changes: {} };
  }

  // The mock answers straight away; a short pause makes it read as the agent
  // working rather than a page that didn't notice the click.
  const thinking = () => new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

  const routes = {
    async config() {
      const { PRESETS } = (await modules)[0];
      return {
        ai: true,
        publishStore: null,
        demoPublish: true,
        presets: Object.fromEntries(
          Object.entries(PRESETS).map(([id, p]) => [id, { label: p.label, describe: p.describe, defaultText: p.defaultText }]),
        ),
      };
    },

    async check(body) {
      const domain = await recordedStore(body.domain);
      const data = await getJson(`recording/${domain}/check.json`);
      if (!data) throw new Shown(`The recording for ${domain} is missing.`);
      const liveItems = liveList(domain);
      return { store: data.store, checks: data.checks, live: liveItems.length, liveItems };
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
      // Pages saved before 15 Nov point at a change with scrollIntoView,
      // which also scrolls the QuickLift page around the frame. Same fix as
      // lib/preview.js, applied to the saved copy.
      html = html.replace("el.scrollIntoView({block:'center'});", "var rr=el.getBoundingClientRect();window.scrollTo(0,Math.max(0,rr.top+window.scrollY-window.innerHeight/2+rr.height/2));");
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
      const { mockIdeas } = (await modules)[2];
      const agent = await agentFor(body.domain);
      await thinking();
      return { ideas: agent.ideas[body.path || "/"] || mockIdeas(body.path || "/") };
    },

    async "ai-change"(body) {
      const { requestKey } = (await modules)[1];
      const { mockChange } = (await modules)[2];
      const request = String(body.request || "").trim();
      if (!request) throw new Shown("Describe the change you want.");
      const agent = await agentFor(body.domain);
      const recorded = agent.changes[body.path || "/"]?.[requestKey(request)];
      await thinking();
      return { ...(recorded || mockChange(request, body.path || "/")), request };
    },

    async publish(body) {
      const domain = await recordedStore(body.domain);
      const { PRESETS } = (await modules)[0];
      const items = [
        ...(body.presets || []).map((p) => PRESETS[p.id]?.label).filter(Boolean),
        ...(body.custom || []).map((c) => c.summary).filter(Boolean),
      ];
      const n = items.length;
      if (!n) throw new Shown("There's nothing to publish yet.");
      setLive(domain, items);
      return {
        store: domain,
        demo: true,
        note: `✓ Live on ${domain}: ${n} change${n === 1 ? "" : "s"}, in one snippet in its theme. (Acted out in this demo; the real store isn't touched.)`,
      };
    },
    async undo(body) {
      const domain = await recordedStore(body.domain);
      setLive(domain, []);
      return { store: domain, demo: true, note: `Undone: ${domain} is back to how it was.` };
    },
  };

  // What the demo has "published", per store, so the dashboard's "live on
  // your store" can count it. This browser only; nothing leaves it.
  function liveList(domain) {
    try {
      const list = JSON.parse(localStorage.getItem(`ql:demo-live:${domain}`) || "[]");
      return Array.isArray(list) ? list.map(String) : [];
    } catch {
      return [];
    }
  }
  function setLive(domain, items) {
    try {
      if (items.length) localStorage.setItem(`ql:demo-live:${domain}`, JSON.stringify(items));
      else localStorage.removeItem(`ql:demo-live:${domain}`);
    } catch {
      // Storage blocked: the dashboard just shows 0.
    }
  }

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
      `<strong>Online demo:</strong> saved copies of three Australian stores (15 Nov 2026) and a simulated agent. Nothing touches the real stores. ` +
      `<a href="${REPO}#readme" target="_blank" rel="noopener">About</a>` +
      `<button type="button" class="ql-recorded-x" aria-label="Hide this note">×</button>`;
    bar.querySelector(".ql-recorded-x").addEventListener("click", () => bar.remove());
    const style = document.createElement("style");
    style.textContent = `
.ql-recorded{background:#efedfc;color:#2a2194;font:14px/1.45 "Funnel Sans",system-ui,sans-serif;padding:8px 16px;text-align:center;border-bottom:1px solid #d9d5f7}
.ql-recorded a{color:#2a2194;font-weight:600}
.ql-recorded{position:relative;padding-right:40px}
.ql-recorded-x{position:absolute;right:10px;top:50%;transform:translateY(-50%);border:0;background:none;color:#2a2194;font-size:20px;line-height:1;cursor:pointer}
.ql-try{margin:10px 0 0;font:14px/1.6 "Funnel Sans",system-ui,sans-serif;color:inherit;opacity:.85}
.ql-try a{color:inherit;font-weight:600;margin-right:10px;white-space:nowrap}`;
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

  // Short names for the requests the demo is ready for, in the same order
  // as EXTRA_REQUESTS; the full request is what gets sent.
  const CHIP_NAMES = [
    "Reviews section",
    "Photo gallery",
    "“38 people bought this”",
    "Trust badges",
    "Christmas cut-off in the top bar",
    "Fake 5-star reviews (it’ll refuse)",
  ];

  // The dashboard and the preview each have a row of suggestion chips:
  // swap in the requests the demo is ready for.
  async function replayChips() {
    const { EXTRA_REQUESTS } = (await modules)[1];
    const own = document.getElementById("chips") || document.getElementById("ai-chips");
    if (!own) return;
    own.replaceChildren(
      ...EXTRA_REQUESTS.map((r, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.ask = r;
        b.title = r;
        b.textContent = CHIP_NAMES[i] || r;
        if (/5-star/i.test(r)) b.className = "chip-refuse";
        return b;
      }),
    );
  }

  function ready() {
    banner();
    storeLinks();
    replayChips();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
