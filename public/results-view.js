// How the store is doing, day by day, since its changes went live: the top
// of the dashboard (dashboard.js calls renderResults). The figures are
// SAMPLE DATA, said on the page: a store making about A$100,000 a year
// (docs/proof-of-value.md), worked out the same way every time for the same
// store so the page doesn't change on reload. Connected to a store, it would
// read each day's visits, orders and revenue from its Shopify analytics.

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---------- the sample ----------

const DAYS = 28; // full days shown, ending yesterday
const LIVE_AFTER = 14; // the changes went live at the start of day 14
const SAMPLE = {
  visitsPerDay: 171, // A$100k a year at A$80 an order and 2.0%
  convBefore: 0.02, // the changes in SAMPLE_HISTORY lift it from there
  order: 80,
};
// Weekends bring more visits (Sunday first, as getDay counts).
// Kept gentle so the changes in the history stand out in the daily bars.
const WEEKDAY = [1.05, 0.97, 0.96, 0.97, 0.99, 1.01, 1.05];

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

// How much the changes in the history lift (or cut) the share of visits that
// buy on day i: each one from the day it went live, until it was undone.
// The chart then shows the history: the dip while the loser was live, the
// step up with each winner, nothing for the neutral one.
function liftOn(i) {
  let m = 1;
  for (const h of SAMPLE_HISTORY) {
    const from = LIVE_AFTER + h.day;
    const to = h.liveDays ? from + h.liveDays : Infinity;
    if (i >= from && i < to) m *= 1 + h.lift;
  }
  return m;
}

function buildSample(store) {
  const rand = seeded(store);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  // Small daily noise that cancels out within each two weeks, so what the
  // chart shows is the changes, and the weekly rhythm of a real store
  // (busier weekends), not luck.
  // It cancels out within each stretch between changes, so the average day
  // in each stretch is what that change did, and nothing else.
  const cuts = new Set([0, LIVE_AFTER, DAYS]);
  for (const h of SAMPLE_HISTORY) {
    cuts.add(LIVE_AFTER + h.day);
    if (h.liveDays) cuts.add(LIVE_AFTER + h.day + h.liveDays);
  }
  const edges = [...cuts].filter((i) => i >= 0 && i <= DAYS).sort((a, b) => a - b);
  const both = (size) => edges.slice(1).flatMap((to, k) => wobble(rand, to - edges[k], size));
  const convWobble = both(0.03);
  const visitWobble = both(0.02);
  const orderWobble = both(0.02);
  // Orders are whole numbers: carrying the fractions from day to day keeps
  // each period's total true to its rate. Revenue follows the expected
  // orders, so a day with one order more or less doesn't jump.
  let carry = 0;
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAYS - i));
    const after = i >= LIVE_AFTER;
    if (i === LIVE_AFTER) carry = 0;
    const visits = Math.round(SAMPLE.visitsPerDay * WEEKDAY[date.getDay()] * (1 + visitWobble[i]));
    const expected = visits * SAMPLE.convBefore * liftOn(i) * (1 + convWobble[i]);
    const exact = expected + carry;
    const orders = Math.max(0, Math.round(exact));
    carry = exact - orders;
    const revenue = Math.round(expected * SAMPLE.order * (1 + orderWobble[i]));
    days.push({ date, visits, orders, revenue, after });
  }
  // Today, up to now.
  const now = new Date();
  const part = Math.max(0.05, (now.getHours() * 60 + now.getMinutes()) / 1440);
  const visits = Math.round(SAMPLE.visitsPerDay * WEEKDAY[today.getDay()] * part);
  const orders = Math.round(visits * SAMPLE.convBefore * liftOn(DAYS));
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
const H = 290;
// Room at the bottom for the change markers, between the bars and the dates.
const PAD = { top: 26, right: 16, bottom: 58, left: 52 };

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

// ---------- change history (sample) ----------
// What changed on the store and when, so a dip or a rise on the chart can
// be read against it. Past entries are SAMPLE, like the figures: days are
// counted from the sample's go-live day. What the owner really approved in
// this browser goes on top, dated today.
//
// Each has a verdict from the week after it went live, against the week
// before: a winner (revenue up), neutral (no clear change) or a loser
// (revenue down; that's the one that was undone). A change made today is
// "too early to tell": one day of a small store's sales proves nothing.
// lift is what each change does to the share of visits that buy, and the
// sample's figures are built from it (liftOn), so the chart and the
// verdicts tell the same story.
const SAMPLE_HISTORY = [
  { day: -7, liveDays: 2, lift: -0.25, title: "Rounder Add to cart button", source: "Asked the agent", status: "undone", verdict: "loser", effect: "Sales down about 25% while it was live. Undone two days later." },
  { day: 0, lift: 0.1, title: "Bigger, brighter Add to cart", source: "Asked the agent", status: "live", verdict: "winner", effect: "Sales up about 10% from the day it went live." },
  { day: 3, lift: 0, title: "Product names easier to scan on the home page", source: "Agent’s idea", status: "live", verdict: "neutral", effect: "No clear change after it went live." },
  { day: 7, lift: 0.06, title: "Bolder product title on phones", source: "Asked the agent", status: "live", verdict: "winner", effect: "Sales up about 6% more from the day it went live." },
];

const VERDICT = { winner: "Winner", neutral: "Neutral", loser: "Loser", early: "Too early to tell" };

