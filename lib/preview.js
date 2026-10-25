// Build a live copy of a store page with our changes on it.
//
// We fetch the real page, point every relative link and image back at the
// store (<base href>), and add our CSS and script.
//
// Scripts: by default we keep the theme's own (its files under /t/<id>/assets
// and its inline setup), because galleries, sliders and prices on many
// themes only appear once those run. Everything else goes: analytics, so
// demo views never show up in the store's reports; and apps (pop-ups,
// geo-redirects, chat widgets), which are what tends to drag a frame off to
// another page. If a theme still misbehaves, "scripts: false" strips every
// script and leaves a still but faithful page, since layout is HTML and CSS.

import * as cheerio from "cheerio";

// Theme asset files, wherever Shopify serves them from.
const THEME_ASSET = /\/cdn\/shop\/t\/\d+\/assets\/|cdn\.shopify\.com\/s\/files\/[^"']*\/t\/\d+\/assets\//i;
// Inline scripts that report or track rather than build the page.
const TRACKING =
  /trekkie|ShopifyAnalytics|monorail|web-pixels|gtag\(|googletagmanager|fbq\(|connect\.facebook|klaviyo|hotjar|tiktok|pintrk|snaptr|clarity|_learnq|analytics\.load|dataLayer\.push/i;

// The preview runs in a sandboxed frame with no origin of its own, where
// localStorage, sessionStorage and document.cookie throw instead of working.
// Plenty of theme code touches them without a try/catch and would stop
// dead, so give them harmless in-memory stand-ins before any theme code runs.
const SANDBOX_SHIM = `
(function(){
  function mem(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},
    setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},
    key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
  ['localStorage','sessionStorage'].forEach(function(n){try{window[n].length}catch(e){
    try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}});
  try{document.cookie}catch(e){try{Object.defineProperty(document,'cookie',{get:function(){return ''},set:function(){},configurable:true})}catch(_){}}
  ['pushState','replaceState'].forEach(function(m){var o=history[m];history[m]=function(){try{return o.apply(history,arguments)}catch(_){}}});
})();`;

// Runs only in the preview. Keeps clicks inside our frame (the parent page
// decides where to go), and loads images that themes lazy-load with
// JavaScript, for when that JavaScript was removed.
const PREVIEW_HELPER = `
(function(){
  function fixLazy(){
    document.querySelectorAll('img[data-src],img[data-srcset],source[data-srcset]').forEach(function(el){
      if(el.dataset.srcset){el.srcset=el.dataset.srcset}
      if(el.dataset.src&&el.tagName==='IMG'){el.src=el.dataset.src.replace('{width}','800')}
      if(el.getAttribute('sizes')==='auto'){el.setAttribute('sizes','100vw')}
    });
    document.querySelectorAll('[data-bgset],[data-bg]').forEach(function(el){
      var u=(el.dataset.bg||el.dataset.bgset.split(',')[0]).trim().split(' ')[0];
      if(u)el.style.backgroundImage='url("'+u.replace('{width}','1200')+'")';
    });
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');
    if(!a)return;
    e.preventDefault();
    var url;try{url=new URL(a.getAttribute('href'),document.baseURI)}catch(_){return}
    parent.postMessage({shopfix:'navigate',host:url.hostname,path:url.pathname+url.search},'*');
  },true);
  document.addEventListener('submit',function(e){
    e.preventDefault();
    parent.postMessage({shopfix:'form',action:(e.target.getAttribute('action')||'')},'*');
  },true);
  // Every toggle re-renders the page; the parent remembers where you were
  // so flipping a fix doesn't throw you back to the top.
  var t;window.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(function(){
    parent.postMessage({shopfix:'scrolled',y:window.scrollY},'*')},120)},{passive:true});
  window.addEventListener('message',function(e){
    if(e.data&&e.data.shopfix==='scroll'){window.scrollTo(0,e.data.y||0)}
  });
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fixLazy)}else{fixLazy()}
})();`;

// Themes fade sections in as you scroll using the scripts we removed.
// Without this, those sections would stay invisible.
const PREVIEW_CSS = `
.scroll-trigger,.animate--slide-in,.animate--fade-in,[data-aos]{opacity:1!important;transform:none!important;animation:none!important}
html{scroll-behavior:auto!important}`;

export function renderPreview({ html, domain, bundle, highlight = false, scripts = true }) {
  const $ = cheerio.load(html);

  $("script").each((_, el) => {
    const s = $(el);
    const type = (s.attr("type") || "").toLowerCase();
    // JSON blocks (product data, structured data) never run; keep them.
    if (type === "application/ld+json" || type === "application/json" || type === "importmap") return;
    if (scripts) {
      const src = s.attr("src");
      if (src ? THEME_ASSET.test(src) : !TRACKING.test(s.html() || "")) return;
    }
    s.remove();
  });
  $('link[rel="preload"][as="script"], link[rel="modulepreload"]').each((_, el) => {
    if (!scripts || !THEME_ASSET.test($(el).attr("href") || "")) $(el).remove();
  });
  $('meta[http-equiv="Content-Security-Policy" i], meta[http-equiv="refresh" i]').remove();
  $("base").remove();

  const head = $("head");
  // Order matters: base first so every later URL resolves to the store,
  // then the shim before any theme script can run.
  head.prepend(`<base href="https://${domain}/"><script>${SANDBOX_SHIM}</script>`);
  head.append(`<style id="shopfix-preview">${PREVIEW_CSS}</style>`);
  if (bundle.css) {
    // </style> inside generated CSS would end the block early.
    head.append(`<style id="shopfix-css">${bundle.css.replace(/<\/style/gi, "<\\/style")}</style>`);
  }
  if (highlight) {
    head.append(
      `<style>[data-shopfix],[data-shopfix-ai]{outline:2px dashed #e0115f!important;outline-offset:2px}</style>`,
    );
  }

  const body = $("body");
  body.append(`<script>${PREVIEW_HELPER}</script>`);
  if (bundle.js) body.append(`<script id="shopfix-js">${bundle.js.replace(/<\/script/gi, "<\\/script")}</script>`);

  return $.html();
}

/**
 * A compact outline of the page for the AI: structure, classes, ids and
 * short text, without scripts, styles, SVG paths or long attribute values.
 * Enough to write selectors that match, small enough to send quickly.
 */
export function pageOutline(html, maxChars = 45000) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, link, meta, template").remove();
  $("*").each((_, el) => {
    const attrs = el.attribs || {};
    for (const name of Object.keys(attrs)) {
      const keep = name === "class" || name === "id" || name === "href" || name === "type" || name === "name" || name.startsWith("aria-");
      if (!keep) $(el).removeAttr(name);
      else if (attrs[name] && attrs[name].length > 120) $(el).attr(name, attrs[name].slice(0, 120));
    }
  });
  let out = $("body").html() || "";
  out = out.replace(/\s+/g, " ").replace(/>\s+</g, "><");
  // Long runs of text add nothing to selector-writing.
  out = out.replace(/>([^<]{160,})</g, (_, t) => `>${t.slice(0, 150)}…<`);
  return out.length > maxChars ? out.slice(0, maxChars) + " …(truncated)" : out;
}
