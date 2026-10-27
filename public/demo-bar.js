// The demo bar: a slim strip above every page with one tab per step of the
// demo (home, dashboard, preview), so the presenter can jump between them
// without typing addresses. It keeps the store being shown, from the address
// or the last store checked. Keys 1, 2 and 3 switch tabs too (not while
// typing). × hides it for the rest of the visit, for screenshots.
//
// Not part of the product: an owner would never see it.

(() => {
  try {
    if (sessionStorage.getItem("ql:demoBar") === "off") return;
  } catch {
    // Storage blocked: show the bar.
  }

  let store = new URLSearchParams(location.search).get("store") || "";
  try {
    store ||= localStorage.getItem("ql:lastStore") || "";
  } catch {
    // No remembered store; the dashboard and preview tabs ask for one.
  }
  const q = store ? `?store=${encodeURIComponent(store)}` : "";
  const here = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
  const tabs = [
    { key: "1", label: "Home page", href: "/", on: here === "/" || here === "/index" },
    { key: "2", label: "Owner’s dashboard", href: store ? `/dashboard${q}` : "/#hero-scan", on: here === "/dashboard" },
    { key: "3", label: "Preview and approve", href: `/preview${q}`, on: here === "/preview" },
  ];

  const style = document.createElement("style");
  style.textContent = `
    .ql-demo { display:flex; align-items:center; gap:6px; padding:6px 14px; background:#14122b; color:#d9d6ff;
      font:500 13px/1.2 "Funnel Sans", system-ui, sans-serif; flex-shrink:0; position:relative; z-index:50; }
    .ql-demo-label { margin-right:8px; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9c95ff; }
    .ql-demo a { display:inline-flex; align-items:center; gap:7px; padding:5px 12px; border-radius:999px; color:#d9d6ff; text-decoration:none; }
    .ql-demo a:hover { background:#25224a; }
    .ql-demo a.on { background:#3b2fc9; color:#fff; }
    .ql-demo kbd { font:600 11px/1 ui-monospace, monospace; padding:2px 5px; border-radius:4px; background:rgba(255,255,255,.12); }
    .ql-demo-store { margin-left:auto; color:#9c95ff; }
    .ql-demo-x { margin-left:10px; border:0; background:none; color:#9c95ff; font-size:16px; cursor:pointer; padding:0 4px; }
  `;
  document.head.appendChild(style);

  const bar = document.createElement("nav");
  bar.className = "ql-demo";
  bar.setAttribute("aria-label", "Demo");
  bar.innerHTML =
    `<span class="ql-demo-label">Demo</span>` +
    tabs.map((t) => `<a href="${t.href}"${t.on ? ' class="on" aria-current="page"' : ""}><kbd>${t.key}</kbd>${t.label}</a>`).join("") +
    `<span class="ql-demo-store">${store ? store.replace(/[<>&"]/g, "") : ""}</span>` +
    `<button type="button" class="ql-demo-x" aria-label="Hide the demo bar">×</button>`;
  document.body.prepend(bar);

  bar.querySelector(".ql-demo-x").addEventListener("click", () => {
    bar.remove();
    try {
      sessionStorage.setItem("ql:demoBar", "off");
    } catch {
      // Hidden for this page only.
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const tab = tabs.find((t) => t.key === e.key);
    if (tab && !tab.on) location.href = tab.href;
  });
})();
