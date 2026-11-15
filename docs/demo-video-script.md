# Demo video: script and shot list

**Length:** about 8½ minutes, under the 10-minute limit with room to spare.
**Use cases shown:** five. The brief asks for at least three, including the agentic feature (use case 3).
**Record on the full app running locally** (`npm start`, then http://localhost:3010). The online copy on GitHub Pages replays recorded agent answers, so it can't show the agent taking a request typed in your own words. The full app needs Anthropic API credit; the account ran out on 15 November, so top it up first. If you can't, record on the online copy and use its recorded-request buttons instead. Frank Body has all of them.

Before recording:

- Run each store through once, so pages load quickly on camera.
- Use browser zoom at 110–125% so text is readable on a laptop screen. Hide bookmarks. Close other tabs.
- Have the dev store open in a second tab if you're showing use case 4.
- Press × on the dark Demo bar if you don't want it in shot. Keys 1, 2 and 3 still switch pages.

---

## 0:00 Opening (30 s)

**Show:** the QuickLift home page.

**Say:** "Small Australian Shopify stores lose sales to things a shopper notices in seconds: no Afterpay near the price, delivery cost hidden until checkout, no returns policy in sight. They don't have a developer or enough traffic to run A/B tests. QuickLift finds those gaps on a store's real pages and fixes them, with a preview the owner approves first. You can try a recorded copy yourself at the link in our deck."

---

## Use case 1: check a store (1 min 30 s)

**Show:** the home page. Paste `frankbody.com` and press Check store. The dashboard loads.

**Say and point:**

- "It reads only public pages: the home page, the product feed and one product page. No login or app install is needed to get a first answer."
- The store card shows AUD, an Australian store and the theme name.
- "What to fix first" shows **Fix** items, most important first.
- Open "Looking good" to show what passed.
- "When it can't read something, like a hidden product feed, it says *Can't tell*. It never claims a store is missing something it couldn't see."

---

## Use case 2: one-click fixes on the real page (2 min)

**Show:** click a Fix item so the preview opens on the store's real page.

1. Switch on **Afterpay instalments**. The page scrolls to the price, where "or 4 payments of …" appears. **Say:** "It's worked out from the sale price, not the crossed-out one."
2. Switch on the **Returns and Australian business bar**, then edit its wording. **Say:** "Only the owner knows what's true about their business, so every line can be changed."
3. Switch on **Sticky Add to cart**. It moves to Phone view and a product page. Scroll past Add to cart and the bar slides in.
4. Point at the violet "Changed by QuickLift" outlines. **Say:** "Every change is labelled, so the owner sees exactly what's different."

---

## Use case 3: the agent (agentic feature) (2 min 30 s)

This is the most important part of the video. Take your time.

**Part A: the agent suggests changes (1 min).**

- Open **More ideas for this page**. **Say:** "The agent looks at this exact page the way a first-time shopper on a phone would, and suggests 6–8 changes, each one naming a real button or section on this page."
- Switch one idea on and show it appear in place.

**Part B: the owner asks in plain English (1 min 30 s).**

- Type in your own words, for example: *"Make the Add to cart button bright green, and add a small line under it saying Ships from Sydney in 1–2 business days."*
- While it works (about 10 seconds), **say:** "It reads an outline of this page, writes the change against the store's own theme classes, and checks it against our rules. It never invents reviews, discounts, countdown timers or other claims about the business."
- When the change appears, open **Show the code**. **Say:** "It's real CSS and JavaScript, not a mock-up."
- Optionally ask for something it should refuse, like *"add five 5-star reviews"*, and show its warning. That proves the rule is real.

---

## Use case 4: publish and undo on a real store (1 min)

Do this only if the dev store is set up on the live link; otherwise skip it and use the time on use case 3.

- Press **Approve and publish**. Reload the dev store in the other tab and show the change live.
- Press **Undo**, then reload. **Say:** "All our code lives in one snippet, and Undo empties it. It never rewrites the owner's theme, so it can't wipe out their own edits."

---

## Use case 5: what "good" looks like, and being honest (40 s)

- Check a big brand such as `culturekings.com.au` or `peppermayo.com`. Most checks pass. **Say:** "That's what good looks like, and the tool says so rather than inventing problems."
- Optionally check `toyworld.com.au` to show a store with several Fix items.

---

## Close (30 s)

**Show:** the dashboard's "Live on your store" card.

**Say:** "QuickLift turns published usability research into changes a small store can see on its own page and approve in one click. For a store doing A$100k a year, a 5% lift is about A$5,000 more in sales with no extra ad spend. Our proof-of-value slides show the range, from cautious to hopeful. The code, the prompts we used and the login are all in the deck."

---

## Upload checklist

- [ ] Under 10:00
- [ ] YouTube **Unlisted** (not Private), or OneDrive set to "Anyone with the link can view"
- [ ] Open the link in a private window while signed out to confirm it plays
- [ ] Link pasted into the deck's access-details slide