function historyFor(days, live) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const past = SAMPLE_HISTORY.map((h) => ({ ...h, i: LIVE_AFTER + h.day, date: days[LIVE_AFTER + h.day].date, sample: true }));
  const yours = live.map((title) => ({
    title,
    source: "You approved it",
    status: "live",
    verdict: "early",
    effect: "Give it a week before judging it.",
    date: today,
    i: null,
    sample: false,
  }));
  // Numbered oldest first, as they're marked on the chart.
  past.forEach((h, n) => (h.n = n + 1));
  return { past, yours };
}

function revChart(days, liveIndex, events = []) {
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
        .join("") +
        // Each change in the history, numbered, on the day it happened.
        // Two on the same day sit side by side.
        events
          .map((ev) => {
            const same = events.filter((o) => o.i === ev.i);
            const k = same.indexOf(ev);
            const cx = f.x(ev.i) + (k - (same.length - 1) / 2) * 22;
            const cy = f.y(0) + 17;
            return `<g class="rs-ev rs-ev--${ev.verdict}"><circle cx="${cx}" cy="${cy}" r="10"/><text x="${cx}" y="${cy + 4}" text-anchor="middle">${ev.n}</text></g>`;
          })
          .join("");
    },
    tip: (d, i) => {
      const here = events.filter((ev) => ev.i === i);
      return `<b>${dayName(d.date)}</b>${money(d.revenue)} from ${d.orders} orders` + here.map((ev) => `<br>${ev.n}. ${esc(ev.title)}: ${VERDICT[ev.verdict].toLowerCase()}`).join("");
    },
  });
}

// ---------- the results ----------

/** Fills the results section. live: what the owner has approved (the online demo remembers it). */
export function renderResults(store, live) {
  const { days, today, liveDate } = buildSample(store.domain);
  const before = totals(days.slice(0, LIVE_AFTER));
  const after = totals(days.slice(LIVE_AFTER));

  // The answer first, in a sentence.
  const diff = after.revenue - before.revenue;
  const rel = before.revenue ? Math.round((Math.abs(diff) / before.revenue) * 100) : 0;
  const change = `${diff >= 0 ? "up" : "down"} ${money(Math.abs(diff))} (${diff >= 0 ? "+" : "−"}${rel}%)`;
  // Before anything is approved there are no "your changes" to speak of,
  // so it says plainly what the figures are.
  $("#results-summary").textContent = live.length
    ? `Since your changes went live on ${dayName(liveDate)}, revenue is ${change} on the two weeks before.`
    : `Nothing is live yet, so this is a sample: two weeks after its changes went live, revenue was ${change}.`;
  $("#sample-note").textContent =
    `Sample figures for a store making about A$100,000 a year, not ${store.domain}’s real sales. ` +
    `A connected store’s figures would come from its Shopify analytics.`;

  $("#t-rev").textContent = money(after.revenue);
  $("#d-rev").innerHTML = `<span class="${diff >= 0 ? "rs-up" : "rs-down"}">${diff >= 0 ? "▲ +" : "▼ −"}${rel}%</span> on the two weeks before`;
  $("#t-conv").textContent = pct(after.conv, 1);
  $("#d-conv").innerHTML = `<span class="${after.conv >= before.conv ? "rs-up" : "rs-down"}">${after.conv >= before.conv ? "▲" : "▼"}</span> from ${pct(before.conv, 1)} the two weeks before`;
  $("#t-today").textContent = `${today.orders} order${today.orders === 1 ? "" : "s"}`;
  $("#d-today").textContent = `${money(today.revenue)} from ${today.visits} visits`;

  const history = historyFor(days, live);
  revChart(days, LIVE_AFTER, history.past);

  $("#day-rows").innerHTML = [today, ...days.slice().reverse()]
    .map(
      (d, i) => `<tr${d.date.getTime() === liveDate.getTime() ? ' class="rs-row-live"' : ""}>
        <th scope="row">${i === 0 ? "Today so far" : esc(dayName(d.date))}${d.date.getTime() === liveDate.getTime() ? ' <span class="rs-flag">Changes live</span>' : ""}</th>
        <td>${d.visits.toLocaleString("en-AU")}</td><td>${d.orders}</td><td>${pct(conv(d), 1)}</td><td>${money(d.revenue)}</td></tr>`,
    )
    .join("");

  // Newest first: what the owner approved today, then the sample's past.
  // One line each (number, change, verdict); click it for when, where it
  // came from and what it did.
  const row = (h) => `
    <li class="rs-hist-item rs-hist-item--${h.status} rs-hist-item--${h.verdict}">
      <details>
        <summary>
          <span class="rs-hist-n">${h.n ?? "✓"}</span>
          <span class="rs-hist-title">${esc(h.title)}</span>
          <span class="rs-verdict rs-verdict--${h.verdict}">${VERDICT[h.verdict]}</span>
          <span class="rs-hist-chev" aria-hidden="true"></span>
        </summary>
        <div class="rs-hist-more">
          <div class="rs-hist-meta">${h.sample ? esc(shortDate(h.date)) : "Today"} · ${esc(h.source)} · ${h.status === "live" ? "Live" : "Undone"}</div>
          <div class="rs-hist-effect">${esc(h.effect)}</div>
        </div>
      </details>
    </li>`;
  $("#history").innerHTML = [...history.yours, ...history.past.slice().reverse()].map(row).join("");
}
