# PROMPTS.md

QuickLift was built with AI coding assistants, mostly Claude Code. It is a cut-down, Shopify-only version of Avery, a product Nicholas has been building with Claude since August 2026, so many of QuickLift's decisions were first made in those Avery chats.

This file has two parts. Part 1 is the prompts QuickLift itself sends to its AI agent. Part 2 is the prompts that shaped the build, in the order they were sent, with their real dates. Part 2 only includes prompts about Shopify and the QuickLift build; chats about other platforms, billing and admin are left out.

The prompts are copied as typed, typos included. Secret keys, a co-founder's name, employer details and swearing have been removed or replaced with [brackets], and long prompts are cut with "…".

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

### 19–20 August: why Shopify (Avery's first chat)

The first prompt set the target: small Shopify stores that don't have the traffic to run their own A/B tests.

> Can you see files inside here? … essentially, our idea is a AI agent that does three main things. So the first one is is a AI developer. Um, second is it automatically injects analytics. And then the third thing is I am currently working as a CRO product manager, and I have experience in knowing what experience work. Um, combining these two will automatically recommend improvements. And what we're targeting here is Shopify stores, um, because it's, like, hundreds of thousands that make, you know, up to five or six figures in revenue. A lot of those don't have the traffic to do AB tests, so just base improvements would would be better for the most of the time. And, you know, we'll charge, like, a monthly fee of hundred to two hundred dollars. I wanna know exactly what is working right now based on this repo and what still has to be coded. …

> since we are going to be applying this to other shopify websites, would it be ggod to have results split across stuff like home page, offer page, search page, checkout etc

> can i create a free fake shopify account?

> so would this have any benefit over shopify's tracking currently?

> give me a list of metrics we can and cant do, alongside if shoipify already allows it. im scared this part will be worthless

### 24 September: the owner sees a preview before anything changes

> i actually love the reccomednations you gave them - just to confirm, we will give them the ability to actually action those changes by clicking a button, we will code and give a preview then they can look?

### 11–13 October: making real changes to a Shopify store

This is where the approach QuickLift uses was worked out. Shopify limits what an outside app can change in a store's theme, and these prompts pushed past "give the owner steps to follow".

> Test a full shopify fix.

> For anything else, like moving a section or rewording a heading, Avery gives the merchant steps to do it in Shopify's editor themselves. That's the limit of what Shopify allows apps. this is terrible? there has to be a way we can do this

> do you understand what i want? i want us to be able to reccomend changes, and then for it to happen.

> no but i dont just want style changes i want to be able to completely change the page. does this make sense>

> so there is no way to create custom code in shopify atm?

> you can defintiely connect claude to shopify. surely we can connect using our thing then??

> so there is NOTHING we can do there? doesnt it make it like useless for shopifuy stores???

> with context about what we are talking about, please do deep research online to see what platofmrs ecommerce websites use to host? if like 90% are shopify and we dont have a great solution this is bad

> always come back to the use case of what we want and how to provide as much value as possible.

> can you test a larger change on shopify please then? ive opened the tabs in my chrome so you can use.

> give me a simple table of what is possible but not done, done, or not possible for the ideas for avery in these platforms in a tbale

> i dont want this to be the end of the idea

> how do we get full theme access? explain this more please

> i dont want this only scoped to how to get enabled on shopify though. i want a proper good ab testing platform. remember this and get fable to look into it it is important

> in our most recent chat we talk through building an a/b testing platform. i have you on fable i want you to essentially audit the plan for wha it suggested. dont build anything, just audit and note down any recceomdnations

### 22 October: the uni assignment

> Okay, long story short is our university assignment is that we need to use AI to help small to medium enterprises in Australia. I figured that since we've built out an actual product, we can probably leverage a lot of this. What I think we should do is build a much simpler version of this in a separate repo. The requirement that we're looking to do is help e-commerce websites using Shopify to optimize their stores. So we'll just have a much simpler version of Avery. We'll make a much simpler website. We can just show the [stuff] in my localhost, stuff like that. As an initial starting point, I need to give a context doc of every decision we've had as to why we've done things. To Isaac's document, sorry, Isaac's my friend. To his codex, so we can fill out some forms. But I want you to frame these decisions that we would have made from the perspective of a small to medium enterprise. …

### 25 October: the first QuickLift build (on another computer)

This chat ran on a different computer, so only its opening prompt is recorded here. It produced the first commit, "ShopFix AU: check an Australian Shopify store and preview fixes live".

> Essentially, I have a uni assignment. … what we need to do is make a much more simple version of this. Essentially, it's just Australian e-commerce websites that use Shopify. It'll be this tool. We need to have a live demo Wednesday, and since we already have all of this information here, I thought we could probably just use it again. … So all I need to do is have a product where you can put in a Shopify website and make live changes to it. …

[Further prompts from this chat: to be added from the other computer]

### 27 October: Shopify sign-in, and how a competitor changes pages

> no but i cant sign in because i dont have a shopify store

> i feel like our ui still isnt great for inside the portal - are there any examples for what competitors have?

> oh so shoplyft just uses theme editor to change stuff?

### 27–28 October: turning ShopFix into QuickLift

> there should be a repo we can connect to - can i set it up in this chat maybe?

> Yes, start ShopFix in the browser pane and run it on frankbody.com, including a 'Describe a change' edit.

> i more mean that i want to give you this link to help improve our presentation. part of this was just a really quick mock-up but lacks the decisions etc we have had to make. can you take control of my computer, look through here then improve the presentaion by making our own?

> the main things we need to see is okay we only are doing shopify businesses because it is simplest to be enabled on their platform. next, we are targeting ecommerce businesses becuase fundementally cro works for all ecommerce.

> and we need to make our demo strong too

> maybe we also need to fix our prototype tool. i think we should build out the home page (we can copy avery, maybe we just make the name quicklift.ai and change the colours then we copy the home page and make it only for shopify. then we can have a dashboard that the owner sees, and then finally we can have the current ui which shows the changes before they approve them. does this make sense?

> for quicklift.ai can we please also make a much more simplified best practice document using things from onlien rather than my [work] experience?

> and for the live demo with the home page, dashboard and also sample change let me easily change with a tab at the top like we had for the original version. does this make sense?

> can we make this tickbox different maybe a toggle that calls it out better

> after you finish this i need you to go through the presentation to make sure it doesnt look ai. use the humanizer skill to address any wording etc.

> the toggle at the top is not good for before and after lets remove. also it flickers when. i swap between before and after. maybe we make it so that we also highlight the change on the page or something so it is obvious what do you think?

> can you give more suggestions for the page too? i love them i just want moer

> if i ask something other than that exact prompt request, will it still action?
