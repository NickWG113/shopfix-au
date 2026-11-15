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
  // Phone first: both versions fit side by side at a phone's width, and
  // most of these stores' shoppers are on phones.
  size: "phone",
  // On Computer only one version fits: "fix" (with the changes) or "now".
  view: "fix",
  highlight: true,
  scripts: true,
  scrollY: 0,
  // What the frame is showing right now, so a new change can be added to
  // it in place instead of reloading the page (see applyChanges).
  rendered: null,
  ideas: { path: null, list: [], made: new Map(), busy: new Set() },
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
    const { store, checks } = await api("api/check", { domain });
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
    $("#tab-dashboard").href = `dashboard?store=${encodeURIComponent(store.domain)}`;
    try {
      localStorage.setItem("ql:lastStore", store.domain);
    } catch {
      // Storage blocked: nothing depends on it.
    }
    $("#review-head").hidden = false;
    $("#review-grid").hidden = false;
    renderStore();
    renderChecks();
    renderChanges();
    $("#ai-card").hidden = false;
    fitFrames();
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
  // The first pill says where the review stands (renderChanges keeps it
  // current); the rest say what we know about the store.
  const tags = [
    `<span class="pill status" id="status-pill"></span>`,
    `<span class="pill">${esc(s.domain)}</span>`,
    s.currency ? `<span class="pill">${esc(s.currency)}</span>` : "",
    s.australian ? `<span class="pill">Australian store</span>` : `<span class="pill warn">Not obviously Australian</span>`,
    s.themeName ? `<span class="pill">Theme: ${esc(s.themeName)}</span>` : "",
    s.passwordPage ? `<span class="pill warn">Password protected</span>` : "",
  ].join("");
  $("#review-title").textContent = s.name;
  $("#review-pills").innerHTML = tags;
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
  const item = (c) => `
      <li class="check ${c.status}">
        <div class="t"><span class="s">${label[c.status]}</span> ${esc(c.title)}</div>
        <p>${esc(c.detail)}</p>
        ${c.fix ? fixControl(c.fix) : ""}
      </li>`;
  // What needs fixing stays in view; what already passes, and the fixes
  // for it, fold away so the column isn't a wall of cards.
  const open = checks.filter((c) => c.status !== "pass");
  const passed = checks.filter((c) => c.status === "pass");
  let html = open.map(item).join("") || `<li class="muted">Nothing to fix from our checks. Ask the agent for anything else.</li>`;

  // Fixes for things the store already does are still offered (a store can
  // pass a check and still want, say, a sticky cart), inside the fold.
  const suggested = new Set(state.checks.map((c) => c.fix).filter(Boolean));
  const extra = Object.keys(state.config.presets).filter((id) => !suggested.has(id));
  let more = passed.map(item).join("");
  if (extra.length && !state.store.passwordPage) {
    for (const id of extra) state.presets[id] ??= { on: false, text: state.config.presets[id].defaultText };
    more += `<li class="check"><div class="t">More fixes to try</div>${extra.map(fixControl).join("")}</li>`;
  }
  if (more) {
    // Kept open if something inside it is switched on, so it can be found.
    const anyOn = [...passed.map((c) => c.fix), ...extra].some((id) => id && state.presets[id]?.on);
    html += `<li><details class="checks-more"${anyOn ? " open" : ""}><summary>Already looking good (${passed.length}) and more fixes</summary><ul>${more}</ul></details></li>`;
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
  applyChanges();
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
  if (!request || !state.store) return false;
  let added = null;
  const btn = $("#ai-btn");
  btn.disabled = true;
  btn.textContent = "Working on it…";
  try {
    const change = await api("api/ai-change", {
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
    added = change;
    $("#ai-request").value = "";
    renderChanges();
    // The summary of what the agent did sits in the change list, further
    // down the panel; bring it into view so the owner reads it.
    $("#changes-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
    applyChanges();
    toast(change.summary);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Make this change";
  }
  return added;
}

// ---------- ideas ----------

// The agent's own suggestions for the page on screen, each one click away
// from being made. Loaded when a new page is shown, kept per page.
let ideasSeq = 0;
async function loadIdeas(fresh = false) {
  if (!state.config.ai || !state.store) return;
  const seq = ++ideasSeq;
  const path = state.path;
  state.ideas = { path, list: [], made: new Map(), busy: new Set() };
  $("#ideas-card").hidden = false;
  $("#ideas-more").hidden = true;
  $("#ideas").innerHTML = "";
  $("#ideas-note").textContent = "The agent is reading this page…";
  try {
    const { ideas } = await api("api/ideas", { domain: state.store.domain, path, fresh });
    if (seq !== ideasSeq) return;
    state.ideas.list = ideas;
    $("#ideas-note").textContent = "Picked for this page by the agent. Switch any of them on to see it on the page.";
    renderIdeas();
  } catch (err) {
    if (seq === ideasSeq) $("#ideas-note").textContent = `Couldn't get ideas: ${err.message}`;
  } finally {
    if (seq === ideasSeq) $("#ideas-more").hidden = false;
  }
}

// Each idea is a switch, like the ready-made fixes: on asks the agent to
// make it, off takes it away, and on again reuses the change the agent
// already wrote, so there's no second wait. An idea counts as on while its
// change is in the preview, so removing it from the change list switches
// it off here too.
function ideaOn(i) {
  const change = state.ideas.made.get(i);
  return Boolean(change && state.custom.includes(change));
}

function renderIdeas() {
  $("#ideas").innerHTML = state.ideas.list
    .map((idea, i) => {
      const on = ideaOn(i);
      const busy = state.ideas.busy.has(i);
      const status = busy ? "The agent is making it…" : on ? "On in the preview" : "Try this idea";
      return `
      <li>
        <label class="switch${on || busy ? " on" : ""}">
          <input type="checkbox" role="switch" data-idea="${i}" ${on || busy ? "checked" : ""} ${busy ? "disabled" : ""}>
          <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
          <span class="switch-text"><b>${esc(idea.title)}</b><span class="idea-why">${esc(idea.why)}</span><span class="switch-state">${status}</span></span>
        </label>
      </li>`;
    })
    .join("");
}

$("#ideas").addEventListener("change", async (e) => {
  const i = Number(e.target.dataset.idea);
  if (Number.isNaN(i)) return;
  if (!e.target.checked) {
    const at = state.custom.indexOf(state.ideas.made.get(i));
    if (at >= 0) state.custom.splice(at, 1);
    renderIdeas();
    renderChanges();
    refreshPreview();
    return;
  }
  const kept = state.ideas.made.get(i);
  if (kept) {
    state.custom.push(kept);
    renderIdeas();
    renderChanges();
    applyChanges();
    return;
  }
  state.ideas.busy.add(i);
  renderIdeas();
  const change = await askAgent(state.ideas.list[i].request);
  state.ideas.busy.delete(i);
  if (change) state.ideas.made.set(i, change);
  renderIdeas();
});

$("#ideas-more").addEventListener("click", () => loadIdeas(true));

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
  $("#changes").innerHTML = items.join("") || `<li class="muted">No changes yet. Switch on a fix below, or ask the agent.</li>`;
  $("#changes-card").hidden = !state.store;
  const n = items.length;
  const status = $("#status-pill");
  if (status) status.textContent = n ? `Previewing ${n} change${n === 1 ? "" : "s"}` : "Nothing changed yet";
  $("#change-count").textContent = n ? `(${n})` : "";
  $("#discard-btn").hidden = n === 0;

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
    renderIdeas();
  } else return;
  renderChanges();
  refreshPreview();
});

