# QuickLift: proof of value

Material for the deck's proof-of-value section. It has three parts, and each one says how solid it is:

1. **What it could be worth to a store.** A projection, worked from stated assumptions. It is not a measured result.
2. **What we changed after testing.** Real. These changes are in the repo's history and in PROMPTS.md.
3. **User testing and partner feedback.** Illustrative figures in a ready-made layout. Label them as illustrative in the deck, or replace them with real sessions before submitting (section 3 says how).

---

## 1. What it could be worth: a worked example

**The store.** It's an Australian Shopify store making **A$100,000 a year**, which sits in our target range of five to six figures. Its average order is A$80 and 2.0% of visits end in a sale. Those are typical small-store figures, chosen to make the arithmetic easy to follow.

| | Before | After a 5% relative lift |
|---|---|---|
| Visits a year | 62,500 | 62,500 (no extra traffic needed) |
| Visits that buy | 2.0% | 2.1% |
| Orders a year | 1,250 | 1,312 |
| Revenue a year | A$100,000 | **A$105,000** |
| Extra revenue | | **+A$5,000** |

**The rule of thumb:** extra revenue = annual revenue × lift. At 5%, every A$100k of sales becomes about A$5k more, with no extra spend on ads.

### Three scenarios

The 5% figure is an assumption. That's why the slide should show a range rather than one number.

| Annual revenue | Cautious (1%) | Middle (3%) | Hopeful (5%) |
|---|---|---|---|
| A$50,000 | A$500 | A$1,500 | A$2,500 |
| A$100,000 | A$1,000 | A$3,000 | **A$5,000** |
| A$250,000 | A$2,500 | A$7,500 | A$12,500 |
| A$500,000 | A$5,000 | A$15,000 | A$25,000 |

### Why the lift is plausible, and the honest caveats

- Every fix QuickLift offers comes from published usability research (docs/best-practices.md). One example: Baymard lists surprise costs, such as delivery, as the most common reason shoppers abandon a checkout after "just browsing". The research says *what* to fix. It doesn't promise a percentage, so 1–5% is our assumption.
- A store with 62,500 visits a year can't prove a lift of a few percent with its own A/B test. That is exactly why these stores need changes that are already known to work, and it's our core argument.
- Revenue isn't profit. At a 40% gross margin, A$5,000 of extra sales is about A$2,000 of extra profit. Say so on the slide before a judge asks.
- **Where this number belongs:** in the deck only. QuickLift itself never shows an owner a predicted lift or a research figure (PROMPTS.md, "No research numbers shown to owners"). That's a design decision worth naming in the deck.

---

## 2. What we changed after testing (real)

Each of these came from using the prototype ourselves or showing it to others. All are in the git history between 27 and 28 October.

| What we saw | What we changed |
|---|---|
| Switching Before/After made the store page flicker, and it was hard to tell what had changed | Removed Before/After. Changes are now added in place, the page scrolls to each one, and each gets a "Changed by QuickLift" label |
| Tickboxes for fixes read as permanent decisions | Every fix and every agent idea became an on/off switch that says whether it's on |
| The agent's ideas were well liked, but there weren't enough of them | "More ideas for this page" now gives 6–8 ideas specific to the page on screen, each one click away |
| The dashboard's side links didn't do anything | They now scroll to their section and highlight it |
| Store scripts dragged the preview off to the real site | App and tracking scripts are removed from the preview, and theme scripts are kept |
| The trust bar was hidden under some stores' sticky headers | It now sits inside the sticky header |
| The deck read as AI-written | Rewrote it in plainer words, slides and speaker notes both |

---

## 3. User testing and partner feedback (illustrative)

> **Illustrative figures.** The numbers below show the layout and what good results would look like. If no real sessions are run before submission, mark this slide "Illustrative" in the deck. Presenting made-up testing as real is the one thing a judge can't forgive.

### How to run it for real (about 20 minutes a person)

1. Find 3–5 people who run or work in a small online shop (or friends who shop online often, as a fallback).
2. Give them three tasks and time each one: (a) check a store and say what it should fix first, (b) switch on one fix and find it on the page, (c) ask the agent for a change in their own words.
3. Ask: "How confident are you that the change is right for this store?" (1–5) and "Would you pay for this? How much a month?"
4. Write down one quote from each person.

### Results layout (illustrative)

| Task | Finished without help | Average time |
|---|---|---|
| Check a store and name the top fix | 5 of 5 | 0:48 |
| Switch on a fix and find it on the page | 5 of 5 | 0:35 |
| Ask the agent for a change in their own words | 4 of 5 | 1:20 |

| Question | Average (1–5) |
|---|---|
| "I understood why each fix was suggested" | 4.4 |
| "I'd trust this to change my store after seeing the preview" | 4.0 |
| "I'd use this instead of hiring a developer for small changes" | 4.2 |

**Typical themes to listen for:** the preview before anything goes live builds trust; owners want to edit the wording of a fix themselves; and some ask whether it works on their theme (it fails quietly rather than breaking the page).

### Partner feedback (illustrative)

| From | Said | What we did |
|---|---|---|
| Small-store owner (homewares) | Wanted to change the free-shipping threshold, not accept ours | Bar wording and threshold are editable |
| Small-store owner (fashion) | Nervous about anything going live without checking | Nothing publishes without Approve, and Undo restores the theme |
