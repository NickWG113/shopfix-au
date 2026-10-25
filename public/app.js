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

$("#check-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#check-btn");
  btn.disabled = true;
  btn.textContent = "Checking…";
  try {
    const { store, checks } = await api("/api/check", { domain: $("#domain").value });
    state.store = store;
    state.checks = checks;
    state.path = "/";
    state.custom = [];
    state.presets = {};
    // Suggested fixes start switched off: the owner chooses, and the
    // before/after is more convincing when they flip them on themselves.
    for (const c of checks) if (c.fix) state.presets[c.fix] = { on: false, text: state.config.presets[c.fix].defaultText };
    $("#domain").value = store.domain;
    $("#intro").hidden = true;
    renderStore();
    renderChecks();
    renderChanges();
    $("#ai-card").hidden = false;
    refreshPreview();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Check store";
  }
});

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
      <label><input type="checkbox" data-fix="${id}" ${p.on ? "checked" : ""}> ${esc(def.label)}</label>
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

$("#ai-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const request = $("#ai-request").value.trim();
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
    setMode("after");
    refreshPreview();
    toast(change.summary);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Apply to preview";
  }
});

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

  const pub = state.config.publishStore;
  $("#publish-box").hidden = !(pub && state.store?.shop === pub);
  $("#publish-store").textContent = pub || "";
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

// Load the new version in a hidden frame behind the current one and swap
// when it has drawn, so flipping a fix looks like the page changing in
// place rather than going blank and reloading.
let activeFrame = $("#frame");
function swapIn(html, seq) {
  return new Promise((resolve) => {
    const next = activeFrame.cloneNode(false);
    next.removeAttribute("id");
    next.classList.add("loading-frame");
    next.hidden = false;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      if (seq !== previewSeq) {
        next.remove();
        return resolve();
      }
      next.classList.remove("loading-frame");
      if (activeFrame.isConnected && activeFrame !== next) activeFrame.remove();
      activeFrame = next;
      $("#empty").hidden = true;
      resolve();
    };
    next.onload = () => {
      next.contentWindow.postMessage({ shopfix: "scroll", y: state.scrollY }, "*");
      // A beat for the theme's scripts to lay the page out after load.
      setTimeout(show, 250);
    };
    // Some theme never fires load (a hung asset); don't wait forever.
    setTimeout(show, 8000);
    next.srcdoc = html;
    $("#frame-wrap").appendChild(next);
  });
}

window.addEventListener("message", (e) => {
  if (e.source !== activeFrame.contentWindow) return;
  const m = e.data || {};
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
const fromUrl = new URLSearchParams(location.search).get("store");
if (fromUrl) {
  $("#domain").value = fromUrl;
  $("#check-form").requestSubmit();
}
