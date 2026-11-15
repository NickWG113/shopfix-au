// Daily results: how the store is doing, day by day, since its changes went
// live. The figures are SAMPLE DATA, said on the page: a store making about
// A$100,000 a year (docs/proof-of-value.md), worked out the same way every
// time for the same store so the page doesn't change on reload. Connected to
// a store, the same page would read each day's visits, orders and revenue
// from its Shopify analytics.

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

const params = new URLSearchParams(location.search);
const domain = (params.get("store") || "").trim();

function link(page) {
  return `${page}?${new URLSearchParams({ store: domain })}`;
}
for (const a of document.querySelectorAll("[data-link]")) a.href = link(a.dataset.link);

// ---------- the sample ----------

const DAYS = 28; // full days shown, ending yesterday
const LIVE_AFTER = 14; // the changes went live at the start of day 14
const SAMPLE = {
  visitsPerDay: 171, // A$100k a year at A$80 an order and 2.0%
  convBefore: 0.02,
  convAfter: 0.021, // the 5% relative lift used in the proof of value
  order: 80,
};
// Weekends bring more visits (Sunday first, as getDay counts).
const WEEKDAY = [1.14, 0.94, 0.92, 0.95, 0.99, 1.01, 1.12];

// Same store, same numbers: a small seeded random number generator.
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Daily ups and downs that cancel out over each period, so the sample's
// two periods differ by the lift it was built with and not by luck.
function wobble(rand, n, size) {
  const half = Array.from({ length: Math.ceil(n / 2) }, () => (rand() - 0.5) * 2 * size);
  const all = [...half, ...half.map((v) => -v)].slice(0, n);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

function buildSample(store) {
  const rand = seeded(store);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  const convWobble = [...wobble(rand, LIVE_AFTER, 0.35), ...wobble(rand, DAYS - LIVE_AFTER, 0.35)];
  // Orders are whole numbers: carrying the fractions from day to day keeps
  // each period's total true to its rate.
  let carry = 0;
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAYS - i));
    const after = i >= LIVE_AFTER;
    if (i === LIVE_AFTER) carry = 0;
    const visits = Math.round(SAMPLE.visitsPerDay * WEEKDAY[date.getDay()] * (1 + (rand() - 0.5) * 0.24));
    const rate = (after ? SAMPLE.convAfter : SAMPLE.convBefore) * (1 + convWobble[i]);
    const exact = visits * rate + carry;
    const orders = Math.max(0, Math.round(exact));
    carry = exact - orders;
    const revenue = Math.round(orders * SAMPLE.order * (1 + (rand() - 0.5) * 0.3));
    days.push({ date, visits, orders, revenue, after });
  }
  // Today, up to now.
  const now = new Date();
  const part = Math.max(0.05, (now.getHours() * 60 + now.getMinutes()) / 1440);
  const visits = Math.round(SAMPLE.visitsPerDay * WEEKDAY[today.getDay()] * part);
  const orders = Math.round(visits * SAMPLE.convAfter);
  const todayRow = { date: today, visits, orders, revenue: Math.round(orders * SAMPLE.order), after: true };
  return { days, today: todayRow, liveDate: days[LIVE_AFTER].date };
}

// ---------- formatting ----------

const money = (n) => `A$${Math.round(n).toLocaleString("en-AU")}`;
const pct = (n, dp = 1) => `${(n * 100).toFixed(dp)}%`;
const dayName = (d) => d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
const shortDate = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
const conv = (d) => (d.visits ? d.orders / d.visits : 0);

function totals(rows) {
  const visits = rows.reduce((s, d) => s + d.visits, 0);
  const orders = rows.reduce((s, d) => s + d.orders, 0);
  const revenue = rows.reduce((s, d) => s + d.revenue, 0);
  return { visits, orders, revenue, conv: visits ? orders / visits : 0 };
}


// ---------- charts ----------
// Plain SVG, one series each, with a crosshair and a tooltip on hover.

