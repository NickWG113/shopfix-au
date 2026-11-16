# PROMPTS.md

QuickLift was built with AI coding assistants, mostly Claude Code. This file has two parts. Part 1 is the prompts QuickLift itself sends to its AI agent, copied exactly. Part 2 is a dated log of how the build developed: each problem we raised and what changed because of it. Part 2 summarises our requests in plain words rather than quoting them.

---

## Part 1: Prompts inside QuickLift

QuickLift's agent is Claude, called through the Anthropic API from our server (`lib/ai.js`). It has two jobs, each with its own system prompt. Both reply in a fixed format (a Zod schema), so the app can read the answer.

### Making a change the owner asks for

Sent with an outline of the store's page and the owner's request. The reply is a summary, CSS, JavaScript and a warning.

```
You edit live Shopify storefront pages for Australian store owners.
You are given an outline of the page's HTML (structure, ids, classes, short text) and a request.
Reply with CSS and/or JavaScript that makes the change on this exact page.

Rules:
- Use selectors that exist in the outline. Prefer stable theme classes and ids.
- JavaScript runs after the page has loaded, in a normal browser, with no libraries. It must be safe to run twice (check before adding an element). Set a data-shopfix-ai attribute on every element you add or change, including elements you only restyle with CSS, so the owner can see what changed.
- No network requests, no cookies or storage, no redirects, no alert(), no external scripts, fonts or images unless the request gives a URL.
- Never invent facts about the business: no fake reviews, ratings, stock counts, countdown timers, discounts, awards or claims. If the request needs a fact you don't have, use a clearly editable placeholder like [your threshold] and say so in warning.
- Australian English and AUD in any text you write.
- Keep it as small as the request needs. Don't restyle things that weren't asked about.
- If the request isn't a change to this page (or can't be done with CSS/JS), return empty css and js and explain in warning.
```

### Suggesting ideas for the page

Sent with an outline of the page and the list of ready-made fixes. The reply is six to eight ideas, each with a title, a reason and a request the owner can send back with one click.

```
You review one page of an Australian Shopify store the way a first-time shopper on a phone would, and suggest changes that would help them buy.
You see an outline of the page's HTML (structure, ids, classes, short text).

Rules:
- Suggest 6 to 8 changes, most useful first, each specific to THIS page (name the actual button, heading or section).
- Every change must be doable on this page with CSS and JavaScript alone: layout, wording that doesn't state new facts, emphasis, ordering, spacing, showing information already on the page more clearly.
- Base each one on widely accepted ecommerce usability practice (the kind Baymard Institute and Nielsen Norman Group publish). Say why in plain words. Never quote numbers, percentages or studies.
- Never suggest fake reviews, ratings, stock counts, countdown timers, discounts, awards or claims, or anything that states a fact about the business the page doesn't already show. If an idea needs a fact only the owner knows, the request must use a clearly editable placeholder like [your returns window].
- Skip what the store's ready-made fixes already cover (listed in the request).
- Australian English.
```

---

## Part 2: How the build developed

### Before 22 October: the groundwork

From August to mid-October, Nicholas worked on an earlier prototype of the same idea. The decisions QuickLift reuses came from that work:

- **Small Shopify stores (August).** Target Shopify stores making five to six figures a year. Most don't have the traffic to run their own A/B tests, so they're better served by changes that are already known to work. Organise the advice by page type: home page, product page, checkout.
- **A preview before anything changes (September).** The owner should see every change on their own page and approve it with one click. Nothing goes live on its own.
- **Look at the site the way a shopper does (September).** The AI should review what a person actually sees on the page, not just run a fixed checklist.
- **No research numbers shown to owners (September).** Published figures guide what to suggest first, but an owner only ever sees facts about their own store.
- **Make the change, don't just describe it (11–13 October).** Giving owners steps to follow in Shopify's editor wasn't enough: the tool should make the change itself.

### 22 October: choosing the problem

**Problem:** the assignment asks how AI can help small and medium Australian businesses. Small online stores lose sales to things a shopper notices in seconds, and most owners have no developer and no way to test changes.

**What we did:** chose Australian Shopify stores, started a simpler version of the earlier prototype in a new repository, and wrote down every design decision from a store owner's point of view.

