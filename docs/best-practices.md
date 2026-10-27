# QuickLift best practices

QuickLift (INFS3605, team W14A-10) checks Australian Shopify stores against seven practices that help shoppers decide to buy, and offers a fix for each one it can fix honestly. Every practice below rests only on public, online research and Australian regulator guidance, linked in the Sources list; we quote a number only where the source page itself gives it with a stated method.

*Sources checked 27 October 2026.*

---

## 1. Show prices in Australian dollars, GST included

**The practice:** an Australian shopper should see the full price in AUD, not in US dollars.

**Why it matters:** Australian law requires the total price, including GST and any unavoidable fees, to be shown as a single figure ([ACCC: Price displays](https://www.accc.gov.au/business/pricing/price-displays)). A price in another currency leaves the shopper to work out what they will really pay.

**What QuickLift checks:** the store's currency. Pass if it is AUD.

**The fix:** no automatic fix, because currency is a store setting, not a page change. QuickLift points the owner to Shopify Markets to turn on AUD for Australian visitors.

## 2. Make delivery cost clear before checkout

**The practice:** say what delivery costs, or when it is free, on the home and product pages.

**Why it matters:** in Baymard Institute's research on why US online shoppers abandon a checkout, extra costs such as shipping, tax and fees are the most common reason after "just browsing" ([Baymard: Cart abandonment](https://baymard.com/lists/cart-abandonment-rate)). Baymard's usability testing also finds that product pages should show the lowest shipping cost, or at least an estimate, so it does not surprise people at checkout ([Baymard: Product page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)). The ACCC says fees should be disclosed at the start of a purchase, not added along the way ([ACCC: Price displays](https://www.accc.gov.au/business/pricing/price-displays)), and Australia Post suggests free shipping thresholds as a way to grow order size ([Australia Post eCommerce Report 2026](https://auspost.com.au/business/grow-your-business/2026-ecommerce-report)).

**What QuickLift checks:** whether the home or product page mentions free shipping, delivery or postage.

**The fix:** a **free shipping bar** across the top of the store. The owner edits the threshold. It must match what the store really charges.

## 3. Show buy now, pay later near the price

**The practice:** if the store offers Afterpay, Zip or similar, say so next to the price.

**Why it matters:** in the Reserve Bank's 2022 Consumer Payments Survey (about 1,000 people keeping a seven-day payments diary), almost one-third of Australians had used a buy now, pay later service in the past year, with use highest among younger shoppers ([RBA Bulletin, June 2023](https://www.rba.gov.au/publications/bulletin/2023/jun/consumer-payment-behaviour-in-australia.html)). The same report notes the trade-off: these services cost the store more to accept than cards. Afterpay's own Australian merchant rules say any instalment amount must appear with the full price ([Afterpay: Marketing messaging](https://www.afterpay.com/en-AU/business/resources/marketing/marketing-messaging)).

**What QuickLift checks:** whether Afterpay, Zip, Klarna, humm or PayPal Pay in 4 appears on the page.

**The fix:** **Afterpay instalments under the price**, placed directly under the full price. Turn it on only if the store already offers Afterpay.

## 4. Make returns and "who you are" easy to see

**The practice:** link the returns policy from the page, and say where the business is based or ships from, if that is true.

**Why it matters:** in the same Baymard research, not trusting the site and an unsatisfactory returns policy are both common reasons for abandoning a checkout ([Baymard: Cart abandonment](https://baymard.com/lists/cart-abandonment-rate)). Baymard recommends showing or linking the return policy from the product page itself and keeping it easy to read ([Baymard: Product page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux); [Baymard: 35 best practices](https://baymard.com/blog/ecommerce-ux-best-practices)). We found no public study with a stated method on "Australian owned" signals, so we treat them only as trust information, and the ACCC says any origin claim must be true and have reasonable grounds ([ACCC: Country of origin claims](https://www.accc.gov.au/business/advertising-and-promotions/country-of-origin-claims)).

**What QuickLift checks:** a returns or refund policy link, and wording such as "Australian owned", "made in Australia" or "ships from Australia".

**The fix:** a **returns and Australian business bar** under the header. Every line can be edited or removed, and the owner keeps only what is true.

## 5. Show real customer reviews

**The practice:** let real customers review products, and show the reviews on the product page.

**Why it matters:** Baymard's testing finds shoppers rely on ratings and reviews to choose products ([Baymard: 35 best practices](https://baymard.com/blog/ecommerce-ux-best-practices)) and often go looking for the negative ones ([Baymard: Product page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)).

**What QuickLift checks:** a reviews app (Judge.me, Okendo, Yotpo and others) or star ratings on the page.

**No automatic fix, and why:** the only honest fix is collecting real reviews. Writing or adding reviews for a store would be fake reviews, which is illegal in Australia (see "What we won't do"). QuickLift suggests a reviews app instead.

## 6. Give every product at least three photos

**The practice:** show each product from several angles, including one in use or next to something for scale.

**Why it matters:** Baymard's testing finds shoppers rely on product images to judge whether a product is right for them, and recommends at least three to five images per product, including an "in scale" image ([Baymard: 35 best practices](https://baymard.com/blog/ecommerce-ux-best-practices); [Baymard: Product page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)).

**What QuickLift checks:** the number of images per product in the store's public product feed. It fails if more than a third of products have fewer than three.

**No automatic fix, and why:** QuickLift cannot photograph the owner's products. Made-up or AI-generated product photos could mislead shoppers about what they are buying, and the ACCC says images must be accurate ([ACCC: False or misleading claims](https://www.accc.gov.au/business/advertising-and-promotions/false-or-misleading-claims)).

## 7. Keep Add to cart within reach on phones

**The practice:** on a phone, keep the Add to cart button on screen once the original one has scrolled away.

**Why it matters:** Baymard's benchmark finds mobile product pages perform worse than desktop ones ([Baymard: Product page UX 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)). Baymard treats a sticky Add to cart button as a normal pattern and advises surrounding it with white space rather than making it full width ([Baymard: 35 best practices](https://baymard.com/blog/ecommerce-ux-best-practices)). This practice has the weakest evidence of the seven: we found no public study with a stated method that measures its effect on sales, so we offer it as a convenience rather than a proven win.

**What QuickLift checks:** whether the product page already has a sticky add-to-cart. It cannot measure scrolling from the page code, so this is advice.

**The fix:** a **sticky Add to cart on phones**. It appears only after the real button scrolls away and presses the store's own button, so options and the cart behave as normal.

---

## What we won't do

QuickLift's fixes and its AI agent are built not to invent facts about a store. The agent is told never to add fake reviews, ratings, stock counts, countdown timers, discounts, awards or claims, and to write in Australian English with AUD prices. Specifically:

- **Fake or edited reviews.** Creating fake reviews, or getting others to, is against Australian law. So are reviews by staff or paid people that don't disclose the connection, and reviews edited after the fact ([ACCC: Online reviews](https://www.accc.gov.au/business/advertising-and-promotions/online-reviews-for-product-and-services)). The US regulator warns businesses the same way ([FTC: Fake reviews warning](https://consumer.ftc.gov/consumer-alerts/2025/12/ftc-warns-businesses-about-fake-reviews)).
- **Fake urgency.** No countdown timers on offers that don't actually end, and no "only 2 left" without real stock data. The US Federal Trade Commission names fake countdown timers as a dark pattern ([FTC: Dark patterns report](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers)). The ACCC says businesses must not make false claims about whether goods are in stock ([ACCC: False or misleading claims](https://www.accc.gov.au/business/advertising-and-promotions/false-or-misleading-claims)).
- **"Was" prices that were never charged.** A "was $X, now $Y" price is misleading if the product was not sold at the higher price for a reasonable period just before the sale ([ACCC: Price displays](https://www.accc.gov.au/business/pricing/price-displays)).
- **Claims only the owner can confirm.** Free shipping, returns terms and "Australian owned" are editable text that the owner must check before publishing. Nothing is written to the live store until the owner presses Publish.

---

## Sources

1. Baymard Institute, "Cart Abandonment Rate Statistics": https://baymard.com/lists/cart-abandonment-rate
2. Baymard Institute, "Product Page UX Best Practices 2026": https://baymard.com/blog/current-state-ecommerce-product-page-ux
3. Baymard Institute, "35 Data-Driven Ecommerce Best Practices": https://baymard.com/blog/ecommerce-ux-best-practices
4. Reserve Bank of Australia, "Consumer Payment Behaviour in Australia", Bulletin, June 2023: https://www.rba.gov.au/publications/bulletin/2023/jun/consumer-payment-behaviour-in-australia.html
5. Afterpay (Australia), "Marketing resources centre: Marketing messaging": https://www.afterpay.com/en-AU/business/resources/marketing/marketing-messaging
6. Australia Post, "eCommerce Report 2026": https://auspost.com.au/business/grow-your-business/2026-ecommerce-report
7. ACCC, "Price displays": https://www.accc.gov.au/business/pricing/price-displays
8. ACCC, "False or misleading claims": https://www.accc.gov.au/business/advertising-and-promotions/false-or-misleading-claims
9. ACCC, "Online reviews for product and services": https://www.accc.gov.au/business/advertising-and-promotions/online-reviews-for-product-and-services
10. ACCC, "Country of origin claims": https://www.accc.gov.au/business/advertising-and-promotions/country-of-origin-claims
11. US Federal Trade Commission, "FTC Report Shows Rise in Sophisticated Dark Patterns Designed to Trick and Trap Consumers" (15 Sep 2022): https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers
12. US Federal Trade Commission, "FTC warns businesses about fake reviews" (22 Dec 2025): https://consumer.ftc.gov/consumer-alerts/2025/12/ftc-warns-businesses-about-fake-reviews
