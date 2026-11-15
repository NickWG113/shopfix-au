// The tab bar across the top of every page, for moving around the demo:
// Home, then the two steps (Dashboard, Preview and approve).
// It keeps the store being shown, from the address or the last store
// checked. Keys 1 to 3 switch tabs too (not while typing). × hides it for
// the rest of the visit, for recording; the keys still work.
//
// For presenting, not part of the product: an owner would move through the
// steps with the step bar on each page.

(() => {
  let store = new URLSearchParams(location.search).get("store") || "";
  try {
    store ||= localStorage.getItem("ql:lastStore") || "";
  } catch {
    // Storage blocked: falls through to the demo store below.
  }
  // On a computer that has never checked a store (anyone opening the shared
  // link), the store the presentation uses.
  store ||= "toyworld.com.au";
  const q = `?store=${encodeURIComponent(store)}`;
  // Only the last part of the address, and relative links, so the same
  // pages work at the site root (our server) and under a folder (the online
  // demo on GitHub Pages, /shopfix-au/).
  const here = "/" + (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  const tabs = [
    { key: "1", label: "Home", href: "./", on: here === "/" || here === "/index" },
    { key: "2", label: "Dashboard", href: `dashboard${q}`, on: here === "/dashboard" },
    { key: "3", label: "Preview and approve", href: `preview${q}`, on: here === "/preview" },
  ];

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const tab = tabs.find((t) => t.key === e.key);
    if (tab && !tab.on) location.href = tab.href;
  });

  try {
    if (sessionStorage.getItem("ql:demoBar") === "off") return;
  } catch {
    // Storage blocked: show the bar.
  }

  const style = document.createElement("style");
  style.textContent = `
    .ql-demo { display:flex; align-items:center; gap:4px; padding:6px 14px; background:#14122b; color:#d9d6ff;
      font:500 13px/1.2 "Funnel Sans", system-ui, sans-serif; position:relative; z-index:50; overflow-x:auto; }
    .ql-demo-label { margin-right:8px; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9c95ff; }
    .ql-demo a { display:inline-flex; align-items:center; gap:7px; padding:5px 12px; border-radius:999px; color:#d9d6ff; text-decoration:none; white-space:nowrap; }
    .ql-demo a:hover { background:#25224a; color:#fff; }
    .ql-demo a.on { background:#3b2fc9; color:#fff; }
    .ql-demo kbd { font:600 11px/1 ui-monospace, monospace; padding:2px 5px; border-radius:4px; background:rgba(255,255,255,.12); }
    .ql-demo-store { margin-left:auto; padding-left:12px; color:#9c95ff; white-space:nowrap; }
    .ql-demo-x { margin-left:8px; border:0; background:none; color:#9c95ff; font-size:16px; cursor:pointer; padding:0 4px; }
    .ql-demo-x:hover { color:#fff; }
  `;
  document.head.appendChild(style);

  const bar = document.createElement("nav");
  bar.className = "ql-demo";
  bar.setAttribute("aria-label", "Demo pages");
  bar.innerHTML =
    `<span class="ql-demo-label">Demo</span>` +
    tabs.map((t) => `<a href="${t.href}"${t.on ? ' class="on" aria-current="page"' : ""}><kbd>${t.key}</kbd>${t.label}</a>`).join("") +
    `<span class="ql-demo-store">${store.replace(/[<>&"]/g, "")}</span>` +
    `<button type="button" class="ql-demo-x" aria-label="Hide the tab bar">×</button>`;
  document.body.prepend(bar);

  bar.querySelector(".ql-demo-x").addEventListener("click", () => {
    bar.remove();
    try {
      sessionStorage.setItem("ql:demoBar", "off");
    } catch {
      // Hidden for this page only.
    }
  });
})();
