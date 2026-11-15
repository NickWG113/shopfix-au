# PROMPTS.md

QuickLift was built with AI coding assistants, mostly Claude Code. This file has two parts. Part 1 is the prompts QuickLift itself sends to its AI agent. Part 2 is the prompts that shaped the build, in the order they were sent, with their real dates.

The prompts are copied as typed, typos included. Secret keys, names outside the team, employer details and swearing have been removed or replaced with [brackets], and long prompts are cut with "…".

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

## Part 2: Prompts that shaped the build

### Before 22 October: the groundwork

Before the assignment, Nicholas spent August to mid-October working with Claude on an earlier prototype of the same idea. The decisions QuickLift reuses came from that work:

- **Small Shopify stores (August).** Target Shopify stores making five to six figures a year. Most don't have the traffic to run their own A/B tests, so they're better served by changes that are already known to work. Organise the advice by page type: home page, product page, checkout.
- **A preview before anything changes (September).** The owner should see every change on their own page and approve it with one click. Nothing goes live on its own.
- **Look at the site the way a shopper does (September).** The AI should review what a person actually sees on the page, not just run a fixed checklist, and it should work for any kind of online shop.
- **No research numbers shown to owners (September).** Published figures guide what to suggest first, but an owner only ever sees facts about their own store.
- **Make the change, don't just describe it (11–13 October).** Giving owners steps to follow in Shopify's editor wasn't good enough: the tool should make the change itself. This led to the research on what Shopify lets an outside app change in a store's theme.

### 22 October: the uni assignment

> Okay, long story short is our university assignment is that we need to use AI to help small to medium enterprises in Australia. I figured that since we've built out an actual product, we can probably leverage a lot of this. What I think we should do is build a much simpler version of this in a separate repo. The requirement that we're looking to do is help e-commerce websites using Shopify to optimize their stores. So we'll just have a much simpler version of [our earlier prototype]. We'll make a much simpler website. We can just show the [stuff] in my localhost, stuff like that. As an initial starting point, I need to give a context doc of every decision we've had as to why we've done things. To Isaac's document, sorry, Isaac's my friend. To his codex, so we can fill out some forms. But I want you to frame these decisions that we would have made from the perspective of a small to medium enterprise. …

### 25 October: the first build (on another computer)

This chat ran on a different computer, so only its opening prompt is recorded here. It produced the first commit, "ShopFix AU: check an Australian Shopify store and preview fixes live".

> Essentially, I have a uni assignment. … what we need to do is make a much more simple version of this. Essentially, it's just Australian e-commerce websites that use Shopify. It'll be this tool. We need to have a live demo Wednesday, and since we already have all of this information here, I thought we could probably just use it again. … So all I need to do is have a product where you can put in a Shopify website and make live changes to it. …

[Further prompts from this chat: to be added from the other computer]

### 27 October: from ShopFix to QuickLift

> there should be a repo we can connect to - can i set it up in this chat maybe?

> Yes, start ShopFix in the browser pane and run it on frankbody.com, including a 'Describe a change' edit.

> i more mean that i want to give you this link to help improve our presentation. part of this was just a really quick mock-up but lacks the decisions etc we have had to make. can you take control of my computer, look through here then improve the presentaion by making our own?

> the main things we need to see is okay we only are doing shopify businesses because it is simplest to be enabled on their platform. next, we are targeting ecommerce businesses becuase fundementally cro works for all ecommerce.

> and we need to make our demo strong too

