import crypto from "node:crypto";

// A single shared username and password in front of the whole app, for the
// hosted demo. Two reasons it exists: the judges need a login they can use
// without anyone setting them up, and every "Describe a change" and every
// list of ideas is a paid Claude call, so a public link with no gate is an
// open tab on our API key.
//
// It is on only when DEMO_USERNAME and DEMO_PASSWORD are both set. Locally
// (no variables) the app behaves exactly as before, so `npm start` still just
// works for anyone who clones the repo.
//
// Why not accounts: QuickLift has no per-person data to protect. Everyone who
// signs in sees the same demo, so one shared login is the honest size of it.

const COOKIE = "ql_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

// Paths a signed-out visitor may reach: the sign-in page and what it needs to
// draw itself. Everything else, the home page included, waits for sign-in.
const OPEN_PATHS = new Set(["/login", "/logout", "/shell.css", "/healthz"]);

export function authConfigured(env = process.env) {
  return Boolean(env.DEMO_USERNAME && env.DEMO_PASSWORD);
}

// Signed with SESSION_SECRET when there is one. Without it a random key is
// made at start-up, which works but signs everyone out on each restart, so
// the hosted app should set one.
let fallbackSecret;
function secret(env = process.env) {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  fallbackSecret ??= crypto.randomBytes(32).toString("hex");
  return fallbackSecret;
}

function sign(value, env) {
  return crypto.createHmac("sha256", secret(env)).update(value).digest("base64url");
}

/** A cookie value that proves sign-in until `expires` (ms since epoch). */
export function makeToken(expires, env = process.env) {
  const body = String(expires);
  return `${body}.${sign(body, env)}`;
}

/** True when the token was made by us and hasn't expired. */
export function tokenValid(token, now = Date.now(), env = process.env) {
  if (typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const body = token.slice(0, dot);
  if (!sameText(token.slice(dot + 1), sign(body, env))) return false;
  const expires = Number(body);
  return Number.isFinite(expires) && expires > now;
}

// Constant-time, so a wrong guess takes as long as a right one. Hashing first
// gives both sides the same length, which timingSafeEqual requires.
function sameText(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function credentialsMatch(username, password, env = process.env) {
  // Both compared every time (no short-circuit), so timing doesn't reveal
  // which of the two was wrong.
  const userOk = sameText(String(username ?? "").trim().toLowerCase(), env.DEMO_USERNAME.trim().toLowerCase());
  const passOk = sameText(String(password ?? ""), env.DEMO_PASSWORD);
  return userOk && passOk;
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function cookieHeader(value, maxAgeSeconds, secure) {
  return [
    `${COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

/**
 * Only a path on this site, so a crafted ?next= can't send someone who just
 * signed in off to another site.
 */
export function safeNext(next) {
  const s = String(next || "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
}

// Wrong guesses per address: ten every fifteen minutes. Kept in memory, which
// is enough for one small machine; a restart forgets them, which is fine.
const ATTEMPTS = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;

function tooManyFails(ip, now = Date.now()) {
  const entry = ATTEMPTS.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) return false;
  return entry.fails >= MAX_FAILS;
}

function noteFail(ip, now = Date.now()) {
  const entry = ATTEMPTS.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) ATTEMPTS.set(ip, { start: now, fails: 1 });
  else entry.fails += 1;
  if (ATTEMPTS.size > 10_000) ATTEMPTS.clear();
}

/** Adds /login, /logout and the gate in front of everything else. */
export function installAuth(app, { loginPage }) {
  if (!authConfigured()) return;

  const secureCookies = process.env.NODE_ENV === "production";

  app.get("/login", (req, res) => {
    if (tokenValid(readCookie(req, COOKIE))) return res.redirect(safeNext(req.query.next));
    res.sendFile(loginPage);
  });

  app.post("/login", (req, res) => {
    const next = safeNext(req.body?.next);
    const back = (code) => res.redirect(`/login?error=${code}&next=${encodeURIComponent(next)}`);
    const ip = req.ip || "unknown";
    if (tooManyFails(ip)) return back("wait");
    if (!credentialsMatch(req.body?.username, req.body?.password)) {
      noteFail(ip);
      return back("wrong");
    }
    ATTEMPTS.delete(ip);
    res.setHeader("Set-Cookie", cookieHeader(makeToken(Date.now() + SESSION_MS), SESSION_MS / 1000, secureCookies));
    res.redirect(next);
  });

  app.get("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", cookieHeader("", 0, secureCookies));
    res.redirect("/login");
  });

  app.use((req, res, next) => {
    if (OPEN_PATHS.has(req.path) || tokenValid(readCookie(req, COOKIE))) return next();
    // The app's own fetches get a plain refusal they can show; a person
    // opening a page is sent to sign in and brought back afterwards.
    if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Please sign in again." });
    res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  });
}
