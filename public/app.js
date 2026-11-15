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
    $("#store-pill").textContent = store.domain;
    $("#store-pill").hidden = false;
    $("#tab-dashboard").href = `dashboard?store=${encodeURIComponent(store.domain)}`;
    $("#to-results").href = `dashboard?store=${encodeURIComponent(store.domain)}#results`;
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
    $("#make-card").hidden = false;
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
  // The store's details are on step 1, and the change count is in Your
  // changes; only a warning that changes what the owner can do shows here.
  const tags = s.passwordPage ? `<span class="pill warn">Password protected</span>` : "";
  $("#review-title").textContent = s.name;
  $("#review-pills").innerHTML = tags;
}

const TRUE_ONLY = new Set(["shipping-bar", "trust-bar"]);

// What each fix answers, named as the problem (as on step 1).
const PROBLEM = {
  bnpl: "Fixes: no Afterpay or Zip near the price",
  shipping: "Fixes: delivery cost isn’t clear up front",
  trust: "Fixes: nothing says you’re Australian, or how returns work",
  sticky: "Fixes: Add to cart scrolls out of reach on phones",
};

// One switch per fix: what it does, and which finding it answers. Its
// wording only shows once it's on, which is when it matters.
function fixControl(id, why = "") {
  const def = state.config.presets[id];
  const p = state.presets[id];
  return `
    <li class="fix-item${p.on ? " on" : ""}">
      <label class="switch${p.on ? " on" : ""}">
        <input type="checkbox" role="switch" data-fix="${id}" ${p.on ? "checked" : ""}>
        <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
        <span class="switch-text"><b>${esc(def.label)}</b>${why ? `<span class="switch-why">${esc(why)}</span>` : ""}</span>
      </label>
      <div class="fix-edit">
        <input type="text" data-fix-text="${id}" value="${esc(p.text)}" aria-label="${esc(def.label)} wording">
        ${TRUE_ONLY.has(id) ? `<span class="note">Edit the wording so it’s true for this store.</span>` : ""}
      </div>
    </li>`;
}

const AGENT_BUILDS = new Map([
  ["reviews", "A reviews section, with star ratings"],
  ["photos", "A photo gallery from every angle"],
]);

function renderChecks() {
  const fixable = state.checks.filter((c) => c.status === "fail" && c.fix);
  // Reviews and photos have no ready-made fix, but the agent builds them
  // (a reviews section, a photo gallery): its Ideas tab has them.
  const forAgent = state.checks.filter((c) => c.status === "fail" && !c.fix && AGENT_BUILDS.has(c.id));
  const needsOwner = state.checks.filter((c) => c.status === "fail" && !c.fix && !AGENT_BUILDS.has(c.id));
  const passed = state.checks.filter((c) => c.status === "pass");
  const unsure = state.checks.filter((c) => c.status === "unknown");
  // Fixes for things the store already does well are still on offer (a
  // store can pass a check and still want, say, a sticky cart).
  const suggested = new Set(fixable.map((c) => c.fix));
  const extra = state.store.passwordPage ? [] : Object.keys(state.config.presets).filter((id) => !suggested.has(id));
  for (const id of extra) state.presets[id] ??= { on: false, text: state.config.presets[id].defaultText };

  const line = (c) => `<li><b>${esc(c.title)}</b><span>${esc(c.detail)}</span></li>`;
  const fold = (title, inner, open = false) => `<details class="fold"${open ? " open" : ""}><summary>${title}</summary>${inner}</details>`;
  let html = fixable.length
    ? `<ul class="fix-list">${fixable.map((c) => fixControl(c.fix, PROBLEM[c.id] || c.title)).join("")}</ul>`
    : `<p class="panel-lede">Nothing to fix from our checks. Try the agent, or the extra fixes below.</p>`;
  if (forAgent.length) {
    html += fold(
      `The agent builds these (${forAgent.length})`,
      `<ul class="fold-list">${forAgent.map((c) => `<li><b>${esc(AGENT_BUILDS.get(c.id))}</b><span>Open the Ideas tab, or ask the agent.</span></li>`).join("")}</ul>`,
    );
  }
  if (needsOwner.length) html += fold(`Needs you, not a fix (${needsOwner.length})`, `<ul class="fold-list">${needsOwner.map(line).join("")}</ul>`);
  if (extra.length) {
    // Kept open while one of them is on, so it can be found and switched off.
    const anyOn = extra.some((id) => state.presets[id]?.on);
    html += fold(`More fixes to try (${extra.length})`, `<ul class="fix-list">${extra.map((id) => fixControl(id)).join("")}</ul>`, anyOn);
  }
  if (passed.length || unsure.length) {
    html += fold(
      `Already looking good (${passed.length})`,
      `<ul class="fold-list">${passed.map(line).join("")}${unsure.map((c) => `<li><b>${esc(c.title)} (can’t tell)</b><span>${esc(c.detail)}</span></li>`).join("")}</ul>`,
    );
  }
  $("#checks").innerHTML = html;
  $("#fixes-n").textContent = fixable.length || "";
}

