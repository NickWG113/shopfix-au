// A handful of plain checks an Australian shopper would notice.
//
// Deliberately simple: each one looks for a visible signal in the page
// HTML or the public product feed. A check returns "pass", "fail" or
// "unknown" — "unknown" when the thing it reads wasn't there to read (a
// blocked feed, a password page), so we never tell a store it's missing
// something we simply couldn't see.

const has = (html, re) => re.test(html);

/** Text a shopper can read, without scripts, styles and tags. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * @param store  result of inspectStore
 * @param pages  { home: html, product: html | null }
 */
export function runChecks(store, pages) {
  const home = pages.home || "";
  const product = pages.product || "";
  const both = home + "\n" + product;
  const text = visibleText(both);
  const products = store.products || [];
  const checks = [];

  if (store.passwordPage) {
    // Everything below would be judging the password page, not the store.
    return [
      {
        id: "password",
        title: "Store is behind a password",
        status: "unknown",
        detail:
          "Shoppers (and we) only see a password page, so there's nothing to check yet. Remove the password in Online Store > Preferences when the store launches.",
      },
    ];
  }

  checks.push({
    id: "aud",
    title: "Prices shown in Australian dollars",
    status: !store.currency ? "unknown" : store.currency === "AUD" ? "pass" : "fail",
    detail: !store.currency
      ? "Couldn't read the store's currency."
      : store.currency === "AUD"
        ? "Prices are in AUD."
        : `Prices show in ${store.currency}. Australian shoppers expect AUD, GST included; Shopify Markets can turn on AUD for Australian visitors.`,
  });

  // Afterpay started in Australia and shoppers here look for it; Zip,
  // Klarna and humm are the other common ones.
  const bnpl = ["afterpay", "zip pay", "zippay", "zip money", "quadpay", "klarna", "humm", "paypal pay in 4"];
  const bnplFound = bnpl.filter((n) => text.toLowerCase().includes(n) || has(both, new RegExp(n.replace(" ", "[-_ ]?"), "i")));
  checks.push({
    id: "bnpl",
    title: "Buy now, pay later shown near the price",
    status: bnplFound.length ? "pass" : "fail",
    detail: bnplFound.length
      ? `Found ${bnplFound[0].replace(/\b\w/g, (c) => c.toUpperCase())} on the page.`
      : "No Afterpay, Zip or similar messaging found. Showing the instalment amount next to the price is common on Australian stores.",
    fix: bnplFound.length ? null : "afterpay",
  });

  const freeShip = /free (shipping|delivery|postage)/i.test(text);
  checks.push({
    id: "shipping",
    title: "Shipping cost is clear up front",
    status: freeShip ? "pass" : "fail",
    detail: freeShip
      ? "Free shipping is mentioned on the page."
      : "Nothing on the home or product page says what delivery costs. Surprise shipping at checkout is the most common reason carts are abandoned.",
    fix: freeShip ? null : "shipping-bar",
  });

  const reviewApps = /judge\.?me|okendo|yotpo|stamped\.io|loox|reviews\.io|junip|trustpilot|product-reviews|spr-badge|jdgm/i;
  const reviews = reviewApps.test(both) || /\b\d+(\.\d)?\s*(out of 5|stars?)\b|\b\d+\s+reviews\b/i.test(text);
  checks.push({
    id: "reviews",
    title: "Customer reviews on products",
    status: reviews ? "pass" : "fail",
    detail: reviews
      ? "Reviews are shown."
      : "No product reviews found. A reviews app (Judge.me has a free plan) lets real customers vouch for you. We won't add reviews for you — they have to be real.",
    // No automatic fix on purpose: the only honest fix is collecting real ones.
    fix: null,
  });

  // Links count from the raw HTML (footer hrefs); the word only counts if a
  // shopper can read it, or every theme script mentioning "returns" passes.
  const returns = /refund-policy|returns?-policy/i.test(both) || /\b(returns|refunds)\b/i.test(text);
  const auTrust = /australian[- ]owned|australian[- ]made|made in australia|ships? from australia|aussie[- ]owned|based in (sydney|melbourne|brisbane|perth|adelaide|hobart|australia)/i.test(text);
  checks.push({
    id: "trust",
    title: "Returns and 'Australian business' are easy to see",
    status: returns && auTrust ? "pass" : "fail",
    detail:
      returns && auTrust
        ? "Returns and local signals are both visible."
        : [
            returns ? null : "No returns policy link found.",
            auTrust ? null : "Nothing says the business is Australian or ships locally.",
            "A slim bar under the header fixes both.",
          ]
            .filter(Boolean)
            .join(" "),
    fix: returns && auTrust ? null : "trust-bar",
  });

  if (!products.length) {
    checks.push({
      id: "photos",
      title: "Enough product photos",
      status: "unknown",
      detail: "The store's product feed isn't public, so we couldn't count photos.",
    });
  } else {
    const thin = products.filter((p) => p.images < 3);
    checks.push({
      id: "photos",
      title: "Enough product photos",
      status: thin.length <= products.length / 3 ? "pass" : "fail",
      detail:
        thin.length === 0
          ? `All ${products.length} products we looked at have 3+ photos.`
          : `${thin.length} of ${products.length} products have fewer than 3 photos (e.g. "${thin[0].title}"). Shoppers can't touch the product; extra angles and a photo in use stand in for that.`,
    });
  }

  if (pages.product !== null) {
    // Most themes put the button high on desktop but far down on a phone,
    // under a gallery of photos. We can't measure scroll from HTML, so this
    // is advice rather than a pass/fail, and only offered on a product page.
    const sticky = /sticky[-_ ]?(add|atc|cart|buy)|product-sticky|sticky-atc/i.test(product);
    checks.push({
      id: "sticky",
      title: "Add to cart stays in reach on phones",
      status: sticky ? "pass" : "fail",
      detail: sticky
        ? "The product page has a sticky add-to-cart."
        : "On a phone the Add to cart button scrolls away under the photos. A sticky button keeps it one tap away.",
      fix: sticky ? null : "sticky-cart",
    });
  }

  return checks;
}
