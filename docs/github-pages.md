# The online demo on GitHub Pages

**Link:** https://nickwg113.github.io/shopfix-au/
**No sign-in needed. Nothing in it is live**: no server, no AI calls, and nothing touches the real stores.

## How it works

GitHub Pages can only serve files, so the online copy is the same front end with the server replaced by `pages/static-api.js`. That file answers the pages' `api/...` calls in the browser:

| Part | Online demo | Full app (`npm start`) |
|---|---|---|
| Store pages and checks | Saved copies of three stores' home and product pages (Toyworld, Mr Simple, Culture Kings), from 15 Nov 2026 (`recording/`) | Read live, any store |
| Ready-made fixes | The same `lib/fixes.js` code, run in the browser on the saved pages | Same |
| Agent: ideas and "Describe a change" | **Mocked** (`pages/mock-agent.js`). It builds whole sections: a reviews section with star ratings (example reviews, labelled), a photo gallery from the product's own photos, a "bought in the last 30 days" line, trust badges under the button, and Bestseller badges on the home page. It also reads a request for what to change (button, announcement bar, title, price, product cards), a colour, bigger, bolder, rounded, on phones, new wording "to say …", and a line of text "saying …", then writes the CSS and JavaScript itself. It refuses requests for fake reviews, timers or discounts, as the real agent does. | Claude, live |
| Results (top of the dashboard) | Sample figures, labelled on the page, for a store making about A$100k a year (`public/results-view.js`) | The same sample: reading real figures from Shopify's analytics isn't built yet |
| Publish and Undo | **Acted out.** Approve and publish says what would go live, the dashboard shows it as live (in that browser only), and Undo takes it off. Nothing is written anywhere. | Writes to a dev store's theme |

Every idea and suggested request is answered by the mock. (A store can also have an `agent.json` of answers saved once from the real agent, which is played back instead; none of the three stores has one now.)

## Things to try

- On a product page, try *"Add a reviews section with star ratings"*, *"Show all the product photos in a big photo gallery"* or *"Add trust badges under the Add to cart button"*.
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
