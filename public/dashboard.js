// The owner's dashboard, the one page to look at: how the store is doing
// (results-view.js, sample data), then suggested improvements and the agent.
// It reads the same /api/check the preview uses, so the two never disagree,
// and every button that changes anything opens the preview, where the owner
// sees the change on their real page before approving it.

import { renderResults } from "./results-view.js";

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

async function api(url, body) {
  const res = await fetch(url, body === undefined ? {} : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: "The server sent something unreadable." }));
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Which gaps come first. Ours, not measured: the ones that sit right at the
// buying decision (the price, what delivery costs) before the ones a shopper
// meets on the way. Shown as a word, never a score.
const PRIORITY = {
  password: "high",
  aud: "high",
  bnpl: "high",
  shipping: "high",
  trust: "medium",
  sticky: "medium",
  photos: "high",
  reviews: "high",
};
const RANK = { high: 0, medium: 1 };

// The checks are named for what good looks like ("Shipping cost is clear
// up front"). Under "What to fix" that reads as if it's already done, so
// a failed check is named for the problem instead.
const PROBLEM = {
  password: "Your store is behind a password",
  aud: "Prices aren’t shown in Australian dollars",
  bnpl: "No Afterpay or Zip near the price",
  shipping: "Delivery cost isn’t clear up front",
  reviews: "No reviews or star ratings on products",
  trust: "Nothing says you’re Australian, or how returns work",
  photos: "Product photos are small and few",
  sticky: "Add to cart scrolls out of reach on phones",
};

// Ideas with no ready-made fix still get a preview: the agent builds the
// change on a product page (never fake reviews: it shows the store's real
// ones). done is what the change is called once it's approved, so it leaves
// this list for the change history.
const AGENT_FIX = {
  reviews: {
    ask: "Add a reviews section with star ratings, showing real reviews from our reviews app",
    done: "Added a reviews section, with star ratings under the title.",
    detail: "Shoppers trust other shoppers. Stars under the title and a row of reviews by the button, from a reviews app (Judge.me has a free plan). Only real reviews, never made-up ones.",
  },
  photos: {
    ask: "Show all the product photos in a big photo gallery under the product",
    done: "Added a photo gallery under the product.",
  },
};

// The agent's own ideas, beyond the check: the big changes that help a
// small store sell, each previewed on the store's page.
const AGENT_IDEAS = [
  {
    id: "proof",
    sev: "high",
    title: "Nothing shows that people buy here",
    detail: "A first-time shopper looks for signs that others buy from you. A line under the price saying how many people bought it lately, from your real orders, does that.",
    ask: "Show how many people bought this in the last 30 days, from our real orders",
    page: "product",
    done: "Added a line under the price saying how many people bought it lately.",
  },
  {
    id: "badges",
    sev: "medium",
    title: "Nothing by the button says checkout is safe",
    detail: "Secure checkout, pay later and local shipping, as badges right under Add to cart, where the shopper decides.",
    ask: "Add trust badges under the Add to cart button",
    page: "product",
    done: "Added trust badges under the Add to cart button.",
  },
  {
    id: "bestseller",
    sev: "medium",
    title: "Your best sellers look like everything else",
    detail: "Bestseller badges on the home page point new shoppers to what other people buy, from your real sales.",
    ask: "Add Bestseller badges to our best sellers",
    page: null,
    done: "Added Bestseller badges to your top-selling products.",
  },
];

// Ideas only the owner can do, in Shopify's settings: no preview possible.
const NO_FIX = {
  aud: "turn on AUD for Australian visitors in Shopify Markets.",
  password: "remove the password in Online Store › Preferences.",
};

const params = new URLSearchParams(location.search);
const domain = (params.get("store") || "").trim();
let store = null;
// The ready-made fixes the owner has approved, by id, so their findings
// say "Fixed" instead of offering the fix again.
let liveFixes = new Set();

function previewUrl(extra = {}) {
  const q = new URLSearchParams({ store: store?.domain || domain, ...extra });
  return `preview?${q}`;
}

function wireLinks() {
  for (const a of document.querySelectorAll('[data-link="preview"]')) a.href = previewUrl();
  for (const a of document.querySelectorAll('[data-link="dashboard"]')) a.href = location.pathname + location.search;
}