$("#checks").addEventListener("change", (e) => {
  const id = e.target.dataset.fix;
  if (!id) return;
  state.presets[id].on = e.target.checked;
  e.target.closest(".switch")?.classList.toggle("on", e.target.checked);
  e.target.closest(".fix-item")?.classList.toggle("on", e.target.checked);
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

// The agent at work, shown the way a developer works: a log of what it
// did, then the code it wrote, typed out before the change goes on the
// page. Every line says what really happened: the page it read, the
// request it worked on, the selectors in the code it sent back.
// The log goes where the request came from: under the request box, or
// above the ideas when an idea was switched on, so it's in view.
function devLog(anchor) {
  const box = $("#ai-dev");
  if (anchor && anchor.nextElementSibling !== box) anchor.after(box);
  const log = $("#ai-log");
  const code = $("#ai-code");
  box.hidden = false;
  log.innerHTML = "";
  code.hidden = true;
  code.textContent = "";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  let last = null;
  const settle = (how) => last?.classList.replace("doing", how);
  return {
    step(text, detail = "") {
      settle("done");
      last = document.createElement("li");
      last.className = "doing";
      last.innerHTML = esc(text) + (detail ? ` <code>${esc(detail)}</code>` : "");
      log.append(last);
    },
    // The reason under the step on screen, e.g. why it said no.
    why(text) {
      if (!last) return;
      const p = document.createElement("p");
      p.className = "ai-why";
      p.textContent = text;
      last.append(p);
    },
    end(ok = true) {
      settle(ok ? "done" : "stopped");
      last = null;
    },
    // About a second however long the code is, so a big change doesn't
    // hold the owner up and a small one is still readable.
    type(text) {
      code.hidden = false;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        code.textContent = text;
        return Promise.resolve();
      }
      // Paced by the clock, not by animation frames, which stop while the
      // tab is in the background and would leave the change half-typed.
      const start = performance.now();
      const ms = 1100;
      return new Promise((done) => {
        (function tick() {
          const at = Math.min(text.length, Math.ceil((text.length * (performance.now() - start)) / ms));
          code.textContent = text.slice(0, at);
          code.scrollTop = code.scrollHeight;
          if (at < text.length) setTimeout(tick, 16);
          else done();
        })();
      });
    },
  };
}

// The first few selectors the CSS targets, to name what the agent changed.
function targetsOf(css) {
  const found = new Set();
  const clean = String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/(?:^|[{}])\s*([^{}@;]+?)\s*\{/g)) {
    for (const sel of m[1].split(",")) {
      const s = sel.trim().replace(/\s+/g, " ");
      if (s && !/^(\d|from$|to$)/.test(s)) found.add(s.length > 42 ? `${s.slice(0, 40)}…` : s);
    }
  }
  return [...found].slice(0, 3);
}

const lineCount = (s) => (s?.trim() ? s.trim().split("\n").length : 0);