const W = 900;
const H = 260;
const PAD = { top: 26, right: 16, bottom: 30, left: 52 };

function niceMax(v) {
  const step = 10 ** Math.floor(Math.log10(v || 1));
  return Math.ceil((v * 1.1) / step) * step;
}

function frame({ max, ticks, fmt, days, liveIndex }) {
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (iw * (i + 0.5)) / days.length;
  const y = (v) => PAD.top + ih - (v / max) * ih;
  let svg = "";
  for (let t = 0; t <= ticks; t++) {
    const v = (max * t) / ticks;
    svg += `<line class="rs-gridline" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(v)}" y2="${y(v)}"/>`;
    svg += `<text class="rs-axis" x="${PAD.left - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  }
  days.forEach((d, i) => {
    if (i % 7 === 0) svg += `<text class="rs-axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${shortDate(d.date)}</text>`;
  });
  const lx = PAD.left + (iw * liveIndex) / days.length;
  svg += `<line class="rs-live-line" x1="${lx}" x2="${lx}" y1="${PAD.top - 14}" y2="${PAD.top + ih}"/>`;
  svg += `<text class="rs-live-text" x="${lx + 6}" y="${PAD.top - 4}">Changes went live, ${shortDate(days[liveIndex].date)}</text>`;
  return { svg, x, y, iw, ih };
}