// Everything off in one go: the fixes, the agent's changes and its ideas.
$("#discard-btn").addEventListener("click", () => {
  for (const p of Object.values(state.presets)) p.on = false;
  state.custom = [];
  renderChecks();
  renderIdeas();
  renderChanges();
  refreshPreview();
  toast("All changes discarded. Your page is back to how it is now.");
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
    const r = await api("api/publish", { shop: state.store.shop, presets: activePresets(), custom: state.custom });
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
    const r = await api("api/undo", {});
    $("#publish-msg").textContent = `Removed from ${r.store}. The theme is back to how it was.`;
    toast("Published changes removed.");
  } catch (err) {
    toast(err.message, true);
  }
});

// ---------- preview ----------

let previewSeq = 0;
async function refreshPreview({ focus = false } = {}) {
  if (!state.store) return;
  const seq = ++previewSeq;
  // Ideas take the agent a while; start them alongside the page.
  if (state.ideas.path !== state.path) loadIdeas();
  loadNow();
  $("#loading").hidden = false;
  $("#path").textContent = state.path;
  $("#go-home").classList.toggle("on", state.path === "/");
  $("#go-product").classList.toggle("on", state.path.startsWith("/products/"));
  try {
    const { html } = await api("api/preview", {
      domain: state.store.domain,
      path: state.path,
      presets: activePresets(),
      custom: state.custom,
      highlight: state.highlight,
      scripts: state.scripts,
    });
    // A slow response for an older click mustn't overwrite a newer one.
    if (seq !== previewSeq) return;
    await swapIn(html, seq);
    state.rendered = snapshot();
    if (focus && seq === previewSeq) frame.contentWindow?.postMessage({ shopfix: "focus" }, "*");
  } catch (err) {
    if (seq === previewSeq) toast(err.message, true);
  } finally {
    if (seq === previewSeq) $("#loading").hidden = true;
  }
}

