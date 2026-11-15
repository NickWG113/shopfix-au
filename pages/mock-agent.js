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

// The whole announcement bar, for recolouring it (its text is above).
const ANNOUNCEMENT_BAR = ".announcement-bar,.AnnouncementBar,#shopify-section-announcement-bar,.topbar";

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

// ---------- the big changes ----------
// Whole new sections, not a restyle: a reviews section, a photo gallery, a
// "bought recently" line, trust badges, bestseller badges. Each is built
// from the store's own page (its photos, its button) and from data a
// connected store really has (its reviews app, its orders). In this demo
// those figures are examples, and the warning says so.
// The scripts are plain functions, sent as their own source, so the work
// log shows readable code.

const FIND = {
  // The buy form, not the hidden Afterpay one some themes put by the price.
  form: 'form[action*="/cart/add"]:not(.installment):not([id*="installment"])',
  title: ".product__title, h1.product__title, .product-single__title, .product_title, h1.product-title, .product__info-container h1",
  price: TARGETS.price.sel.join(","),
};

// The main product section, where the product's photos and title are.
function productSection(find) {
  var form = document.querySelector(find.form);
  return form && (form.closest(".shopify-section, section") || form.parentElement);
}

// New sections go right under the Add to cart button, where the shopper
// is deciding, rather than below a long description.
function placeUnderButton(find, el) {
  var form = document.querySelector(find.form);
  var at = form && (form.closest(".product__block, .product-form") || form);
  if (at) at.insertAdjacentElement("afterend", el);
}

function addReviews(find) {
  if (document.querySelector('[data-shopfix-ai="reviews"]')) return;
  var section = productSection(find);
  if (!section) return;
  // Stars under the title the shopper sees (themes often have a second,
  // hidden copy for another screen size), after the title's own block so
  // the theme's title styles leave them alone. A click goes to the reviews.
  var titles = Array.prototype.filter.call(section.querySelectorAll(find.title + ", h1"), function (h) {
    return h.getClientRects().length && h.offsetHeight;
  });
  titles.slice(0, 1).forEach(function (h) {
    var line = document.createElement("div");
    line.className = "sf-stars-line";
    line.setAttribute("data-shopfix-ai", "stars");
    line.innerHTML = '<span class="sf-stars">★★★★★</span> 4.8 <u>(23 reviews)</u>';
    line.addEventListener("click", function () {
      document.getElementById("sf-reviews").scrollIntoView({ behavior: "smooth" });
    });
    (h.closest(".product__block") || h).insertAdjacentElement("afterend", line);
  });
  var reviews = [
    ["Exactly as pictured", "Great quality and it arrived two days after I ordered. Would buy again.", "Sarah, Brisbane"],
    ["A hit with the kids", "Bought it as a birthday present and it hasn't been put down since.", "James, Geelong"],
    ["Good value", "Cheaper than the big stores and the packaging was lovely.", "Priya, Parramatta"],
    ["Fast delivery", "Ordered on Monday, here by Wednesday. Well packed too.", "Tom, Ballarat"],
    ["Would recommend", "Sturdy and well made. The second one we've bought.", "Mia, Hobart"],
  ];
  var box = document.createElement("section");
  box.id = "sf-reviews";
  box.className = "sf-block";
  box.setAttribute("data-shopfix-ai", "reviews");
  box.innerHTML =
    '<div class="sf-wrap"><div class="sf-rv-head"><div><h2>What customers say</h2>' +
    '<p><span class="sf-stars">★★★★★</span> <b>4.8 out of 5</b> from 23 reviews</p></div>' +
    '<span class="sf-example">Example reviews: your real ones show here</span>' +
    '<span class="sf-rv-arrows"><button type="button" aria-label="Previous reviews" data-sf-dir="-1">‹</button><button type="button" aria-label="More reviews" data-sf-dir="1">›</button></span>' +
    '</div><div class="sf-rv-grid">' +
    reviews.map(function (r) {
      return '<figure class="sf-rv"><span class="sf-stars">★★★★★</span><b>' + r[0] + "</b><p>" + r[1] + "</p><figcaption>" + r[2] + " · Verified buyer</figcaption></figure>";
    }).join("") +
    '</div><button type="button" class="sf-btn">Write a review</button></div>';
  placeUnderButton(find, box);
  // The reviews scroll sideways: swipe on a phone, or the arrows.
  var row = box.querySelector(".sf-rv-grid");
  box.querySelectorAll("[data-sf-dir]").forEach(function (b) {
    b.addEventListener("click", function () {
      row.scrollBy({ left: Number(b.getAttribute("data-sf-dir")) * row.clientWidth * 0.8, behavior: "smooth" });
    });
  });
}

