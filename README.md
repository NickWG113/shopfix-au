# QuickLift (was ShopFix AU)

Paste in an Australian Shopify store. QuickLift checks it for the things an
Australian shopper looks for, then lets you switch fixes on — or describe your
own change in plain English — and watch the store's real page update live.

**Try it online:** https://nickwg113.github.io/shopfix-au/. No sign-in. It's a
mocked copy: four stores' pages saved on 15 Nov 2026, the fixes running in the
browser, and a mocked agent, with nothing live. [docs/github-pages.md](docs/github-pages.md)
explains how. To check any store with the real agent, run it locally (below).

## Pages

- `/` — the home page, reused from our earlier prototype ("Red pen" design),
  recoloured and cut down to Shopify only: how it works, the ground rules,
  questions. Its form opens step 1.

After that, every page has the same step bar: **1 What to fix → 2 Preview
and approve → 3 Results**.

- `/dashboard?store=…` — step 1, **What to fix**: one sentence on what the
  check found, each problem with **Preview the fix**, and the agent for any
  other change.
- `/preview?store=…` — step 2, the store's real page with changes on it, then
  Approve and publish. New changes are added to the page in place (no
  reload) and the page scrolls to each one with a "Changed by QuickLift"
  label. The **Ideas** tab is the agent's own list of changes for
  the page on screen, each one click away. `&fix=afterpay` opens with a fix switched on;
  `&ask=…&page=product` hands a request straight to the agent.
- `/results?store=…` — step 3, **Results**: revenue since the changes went
  live, in a sentence, three numbers and one chart, with every day folded
  away. **Sample data**, labelled on the page (a store making about A$100k a
  year); connected to a store it would read these from Shopify's analytics.

For presenting, a dark tab bar across the top of every page switches
between Home, What to fix, Preview and approve, and Results (or keys 1–4),
keeping the store. × hides it for the visit (`public/demo-bar.js`).

