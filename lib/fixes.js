// Ready-made fixes, each a bit of CSS and JavaScript added to the page.
//
// The same code runs in two places: the preview (our copy of the page, with
// the theme's own scripts removed) and, if published, the real theme. So
// every script waits for the page, finds things by the class names common
// Shopify themes use, does nothing if it can't find them, and never runs
// twice (each marks what it adds with a data-shopfix attribute).
//
// None of them invent facts about the store. The trust bar and shipping bar
// say things only the merchant can confirm, so their text is editable and
// the UI says to only switch on what's true.

export const PRESETS = {
  "shipping-bar": {
    label: "Free shipping bar",
    describe: "A bar across the top saying when delivery is free.",
    defaultText: "Free shipping Australia-wide on orders over $99",
    css: `
[data-shopfix="shipping-bar"]{background:#0f3d2e;color:#fff;text-align:center;
  font:600 14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:10px 16px;letter-spacing:.01em}`,
    js: (text) => `
if(!document.querySelector('[data-shopfix="shipping-bar"]')){
  var bar=document.createElement('div');bar.setAttribute('data-shopfix','shipping-bar');
  bar.textContent=${JSON.stringify(text)};
  document.body.insertBefore(bar,document.body.firstChild);
}`,
  },

  "trust-bar": {
    label: "Returns + Australian business bar",
    describe: "A slim row under the header with returns and local signals.",
    defaultText: "Australian owned | Easy 30-day returns | Secure checkout",
    css: `
[data-shopfix="trust-bar"]{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 28px;
  background:#f4f1ea;color:#2b2b2b;border-bottom:1px solid #e3ded2;padding:9px 16px;
  font:500 13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
[data-shopfix="trust-bar"] span::before{content:"✓";color:#0f7b52;font-weight:700;margin-right:6px}`,
    js: (text) => `
if(!document.querySelector('[data-shopfix="trust-bar"]')){
  var row=document.createElement('div');row.setAttribute('data-shopfix','trust-bar');
  ${JSON.stringify(text)}.split('|').map(function(s){return s.trim()}).filter(Boolean).forEach(function(s){
    var span=document.createElement('span');span.textContent=s;row.appendChild(span);
  });
  // Straight after the site header. Most specific first: a bare "header"
  // also matches the cart drawer's header, which sits at the end of the page.
  var sels=['#shopify-section-header','.shopify-section[id$="__header"]','.shopify-section-group-header-group header','.site-header','header'];
  var found=null;for(var i=0;i<sels.length&&!found;i++){found=document.querySelector(sels[i])}
  var after=found&&(found.closest('.shopify-section')||found);
  if(after&&after.parentNode){after.parentNode.insertBefore(row,after.nextSibling)}
  else{document.body.insertBefore(row,document.body.firstChild)}
  // Themes with a sticky header often pull the banner up underneath it with a
  // negative margin, and that banner then paints straight over the bar (seen
  // on frankbody.com, 27 Oct). If whatever follows the bar starts above the
  // bar's bottom edge, move the bar inside the header instead: the header is
  // positioned, so it paints above the banner. Checked again after load
  // because the theme's own scripts set the header up late.
  var tuck=function(){
    var next=row.nextElementSibling;
    if(!after||row.parentNode===after||!next)return;
    if(next.getBoundingClientRect().top<row.getBoundingClientRect().bottom-1){after.appendChild(row)}
  };
  var later=function(){tuck();setTimeout(tuck,800)};
  tuck();if(document.readyState==='complete'){later()}else{window.addEventListener('load',later)}
}`,
  },

  afterpay: {
    label: "Afterpay instalments under the price",
    describe: "\"or 4 payments of $X with Afterpay\" under each price — what Afterpay's own app adds.",
    defaultText: "Afterpay",
    css: `
[data-shopfix="afterpay"]{display:block;margin:4px 0 6px;font:400 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#444}
[data-shopfix="afterpay"] b{font-weight:700;color:#111}`,
    js: (text) => `
var provider=${JSON.stringify(text)};
// Themes wrap the price differently; take the outermost price element so a
// card gets one line, not one per nested span.
var all=Array.prototype.slice.call(document.querySelectorAll('.price, .product__price, .product-price, [data-product-price], .product-single__price'));
var prices=all.filter(function(el){return !all.some(function(o){return o!==el&&o.contains(el)})}).slice(0,24);
prices.forEach(function(el){
  if(el.querySelector('[data-shopfix="afterpay"]')||(el.nextElementSibling&&el.nextElementSibling.getAttribute('data-shopfix')==='afterpay'))return;
  // A sale shows both prices; the lower one is what the shopper pays.
  var nums=(el.textContent.match(/\\$\\s?[\\d,]+(?:\\.\\d{2})?/g)||[]).map(function(s){return parseFloat(s.replace(/[^\\d.]/g,''))}).filter(function(n){return n>0});
  if(!nums.length)return;
  var price=Math.min.apply(null,nums);
  // Afterpay's limit in Australia is $2,000; past that it isn't offered.
  if(price>2000)return;
  var line=document.createElement('span');line.setAttribute('data-shopfix','afterpay');
  line.innerHTML='or 4 interest-free payments of <b>$'+(price/4).toFixed(2)+'</b> with <b></b>';
  line.lastChild.textContent=provider;
  el.parentNode.insertBefore(line,el.nextSibling);
});`,
  },

  "sticky-cart": {
    label: "Sticky Add to cart on phones",
    describe: "Keeps an Add to cart button at the bottom of the screen on product pages.",
    defaultText: "Add to cart",
    css: `
[data-shopfix="sticky-cart"]{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:none;
  align-items:center;gap:12px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:#fff;
  box-shadow:0 -4px 18px rgba(0,0,0,.12);font:500 14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
[data-shopfix="sticky-cart"].shopfix-show{display:flex}
[data-shopfix="sticky-cart"] .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111}
[data-shopfix="sticky-cart"] button{flex:none;border:0;border-radius:6px;background:#111;color:#fff;
  font:600 15px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:14px 20px;cursor:pointer}
@media (min-width:750px){[data-shopfix="sticky-cart"]{display:none!important}}`,
    js: (text) => `
// The first /cart/add form is often not the real one (Shopify adds an
// empty one for instalment messaging), so take the first with a button.
var real=null;
Array.prototype.some.call(document.querySelectorAll('form[action*="/cart/add"]'),function(f){
  real=f.querySelector('[name="add"]')||f.querySelector('[type="submit"]');return !!real;
});
if(real&&!document.querySelector('[data-shopfix="sticky-cart"]')){
  var bar=document.createElement('div');bar.setAttribute('data-shopfix','sticky-cart');
  var title=document.querySelector('h1');
  var t=document.createElement('div');t.className='t';t.textContent=title?title.textContent.trim():'';
  var b=document.createElement('button');b.type='button';b.textContent=${JSON.stringify(text)};
  // Press the theme's own button, so variants, quantity and the theme's
  // cart drawer all behave exactly as they already do.
  b.addEventListener('click',function(){real.click()});
  bar.appendChild(t);bar.appendChild(b);document.body.appendChild(bar);
  // Only show it once the real button has scrolled off screen.
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){bar.classList.toggle('shopfix-show',!es[0].isIntersecting)}).observe(real);
  }else{bar.classList.add('shopfix-show')}
}`,
  },
};

/**
 * Turn the chosen presets and custom changes into one CSS string and one
 * script. `presets` is [{ id, text? }], `custom` is [{ css, js }].
 */
export function buildChangeBundle(presets = [], custom = []) {
  const css = [];
  const scripts = [];
  for (const p of presets) {
    const def = PRESETS[p.id];
    if (!def) continue;
    const text = String(p.text ?? def.defaultText).slice(0, 200);
    css.push(def.css.trim());
    scripts.push(def.js(text));
  }
  for (const c of custom) {
    if (c.css) css.push(String(c.css));
    if (c.js) scripts.push(String(c.js));
  }
  // Each change runs on its own, so one broken change can't stop the others.
  const js = scripts
    .map((s) => `try{${s}\n}catch(e){console.warn('[shopfix]',e)}`)
    .join("\n");
  const wrapped = js
    ? `(function(){function run(){\n${js}\n}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run)}else{run()}})();`
    : "";
  return { css: css.join("\n"), js: wrapped };
}