function addGallery(find) {
  if (document.querySelector('[data-shopfix-ai="gallery"]')) return;
  var section = productSection(find);
  if (!section) return;
  var seen = {};
  var photos = [];
  // The product's own photos: the first of these the theme uses, so a
  // picture in the description doesn't creep in.
  [".product__media-item img", ".product-single__media img", ".product-gallery img", "[data-product-media] img", ".product__photo img", ".product__media img"].some(function (sel) {
    section.querySelectorAll(sel).forEach(function (img) {
      var src = img.currentSrc || img.src;
      var key = (src || "").split("?")[0];
      if (!src || src.indexOf("data:") === 0 || seen[key]) return;
      seen[key] = 1;
      photos.push(src);
    });
    return photos.length;
  });
  // The store's main photo (its share image) leads.
  var og = document.querySelector('meta[property="og:image"]');
  var main = og ? og.content.split("?")[0].split("/").pop() : "";
  photos.sort(function (x, y) {
    return (y.split("?")[0].split("/").pop() === main) - (x.split("?")[0].split("/").pop() === main);
  });
  if (!photos.length && og) photos.push(og.content);
  if (!photos.length) return;
  var box = document.createElement("section");
  box.className = "sf-block";
  box.setAttribute("data-shopfix-ai", "gallery");
  box.innerHTML =
    '<div class="sf-wrap"><h2>See it from every angle</h2><p class="sf-sub">Swipe for more photos</p><div class="sf-gal">' +
    photos.slice(0, 8).map(function (src) {
      return '<a class="sf-gal-item" href="' + src + '" target="_blank" rel="noopener"><img src="' + src + '" alt="" loading="lazy"></a>';
    }).join("") +
    "</div></div>";
  placeUnderButton(find, box);
}

function addBoughtRecently(find) {
  if (document.querySelector('[data-shopfix-ai="proof"]')) return;
  var price = document.querySelector(find.price);
  if (!price) return;
  var p = document.createElement("div");
  p.className = "sf-proof";
  p.setAttribute("data-shopfix-ai", "proof");
  p.innerHTML = '<span class="sf-proof-dot"></span><b>38 people</b>&nbsp;bought this in the last 30 days';
  price.insertAdjacentElement("afterend", p);
}

function addTrustBadges(find) {
  if (document.querySelector('[data-shopfix-ai="badges"]')) return;
  var form = document.querySelector(find.form);
  if (!form) return;
  var icon = function (path) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
  };
  var ul = document.createElement("ul");
  ul.className = "sf-badges";
  ul.setAttribute("data-shopfix-ai", "badges");
  ul.innerHTML = [
    [icon('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'), "Secure checkout", "Encrypted payment"],
    [icon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'), "Pay in 4", "With Afterpay"],
    [icon('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'), "Ships from Australia", "Tracked delivery"],
  ].map(function (b) {
    return "<li>" + b[0] + "<span><b>" + b[1] + "</b>" + b[2] + "</span></li>";
  }).join("");
  form.insertAdjacentElement("afterend", ul);
}

function addBestsellerBadges() {
  if (document.querySelector('[data-shopfix-ai="bestseller"]')) return;
  var cards = document.querySelectorAll(".product-card, .card-wrapper, .grid-product, .product-item, .card--product");
  Array.prototype.slice.call(cards, 0, 4).forEach(function (card) {
    var media = card.querySelector(".product-card__image-wrapper, .card__media, .card__inner, .grid-product__image-wrap, .product-item__image-wrapper") || card;
    if (getComputedStyle(media).position === "static") media.style.position = "relative";
    var b = document.createElement("span");
    b.className = "sf-best";
    b.setAttribute("data-shopfix-ai", "bestseller");
    b.textContent = "★ Bestseller";
    media.appendChild(b);
  });
}