The example-shop photos in `public/images/home/` are CC0 from StockSnap:
[bowls](https://stocksnap.io/photo/stacked-bowls-FTFTNXN41H),
[mug](https://stocksnap.io/photo/cup-mug-LOSYDU1I0A),
[vases](https://stocksnap.io/photo/jars-blur-JKJS3BCD7N) and
[espresso cups](https://stocksnap.io/photo/ceramic-cup-M50EGNEZ4Z).

## Run it

Needs Node 20 or later.

```bash
npm install
cp .env.example .env     # then put your ANTHROPIC_API_KEY in .env
npm start
```

Open http://localhost:3010. You can also open
`http://localhost:3010/?store=frankbody.com` to check a store straight away.

Without an `ANTHROPIC_API_KEY` everything works except "Describe a change".

To run the mocked online demo on your own computer instead (no API key, no
credit used): `npm run demo`, then open http://localhost:4010. On Windows
PowerShell, if `npm` is blocked by the script policy, use `npm.cmd run demo`.

```bash
npm test
```

## What it does

1. **Check** — reads the store's public pages and product feed (no login) and
   looks for:
   - prices in AUD
   - buy now, pay later (Afterpay, Zip, …) shown near the price
   - delivery cost mentioned up front
   - customer reviews
   - returns policy and "Australian business" signals
   - at least 3 photos per product
   - an Add to cart button that stays in reach on phones

   Each check says **OK**, **Fix** or **Can't tell**. "Can't tell" is used when
   the thing it needs wasn't readable (a hidden product feed, a password page),
   so the tool never claims a store is missing something it simply couldn't see.

2. **Fix (preview)** — a failing check comes with a ready-made fix: a free
   shipping bar, a returns + Australian business bar, Afterpay instalments under
   prices, a sticky Add to cart on phones. Switch one on and the preview of the
   store's real page updates. The bar wording is editable, because only the
   store owner knows what's true. Reviews get no automatic fix on purpose: the
   only honest fix is collecting real ones.

3. **Describe a change** — type something like "make the Add to cart button
   green and bigger". Claude reads an outline of that exact page and writes the
   CSS/JS for it, which is applied to the preview. It's told never to invent
   facts (fake reviews, countdown timers, discounts).

4. **Publish (optional)** — for a store you own, write the changes into the
   live theme, and undo them again. See below.

When the agent makes a change, **The agent at work** shows it working like a
developer: the page it read, the theme's own classes it found to change, and
the CSS and JavaScript typed out as it writes them, before the change goes
on the page. A refusal (fake reviews, made-up claims) stops there with the
reason.

The preview is laid out as a review: the store's page **Now** beside the page
**With your changes**, each scrolling on its own, and a right-hand column with two
cards: **Your changes** (one line each, then Approve and publish or Discard
all) and **Make a change**, with three tabs: **Ask the agent**, **Fixes** and
**Ideas**. **Phone** shows both versions side by side; **Computer** shows
one at a time at desktop width. **Outline what changed** draws a dashed violet
outline round everything we added, and **Theme scripts** can be turned off if a
store's page misbehaves in the preview.

## Demo script (about 3 minutes)

1. Paste `frankbody.com` → **Check store**. Point at the store card (AUD,
   Australian store, theme name) and the three **Fix** items.
2. Switch on **Afterpay instalments**: the page jumps to the price, where
   "or 4 payments of $10.00" is worked out from the sale price, not the
   crossed-out one.
3. Switch on **Returns + Australian business bar**; edit its wording to show it's
   the owner's call.
4. Tick **Sticky Add to cart** → it switches to **Phone** and a product page.
   Scroll down past Add to cart and the sticky bar slides in.
5. **Describe a change**: "Make the Add to cart button bright green, and add a
   small line under it saying Ships from Sydney in 1–2 business days". About
   10 seconds later it's on the page. Open **Show the code** to show it's real
   CSS/JS against the store's own classes.
6. (If set up) **Publish** to your dev store, reload the real store in another
   tab, then **Undo**.

Other stores that show a few fixes: `toyworld.com.au`, `mrsimple.com.au`.
Big brands (Culture Kings, Peppermayo) pass most checks — also worth showing,
as it's what "good" looks like.

## How it works

```
browser (public/)                      server.js (Express)
  check form  ──POST /api/check──────▶  lib/store.js   fetch home page, /products.json,
                                        lib/checks.js  one product page → checks
  fix toggles ──POST /api/preview────▶  lib/fixes.js   presets → one CSS + one JS bundle
                                        lib/preview.js real page + <base href> + bundle
  <iframe srcdoc sandbox>  ◀── html ──
  "describe"  ──POST /api/ai-change──▶  lib/ai.js      page outline + request → Claude
                                                       → { summary, css, js, warning }
  publish     ──POST /api/publish────▶  lib/publish.js Shopify Admin GraphQL:
                                                       snippets/shopfix.liquid + one
                                                       {% render %} line in theme.liquid
```

Decisions worth knowing:

- **The preview is a copy, not the store.** We fetch the page and add our code
  to it, so nothing on the real store changes. It's shown in a sandboxed frame
  with no origin, so neither the store's scripts nor generated code can reach
  this app.
- **Theme scripts kept, everything else dropped.** Galleries and prices on many
  themes need the theme's JavaScript, so its asset files and setup scripts are
  kept. Analytics are removed so demo views never appear in the store's
  reports, and app scripts (pop-ups, geo-redirects) are removed because they
  tend to drag the frame off to another page.
- **Fixes don't trust the page.** Every fix finds its target by the class names
  common Shopify themes use, does nothing if it can't find it, and marks what
  it adds so it never runs twice.
- **Publish is undoable without risk.** All code lives in one snippet; undo
  empties the snippet and never rewrites `theme.liquid`, so it can't wipe out
  an edit the owner made since.
- **Only public pages are read**, and addresses like `localhost` or private IPs
  are refused, so the server can't be pointed at itself.

## Sign-in for the hosted demo (optional)

Set `DEMO_USERNAME`, `DEMO_PASSWORD` and `SESSION_SECRET` in `.env` (or as the
host's secrets) and every page asks for that one shared login first. It keeps
the AI features, which cost money per use, off the open internet, and gives
the judges a login. Leave them empty and the app runs with no sign-in, as
before. `/healthz` stays open for the host's health check. See `lib/auth.js`.

## Publishing to a real store (optional)

Use a store you own — a Shopify Partner dev store is ideal.

1. In the store's admin: **Settings → Apps and sales channels → Develop apps →
   Create an app**. Give it the Admin API scopes `read_themes` and
   `write_themes`, install it, and copy the Admin API access token.
2. In `.env`:
   ```
   SHOPIFY_STORE=your-store.myshopify.com
   SHOPIFY_ADMIN_TOKEN=shpat_...
   STOREFRONT_PASSWORD=...   # only if the store still has a password page
   ```
3. Restart, check that store, and a **Publish** button appears under the
   changes. It only ever publishes to that one store.

## Limits

- Checks read HTML, so a signal drawn entirely by an app after page load (some
  review widgets, some Afterpay badges) can be missed.
- The preview runs the theme's scripts in a sandbox with no cookies, so things
  that depend on a session (cart count, logged-in state) show as a new visitor.
- The AI's change is written against the page it was given; on a very
  different page of the same store it may not apply. It fails quietly rather
  than breaking the page.
