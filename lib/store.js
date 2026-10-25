// Reading a Shopify storefront from the outside, with no login.
//
// Every Shopify store serves its pages and a public product feed
// (/products.json), so we can look at any store someone types in. Nothing
// here ever writes to the store; that lives in publish.js and needs a token.

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 ShopFixAU/0.1";

// Pages change rarely during a demo, and toggling a fix re-renders the
// preview. Caching for a few minutes keeps that instant and stops us
// hammering someone else's store.
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

/** "https://Www.Example.com.au/collections/x" -> "www.example.com.au" */
export function normaliseDomain(input) {
  let s = String(input || "").trim().toLowerCase();
  if (!s) throw new Error("Type a store address, e.g. example.com.au");
  if (!/^https?:\/\//.test(s)) s = "https://" + s;
  let url;
  try {
    url = new URL(s);
  } catch {
    throw new Error("That doesn't look like a web address.");
  }
  // Refuse anything that isn't a public hostname. The server fetches what
  // it's given, so without this someone could point it at our own machine.
  const host = url.hostname;
  if (
    !host.includes(".") ||
    host === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("That isn't a public store address.");
  }
  return host;
}

/** Only ever a path on the store itself, never a full URL to somewhere else. */
export function normalisePath(input) {
  let p = String(input || "/").trim();
  if (!p.startsWith("/")) p = "/" + p;
  if (p.startsWith("//")) p = "/";
  return p;
}

async function get(url, { cookie, accept = "text/html" } = {}) {
  const res = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept,
      "accept-language": "en-AU,en;q=0.9",
      ...(cookie ? { cookie } : {}),
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  return res;
}

// Dev stores (and stores not launched yet) sit behind a password page. If the
// person running the demo set STOREFRONT_PASSWORD for their own store, log in
// once and reuse the cookie. We never try passwords on anyone else's store.
const passwordCookies = new Map();
// The password belongs to one store, which can answer on its myshopify
// address and on a custom domain it redirects to. inspectStore adds the latter.
const ownDomains = new Set();
async function storefrontCookie(domain) {
  const own = (process.env.SHOPIFY_STORE || "").toLowerCase();
  const pw = process.env.STOREFRONT_PASSWORD;
  if (!pw || !own) return undefined;
  if (domain !== own && !ownDomains.has(domain)) return undefined;
  if (passwordCookies.has(domain)) return passwordCookies.get(domain);

  const body = new URLSearchParams({ form_type: "storefront_password", utf8: "✓", password: pw });
  const res = await fetch(`https://${domain}/password`, {
    method: "POST",
    headers: { "user-agent": USER_AGENT, "content-type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  passwordCookies.set(domain, cookie || undefined);
  return cookie || undefined;
}

/**
 * Fetch one storefront page. Returns { html, finalUrl, status, passwordPage }.
 * Cached per domain + path.
 */
export async function fetchPage(domain, path = "/") {
  const key = `${domain}${path}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const cookie = await storefrontCookie(domain);
  const res = await get(`https://${domain}${path}`, { cookie });
  const html = await res.text();
  const finalUrl = res.url;
  const passwordPage =
    new URL(finalUrl).pathname.startsWith("/password") ||
    /template-password|password-page|storefront_password/i.test(html.slice(0, 200000));

  const value = { html, finalUrl, status: res.status, passwordPage };
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Up to `limit` products from the public feed, or [] if the store hides it. */
export async function fetchProducts(domain, limit = 12) {
  const key = `${domain}#products`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  let products = [];
  try {
    const cookie = await storefrontCookie(domain);
    const res = await get(`https://${domain}/products.json?limit=${limit}`, {
      cookie,
      accept: "application/json",
    });
    if (res.ok) {
      const data = await res.json();
      products = (data.products || []).map((p) => ({
        handle: p.handle,
        title: p.title,
        images: (p.images || []).length,
        // products.json gives prices as strings in dollars ("49.95"),
        // unlike the /products/x.js feed which uses cents.
        price: p.variants?.[0]?.price ? Number(p.variants[0].price) : null,
        compareAt: p.variants?.[0]?.compare_at_price ? Number(p.variants[0].compare_at_price) : null,
        available: (p.variants || []).some((v) => v.available),
      }));
    }
  } catch {
    // A store that blocks the feed is still a store; the checks that need
    // products just say they couldn't look.
  }
  cache.set(key, { at: Date.now(), value: products });
  return products;
}

/** Pull the facts Shopify prints into every page's <head>. */
export function readShopifyGlobals(html) {
  // These are JSON in the page, so "/" arrives escaped as "\/".
  const pick = (re) => html.match(re)?.[1]?.replace(/\\\//g, "/") ?? null;
  return {
    shop: pick(/Shopify\.shop\s*=\s*"([^"]+)"/),
    currency: pick(/Shopify\.currency\s*=\s*\{\s*"active"\s*:\s*"([A-Z]{3})"/),
    country: pick(/Shopify\.country\s*=\s*"([A-Z]{2})"/),
    themeName: pick(/Shopify\.theme\s*=\s*\{[^}]*?"name"\s*:\s*"([^"]+)"/),
  };
}

export function looksLikeShopify(html) {
  return /cdn\.shopify\.com|Shopify\.shop\s*=|myshopify\.com|shopify-section/i.test(html);
}

export function storeTitle(html) {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return (
    (og || title || "")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&#x27;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || null
  );
}

/** Everything the home screen needs about a store, in one call. */
export async function inspectStore(domainInput) {
  const domain = normaliseDomain(domainInput);
  let page;
  try {
    page = await fetchPage(domain, "/");
  } catch (err) {
    const code = err.cause?.code || err.name;
    if (code === "ENOTFOUND") throw new Error(`There's no website at ${domain}. Check the spelling.`);
    if (code === "TimeoutError") throw new Error(`${domain} took too long to answer. Try again.`);
    throw new Error(`Couldn't reach ${domain} (${code}).`);
  }
  // Follow the store to its real address (e.g. a .myshopify.com typed in
  // that redirects to the custom domain), so later fetches skip the redirect.
  const realDomain = new URL(page.finalUrl).hostname;
  if (realDomain !== domain && process.env.SHOPIFY_STORE?.toLowerCase() === domain) {
    ownDomains.add(realDomain);
  }

  const globals = readShopifyGlobals(page.html);
  const shopify = looksLikeShopify(page.html);
  const products = shopify ? await fetchProducts(realDomain) : [];

  const australian =
    globals.currency === "AUD" || globals.country === "AU" || realDomain.endsWith(".au");

  return {
    domain: realDomain,
    typed: domain,
    name: storeTitle(page.html) || realDomain,
    status: page.status,
    shopify,
    australian,
    passwordPage: page.passwordPage,
    ...globals,
    products,
    firstProductPath: products[0] ? `/products/${products[0].handle}` : null,
  };
}