### 25 October: the first build

**Problem:** we needed a working demo within days: type in a Shopify store, see what to fix, and preview a change on its real page.

**What changed:** the first version checked a store's public pages and previewed fixes live (first commit, "ShopFix AU: check an Australian Shopify store and preview fixes live").

### 27 October: from ShopFix to QuickLift

- **Problem:** the presentation lacked the reasons behind our decisions. **Change:** it now explains why Shopify only (simplest platform to change) and why any kind of online shop (conversion basics apply to all of them).
- **Problem:** the prototype was one screen. **Change:** it became QuickLift: a home page, an owner's dashboard, and a preview of changes before they're approved, with a tab bar to switch between them in a demo.
- **Problem:** our best-practice advice leaned on personal experience. **Change:** a shorter best-practice document built from published research (`docs/best-practices.md`).
- **Problem:** tick boxes for fixes read as permanent decisions, and switching between Before and After made the page flicker. **Change:** fixes became on/off switches, and each change is outlined on the page instead.
- **Problem:** the presentation's wording was generic. **Change:** rewritten in plainer words, slides and speaker notes both.
- **Problem:** owners liked the agent's ideas but wanted more. **Change:** six to eight ideas for each page.

### 28 October: testing it

- **Problem:** would the agent handle requests other than the demo's? Would it work on a real Shopify development store? **Change:** tested both, and documented what works live and what is acted out.
- **Problem:** the dashboard's side links did nothing, and fixes still felt permanent. **Change:** the links scroll to their section, and every fix and idea is a switch.

### 15 November: getting ready to submit

- **Problem:** the brief asks for a deck and a video showing at least three use cases, including the agentic feature, and anyone must be able to try it. **Change:** a fully mocked online demo on GitHub Pages: saved store pages, fixes running in the browser and a simulated agent, so it costs nothing to run and never touches a real store (`pages/static-api.js`, `pages/mock-agent.js`). Also the proof-of-value working (`docs/proof-of-value.md`) and the video script.
- **Problem:** the preview was confusing. **Change:** it became a review: the page **Now** beside the page **With your changes**, and one column for the decision, the agent, the fixes and the ideas.
- **Problem:** walking through the video's use cases turned up six faults. **Change:** all six fixed, including the page scrolling out of view, the agent's refusal of fake reviews disappearing too fast, and Approve and publish being a dead end online.
- **Problem:** the agent's work happened out of sight. **Change:** "The agent at work" shows it working like a developer: the page it read, the theme classes it found, and the code it wrote.
- **Problem:** the right-hand column was cluttered and repeated itself. **Change:** two cards: **Your changes**, and **Make a change** with tabs for Ask the agent, Fixes and Ideas.
- **Problem:** the flow needed to be simple. **Change:** two steps, Dashboard → Preview and approve, with the results and suggested improvements on one dashboard page.
- **Problem:** the first demo store wasn't suited to a classroom. **Change:** Toyworld, a family toy shop, became the demo store.
- **Problem:** owners need to see whether a change helped. **Change:** a change history with a verdict for each change (Winner, Neutral, Loser, or Too early to tell), matched to markers on the revenue chart. All results are sample figures for a A$100,000-a-year store, labelled on the page. They were tuned so each change is easy to see on the chart; the proof of value plans on a cautious 5%.
- **Problem:** the agent's suggestions were too small to matter. **Change:** it builds whole sections: reviews with star ratings (examples in the demo, only real reviews once published), a photo gallery, a "people bought this" line and trust badges. It still refuses fake reviews.

### 16 November: final touches

- **Problem:** the home page read as one long sheet. **Change:** sections sit on rounded colour blocks, with a "What QuickLift noticed" card from Toyworld's real check and a comparison with hiring a developer.
- **Problem:** owners with enough visitors will want a proper test, not just before and after. **Change:** "Or run it as an A/B test" beside Approve and publish, with a test card on the dashboard. In this proof of concept the test is acted out with sample figures, and the card says so.
- **Problem:** after a reload, the demo lost its Undo button for a change already published. **Change:** Undo now stays until the change is taken off.
