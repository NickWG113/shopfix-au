import { test } from "node:test";
import assert from "node:assert/strict";

import { renderPreview, pageOutline } from "../lib/preview.js";
import { buildChangeBundle, PRESETS } from "../lib/fixes.js";

const PAGE = `<!doctype html><html><head>
<script src="//shop.com.au/cdn/shop/t/12/assets/global.js"></script>
<script src="https://apps.example.com/popup.js"></script>
<script>window.theme = { strings: {} };</script>
<script>(function(){ trekkie.load(); })()</script>
<script type="application/ld+json">{"@type":"Product"}</script>
</head><body><header>Header</header><div class="price">$40.00</div></body></html>`;

test("the preview keeps theme scripts and drops apps and tracking", () => {
  const html = renderPreview({ html: PAGE, domain: "shop.com.au", bundle: { css: "", js: "" } });
  assert.match(html, /<base href="https:\/\/shop\.com\.au\/">/);
  assert.match(html, /assets\/global\.js/);
  assert.match(html, /window\.theme/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /popup\.js/);
  assert.doesNotMatch(html, /trekkie/);
});

test("with scripts off, only data blocks and our own helpers remain", () => {
  const html = renderPreview({ html: PAGE, domain: "shop.com.au", bundle: { css: "", js: "" }, scripts: false });
  assert.doesNotMatch(html, /global\.js|window\.theme/);
  assert.match(html, /application\/ld\+json/);
});

test("a change can't close its own <script> or <style> tag early", () => {
  const html = renderPreview({
    html: PAGE,
    domain: "shop.com.au",
    bundle: { css: "a{}</style><b>x</b>", js: "var s='</script><img src=x>'" },
  });
  assert.doesNotMatch(html, /<\/style><b>x/);
  assert.doesNotMatch(html, /<\/script><img/);
});

test("every preset builds into one script that runs each fix on its own", () => {
  const bundle = buildChangeBundle(
    Object.keys(PRESETS).map((id) => ({ id })),
    [{ css: ".x{color:red}", js: "document.body.dataset.ok=1" }],
  );
  assert.equal((bundle.js.match(/try\{/g) || []).length, Object.keys(PRESETS).length + 1);
  assert.match(bundle.css, /\.x\{color:red\}/);
  // The bundle must at least parse as JavaScript.
  assert.doesNotThrow(() => new Function(bundle.js));
});

test("preset text is escaped into the script, not spliced in raw", () => {
  const bundle = buildChangeBundle([{ id: "shipping-bar", text: `"); alert(1); ("` }]);
  assert.doesNotThrow(() => new Function(bundle.js));
  assert.match(bundle.js, /\\"\); alert\(1\); \(\\"/);
});

test("the AI outline drops scripts and noise but keeps classes and text", () => {
  const out = pageOutline(PAGE);
  assert.match(out, /class="price"/);
  assert.match(out, /\$40\.00/);
  assert.doesNotMatch(out, /trekkie|global\.js/);
});
