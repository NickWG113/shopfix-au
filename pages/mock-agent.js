// A mocked agent for the online demo. No AI and no network: it reads the
// owner's request for a few plain patterns (what to change, a colour,
// bigger, bolder, rounded, a line of text) and writes the CSS and
// JavaScript itself, against the class names common Shopify themes use, the
// same way the ready-made fixes in lib/fixes.js find their targets.
//
// It keeps the real agent's rules (PROMPTS.md, Part 1): changed elements
// carry data-shopfix-ai so the preview labels them, the script is safe to
// run twice, and it refuses to invent facts such as reviews, ratings,
// countdown timers, stock counts or discounts.
//
// Used by static-api.js wherever no answer was recorded for a request.

const TARGETS = {
  announcement: {
    name: "announcement bar",
    words: /announcement|top bar|bar at the top|banner at the top/,
    sel: [".announcement-bar__message", ".announcement-bar p", ".AnnouncementBar__Content", ".announcement__message", ".topbar__center .topbar__menu-item a", ".announcement-bar"],
  },
  cart: {
    name: "Add to cart button",
    words: /add to cart|add-to-cart|cart button|buy button|buy now|checkout button|\bbutton\b/,
    sel: [
      'form[action*="/cart/add"] button[type="submit"]',
      'form[action*="/cart/add"] [name="add"]',
      ".product-form__submit",
      "button.add-to-cart",
      ".btn--add-to-cart",
      "#AddToCart",
      ".ProductForm__AddToCart",
      '[data-action="add-to-cart"]',
      ".product-form__cart-submit",
    ],
  },
  title: {
    name: "product title",
    words: /product (title|name)|\btitle\b|\bheading\b/,
    sel: [".product__title h1", "h1.product__title", ".product-single__title", ".product_title", "h1.product-title", ".product__info-container h1"],
  },
  price: {
    name: "price",
    words: /\bprices?\b/,
    sel: [".product__info-container .price", ".product .price", ".product-single__price", "[data-product-price]", ".product-price", ".price-item--sale", ".price-item--regular", ".f-price--large"],
  },
  cardTitle: {
    name: "product names on the cards",
    words: /cards?|tiles?|product names|collection/,
    sel: [".card__heading", ".product-card__title", ".grid-product__title", ".product-item__title", ".card-information__text"],
  },
  cardPrice: {
    name: "prices on the cards",
    words: /card prices?|prices? on (the )?cards?/,
    sel: [".card-information .price", ".product-card__price", ".grid-product__price", ".product-item__price", ".product-card__info .f-price"],
  },
};

const COLOURS = {
  "bright green": "#16a34a",
  green: "#15803d",
  red: "#dc2626",
  blue: "#2563eb",
  navy: "#1e3a8a",
  black: "#111111",
  orange: "#ea580c",
  purple: "#7c3aed",
  pink: "#db2777",
  teal: "#0d9488",
  yellow: "#facc15",
};

// The real agent's rule: never state a fact about the business it wasn't given.
const INVENTS = /\b(add|show|put|insert|create|make up|write|include)\b.{0,40}\b(reviews?|ratings?|stars?|testimonials?|countdown|timer|stock count|only \d+ left|discounts?|% off|awards?)\b/;

function pickTarget(text, pagePath) {
  const onHome = !pagePath || pagePath === "/";
  if (TARGETS.announcement.words.test(text)) return "announcement";
  if (TARGETS.cardPrice.words.test(text)) return "cardPrice";
  if (onHome && /\bprices?\b/.test(text)) return "cardPrice";
  if (TARGETS.cart.words.test(text)) return "cart";
  if (TARGETS.price.words.test(text)) return onHome ? "cardPrice" : "price";
  if (TARGETS.cardTitle.words.test(text) || (onHome && TARGETS.title.words.test(text))) return "cardTitle";
  if (TARGETS.title.words.test(text)) return "title";
  return null;
}

/** The words after "saying" or inside quotes, if the request asks for a line of text. */
function lineOfText(request) {
  const quoted = request.match(/["“'‘]([^"”'’]{3,140})["”'’]/);
  if (quoted) return quoted[1].trim();
  const saying = request.match(/\b(?:saying|that says|which says|reading|with the text|with the words)\s*:?\s*(.{3,140})$/i);
  return saying ? saying[1].trim().replace(/[.!]+$/, "") : null;
}

function selectorList(target) {
  return TARGETS[target].sel.join(",");
}

function js(lines) {
  return lines.join("\n");
}

