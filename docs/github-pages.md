# The online demo on GitHub Pages

**Link:** https://nickwg113.github.io/shopfix-au/
**No sign-in needed. Nothing in it is live**: no server, no AI calls, and nothing touches the real stores.

## How it works

GitHub Pages can only serve files, so the online copy is the same front end with the server replaced by `pages/static-api.js`. That file answers the pages' `api/...` calls in the browser:

| Part | Online demo | Full app (`npm start`) |
|---|---|---|
| Store pages and checks | Saved copies of four stores' home and product pages, from 15 Nov 2026 (`recording/`) | Read live, any store |
| Ready-made fixes | The same `lib/fixes.js` code, run in the browser on the saved pages | Same |
| Agent: ideas and "Describe a change" | **Mocked** (`pages/mock-agent.js`). It reads the request for what to change (button, title, price, product cards), a colour, bigger, bolder, rounded, on phones, and a line of text "saying …", then writes the CSS and JavaScript itself. It refuses requests for fake reviews, timers or discounts, as the real agent does. | Claude, live |
| Results | Sample figures, labelled on the page, for a store making about A$100k a year (`public/results.js`) | The same sample: reading real figures from Shopify's analytics isn't built yet |
| Publish and Undo | **Acted out.** Approve and publish says what would go live, step 1 shows it as live (in that browser only), and Undo takes it off. Nothing is written anywhere. | Writes to a dev store's theme |

On frankbody.com, the agent's ideas and the suggested requests play back answers saved once from the real agent. Everything else, on every store and anything typed, uses the mock.

## Things to try

- Type your own request, e.g. *"Make the Add to cart button rounded and purple, and add a line under it saying Free returns within 30 days"*.
- Ask for something it should refuse: *"Add five 5-star reviews under the price"*.
- Switch on one of the agent's ideas in the **Ideas** tab.

## Updating it

```bash
node scripts/record-demo.js              # re-save pages and checks for every store in public/recording-keys.js
node scripts/build-pages.js              # build _site/ to check locally
```

Neither needs an API key. Pushing to `main` publishes the site (`.github/workflows/pages.yml`).

The saved pages are copies of public store pages, kept only so the demo can show fixes on them. Their pictures, fonts and styles still load from each store's own site.
