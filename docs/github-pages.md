# The online demo on GitHub Pages

**Link:** https://nickwg113.github.io/shopfix-au/
**No sign-in needed.**

## Why it's a recording

GitHub Pages can only serve files. QuickLift's server does two things a page of files can't:

- **It reads store pages.** A browser isn't allowed to fetch frankbody.com from another site, so the server fetches the page instead.
- **It calls Claude.** Those calls need our API key, which must never be in a public page.

So the online copy is the same front end with the server replayed. `pages/static-api.js` answers the pages' `api/...` calls from files saved in `recording/`.

## What's real and what's replayed

| Part | Online demo | Full app (`npm start`) |
|---|---|---|
| Store pages and checks | Real, read on 15 Nov 2026 | Read live, any store |
| Ready-made fixes | **Live**: the same `lib/fixes.js` code runs in the browser | Live |
| Agent's ideas for a page | Claude's real answers, played back | Asked live |
| "Describe a change" | Recorded requests only, shown as buttons | Anything the owner types |
| Publish and Undo | Not available | Writes to a dev store's theme |

The agent was recorded on **frankbody.com** (home page and one product page, 26 answers). That includes one refusal: "Add five 5-star customer reviews" is declined because the reviews would be fake. Toyworld, Mr Simple and Culture Kings have their pages and checks recorded, so the fixes work there, but the agent wasn't recorded for them: the API credit ran out partway. Add credit and run the recorder again to fill them in.

## Updating it

```bash
node --env-file=.env scripts/record-demo.js          # every store in public/recording-keys.js
node --env-file=.env scripts/record-demo.js toyworld.com.au
node scripts/build-pages.js                           # builds _site/ to check locally
```

The recorder skips what's already recorded. Delete a store's folder in `recording/` to record it again from scratch. Pushing to `main` publishes it (`.github/workflows/pages.yml`).

The recorded pages are copies of public store pages, kept only so the demo can show fixes on them. Their pictures, fonts and styles still load from each store's own site.