> maybe we also need to fix our prototype tool. i think we should build out the home page ([we can reuse our earlier prototype's], maybe we just make the name quicklift.ai and change the colours then we copy the home page and make it only for shopify. then we can have a dashboard that the owner sees, and then finally we can have the current ui which shows the changes before they approve them. does this make sense?

> for quicklift.ai can we please also make a much more simplified best practice document using things from onlien rather than my [work] experience?

> and for the live demo with the home page, dashboard and also sample change let me easily change with a tab at the top like we had for the original version. does this make sense?

> can we make this tickbox different maybe a toggle that calls it out better

> after you finish this i need you to go through the presentation to make sure it doesnt look ai. use the humanizer skill to address any wording etc.

> the toggle at the top is not good for before and after lets remove. also it flickers when. i swap between before and after. maybe we make it so that we also highlight the change on the page or something so it is obvious what do you think?

> can you give more suggestions for the page too? i love them i just want moer

### 28 October: testing it, and the demo

> if i ask something other than that exact prompt request, will it still action?

> can you please also let me know - would this actually work on a shopify development store

> do you think our demo is fine for 4 minutes?

> if i actually ask it stuff like this will it do it or is it all movie magic right now

> these left tabs dont work

> also make these a toggle - not a set in stone deciison

### 15 November: getting ready to submit

> we need to make some finishing touches to this. we needto have 3  things ready to present i think[course brief link] 1. Slide deck (PDF) … 2.Demonstration video … Show the PoC working across at least three different use cases. Your agentic feature should be one of them.

> what can we showcase and waht do we need to build

> 1. sure build 2. make public 3. create it 4. lets mock data. we can extrapolate that a buisiness making 100k a year with a 5% increase makes 5 grand. etc. 5. someone else doing 6. someone else doing 7. that is us. we need to make sure we shoud the different use cases etc.

> wait. do NOT touch [our earlier prototype's] repo. this is meant to be the shopfix repo. please do NOT touch [it]

> you can take inspuiration from there thoug

> can we not just have it live on hibut

> github

> why are you using api credit? i font want anything actually live i just want to mock it all

So the online copy is fully mocked: saved store pages, the fixes running in the browser, and a mocked agent that writes simple changes from the request's wording (`pages/mock-agent.js`), with no API calls.

What came out of it: the mocked online demo on GitHub Pages (`pages/static-api.js`, `pages/mock-agent.js`, `scripts/record-demo.js`, `scripts/build-pages.js`, `docs/github-pages.md`), a shared sign-in for when the full app is hosted (`lib/auth.js`), the proof-of-value working (`docs/proof-of-value.md`), and the demo video script (`docs/demo-video-script.md`).

> lets make this ui better. … i mean the preview change ui etc. rn it looks really confusing

The preview became a review: the page **Now** beside the page **With your changes**, and one column for the decision, the agent, the fixes and the ideas.

> what is next. can you audti to make sure it is what we what. what use cases are we shoiwing

Walking through every use case in the video script on the live demo turned up six problems, all fixed: the store's page scrolled out of view while switching on fixes further down the column (it now stays in view); the agent's refusal of fake reviews only flashed up for a few seconds (it now stays under the request); Approve and publish was a dead end online (it's now acted out, with Undo and the dashboard's "live on your store" count); the dashboard showed two sets of suggested requests; findings with no ready-made fix were squashed into a narrow column; and the dashboard sat to one side on wide screens.

> yeah i want to display giving an dea and implementing it, an ai developer and then the daily tracking of stats

Three additions for the video. When the agent makes a change, it is now shown working like a developer ("The agent at work": the page it read, the theme classes it found, and its CSS and JavaScript typing out before the change goes on the page). Switching on one of its ideas shows the same thing, so an idea becomes a change on screen. And a new Daily results page shows conversion rate, orders and revenue day by day, before and after the changes went live. Its figures are sample data for a A$100k-a-year store, and the page says so.

> [screenshot of the preview's right-hand column] this menu just feels wayyy too cluitered. spend some time thinking about how to make it better

The column had five cards open at once, the same "nothing goes live until you approve" message three times, and a second red box under the agent's log. It is now two cards: **Your changes** (one line per change with ×, then Approve and publish) and **Make a change**, with tabs for **Ask the agent**, **Fixes** and **Ideas**, so only one way of changing the page is open at a time. The agent's log opens where the request came from, and a refusal shows inside it.

> please do that for the entire flow. i tneeds to feel REALLY simple to understand

Every page now follows one idea: the flow is three steps, and each page says which one you're on. The dark Demo bar and the dashboard's side menu are gone (keys 1–4 still switch pages for presenting), and the pages' tabs became a step bar, **1 What to fix → 2 Preview and approve → 3 Results**. The home page went from eight sections to five (the walkthrough that repeated How it works, and the A/B, Shopify and pricing panels, became three questions). Step 1 says what the check found in one sentence and names each problem as a problem. Step 2 lost the repeated badges and the page address. Step 3 answers first, in a sentence, then three numbers and one chart, with every day folded away. After approving, "Next: see the results →" leads to step 3.

> give me the ability to swap tabs at the top thanks

The dark tab bar is back across the top of every page, home included: Home, What to fix, Preview and approve, Results, keeping the store (keys 1–4 too, × hides it).

> [screenshot of the two phone previews] dont make this scroll together it feels weird

"Now" and "With your changes" each scroll on their own now; "Now" no longer follows the other page.

> i cant see this working either? [screenshot of an agent idea switched on, with nothing visible on the page]

That idea's change waited for the store's product recommendations, which never load in a saved copy, so it hid the section instead. Every idea and suggested request was then tested on the new demo store's saved pages, and the simulated agent was taught that theme's price classes so each one visibly changes the page.

> the dashboard of results should be on the same page Like essentially this, there should be one page which is like a dashboard for them. And the top, it has like all the results and stuff and improvements over time, like the results screen that you have, which is great. We just want to have a bit maybe below that that says like, oh, suggested improvements, blah, blah, blah. So it's like a spot they can look one thing and see everything, if that makes sense. Also, maybe we do a shop other than Frank and Body just because of the nature of the product. And I don't want to have some of this content shown to a uni lecturer. Thank you.

> like its a bit sexual

The dashboard is now the one page: **How your store is doing** (the results, sample data) at the top, **Suggested improvements** below, and an approved fix shows as "✓ Fixed, live". The flow is two steps, Dashboard → Preview and approve, and the old Results link forwards to the dashboard. Frank Body was taken out of the online demo entirely; Toyworld, a family toy shop, is the demo store now. The sample results were evened out so they show the 5% lift the proof of value assumes, not a lucky 12%.