// The steps light up while the check runs. They describe what the server
// really does for a check (server.js /api/check), in that order; the timing
// is only there so the list doesn't sit still.
function animateSteps() {
  const items = [...document.querySelectorAll("#load-steps li")];
  let i = 0;
  items[0]?.classList.add("on");
  const t = setInterval(() => {
    i += 1;
    if (i >= items.length) return clearInterval(t);
    items[i].classList.add("on");
  }, 900);
  return () => clearInterval(t);
}

async function load() {
  if (!domain) {
    location.href = "./";
    return;
  }
  $("#loading").hidden = false;
  $("#content").hidden = true;
  $("#error").hidden = true;
  const stop = animateSteps();
  try {
    const result = await api("api/check", { domain });
    store = result.store;
    try {
      localStorage.setItem("ql:lastStore", store.domain);
    } catch {
      // Storage blocked: the home page just won't offer a way back here.
    }
    const config = await api("api/config");
    render(result.checks, config, result.liveItems || []);
  } catch (err) {
    $("#error-msg").textContent = err.message;
    $("#error").hidden = false;
  } finally {
    stop();
    $("#loading").hidden = true;
  }
}

function render(checks, config, live = []) {
  wireLinks();
  document.title = `${store.name} · Dashboard · QuickLift`;
  $("#store-name").textContent = store.name;
  $("#store-pill").textContent = store.domain;
  $("#store-pill").hidden = false;
  // What we know about the store, in one quiet line.
  $("#store-meta").innerHTML = [
    esc(store.domain),
    store.currency ? `Prices in ${esc(store.currency)}` : "",
    store.australian ? "Australian store" : `<span class="db-warn">Not obviously Australian</span>`,
    store.passwordPage ? `<span class="db-warn">Password protected</span>` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const fails = checks
    .filter((c) => c.status === "fail" || c.id === "password")
    .sort((a, b) => RANK[PRIORITY[a.id] ?? "medium"] - RANK[PRIORITY[b.id] ?? "medium"]);
  const unknown = checks.filter((c) => c.status === "unknown" && c.id !== "password");
  const ok = checks.filter((c) => c.status === "pass");

  // Only ideas the owner hasn't tried: one they've approved is in the
  // change history now, not here.
  liveFixes = new Set(fails.filter((c) => c.fix && live.includes(config.presets[c.fix]?.label)).map((c) => c.fix));
  const ideas = [
    ...fails.filter((c) => !liveFixes.has(c.fix) && !live.includes(AGENT_FIX[c.id]?.done)),
    ...AGENT_IDEAS.filter((a) => !live.includes(a.done)),
  ].sort((x, y) => RANK[sevOf(x)] - RANK[sevOf(y)]);

  // The whole list in one sentence.
  const lookGood = `${ok.length} ${ok.length === 1 ? "thing already looks" : "things already look"} good.`;
  $("#summary").textContent = ideas.length
    ? `${ideas.length} idea${ideas.length === 1 ? "" : "s"} to try, most important first. ${lookGood}`
    : `You've tried every idea from our check. ${lookGood}`;

  $("#findings").innerHTML = ideas.length
    ? ideas.map(findingRow).join("")
    : `<li><div class="db-f-title">Nothing left from our check.</div><div class="db-f-detail">Ask the agent for any other change.</div></li>`;

  $("#unknown-wrap").hidden = unknown.length === 0;
  $("#unknown").innerHTML = unknown.map((c) => quietRow(c, "unknown", "Can’t tell")).join("");

  $("#ok-count").textContent = ok.length;
  $("#ok").innerHTML = ok.map((c) => quietRow(c, "ok", "OK")).join("");

  // How the store is doing, at the top of the page.
  renderResults(store, live);
  renderAbTest(store.domain);

  if (!config.ai) {
    $("#ask-form").querySelector("button").disabled = true;
    $("#ask").placeholder = "The agent is off on this server (no AI key set).";
  }

  const steps = [
    "Read your home page",
    store.products.length ? `Read ${store.products.length} products from your product feed` : "Tried your product feed (it isn’t public)",
    store.firstProductPath ? `Read a product page: ${store.firstProductPath}` : null,
    `Ran ${checks.length} checks an Australian shopper would notice`,
    fails.length ? `Ranked ${fails.length} things to fix, most important first` : null,
  ].filter(Boolean);
  $("#activity").innerHTML = steps.map((s) => `<li>${esc(s)}</li>`).join("");

  $("#content").hidden = false;
  // Arriving from "See the results" after approving: go to that section.
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" });

  // The preview's ideas take the real agent a while. Ask now, in the
  // background, so they're ready by the time the owner opens a page.
  if (config.ai) {
    for (const path of [store.firstProductPath, "/"].filter(Boolean)) {
      api("api/ideas", { domain: store.domain, path }).catch(() => {});
    }
  }
}

// High or medium: an agent idea says its own, a check's comes from PRIORITY.
function sevOf(c) {
  return c.sev ?? PRIORITY[c.id] ?? "medium";
}

function findingRow(c) {
  const sev = sevOf(c);
  // Every idea that can be shown on the page gets a preview: a ready-made
  // fix, or an honest change the agent makes. Only settings-only ones
  // (prices in AUD, the password page) say what to do instead.
  const preview = c.fix
    ? previewUrl({ fix: c.fix })
    : AGENT_FIX[c.id]
      ? previewUrl({ ask: AGENT_FIX[c.id].ask, page: "product" })
      : c.ask
        ? previewUrl(c.page ? { ask: c.ask, page: c.page } : { ask: c.ask })
        : null;
  const action = preview
    ? `<div class="db-f-action"><a class="ql-btn" href="${esc(preview)}">Preview the fix</a></div>`
    : NO_FIX[c.id]
      ? `<div class="db-f-note">${esc(NO_FIX[c.id])}</div>`
      : "";
  return `
    <li>
      <div class="db-f-title"><span class="db-sev db-sev--${sev}">${sev === "high" ? "High" : "Medium"}</span>${esc(PROBLEM[c.id] || c.title)}</div>
      <div class="db-f-detail">${esc(AGENT_FIX[c.id]?.detail ?? c.detail)}</div>
      ${action}
    </li>`;
}

function quietRow(c, kind, word) {
  return `
    <li>
      <div class="db-f-title"><span class="db-sev db-sev--${kind}">${word}</span>${esc(c.title)}</div>
      <div class="db-f-detail">${esc(c.detail)}</div>
    </li>`;
}

// ---------- the agent ----------

$("#ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const ask = $("#ask").value.trim();
  if (!ask) return $("#ask").focus();
  // The agent runs on the preview page, where its change appears on the
  // store's real page; the request travels in the address.
  // A product page, where most requests are about; the preview can switch.
  location.href = previewUrl({ ask, page: "product" });
});