// "Now": the same page with nothing changed, beside the one with the
// changes. It only reloads when the page itself does (another page, another
// store, theme scripts on or off), never when a change is switched on, so
// it stays still while the other side changes.
const frameNow = $("#frame-now");
let nowKey = null;
async function loadNow() {
  const key = `${state.store.domain}|${state.path}|${state.scripts}`;
  if (key === nowKey) return;
  nowKey = key;
  try {
    const { html } = await api("api/preview", { domain: state.store.domain, path: state.path, original: true, scripts: state.scripts });
    if (nowKey !== key) return;
    frameNow.onload = () => frameNow.contentWindow?.postMessage({ shopfix: "scroll", y: state.scrollY }, "*");
    frameNow.srcdoc = html;
  } catch {
    // The page with the changes says what went wrong; no second message.
  }
}

function snapshot() {
  return {
    path: state.path,
    scripts: state.scripts,
    highlight: state.highlight,
    presets: Object.fromEntries(activePresets().map((p) => [p.id, p.text])),
    custom: state.custom.length,
  };
}

// Add new changes to the page already in the frame. Only additions can go
// in this way: a change that was switched off, or edited, may have altered
// the page in ways that can't be taken back, so those reload it.
async function applyChanges() {
  const was = state.rendered;
  const now = snapshot();
  const sameView = was && was.path === now.path && was.scripts === now.scripts && was.highlight === now.highlight;
  const kept = was && Object.entries(was.presets).every(([id, text]) => now.presets[id] === text);
  if (!sameView || !kept || now.custom < was.custom) return refreshPreview({ focus: true });
  const presets = activePresets().filter((p) => !(p.id in was.presets));
  const custom = state.custom.slice(was.custom);
  if (!presets.length && !custom.length) return;
  try {
    const bundle = await api("api/bundle", { presets, custom });
    frame.contentWindow?.postMessage({ shopfix: "apply", css: bundle.css, js: bundle.js }, "*");
    state.rendered = now;
  } catch (err) {
    toast(err.message, true);
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
  const fromNow = e.source === frameNow.contentWindow;
  if (e.source !== frame.contentWindow && !fromNow) return;
  if (fromNow) {
    // "Now" follows the page with the changes; a link clicked in it
    // still opens that page on both sides.
    if (m.shopfix !== "navigate" && m.shopfix !== "form") return;
  } else if (m.shopfix === "ready") {
    gotReady = true;
    return;
  }
  if (m.shopfix === "scrolled") {
    state.scrollY = m.y;
    // Keep "Now" at the same place, so the two can be compared at a glance.
    frameNow.contentWindow?.postMessage({ shopfix: "scroll", y: m.y }, "*");
  } else if (m.shopfix === "navigate") {
    if (m.host !== state.store.domain) return toast("That link leaves the store, so the preview doesn't follow it.");
    state.path = m.path;
    state.scrollY = 0;
    refreshPreview();
  } else if (m.shopfix === "form") {
    toast(/cart/.test(m.action) ? "Add to cart pressed — it's a preview, so nothing was added." : "Forms are switched off in the preview.");
  }
});

function setSize(size) {
  state.size = size;
  document.querySelectorAll("[data-size]").forEach((b) => b.classList.toggle("on", b.dataset.size === size));
  const wrap = $("#frame-wrap");
  wrap.classList.toggle("phone", size === "phone");
  wrap.classList.toggle("computer", size !== "phone");
  $("#computer-view").hidden = size === "phone";
  fitFrames();
}

// Computer view draws the page at a real desktop width and scales it to
// the box, so a store shows its desktop layout, not a squeezed one.
const DESKTOP_WIDTH = 1280;
function fitFrames() {
  const computer = state.size !== "phone";
  for (const f of [frame, frameNow]) {
    const box = f.parentElement;
    if (!computer) {
      f.style.width = f.style.height = f.style.transform = "";
      continue;
    }
    const w = box.clientWidth || $("#frame-wrap").clientWidth;
    const scale = Math.min(1, w / DESKTOP_WIDTH);
    f.style.width = `${DESKTOP_WIDTH}px`;
    f.style.height = `${(box.clientHeight || 600) / scale}px`;
    f.style.transform = `scale(${scale})`;
  }
}
new ResizeObserver(fitFrames).observe($("#frame-wrap"));

function setView(view) {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
  $("#frame-wrap").classList.toggle("show-now", view === "now");
  fitFrames();
}

document.querySelectorAll("[data-size]").forEach((b) => b.addEventListener("click", () => setSize(b.dataset.size)));
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
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

state.config = await api("api/config");
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
    await refreshPreview({ focus: Boolean(fix) });
    if (ask) {
      $("#ai-request").value = ask;
      askAgent(ask);
    }
  }
}
