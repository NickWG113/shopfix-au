// The owner's dashboard: one store, what to fix first, and the agent.
// It reads the same /api/check the preview uses, so the two never disagree,
// and every button that changes anything opens the preview, where the owner
// sees the change on their real page before approving it.

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
  photos: "medium",
  reviews: "medium",
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
  reviews: "No customer reviews on products",
  trust: "Nothing says you’re Australian, or how returns work",
  photos: "Too few product photos",
  sticky: "Add to cart scrolls out of reach on phones",
};

// Checks with no automatic fix, and what the owner can do instead.
const NO_FIX = {
  reviews: "ask your recent customers for a review. There's no automatic fix, because reviews have to be real.",
  photos: "add photos in Shopify: more angles, and one of the product in use.",
  aud: "turn on AUD for Australian visitors in Shopify Markets.",
  password: "remove the password in Online Store › Preferences.",
};

const params = new URLSearchParams(location.search);
const domain = (params.get("store") || "").trim();
let store = null;

function previewUrl(extra = {}) {
  const q = new URLSearchParams({ store: store?.domain || domain, ...extra });
  return `preview?${q}`;
}

function wireLinks() {
  for (const a of document.querySelectorAll('[data-link="preview"]')) a.href = previewUrl();
  for (const a of document.querySelectorAll('[data-link="results"]')) a.href = `results?${new URLSearchParams({ store: store?.domain || domain })}`;
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
    render(result.checks, config, result.live || 0);
  } catch (err) {
    $("#error-msg").textContent = err.message;
    $("#error").hidden = false;
  } finally {
    stop();
    $("#loading").hidden = true;
  }
}

function render(checks, config, live = 0) {
  wireLinks();
  document.title = `${store.name} · What to fix · QuickLift`;
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

  // The whole check in one sentence, instead of three number tiles.
  const things = (n) => `${n} thing${n === 1 ? "" : "s"}`;
  $("#summary").textContent = fails.length
    ? `We found ${things(fails.length)} to fix. ${ok.length} ${ok.length === 1 ? "is" : "are"} already looking good.`
    : `Nothing to fix from our checks: ${ok.length} ${ok.length === 1 ? "thing is" : "things are"} looking good.`;

  $("#findings").innerHTML = fails.length
    ? fails.map(findingRow).join("")
    : `<li><div class="db-f-title">Nothing to fix from our checks.</div><div class="db-f-detail">Try asking the agent for a change of your own.</div></li>`;

  $("#unknown-wrap").hidden = unknown.length === 0;
  $("#unknown").innerHTML = unknown.map((c) => quietRow(c, "unknown", "Can’t tell")).join("");

  $("#ok-count").textContent = ok.length;
  $("#ok").innerHTML = ok.map((c) => quietRow(c, "ok", "OK")).join("");

  // Only once something is live does it earn a place here, with the way
  // to step 3.
  $("#live").hidden = !live;
  if (live) $("#live-msg").innerHTML = `<b>${live} change${live === 1 ? " is" : "s are"} live</b> on ${esc(store.domain)}.`;

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

  // The preview's ideas take the real agent a while. Ask now, in the
  // background, so they're ready by the time the owner opens a page.
  if (config.ai) {
    for (const path of [store.firstProductPath, "/"].filter(Boolean)) {
      api("api/ideas", { domain: store.domain, path }).catch(() => {});
    }
  }
}

function findingRow(c) {
  const sev = PRIORITY[c.id] ?? "medium";
  // No ready-made fix: what the owner can do goes under the detail, full
  // width, rather than squeezing the row into two narrow columns.
  const action = c.fix
    ? `<div class="db-f-action"><a class="ql-btn" href="${esc(previewUrl({ fix: c.fix }))}">Preview the fix</a></div>`
    : NO_FIX[c.id]
      ? `<div class="db-f-note">${esc(NO_FIX[c.id])}</div>`
      : "";
  return `
    <li>
      <div class="db-f-title"><span class="db-sev db-sev--${sev}">${sev === "high" ? "High" : "Medium"}</span>${esc(PROBLEM[c.id] || c.title)}</div>
      <div class="db-f-detail">${esc(c.detail)}</div>
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
