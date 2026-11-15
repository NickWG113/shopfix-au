import { test } from "node:test";
import assert from "node:assert/strict";

import { authConfigured, credentialsMatch, makeToken, tokenValid, safeNext } from "../lib/auth.js";

const ENV = { DEMO_USERNAME: "judge", DEMO_PASSWORD: "lift-2026", SESSION_SECRET: "test-secret" };

test("sign-in is on only when both username and password are set", () => {
  assert.equal(authConfigured({}), false);
  assert.equal(authConfigured({ DEMO_USERNAME: "judge" }), false);
  assert.equal(authConfigured(ENV), true);
});

test("the username ignores case and spaces; the password doesn't", () => {
  assert.equal(credentialsMatch(" Judge ", "lift-2026", ENV), true);
  assert.equal(credentialsMatch("judge", "LIFT-2026", ENV), false);
  assert.equal(credentialsMatch("judge", "", ENV), false);
  assert.equal(credentialsMatch(undefined, undefined, ENV), false);
});

test("a session token works until it expires and can't be forged", () => {
  const now = 1_000_000;
  const token = makeToken(now + 60_000, ENV);
  assert.equal(tokenValid(token, now, ENV), true);
  assert.equal(tokenValid(token, now + 60_001, ENV), false);
  // Pushing the expiry out breaks the signature.
  const [, sig] = token.split(".");
  assert.equal(tokenValid(`${now + 999_999_999}.${sig}`, now, ENV), false);
  // Signed with another secret: refused.
  assert.equal(tokenValid(token, now, { ...ENV, SESSION_SECRET: "other" }), false);
  assert.equal(tokenValid("", now, ENV), false);
  assert.equal(tokenValid(null, now, ENV), false);
});

test("after sign-in we only ever go to a page on this site", () => {
  assert.equal(safeNext("/dashboard?store=toyworld.com.au"), "/dashboard?store=toyworld.com.au");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext("/\\evil.example"), "/");
  assert.equal(safeNext(undefined), "/");
});
