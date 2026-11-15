# Demo video: script and shot list

**Length:** about 9 minutes, under the 10-minute limit.
**Store:** Toyworld (`toyworld.com.au`), a family toy shop with four real things to fix.
**Use cases shown:** six. The brief asks for at least three, including the agentic feature. The three to give most time: the agent turning an idea into a change (use case 3), the agent as an AI developer (use case 4), and the dashboard's results (use case 6).
**Record on the online demo:** https://nickwg113.github.io/shopfix-au/. Everything in it is mocked, so it needs no API credit and can't go wrong on the day. You can type your own requests to the agent; docs/github-pages.md lists the kinds of request the simulated agent understands. Press × on the purple "Online demo" note if you don't want it in shot.

Before recording:

- Open Toyworld's dashboard and preview once, so pages load quickly on camera.
- Use browser zoom at 110–125% so text is readable on a laptop screen. Hide bookmarks. Close other tabs.
- Switch pages with the dark tab bar across the top (Home, Dashboard, Preview and approve), or keys 1 to 3. Press × on it if you don't want it in shot; the keys still work.

---

## 0:00 Opening (30 s)

**Show:** the QuickLift home page.

**Say:** "Small Australian Shopify stores lose sales to things a shopper notices in seconds: delivery cost hidden until checkout, no returns policy in sight, nothing saying the business is local. They don't have a developer or enough traffic to run A/B tests. QuickLift finds those gaps on a store's real pages and fixes them, with a preview the owner approves first. You can try a recorded copy yourself at the link in our deck."

---

## Use case 1: the dashboard (1 min 30 s)

**Show:** the home page. Click **toyworld.com.au** under the address box (or type it and press Check my store free). The **Dashboard** loads.

**Say and point:**

- The step bar at the top: **1 Dashboard → 2 Preview and approve**. **Say:** "Two steps. The dashboard is the one page an owner checks: how the store is doing, and what to improve next."
- **How your store is doing** at the top. **Say:** "Nothing is live yet, so this is a sample, and it says so. We'll come back to it once a change is live."
- Scroll to **Suggested improvements**: "We found 4 things to fix. 3 are already looking good." Each problem is named plainly, most important first: delivery cost isn't clear up front, no customer reviews, nothing says it's Australian, too few photos.
- **Say:** "It reads only public pages: the home page, the product feed and one product page. No login or app install is needed. Where there's no automatic fix, like reviews, it says what the owner can do instead. It never adds fake reviews."
- Open **Already looking good** to show what passed.

---

## Use case 2: one-click fixes on the real page (1 min 30 s)

**Show:** press **Preview the fix** on "Delivery cost isn't clear up front". The preview opens on Toyworld's real home page, with the **Fixes** tab open on the right.

1. The free-shipping bar appears at the top of **With your changes**, beside **Now**. **Say:** "The store's real page, with the fix on it. Only the owner sees this."
2. Edit its wording in the box under the switch. **Say:** "Only the owner knows their real threshold, so every line can be changed."
3. Switch on **Returns + Australian business bar** too. Point at the dashed violet outlines. **Say:** "Every change is outlined, so the owner sees exactly what's different."

---

## Use case 3: an idea, then the agent makes it (1 min 15 s)

The agentic feature, part one. Take your time.

- Press **Product page** above the preview, then open the **Ideas** tab on the right. **Say:** "The agent looks at this exact page the way a first-time shopper on a phone would, and suggests changes."
- Read one idea aloud, such as **Make the price easier to see**, then switch it on. **The agent at work** opens right above the ideas and, a moment later, the change is on the page under **With your changes**.
- **Say:** "One click from an idea to the change on the store's own page. Nothing is live yet."

---

## Use case 4: the agent as an AI developer (1 min 45 s)

The agentic feature, part two: the owner asks for something in their own words, and the agent does a developer's job.

- Open the **Ask the agent** tab and press the chip **Green button + "Ships from Sydney"** (or type: *"Make the Add to cart button bright green, and add a small line under it saying Ships from Sydney in 1–2 business days."*).
- Point at **The agent at work** as it goes. **Say:** "It reads the page, finds what to change in the store's own theme, these class names here, and writes the CSS and JavaScript. You're watching it write the code."
- The page scrolls to the green Add To Cart button and the new line. **Say:** "No developer, no ticket, no waiting a week. And it works to rules: it never invents reviews, discounts, countdown timers or claims about the business."
- Prove the rule: press the chip **Fake 5-star reviews (it'll refuse)**. The log stops with a **!** and the reason, in red. **Say:** "It refuses, and explains why: fake reviews break Australian Consumer Law."

---

## Use case 5: approve, publish and undo (1 min)

The online demo acts this out: nothing is written to the real store, but every step shows.

- Point at **Your changes** at the top right: every change is listed on one line, each with **×** to remove it. **Say:** "Nothing goes live until the owner approves it."
- Press **Approve and publish**. The message says the changes are now live in one snippet in the store's theme.
- Press **Undo published changes**. **Say:** "All our code lives in one snippet, and Undo empties it. It never rewrites the owner's theme, so it can't wipe out their own edits." Then approve again.

In the full app with a dev store connected, this writes to the real theme: reload the store in another tab to show it live, then Undo.

---

## Use case 6: results on the dashboard (1 min 15 s)

Press **See the results on your dashboard →** under the Approve button.

- **Say first:** "These are sample figures, labelled on the page, for a store making about A$100,000 a year. Connected to a real store, this reads each day's visits, orders and revenue from Shopify."
- Read the first sentence aloud: revenue up since the changes went live, by about 5%.
- The three tiles: revenue for the 14 days since, the share of visits that bought, and today so far.
- Hover over the revenue chart: lighter bars before, violet after, and the dashed line where the changes went live. **Say:** "Compare weeks, not days: a small store's daily figures jump around."
- Point at **Change history** beside the chart: every change with its verdict, **Winner**, **Neutral** or **Loser**. Click one to open when it went live, where it came from and what it did. The numbers and colours match the markers under the chart, and the black line (the average day between changes) dips while the loser was live and steps up with each winner. **Say:** "The owner sees what changed, when, and whether it helped. The rounder button was a loser, so it was undone. The one approved today says too early to tell: a day of sales proves nothing." Then scroll down: the delivery item now says **✓ Fixed, live**, and the next suggestions are right below. **Say:** "One page: how it's going, and what to do next. A 5% lift on A$100,000 a year is about A$5,000 more in sales, with no extra ad spend."

If time is short, cut use case 1's "Already looking good" and use case 2's wording edit before cutting any of this.

Optional, 20 s, if there's time: check `culturekings.com.au`, a big brand where most checks pass. **Say:** "That's what good looks like, and the tool says so rather than inventing problems."

---

## Close (30 s)

**Show:** the dashboard.

**Say:** "QuickLift turns published usability research into changes a small store can see on its own page, approve in one click, and then watch on one dashboard. For a store doing A$100k a year, a 5% lift is about A$5,000 more in sales with no extra ad spend. Our proof-of-value slides show the range, from cautious to hopeful. The live demo, the code and the prompts we used are all linked in the deck."

---

## Upload checklist

- [ ] Under 10:00
- [ ] YouTube **Unlisted** (not Private), or OneDrive set to "Anyone with the link can view"
- [ ] Open the link in a private window while signed out to confirm it plays
- [ ] Link pasted into the deck's access-details slide
