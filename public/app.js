// The whole front end. One page, no framework: the state below is the
// truth, and render functions redraw from it.

const $ = (sel) => document.querySelector(sel);

const state = {
  config: null,
  store: null,
  checks: [],
  path: "/",
  presets: {}, // id -> { on, text }
  custom: [], // { summary, css, js, warning, request }
  mode: "after",
  size: "desktop",
  highlight: true,
  scripts: true,
  scrollY: 0,
};

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

let toastTimer;
function toast(msg, error = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast" + (error ? " error" : "");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), error ? 6000 : 3500);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---------- checking a store ----------

$("#check-form").addEventListener("submit", (e) => {
  e.preventDefault();
  checkStore($("#domain").value).then((ok) => ok && refreshPreview());
});

async function checkStore(domain) {
  const btn = $("#check-btn");
  btn.disabled = true;
  btn.textContent = "Checking…";
  try {
    const { store, checks } = await api("/api/check", { domain });
    state.store = store;
    state.checks = checks;
    state.path = "/";
    state.custom = [];
    state.presets = {};
    // Each store gets its scripts back; the switch-off above is per store.
    state.scripts = true;
    // A scroll position from the last store means nothing on this one.
    state.scrollY = 0;
    $("#scripts").checked = true;
    // Suggested fixes start switched off: the owner chooses, and the
    // before/after is more convincing when they flip them on themselves.
    for (const c of checks) if (c.fix) state.presets[c.fix] = { on: false, text: state.config.presets[c.fix].defaultText };
    $("#domain").value = store.domain;
    $("#intro").hidden = true;
    $("#tab-dashboard").href = `/dashboard?store=${encodeURIComponent(store.domain)}`;
    try {
      localStorage.setItem("ql:lastStore", store.domain);
    } catch {
      // Storage blocked: nothing depends on it.
    }
    renderStore();
    renderChecks();
    renderChanges();
    $("#ai-card").hidden = false;
    return true;
  } catch (err) {
    toast(err.message, true);
    return false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Check store";
  }
}

function renderStore() {
  const s = state.store;
  const tags = [
    s.currency ? `<span class="tag">${esc(s.currency)}</span>` : "",
    s.australian ? `<span class="tag">Australian store</span>` : `<span class="tag warn">Not obviously Australian</span>`,
    s.themeName ? `<span class="tag">Theme: ${esc(s.themeName)}</span>` : "",
    s.products.length ? `<span class="tag">${s.products.length} products read</span>` : "",
    s.passwordPage ? `<span class="tag warn">Password protected</span>` : "",
  ].join("");
  $("#store-card").innerHTML = `
    <div class="store-name">${esc(s.name)}</div>
    <div class="muted">${esc(s.domain)}</div>
    <div class="tags">${tags}</div>
    ${s.australian ? "" : `<p class="muted">This tool is built for Australian stores; the checks still run, but some advice assumes AU shoppers.</p>`}`;
  $("#store-card").hidden = false;
}

const TRUE_ONLY = new Set(["shipping-bar", "trust-bar"]);

function fixControl(id) {
  const def = state.config.presets[id];
  const p = state.presets[id];
  return `
    <div class="fix">
      <label class="switch${p.on ? " on" : ""}">
        <input type="checkbox" role="switch" data-fix="${id}" ${p.on ? "checked" : ""}>
        <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
        <span class="switch-text"><b>${esc(def.label)}</b><span class="switch-state">${p.on ? "On in the preview" : "Try this fix"}</span></span>
      </label>
      <input type="text" data-fix-text="${id}" value="${esc(p.text)}" aria-label="${esc(def.label)} text">
      ${TRUE_ONLY.has(id) ? `<span class="note">Edit the wording so it's true for this store.</span>` : ""}
    </div>`;
}

function renderChecks() {
  const order = { fail: 0, unknown: 1, pass: 2 };
  const checks = [...state.checks].sort((a, b) => order[a.status] - order[b.status]);
  const label = { pass: "OK", fail: "Fix", unknown: "Can't tell" };
  let html = checks
    .map(
      (c) => `
      <li class="check ${c.status}">
        <div class="t"><span class="s">${label[c.status]}</span> ${esc(c.title)}</div>
        <p>${esc(c.detail)}</p>
        ${c.fix ? fixControl(c.fix) : ""}
      </li>`,
    )
    .join("");

  // Fixes for things the store already does are still offered (a store can
  // pass a check and still want, say, a sticky cart), just further down.
  const suggested = new Set(state.checks.map((c) => c.fix).filter(Boolean));
  const extra = Object.keys(state.config.presets).filter((id) => !suggested.has(id));
  if (extra.length && !state.store.passwordPage) {
    for (const id of extra) state.presets[id] ??= { on: false, text: state.config.presets[id].defaultText };
    html += `<li class="check unknown"><div class="t">More fixes to try</div>${extra.map(fixControl).join("")}</li>`;
  }
  $("#checks").innerHTML = html;
  $("#checks-card").hidden = false;
}

$("#checks").addEventListener("change", (e) => {
  const id = e.target.dataset.fix;
  if (!id) return;
  state.presets[id].on = e.target.checked;
  const sw = e.target.closest(".switch");
  sw?.classList.toggle("on", e.target.checked);
  if (sw) sw.querySelector(".switch-state").textContent = e.target.checked ? "On in the preview" : "Try this fix";
  // Sticky cart only exists on product pages; jump there so it's visible.
  if (id === "sticky-cart" && e.target.checked && state.store.firstProductPath && !state.path.startsWith("/products/")) {
    state.path = state.store.firstProductPath;
    toast("Opened a product page — the sticky button shows on phones once you scroll past Add to cart.");
    setSize("phone");
  }
  renderChanges();
  refreshPreview();
});

let textTimer;
$("#checks").addEventListener("input", (e) => {
  const id = e.target.dataset.fixText;
  if (!id) return;
  state.presets[id].text = e.target.value;
  if (!state.presets[id].on) return;
  clearTimeout(textTimer);
  textTimer = setTimeout(refreshPreview, 500);
});

// ---------- AI changes ----------

$("#ai-form").addEventListener("submit", (e) => {
  e.preventDefault();
  askAgent($("#ai-request").value.trim());
});

async function askAgent(request) {
  if (!request || !state.store) return;
  const btn = $("#ai-btn");
  btn.disabled = true;
  btn.textContent = "Working on it…";
  try {
    const change = await api("/api/ai-change", {
      domain: state.store.domain,
      path: state.path,
      request,
      existing: state.custom.map((c) => c.summary),
    });
    if (!change.css && !change.js) {
      toast(change.warning || "No change was made.", true);
      return;
    }
    state.custom.push(change);
    $("#ai-request").value = "";
    renderChanges();
    // The summary of what the agent did sits in the change list, further
    // down the panel; bring it into view so the owner reads it.
    $("#changes-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
    setMode("after");
    refreshPreview();
    toast(change.summary);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Make this change";
  }
}

// ---------- the change list ----------

function activePresets() {
  return Object.entries(state.presets)
    .filter(([, p]) => p.on)
    .map(([id, p]) => ({ id, text: p.text }));
}

function renderChanges() {
  const presets = activePresets();
  const items = [
    ...presets.map((p) => `<li><span>${esc(state.config.presets[p.id].label)}</span><button data-off="${p.id}">Remove</button></li>`),
    ...state.custom.map(
      (c, i) =>
        `<li><span>${esc(c.summary)}${c.warning ? `<em>${esc(c.warning)}</em>` : ""}</span><button data-del="${i}">Remove</button></li>`,
    ),
  ];
  $("#changes").innerHTML = items.join("") || `<li class="muted">No changes yet. Switch on a fix or describe one.</li>`;
  $("#changes-card").hidden = !state.store;

  // The approve step always shows, because it is the owner's step in the
  // flow. It can only publish to the one store this server holds a key for;
  // on any other store it says what connecting would do instead.
  const pub = state.config.publishStore;
  const canPublish = Boolean(pub && state.store?.shop === pub);
  $("#publish-box").hidden = !state.store;
  $("#publish-store").textContent = canPublish ? pub : "your store";
  $("#undo-btn").hidden = !canPublish;
  $("#publish-btn").disabled = items.length === 0;

  $("#code").textContent =
    [
      ...presets.map((p) => `/* ${state.config.presets[p.id].label} */`),
      ...state.custom.map((c) => `/* ${c.summary} */\n${c.css}\n${c.js}`),
    ].join("\n\n") || "(nothing yet)";
}

$("#changes").addEventListener("click", (e) => {
  const off = e.target.dataset.off;
  const del = e.target.dataset.del;
  if (off) {
    state.presets[off].on = false;
    renderChecks();
  } else if (del !== undefined) {
    state.custom.splice(Number(del), 1);
  } else return;
  renderChanges();
  refreshPreview();
});

$("#publish-btn").addEventListener("click", async () => {
  const pub = state.config.publishStore;
  if (!(pub && state.store?.shop === pub)) {
    $("#publish-msg").textContent =
      "Publishing needs this store connected to QuickLift. Once it is, these changes go into its theme in one snippet, and undo takes them off.";
    return;
  }
  if (!confirm(`Publish these changes to the live theme on ${state.config.publishStore}? Shoppers will see them straight away.`)) return;
  const btn = $("#publish-btn");
  btn.disabled = true;
  try {
    const r = await api("/api/publish", { shop: state.store.shop, presets: activePresets(), custom: state.custom });
    $("#publish-msg").textContent = `Live on ${r.store} (theme "${r.theme}") at ${new Date().toLocaleTimeString("en-AU")}.`;
    toast("Published. Reload the real store to see it.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

$("#undo-btn").addEventListener("click", async () => {
  try {
    const r = await api("/api/undo", {});
    $("#publish-msg").textContent = `Removed from ${r.store}. The theme is back to how it was.`;
    toast("Published changes removed.");
  } catch (err) {
    toast(err.message, true);
  }
});

// ---------- preview ----------

let previewSeq = 0;
async function refreshPreview() {
  if (!state.store) return;
  const seq = ++previewSeq;
  $("#loading").hidden = false;
  $("#path").textContent = state.path;
  try {
    const { html } = await api("/api/preview", {
      domain: state.store.domain,
      path: state.path,
      presets: activePresets(),
      custom: state.custom,
      original: state.mode === "before",
      highlight: state.highlight && state.mode === "after",
      scripts: state.scripts,
    });
    // A slow response for an older click mustn't overwrite a newer one.
    if (seq !== previewSeq) return;
    await swapIn(html, seq);
  } catch (err) {
    if (seq === previewSeq) toast(err.message, true);
  } finally {
    if (seq === previewSeq) $("#loading").hidden = true;
  }
}

// One frame, reloaded in place. (Loading the next version in a second
// frame behind or over the first and swapping looked smoother, but Chrome
// left the swapped-in frame blank white on some stores, Toyworld among
// them, until it was scrolled. A short reload flash is the better trade.)
const frame = $("#frame");
let expectingLoad = false;
let gotReady = false;

function swapIn(html, seq) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (seq === previewSeq) frame.contentWindow?.postMessage({ shopfix: "scroll", y: state.scrollY }, "*");
      resolve();
    };
    expectingLoad = true;
    gotReady = false;
    frame.onload = () => {
      // srcdoc loads once per render. A load we didn't ask for, or one from
      // a page that never said it was ours, means the theme's scripts sent
      // the frame elsewhere (usually the real store, which refuses to be
      // framed and shows a broken-page icon).
      if (!expectingLoad) return frameLeft();
      expectingLoad = false;
      if (gotReady) return finish();
      // "ready" is a message, so it can arrive just after load. Give it a
      // moment before deciding the page isn't ours.
      setTimeout(() => (gotReady ? finish() : frameLeft()), 400);
    };
    // Some theme never fires load (a hung asset); don't wait forever.
    setTimeout(finish, 8000);
    frame.hidden = false;
    $("#empty").hidden = true;
    frame.srcdoc = html;
  });
}

function frameLeft() {
  if (!state.scripts) {
    // Already without scripts and still leaving: nothing more we can do.
    toast("This store's page won't stay in the preview. Try another page or store.", true);
    return;
  }
  state.scripts = false;
  $("#scripts").checked = false;
  toast("This store's own scripts tried to open the real site, so the preview shows it with them off.");
  refreshPreview();
}

window.addEventListener("message", (e) => {
  const m = e.data || {};
  if (e.source !== frame.contentWindow) return;
  if (m.shopfix === "ready") {
    gotReady = true;
    return;
  }
  if (m.shopfix === "scrolled") {
    state.scrollY = m.y;
  } else if (m.shopfix === "navigate") {
    if (m.host !== state.store.domain) return toast("That link leaves the store, so the preview doesn't follow it.");
    state.path = m.path;
    state.scrollY = 0;
    refreshPreview();
  } else if (m.shopfix === "form") {
    toast(/cart/.test(m.action) ? "Add to cart pressed — it's a preview, so nothing was added." : "Forms are switched off in the preview.");
  }
});

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
}
function setSize(size) {
  state.size = size;
  document.querySelectorAll("[data-size]").forEach((b) => b.classList.toggle("on", b.dataset.size === size));
  $("#frame-wrap").classList.toggle("phone", size === "phone");
}

document.querySelectorAll("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => {
    setMode(b.dataset.mode);
    refreshPreview();
  }),
);
document.querySelectorAll("[data-size]").forEach((b) => b.addEventListener("click", () => setSize(b.dataset.size)));
$("#highlight").addEventListener("change", (e) => {
  state.highlight = e.target.checked;
  refreshPreview();
});
$("#scripts").addEventListener("change", (e) => {
  state.scripts = e.target.checked;
  refreshPreview();
});
$("#go-home").addEventListener("click", () => {
  state.path = "/";
  state.scrollY = 0;
  refreshPreview();
});
$("#go-product").addEventListener("click", () => {
  if (!state.store?.firstProductPath) return toast("This store's product list isn't public, so click a product in the preview instead.");
  state.path = state.store.firstProductPath;
  state.scrollY = 0;
  refreshPreview();
});

// ---------- start ----------

state.config = await api("/api/config");
$("#ai-off").hidden = state.config.ai;
$("#ai-form").hidden = !state.config.ai;
// Arriving from the dashboard: ?store= checks that store, ?fix= switches a
// ready-made fix on, and ?ask= hands a request straight to the agent (on
// the page ?page= names), so the owner lands on the change, not a form.
const params = new URLSearchParams(location.search);
const fromUrl = params.get("store");
if (fromUrl) {
  $("#domain").value = fromUrl;
  if (await checkStore(fromUrl)) {
    const fix = params.get("fix");
    const ask = params.get("ask");
    if (fix && state.presets[fix]) {
      state.presets[fix].on = true;
      if ((fix === "afterpay" || fix === "sticky-cart") && state.store.firstProductPath) state.path = state.store.firstProductPath;
      if (fix === "sticky-cart") setSize("phone");
      renderChecks();
      renderChanges();
    }
    if (ask && params.get("page") === "product" && state.store.firstProductPath) state.path = state.store.firstProductPath;
    refreshPreview();
    if (ask) {
      $("#ai-request").value = ask;
      askAgent(ask);
    }
  }
}