// A suggestion goes straight to the agent, as it does on the preview.
$("#chips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ask]");
  if (!b) return;
  location.href = previewUrl({ ask: b.dataset.ask, page: "product" });
});

wireLinks();
load();

// An A/B test started from the preview (app.js). shortcut: acted out with
// sample figures in this browser; a real split needs the store connected.
function renderAbTest(domain) {
  let test = null;
  try {
    test = JSON.parse(localStorage.getItem(`ql:abtest:${domain}`) || "null");
  } catch {
    // Storage blocked or bad data: no test to show.
  }
  const card = $("#abtest");
  card.hidden = !test?.changes?.length;
  if (card.hidden) return;
  const DAYS = 14;
  const day = Math.min(DAYS, Math.max(1, Math.ceil((Date.now() - test.started) / 864e5)));
  const a = 212 * day, b = 207 * day;
  $("#ab-status").textContent = `Running · day ${day} of ${DAYS}`;
  $("#ab-what").textContent = `Testing: ${test.changes.join(", ")}. Half your shoppers see B, half see A. Sample figures.`;
  $("#ab-a-conv").textContent = "1.9% bought";
  $("#ab-b-conv").textContent = "2.3% bought";
  $("#ab-a-n").textContent = `${a.toLocaleString("en-AU")} visits`;
  $("#ab-b-n").textContent = `${b.toLocaleString("en-AU")} visits`;
  $("#ab-progress").style.width = `${(day / DAYS) * 100}%`;
  $("#ab-verdict").textContent =
    day < DAYS
      ? "Too early to call. B is ahead, but QuickLift waits until enough shoppers have seen both before it names a winner."
      : "B won: more of the shoppers who saw the changes bought. Keep B to put it live for everyone.";
  $("#ab-stop").onclick = () => {
    try {
      localStorage.removeItem(`ql:abtest:${domain}`);
    } catch {
      // Nothing stored to remove.
    }
    card.hidden = true;
  };
  if (location.hash === "#abtest") card.scrollIntoView({ block: "center" });
}