/** A mocked answer to one request on one page: { summary, css, js, warning }. */
export function mockChange(request, pagePath = "/") {
  const text = String(request || "").toLowerCase();

  if (INVENTS.test(text)) {
    return {
      summary: "No change made.",
      css: "",
      js: "",
      warning:
        "I can't add reviews, ratings, timers, stock counts or discounts that aren't real: shoppers would be misled, and Australian Consumer Law treats fake reviews and false urgency as misleading. If you have real reviews, a reviews app can show them here.",
    };
  }

  // Rewording: "Change the Add to cart button to say Add to bag". The
  // owner's own words go in place of what's there, on the button or the
  // announcement bar.
  const retext = request.match(/\b(?:to say|to read|so it says|so it reads)\s*:?\s*["“'‘]?(.{2,100}?)["”'’]?[.!]?$/i);
  if (retext) {
    const newWords = retext[1].trim();
    const where = pickTarget(text.replace(newWords.toLowerCase(), ""), pagePath);
    if (where === "cart" || where === "announcement") return reword(where, newWords);
  }

  const words = lineOfText(request);
  const target = pickTarget(words ? text.replace(words.toLowerCase(), "") : text, pagePath);
  const colourName = Object.keys(COLOURS).find((c) => text.includes(c));
  const bigger = /\b(bigger|larger|enlarge|taller|stand out)\b/.test(text);
  const bolder = /\b(bold|bolder|heavier)\b/.test(text);
  const rounded = /\b(round|rounded|pill)\b/.test(text);
  const phones = /\b(phones?|mobile)\b/.test(text);

  const css = [];
  const script = [];
  const did = [];

  // Restyling the target.
  if (target && (colourName || bigger || bolder || rounded)) {
    const rules = [];
    if (colourName) {
      const hex = COLOURS[colourName];
      if (target === "cart") {
        rules.push(`background:${hex}!important`, `border-color:${hex}!important`, `color:${colourName === "yellow" ? "#111" : "#fff"}!important`);
      } else {
        rules.push(`color:${hex}!important`);
      }
      did.push(colourName);
    }
    if (bigger) {
      rules.push(target === "cart" ? "font-size:1.15em!important;padding-top:1.05em!important;padding-bottom:1.05em!important;min-height:3.4em!important" : "font-size:1.3em!important");
      did.push(target === "cart" ? "bigger" : "larger");
    }
    if (bolder) {
      rules.push("font-weight:700!important");
      did.push("bolder");
    }
    if (rounded) {
      rules.push("border-radius:999px!important");
      did.push("rounded");
    }
    let block = `${selectorList(target)}{${rules.join(";")}}`;
    // Some themes (Prestige, and Dawn's hover layer) paint a button's colour
    // on a ::before layer behind the text, so the colour goes there too.
    if (colourName && target === "cart") {
      const hex = COLOURS[colourName];
      block += TARGETS.cart.sel.map((s) => `${s}::before`).join(",") + `{background:${hex}!important;border-color:${hex}!important}`;
    }
    css.push(phones ? `@media (max-width:749px){${block}}` : block);
    // Marked so the preview outlines and labels what changed.
    script.push(`document.querySelectorAll(${JSON.stringify(selectorList(target))}).forEach(function(el){el.setAttribute('data-shopfix-ai','')});`);
  }

  // Adding a line of text.
  if (words) {
    const where = target === "cart" || target === "price" ? target : /\b(top|header|banner|announcement)\b/.test(text) ? "top" : pagePath === "/" ? "top" : "cart";
    css.push(
      where === "top"
        ? `[data-shopfix-ai="line-top"]{background:#171916;color:#fff;text-align:center;font:600 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:9px 16px}`
        : `[data-shopfix-ai="line"]{margin:8px 0 0;font:500 14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2d2f2b}`,
    );
    const textJs = JSON.stringify(words);
    if (where === "top") {
      script.push(
        js([
          `if(!document.querySelector('[data-shopfix-ai="line-top"]')){`,
          `  var bar=document.createElement('div');bar.setAttribute('data-shopfix-ai','line-top');bar.textContent=${textJs};`,
          `  document.body.insertBefore(bar,document.body.firstChild);`,
          `}`,
        ]),
      );
    } else {
      const anchor = where === "price" ? selectorList("price") : selectorList("cart");
      script.push(
        js([
          `if(!document.querySelector('[data-shopfix-ai="line"]')){`,
          `  var at=document.querySelector(${JSON.stringify(anchor)});`,
          `  if(at){var p=document.createElement('p');p.setAttribute('data-shopfix-ai','line');p.textContent=${textJs};`,
          `  (at.closest('form')&&${where === "cart"}?at.closest('form'):at).insertAdjacentElement('afterend',p);}`,
          `}`,
        ]),
      );
    }
  }

  if (!css.length && !script.length) {
    return {
      summary: "No change made.",
      css: "",
      js: "",
      warning:
        "I couldn't tell what to change. Name the part of the page and the change, for example: \"Make the Add to cart button bigger and bright green\" or \"Add a line under the price saying Ships from Sydney\".",
    };
  }

  const parts = [];
  if (target && did.length) parts.push(`The ${TARGETS[target].name}${phones ? " on phones" : ""} ${target.startsWith("card") ? "are" : "is"} now ${listWords(did)}.`);
  if (words) parts.push(`Added the line "${words}".`);
  const placeholder = /\[[^\]]+\]/.test(words || "");
  return {
    summary: parts.join(" "),
    css: css.join("\n"),
    js: script.join("\n"),
    warning: placeholder
      ? "Replace the words in [brackets] with your own details before you publish."
      : words
        ? "Check this wording is right for your store before you publish. Only you know your own delivery times, policies and offers."
        : "",
  };
}

/** Puts the owner's words in place of the button's or the bar's own text. */
function reword(target, newWords) {
  const sel = JSON.stringify(selectorList(target));
  const textJs = JSON.stringify(newWords);
  // The button may also appear as a sticky copy, so every match changes;
  // the announcement bar only once. The first piece of text is replaced and
  // any others emptied, so icons and spinners inside stay.
  const each = target === "cart" ? `document.querySelectorAll(${sel}).forEach(` : `[document.querySelector(${sel})].filter(Boolean).forEach(`;
  return {
    summary: `The ${TARGETS[target].name} now says "${newWords}".`,
    css: "",
    js: js([
      `${each}function(el){`,
      `  if(el.getAttribute('data-shopfix-ai')==='text')return;`,
      `  var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null),n,first=null;`,
      `  while((n=w.nextNode())){if(n.nodeValue.trim()){if(!first)first=n;else n.nodeValue='';}}`,
      `  if(first){first.nodeValue=${textJs};el.setAttribute('data-shopfix-ai','text');}`,
      `});`,
    ]),
    warning: target === "announcement" ? "Check this wording is true for your store before you publish. Only you know your delivery offers." : "",
  };
}

function listWords(list) {
  const out = list.map((w) => (w === "bright green" ? "bright green" : w));
  return out.length > 1 ? `${out.slice(0, -1).join(", ")} and ${out.at(-1)}` : out[0];
}

/** Mocked ideas for a page: each one's request is one mockChange understands. */
export function mockIdeas(pagePath = "/") {
  if (!pagePath || pagePath === "/") {
    return [
      { title: "Make product names easier to scan", why: "Shoppers skim the cards on a phone, and bolder names help them spot what they came for.", request: "Make the product names on the cards bolder" },
      { title: "Bigger prices on the cards", why: "Shoppers decide whether to tap a product partly on price, so it should be easy to read.", request: "Make the prices on the cards larger and bolder" },
      { title: "Use the top bar for delivery", why: "Delivery cost is one of the first things shoppers want to know, before they reach checkout.", request: "Change the announcement bar at the top to say Free delivery on orders over [your threshold]" },
      { title: "Say where you ship from", why: "Knowing an order ships locally reassures first-time shoppers.", request: "Add a line at the top of the page saying Ships from [your city] in 1–2 business days" },
      { title: "Darker product names", why: "Higher contrast makes text easier to read outdoors on a phone.", request: "Make the product names on the cards black and bolder" },
      { title: "Make card prices stand out", why: "A clear price helps shoppers compare products at a glance.", request: "Make the prices on the cards bigger and navy" },
    ];
  }
  return [
    { title: "Make Add to cart stand out", why: "The main button should be the easiest thing to find and tap on the page.", request: "Make the Add to cart button bigger and bright green" },
    { title: "Say when it will arrive", why: "Shoppers hesitate when they don't know how long delivery takes.", request: "Add a small line under the Add to cart button saying Ships from [your city] in 1–2 business days" },
    { title: "Mention returns by the button", why: "A clear returns promise near the button removes a common reason to wait.", request: "Add a small line under the Add to cart button saying Free returns within [your returns window]" },
    { title: "Make the price easier to see", why: "Shoppers look for the price first, so it should stand out from the text around it.", request: "Make the price larger and bolder" },
    { title: "Bolder product title on phones", why: "On a small screen a strong title confirms the shopper is on the right product.", request: "Make the product title larger and bolder on phones" },
    { title: "Friendlier button wording", why: "Words that match how your shoppers talk make the next step feel natural.", request: "Change the Add to cart button to say Add to bag" },
  ];
}