const FEATURE_CSS = [
  `.sf-block{padding:24px 0;margin:8px 0;border-top:1px solid #ececec;color:#1a1a1a;font-family:inherit;text-align:left}`,
  `.sf-wrap{max-width:100%}`,
  `.sf-block h2{font-size:22px;line-height:1.2;margin:0 0 4px;font-weight:700}`,
  `.sf-sub{margin:0;font-size:14px;opacity:.7}`,
  `.sf-stars{color:#f5a623;letter-spacing:2px}`,
  `.sf-stars-line{display:flex;gap:6px;align-items:center;margin:6px 0 10px;font-size:15px;font-weight:600;cursor:pointer}`,
  `.sf-stars-line u{font-weight:400;opacity:.8}`,
  `.sf-rv-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px}`,
  `.sf-rv-head p{margin:0;font-size:15px}`,
  `.sf-example{font:600 12px/1 system-ui,sans-serif;padding:7px 10px;border-radius:999px;background:#fff4d6;color:#7a5200;border:1px dashed #d9a400}`,
  `.sf-rv-grid{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 2px;padding-bottom:10px;-webkit-overflow-scrolling:touch}`,
  `.sf-rv-grid::-webkit-scrollbar{height:6px}.sf-rv-grid::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:3px}`,
  `.sf-rv-arrows{display:flex;gap:8px}.sf-rv-arrows button{width:40px;height:40px;border-radius:50%;border:1px solid #d0d0d0;background:#fff;font:400 22px/1 system-ui,sans-serif;cursor:pointer;color:#1a1a1a}`,
  `.sf-rv{flex:0 0 min(300px,80%);scroll-snap-align:start;margin:0;padding:20px;border:1px solid #e6e6e6;border-radius:14px;background:#fafafa;display:flex;flex-direction:column;gap:8px}`,
  `.sf-rv b{font-size:16px}.sf-rv p{margin:0;font-size:15px;line-height:1.5}`,
  `.sf-rv figcaption{margin-top:auto;font-size:13px;opacity:.7}`,
  `.sf-btn{margin-top:20px;padding:12px 22px;border-radius:999px;border:2px solid #1a1a1a;background:#fff;font:600 15px/1 inherit;cursor:pointer}`,
  `.sf-gal{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin-top:14px;padding-bottom:10px}`,
  `.sf-gal::-webkit-scrollbar{height:6px}.sf-gal::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:3px}`,
  `.sf-gal-item{flex:0 0 min(320px,78%);aspect-ratio:1;scroll-snap-align:start;display:block;border-radius:14px;overflow:hidden;background:#f4f4f4}`,
  `.sf-gal-item img{width:100%;height:100%;object-fit:cover;display:block}`,
  `.sf-proof{display:inline-flex;align-items:center;gap:8px;margin:10px 0;padding:8px 14px;border-radius:999px;background:#fff1e6;color:#9a3412;font-size:14px}`,
  `.sf-proof-dot{width:9px;height:9px;border-radius:50%;background:#ea580c;box-shadow:0 0 0 4px rgba(234,88,12,.2)}`,
  `.sf-badges{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0;padding:0}`,
  `.sf-badges li{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid #e6e6e6;border-radius:12px;font-size:12px;line-height:1.3;background:#fff}`,
  `.sf-badges b{display:block;font-size:13px}.sf-badges svg{flex:none;color:#15803d}`,
  `.sf-best{position:absolute;top:10px;left:10px;z-index:3;padding:6px 10px;border-radius:999px;background:#111;color:#fff;font:700 12px/1 system-ui,sans-serif;letter-spacing:.02em}`,
].join("\n");

const FEATURES = [
  {
    words: /\breviews? (section|widget|block)\b|star ratings? (from|under)|reviews from (our|your|my|the) reviews app/,
    page: "product",
    run: addReviews,
    summary: "Added a reviews section, with star ratings under the title.",
    warning:
      "These are example reviews, to show the layout. Published, it shows only your real reviews from your reviews app (Judge.me has a free plan). Until you have some, it says Be the first to review.",
  },
  {
    words: /\b(photo|image|picture) gallery\b|\ball the (product )?(photos|images|pictures)\b/,
    page: "product",
    run: addGallery,
    summary: "Added a photo gallery under the product.",
    warning: "It uses the photos already on this product. Add more in Shopify, especially one of it in use, and they appear here too.",
  },
  {
    words: /\bbought (this|recently)\b|\bpeople bought\b|\bhow many (people )?(bought|sold)\b/,
    page: "product",
    run: addBoughtRecently,
    summary: "Added a line under the price saying how many people bought it lately.",
    warning:
      "The number comes from your real orders, updated each day, and the line hides on products with fewer than 5 sales. In this demo it's an example.",
  },
  {
    words: /\btrust badges?\b|\bsecure checkout badges?\b/,
    page: "product",
    run: addTrustBadges,
    summary: "Added trust badges under the Add to cart button.",
    warning: "Check each badge is true for your store before you publish: how you take payment and where you ship from.",
  },
  {
    words: /\bbest ?sellers?\b/,
    page: "home",
    run: addBestsellerBadges,
    summary: "Added Bestseller badges to your top-selling products.",
    warning: "Connected to your store, the badges go on your real top sellers from the last 30 days. In this demo they go on the first four products.",
  },
];

