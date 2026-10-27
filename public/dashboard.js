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

// Checks with no automatic fix, and what the owner can do instead.
const NO_FIX = {
  reviews: "No automatic fix: reviews have to come from real customers.",
  photos: "Add photos in Shopify: more angles, and one of the product in use.",
  aud: "Turn on AUD for Australian visitors in Shopify Markets.",
  password: "Remove the password in Online Store › Preferences.",
};

const params = new URLSearchParams(location.search);
const domain = (params.get("store") || "").trim();
let store = null;

function previewUrl(extra = {}) {
  const q = new URLSearchParams({ store: store?.domain || domain, ...extra });
  return `/preview?${q}`;
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
    location.href = "/";
    return;
  }
  $("#loading").hidden = false;
  $("#content").hidden = true;
  $("#error").hidden = true;
  const stop = animateSteps();
  try {
    const result = await api("/api/check", { domain });
    store = result.store;
    try {
      localStorage.setItem("ql:lastStore", store.domain);
    } catch {
      // Storage blocked: the home page just won't offer a way back here.
    }
    const config = await api("/api/config");
    render(result.checks, config);
  } catch (err) {
    $("#error-msg").textContent = err.message;
    $("#error").hidden = false;
  } finally {
    stop();
    $("#loading").hidden = true;
  }
}

function render(checks, config) {
  wireLinks();
  document.title = `${store.name} · QuickLift`;
  $("#store-name").textContent = store.name;
  $("#store-domain").textContent = store.domain;
  $("#store-pill").textContent = store.domain;
  $("#store-pill").hidden = false;
  $("#side-store").innerHTML = `<b>${esc(store.name)}</b>${esc(store.domain)}`;
  $("#side").hidden = false;
  $("#store-tags").innerHTML = [
    store.currency ? `<span class="db-tag">${esc(store.currency)}</span>` : "",
    store.australian ? `<span class="db-tag">Australian store</span>` : `<span class="db-tag db-tag--warn">Not obviously Australian</span>`,
    store.themeName ? `<span class="db-tag">Theme: ${esc(store.themeName)}</span>` : "",
    store.passwordPage ? `<span class="db-tag db-tag--warn">Password protected</span>` : "",
  ].join("");
  $("#checked-at").textContent = `Checked at ${new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;

  const fails = checks
    .filter((c) => c.status === "fail" || c.id === "password")
    .sort((a, b) => RANK[PRIORITY[a.id] ?? "medium"] - RANK[PRIORITY[b.id] ?? "medium"]);
  const unknown = checks.filter((c) => c.status === "unknown" && c.id !== "password");
  const ok = checks.filter((c) => c.status === "pass");

  $("#n-fix").textContent = fails.length;
  $("#n-ok").textContent = ok.length;
  $("#n-live").textContent = "0";

  $("#findings").innerHTML = fails.length
    ? fails.map(findingRow).join("")
    : `<li><div class="db-f-title">Nothing to fix from our checks.</div><div class="db-f-detail">Try asking the agent for a change of your own.</div></li>`;

  $("#unknown-wrap").hidden = unknown.length === 0;
  $("#unknown").innerHTML = unknown.map((c) => quietRow(c, "unknown", "Can’t tell")).join("");

  $("#ok-count").textContent = ok.length;
  $("#ok").innerHTML = ok.map((c) => quietRow(c, "ok", "OK")).join("");

  // Publishing is set up for one store we hold a key for (server.js); for
  // any other store the dashboard says so rather than offering a button
  // that would refuse.
  $("#live-msg").textContent =
    config.publishStore && config.publishStore === store.shop
      ? `Nothing is live yet. Approved changes go into ${config.publishStore}'s theme, and undo takes them off again.`
      : "Nothing is live yet. A change goes live only when you approve it, once this store is connected.";

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
}

function findingRow(c) {
  const sev = PRIORITY[c.id] ?? "medium";
  const action = c.fix
    ? `<a class="ql-btn" href="${esc(previewUrl({ fix: c.fix }))}">Preview the fix</a>`
    : `<span class="db-f-note">${esc(NO_FIX[c.id] || "")}</span>`;
  return `
    <li>
      <div class="db-f-title"><span class="db-sev db-sev--${sev}">${sev === "high" ? "High" : "Medium"}</span>${esc(c.title)}</div>
      <div class="db-f-detail">${esc(c.detail)}</div>
      <div class="db-f-action">${action}</div>
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
  location.href = previewUrl({ ask, page: $("#ask-page").value });
});

$("#chips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ask]");
  if (!b) return;
  $("#ask").value = b.dataset.ask;
  $("#ask").focus();
});

$("#recheck").addEventListener("click", load);

wireLinks();
load();
