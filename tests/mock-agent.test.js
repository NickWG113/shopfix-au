import { test } from "node:test";
import assert from "node:assert/strict";

import { mockChange, mockIdeas } from "../pages/mock-agent.js";
import { EXTRA_REQUESTS } from "../public/recording-keys.js";

const PRODUCT = "/products/tote";

test("restyles the Add to cart button and marks it as changed", () => {
  const c = mockChange("Make the Add to cart button bigger and bright green", PRODUCT);
  assert.match(c.css, /product-form__submit/);
  assert.match(c.css, /#16a34a/);
  assert.match(c.css, /font-size/);
  assert.match(c.js, /data-shopfix-ai/);
  assert.match(c.summary, /Add to cart button is now bright green and bigger/);
});

test("adds the owner's line of text under the button, once", () => {
  const c = mockChange("Make the Add to cart button bright green, and add a small line under it saying Ships from Sydney in 1–2 business days", PRODUCT);
  assert.match(c.js, /Ships from Sydney in 1–2 business days/);
  assert.match(c.js, /if\(!document\.querySelector\('\[data-shopfix-ai="line"\]'\)\)/);
  assert.match(c.css, /#16a34a/);
});

test("a [placeholder] gets a warning to fill it in", () => {
  const c = mockChange("Add a small line under the price saying: Ships from [your city] in 1–2 business days", PRODUCT);
  assert.match(c.js, /\.price/);
  assert.match(c.warning, /\[brackets\]/);
});

test("on phones only when asked", () => {
  const c = mockChange("Make the product title larger and bolder on phones", PRODUCT);
  assert.match(c.css, /^@media \(max-width:749px\)/);
  assert.match(c.css, /product__title/);
});

test("refuses to invent reviews, timers or discounts", () => {
  for (const r of ["Add five 5-star customer reviews under the price", "Show a countdown timer above the button", "Add 20% off to the banner"]) {
    const c = mockChange(r, PRODUCT);
    assert.equal(c.css, "", r);
    assert.equal(c.js, "", r);
    assert.match(c.warning, /can't add/, r);
  }
});

test("says what to try when it can't tell what was meant", () => {
  const c = mockChange("make it better", PRODUCT);
  assert.equal(c.css + c.js, "");
  assert.match(c.warning, /for example/);
});

test("every mocked idea and every suggested request makes a change", () => {
  for (const pagePath of ["/", PRODUCT]) {
    for (const idea of mockIdeas(pagePath)) {
      const c = mockChange(idea.request, pagePath);
      assert.ok(c.css || c.js, `${pagePath}: ${idea.request}`);
    }
  }
  for (const r of EXTRA_REQUESTS.slice(0, 4)) {
    const c = mockChange(r, PRODUCT);
    assert.ok(c.css || c.js, r);
  }
});