function featureChange(f, pagePath) {
  const onHome = !pagePath || pagePath === "/";
  if (f.page === "product" && onHome) {
    return { summary: "No change made.", css: "", js: "", warning: "That goes on a product page. Press Product page above the preview, then ask again." };
  }
  if (f.page === "home" && !onHome) {
    return { summary: "No change made.", css: "", js: "", warning: "That goes on the home page. Press Home page above the preview, then ask again." };
  }
  const helpers = f.run === addReviews || f.run === addGallery ? `${productSection}\n${placeUnderButton}\n` : "";
  return {
    summary: f.summary,
    css: FEATURE_CSS,
    js: `${helpers}(${f.run})(${JSON.stringify(FIND)});`,
    warning: f.warning,
  };
}

/** A mocked answer to one request on one page: { summary, css, js, warning }. */
export function mockChange(request, pagePath = "/") {
  const text = String(request || "").toLowerCase();

  const feature = FEATURES.find((f) => f.words.test(text));
  if (feature) return featureChange(feature, pagePath);

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

  // Recolouring the announcement bar: the whole bar, with white text.
  if (target === "announcement" && colourName && !words) {
    const hex = COLOURS[colourName];
    const bar = JSON.stringify(ANNOUNCEMENT_BAR);
    return {
      summary: `The announcement bar is now ${colourName}.`,
      css: `${ANNOUNCEMENT_BAR}{background:${hex}!important;border-color:${hex}!important}` +
        ANNOUNCEMENT_BAR.split(",").map((s) => `${s} *`).join(",") + `{color:${colourName === "yellow" ? "#111" : "#fff"}!important}`,
      js: `[document.querySelector(${bar})].filter(Boolean).forEach(function(el){el.setAttribute('data-shopfix-ai','')});`,
      warning: "",
    };
  }

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

/** Mocked ideas for a page, the biggest first: each one's request is one mockChange understands. */
export function mockIdeas(pagePath = "/") {
  if (!pagePath || pagePath === "/") {
    return [
      { title: "Bestseller badges on your top products", why: "Shoppers new to a store look for what other people buy. A badge points them to it.", request: "Add Bestseller badges to our best sellers" },
      { title: "Use the top bar for delivery", why: "Delivery cost is one of the first things shoppers want to know, before they reach checkout.", request: "Change the announcement bar at the top to say Free delivery on orders over [your threshold]" },
      { title: "Say where you ship from", why: "Knowing an order ships locally reassures first-time shoppers.", request: "Add a line at the top of the page saying Ships from [your city] in 1–2 business days" },
      { title: "Make product names easier to scan", why: "Shoppers skim the cards on a phone, and bolder names help them spot what they came for.", request: "Make the product names on the cards bolder" },
      { title: "Bigger prices on the cards", why: "Shoppers decide whether to tap a product partly on price, so it should be easy to read.", request: "Make the prices on the cards larger and bolder" },
    ];
  }
  return [
    { title: "Show your reviews, with star ratings", why: "Shoppers trust other shoppers more than the store. Stars by the title and reviews below answer “is it any good?”", request: "Add a reviews section with star ratings, showing real reviews from our reviews app" },
    { title: "A photo gallery from every angle", why: "Shoppers can't pick the product up. Big photos of it from every side stand in for that.", request: "Show all the product photos in a big photo gallery under the product" },
    { title: "Show that people are buying it", why: "Knowing others bought it lately makes a first-time shopper more confident to buy.", request: "Show how many people bought this in the last 30 days, from our real orders" },
    { title: "Trust badges by the button", why: "Secure checkout, pay later and local shipping, right where the shopper decides.", request: "Add trust badges under the Add to cart button" },
    { title: "Make Add to cart stand out", why: "The main button should be the easiest thing to find and tap on the page.", request: "Make the Add to cart button bigger and bright green" },
    { title: "Say when it will arrive", why: "Shoppers hesitate when they don't know how long delivery takes.", request: "Add a small line under the Add to cart button saying Ships from [your city] in 1–2 business days" },
  ];
}