function chart(el, { days, liveIndex, value, max, ticks, fmt, marks, tip }) {
  const f = frame({ max, ticks, fmt, days, liveIndex });
  const band = f.iw / days.length;
  let svg = f.svg + marks(f, band);
  svg += `<line class="rs-cross" id="${el.id}-cross" x1="0" x2="0" y1="${PAD.top}" y2="${PAD.top + f.ih}" visibility="hidden"/>`;
  days.forEach((d, i) => {
    svg += `<rect class="rs-hit" data-i="${i}" x="${f.x(i) - band / 2}" y="${PAD.top}" width="${band}" height="${f.ih}"/>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(el.dataset.label || "")}">${svg}</svg>`;

  const cross = el.querySelector(`#${el.id}-cross`);
  const box = $("#tip");
  const show = (e) => {
    const r = e.target.closest(".rs-hit");
    if (!r) return;
    const i = Number(r.dataset.i);
    const cx = f.x(i);
    cross.setAttribute("x1", cx);
    cross.setAttribute("x2", cx);
    cross.setAttribute("visibility", "visible");
    box.innerHTML = tip(days[i], i);
    box.hidden = false;
    const rect = r.getBoundingClientRect();
    const left = Math.min(window.innerWidth - box.offsetWidth - 12, Math.max(12, rect.left + rect.width / 2 - box.offsetWidth / 2));
    box.style.left = `${left + window.scrollX}px`;
    box.style.top = `${rect.top + window.scrollY - box.offsetHeight - 8}px`;
  };
  const hide = () => {
    cross.setAttribute("visibility", "hidden");
    box.hidden = true;
  };
  el.addEventListener("pointermove", show);
  el.addEventListener("pointerleave", hide);
}

function revChart(days, liveIndex) {
  const el = $("#chart-rev");
  el.dataset.label = "Daily revenue in Australian dollars, before and after the changes went live";
  chart(el, {
    days,
    liveIndex,
    max: niceMax(Math.max(...days.map((d) => d.revenue))),
    ticks: 5,
    fmt: (v) => (v >= 1000 ? `A$${(v / 1000).toFixed(1)}k` : `A$${v}`),
    marks: (f, band) => {
      const w = Math.max(4, band - 4); // a 2px gap each side
      return days
        .map((d, i) => {
          const top = f.y(d.revenue);
          const h = Math.max(0, f.y(0) - top);
          const r = Math.min(4, h / 2, w / 2);
          // Rounded at the top, square on the baseline.
          const x0 = f.x(i) - w / 2;
          const x1 = x0 + w;
          const yb = f.y(0);
          const path = h
            ? `M${x0},${yb}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${yb}Z`
            : "";
          return path ? `<path class="rs-bar ${d.after ? "rs-bar--after" : "rs-bar--before"}" d="${path}"/>` : "";
        })
        .join("");
    },
    tip: (d) => `<b>${dayName(d.date)}</b>${money(d.revenue)} from ${d.orders} orders`,
  });
}

// ---------- the page ----------

function render(store, live) {
  document.title = `Results · ${store.name} · QuickLift`;
  $("#store-pill").textContent = store.domain;
  $("#store-pill").hidden = false;

  const { days, today, liveDate } = buildSample(store.domain);
  const before = totals(days.slice(0, LIVE_AFTER));
  const after = totals(days.slice(LIVE_AFTER));

  // The answer first, in a sentence.
  const diff = after.revenue - before.revenue;
  const rel = before.revenue ? Math.round((Math.abs(diff) / before.revenue) * 100) : 0;
  $("#summary").textContent =
    `Since your changes went live on ${dayName(liveDate)}, revenue is ${diff >= 0 ? "up" : "down"} ` +
    `${money(Math.abs(diff))} (${diff >= 0 ? "+" : "−"}${rel}%) on the two weeks before.`;
  $("#sample-note").textContent =
    `Sample figures for a store making about A$100,000 a year, not ${store.domain}’s real sales. ` +
    `A connected store’s figures would come from its Shopify analytics.`;

  $("#t-rev").textContent = money(after.revenue);
  $("#d-rev").innerHTML = `<span class="${diff >= 0 ? "rs-up" : "rs-down"}">${diff >= 0 ? "▲ +" : "▼ −"}${rel}%</span> on the two weeks before`;
  $("#t-conv").textContent = pct(after.conv, 1);
  $("#d-conv").innerHTML = `<span class="${after.conv >= before.conv ? "rs-up" : "rs-down"}">${after.conv >= before.conv ? "▲" : "▼"}</span> from ${pct(before.conv, 1)} the two weeks before`;
  $("#t-today").textContent = `${today.orders} order${today.orders === 1 ? "" : "s"}`;
  $("#d-today").textContent = `${money(today.revenue)} from ${today.visits} visits`;

  revChart(days, LIVE_AFTER);

  $("#day-rows").innerHTML = [today, ...days.slice().reverse()]
    .map(
      (d, i) => `<tr${d.date.getTime() === liveDate.getTime() ? ' class="rs-row-live"' : ""}>
        <th scope="row">${i === 0 ? "Today so far" : esc(dayName(d.date))}${d.date.getTime() === liveDate.getTime() ? ' <span class="rs-flag">Changes live</span>' : ""}</th>
        <td>${d.visits.toLocaleString("en-AU")}</td><td>${d.orders}</td><td>${pct(conv(d), 1)}</td><td>${money(d.revenue)}</td></tr>`,
    )
    .join("");

  $("#live-list").innerHTML = live.length
    ? live.map((l) => `<li><span>${esc(l)}</span><span class="db-muted">Since ${esc(shortDate(liveDate))}</span></li>`).join("")
    : `<li class="db-muted">Nothing approved yet for this store. The sample shows what this page looks like once changes are live.</li>`;

  $("#content").hidden = false;
}

async function load() {
  if (!domain) {
    location.href = "./";
    return;
  }
  try {
    const [result, config] = await Promise.all([api("api/check", { domain }), api("api/config")]);
    // What went live: what the owner approved (the online demo remembers
    // it), or else the ready-made fixes this store's check suggested.
    const live = result.liveItems?.length
      ? result.liveItems
      : result.checks.filter((c) => c.status === "fail" && c.fix && config.presets[c.fix]).map((c) => config.presets[c.fix].label);
    render(result.store, live);
  } catch (err) {
    $("#error-msg").textContent = err.message;
    $("#error").hidden = false;
  } finally {
    $("#loading").hidden = true;
  }
}

load();
