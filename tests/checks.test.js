import { test } from "node:test";
import assert from "node:assert/strict";

import { runChecks } from "../lib/checks.js";
import { normaliseDomain, normalisePath, readShopifyGlobals } from "../lib/store.js";

const store = (over = {}) => ({
  domain: "example.com.au",
  currency: "AUD",
  passwordPage: false,
  products: [
    { title: "Mug", images: 4 },
    { title: "Tee", images: 5 },
  ],
  ...over,
});
const byId = (checks) => Object.fromEntries(checks.map((c) => [c.id, c]));

test("a bare store fails the AU checks and offers the matching fixes", () => {
  const c = byId(runChecks(store(), { home: "<html><body><h1>Shop</h1></body></html>", product: "<h1>Mug</h1>" }));
  assert.equal(c.aud.status, "pass");
  assert.equal(c.bnpl.status, "fail");
  assert.equal(c.bnpl.fix, "afterpay");
  assert.equal(c.shipping.fix, "shipping-bar");
  assert.equal(c.trust.fix, "trust-bar");
  assert.equal(c.sticky.fix, "sticky-cart");
});

test("reviews never get an automatic fix: they have to be real", () => {
  const c = byId(runChecks(store(), { home: "<body></body>", product: null }));
  assert.equal(c.reviews.status, "fail");
  assert.equal(c.reviews.fix, null);
});

test("signals a shopper can see make checks pass", () => {
  const home = `<body><p>Free shipping over $80</p><p>Pay with Afterpay</p>
    <p>Australian owned and made in Melbourne</p><a href="/policies/refund-policy">Returns</a>
    <div class="jdgm-widget">4.8 out of 5</div></body>`;
  const c = byId(runChecks(store(), { home, product: null }));
  for (const id of ["bnpl", "shipping", "trust", "reviews", "photos"]) assert.equal(c[id].status, "pass", id);
});

test("a word inside a script doesn't count as something the shopper sees", () => {
  const home = `<body><script>var x = "free shipping"; // returns</script></body>`;
  const c = byId(runChecks(store(), { home, product: null }));
  assert.equal(c.shipping.status, "fail");
});

test("a password page is reported as such, not as a page full of problems", () => {
  const checks = runChecks(store({ passwordPage: true }), { home: "<body>Enter password</body>", product: null });
  assert.equal(checks.length, 1);
  assert.equal(checks[0].status, "unknown");
});

test("a hidden product feed means 'can't tell' about photos, not a fail", () => {
  const c = byId(runChecks(store({ products: [] }), { home: "<body></body>", product: null }));
  assert.equal(c.photos.status, "unknown");
});

test("non-AUD pricing fails the currency check", () => {
  const c = byId(runChecks(store({ currency: "USD" }), { home: "<body></body>", product: null }));
  assert.equal(c.aud.status, "fail");
});

test("store addresses are cleaned up, and private addresses refused", () => {
  assert.equal(normaliseDomain("HTTPS://Www.Example.com.au/collections/all"), "www.example.com.au");
  assert.equal(normaliseDomain("example.com.au"), "example.com.au");
  for (const bad of ["localhost", "http://127.0.0.1:3010", "printer.local", "", "nodot"]) {
    assert.throws(() => normaliseDomain(bad), undefined, bad);
  }
});

test("preview paths stay on the store", () => {
  assert.equal(normalisePath("products/x"), "/products/x");
  assert.equal(normalisePath("//evil.com/x"), "/");
});

test("Shopify's head globals are read", () => {
  const g = readShopifyGlobals(
    `Shopify.shop = "x.myshopify.com"; Shopify.currency = {"active":"AUD","rate":"1.0"}; Shopify.country = "AU"; Shopify.theme = {"name":"Dawn","id":1};`,
  );
  assert.deepEqual(g, { shop: "x.myshopify.com", currency: "AUD", country: "AU", themeName: "Dawn" });
});
