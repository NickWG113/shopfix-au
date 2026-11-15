// Keys for presenting: 1 home, 2 what to fix, 3 preview and approve,
// 4 results, keeping the store being shown (from the address, or the last
// store checked). Not while typing.
//
// There used to be a dark "Demo" bar here with the same four tabs. The
// pages' own step bar now does that job, so the bar is gone and only the
// keys are left. Not part of the product: an owner would never use them.

(() => {
  let store = new URLSearchParams(location.search).get("store") || "";
  try {
    store ||= localStorage.getItem("ql:lastStore") || "";
  } catch {
    // Storage blocked: falls through to the demo store below.
  }
  // On a computer that has never checked a store, the store the
  // presentation uses.
  store ||= "frankbody.com";
  const q = `?store=${encodeURIComponent(store)}`;
  // Relative links, so the same pages work at the site root (our server)
  // and under a folder (the online demo on GitHub Pages, /shopfix-au/).
  const here = "/" + (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  const pages = {
    1: { href: "./", on: here === "/" || here === "/index" },
    2: { href: `dashboard${q}`, on: here === "/dashboard" },
    3: { href: `preview${q}`, on: here === "/preview" },
    4: { href: `results${q}`, on: here === "/results" },
  };

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const page = pages[e.key];
    if (page && !page.on) location.href = page.href;
  });
})();