async function askAgent(request, anchor = $("#ai-form")) {
  if (!request || !state.store) return false;
  let added = null;
  const btn = $("#ai-btn");
  btn.disabled = true;
  btn.textContent = "Working on it…";
  const dev = devLog(anchor);
  dev.step("Reading the page", state.path);
  const writing = setTimeout(() => dev.step("Working out the change for this store’s theme"), 600);
  try {
    const change = await api("api/ai-change", {
      domain: state.store.domain,
      path: state.path,
      request,
      existing: state.custom.map((c) => c.summary),
    });
    clearTimeout(writing);
    if (!change.css && !change.js) {
      // Why the agent said no (fake reviews, made-up claims, or it couldn't
      // tell what to change) is the point, so it stays in the log.
      dev.step("Didn’t make this change");
      dev.why(change.warning || "It couldn’t find a way to do this on this page.");
      dev.end(false);
      return;
    }
    const targets = targetsOf(change.css);
    if (targets.length) dev.step("Found what to change", targets.join("   "));
    const css = lineCount(change.css);
    const js = lineCount(change.js);
    dev.step(
      `Writing ${[css && `${css} line${css === 1 ? "" : "s"} of CSS`, js && `${js} line${js === 1 ? "" : "s"} of JavaScript`].filter(Boolean).join(" and ")}`,
    );
    await dev.type([change.css && `/* CSS */\n${change.css.trim()}`, change.js && `// JavaScript\n${change.js.trim()}`].filter(Boolean).join("\n\n"));
    state.custom.push(change);
    added = change;
    $("#ai-request").value = "";
    renderChanges();
    applyChanges();
    dev.step("Done: it’s on the page, and in Your changes");
    dev.end();
    toast(change.summary);
  } catch (err) {
    clearTimeout(writing);
    dev.end(false);
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
  $("#ideas-more").hidden = true;
  $("#ideas").innerHTML = "";
  $("#ideas-n").textContent = "…";
  $("#ideas-note").textContent = "The agent is reading this page…";
  try {
    const { ideas } = await api("api/ideas", { domain: state.store.domain, path, fresh });
    if (seq !== ideasSeq) return;
    state.ideas.list = ideas;
    $("#ideas-n").textContent = ideas.length || "";
    $("#ideas-note").textContent = "The agent’s ideas for the page on screen. Switch one on to see it.";
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
      // Only says something when there's something to say.
      const status = busy ? "The agent is making it…" : on ? "On in the preview" : "";
      return `
      <li>
        <label class="switch${on || busy ? " on" : ""}">
          <input type="checkbox" role="switch" data-idea="${i}" ${on || busy ? "checked" : ""} ${busy ? "disabled" : ""}>
          <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
          <span class="switch-text"><b>${esc(idea.title)}</b><span class="idea-why">${esc(idea.why)}</span>${status ? `<span class="switch-state">${status}</span>` : ""}</span>
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
  const change = await askAgent(state.ideas.list[i].request, $("#ideas-note"));
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
  const remove = (attr, label) => `<button type="button" ${attr} aria-label="Remove: ${esc(label)}" title="Remove">×</button>`;
  const items = [
    ...presets.map((p) => {
      const label = state.config.presets[p.id].label;
      return `<li><span>${esc(label)}</span>${remove(`data-off="${p.id}"`, label)}</li>`;
    }),
    ...state.custom.map(
      (c, i) => `<li><span>${esc(c.summary)}${c.warning ? `<em>${esc(c.warning)}</em>` : ""}</span>${remove(`data-del="${i}"`, c.summary)}</li>`,
    ),
  ];
  $("#changes").innerHTML = items.join("") || `<li class="muted">Nothing yet. Ask the agent, or switch on a fix or an idea below.</li>`;
  $("#changes-card").hidden = !state.store;
  const n = items.length;
  $("#changes-n").textContent = n || "";
  const status = $("#status-pill");
  if (status) status.textContent = n ? `Previewing ${n} change${n === 1 ? "" : "s"}` : "Nothing changed yet";
  $("#change-count").textContent = n ? `(${n})` : "";
  $("#discard-btn").hidden = n === 0;

  // The approve step always shows, because it is the owner's step in the
  // flow. It can only publish to the one store this server holds a key for;
  // on any other store it says what connecting would do instead.
  const pub = state.config.publishStore;
  const canPublish = Boolean(pub && state.store?.shop === pub) || Boolean(state.config.demoPublish);
  $("#publish-box").hidden = !state.store;
  $("#publish-store").textContent = canPublish ? pub : "your store";
  // In the online demo, Undo appears once something has been "published".
  $("#undo-btn").hidden = state.config.demoPublish ? !state.demoLive : !canPublish;
  $("#publish-btn").disabled = items.length === 0;

  $("#code").textContent =
    [
      ...presets.map((p) => `/* ${state.config.presets[p.id].label} */`),
      ...state.custom.map((c) => `/* ${c.summary} */\n${c.css}\n${c.js}`),
    ].join("\n\n") || "(nothing yet)";
}

$("#changes").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const off = b.dataset.off;
  const del = b.dataset.del;
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
  // The online demo (pages/static-api.js) acts out publishing without
  // touching the real store, so it skips the "are you sure".
  const demo = Boolean(state.config.demoPublish);
  if (!demo && !(pub && state.store?.shop === pub)) {
    $("#publish-msg").textContent =
      "Publishing needs this store connected to QuickLift. Once it is, these changes go into its theme in one snippet, and undo takes them off.";
    return;
  }
  if (!demo && !confirm(`Publish these changes to the live theme on ${state.config.publishStore}? Shoppers will see them straight away.`)) return;
  const btn = $("#publish-btn");
  btn.disabled = true;
  try {
    const r = await api("api/publish", { shop: state.store.shop, domain: state.store.domain, presets: activePresets(), custom: state.custom });
    $("#publish-msg").textContent = r.note || `Live on ${r.store} (theme "${r.theme}") at ${new Date().toLocaleTimeString("en-AU")}.`;
    $("#publish-msg").classList.add("live");
    $("#to-results").hidden = false;
    state.demoLive = demo;
    $("#undo-btn").hidden = false;
    toast(demo ? "Approved and published." : "Published. Reload the real store to see it.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

$("#undo-btn").addEventListener("click", async () => {
  try {
    const r = await api("api/undo", { domain: state.store?.domain });
    $("#publish-msg").textContent = r.note || `Removed from ${r.store}. The theme is back to how it was.`;
    $("#publish-msg").classList.remove("live");
    $("#to-results").hidden = true;
    if (state.config.demoPublish) {
      state.demoLive = false;
      $("#undo-btn").hidden = true;
    }
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
// it stays still while the other side changes. Each side scrolls on its own.
const frameNow = $("#frame-now");
let nowKey = null;
async function loadNow() {
  const key = `${state.store.domain}|${state.path}|${state.scripts}`;
  if (key === nowKey) return;
  nowKey = key;
  try {
    const { html } = await api("api/preview", { domain: state.store.domain, path: state.path, original: true, scripts: state.scripts });
    if (nowKey !== key) return;
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
    // Remembered so the page with the changes keeps its place when it
    // reloads. "Now" scrolls on its own: following along felt odd (Nick,
    // 15 Nov).
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

// ---------- tabs: one way of making a change open at a time ----------

const TABS = ["ask", "fixes", "ideas"];
function setTab(name) {
  for (const t of TABS) {
    const on = t === name;
    $(`#tab-${t}`).setAttribute("aria-selected", String(on));
    $(`#tab-${t}`).tabIndex = on ? 0 : -1;
    $(`#panel-${t}`).hidden = !on;
  }
  // A finished log belongs to the tab it came from; one still working stays.
  if (!$("#ai-btn").disabled) $("#ai-dev").hidden = true;
}
$(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (b) setTab(b.dataset.tab);
});
// Arrow keys move between tabs, as tabs do.
$(".tabs").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const at = TABS.indexOf(document.activeElement?.dataset.tab);
  if (at < 0) return;
  const next = TABS[(at + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
  setTab(next);
  $(`#tab-${next}`).focus();
});

// A suggestion chip sends its request straight to the agent.
$("#ai-chips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ask]");
  if (!b || $("#ai-btn").disabled) return;
  $("#ai-request").value = b.dataset.ask;
  askAgent(b.dataset.ask);
});

$("#ai-dev-x").addEventListener("click", () => ($("#ai-dev").hidden = true));

// ---------- start ----------

state.config = await api("api/config");
$("#ai-off").hidden = state.config.ai;
$("#ai-form").hidden = !state.config.ai;
$("#ai-chips").hidden = !state.config.ai;
setTab("ask");
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
      // Arrived to try a fix: open the tab it's in.
      setTab("fixes");
    }
    if (ask && params.get("page") === "product" && state.store.firstProductPath) state.path = state.store.firstProductPath;
    await refreshPreview({ focus: Boolean(fix) });
    if (ask) {
      $("#ai-request").value = ask;
      askAgent(ask);
    }
  }
}
