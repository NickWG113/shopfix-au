// Publish: write the previewed changes into a real theme, on a store we
// have been given a token for (SHOPIFY_STORE + SHOPIFY_ADMIN_TOKEN).
//
// How it's done, and why this way:
//  - All our code goes in one snippet, snippets/shopfix.liquid.
//  - layout/theme.liquid gets one line, {% render 'shopfix' %}, before
//    </body>, added once and never touched again.
//  - "Undo" empties the snippet. We never rewrite theme.liquid back, so
//    undo can't clobber an edit the merchant made to their layout since.
// Only the live (MAIN) theme is changed, because that's what shoppers see.

const API_VERSION = "2026-04";
const SNIPPET = "snippets/shopfix.liquid";
const RENDER_TAG = "{% render 'shopfix' %}";

export function publishConfigured() {
  return Boolean(process.env.SHOPIFY_STORE && process.env.SHOPIFY_ADMIN_TOKEN);
}

async function gql(query, variables) {
  const store = process.env.SHOPIFY_STORE;
  const res = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": process.env.SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Shopify refused the token. Check SHOPIFY_ADMIN_TOKEN and that the app has read_themes + write_themes.");
  }
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join("; "));
  return data.data;
}

async function mainTheme() {
  const data = await gql(`{
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id name
        files(filenames: ["layout/theme.liquid"]) {
          nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } } }
        }
      }
    }
  }`);
  const theme = data.themes.nodes[0];
  if (!theme) throw new Error("This store has no published theme.");
  return { id: theme.id, name: theme.name, layout: theme.files.nodes[0]?.body?.content ?? null };
}

async function upsert(themeId, files) {
  const data = await gql(
    `mutation($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
      themeFilesUpsert(themeId: $themeId, files: $files) {
        upsertedThemeFiles { filename }
        userErrors { field message }
      }
    }`,
    { themeId, files: files.map((f) => ({ filename: f.filename, body: { type: "TEXT", value: f.content } })) },
  );
  const errs = data.themeFilesUpsert.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

function snippetBody(bundle) {
  const stamp = new Date().toISOString();
  // {% raw %} so a "{{" or "{%" in generated CSS/JS can't be read as Liquid.
  return `{% comment %} Added by ShopFix AU ${stamp}. Empty this file (or press Undo) to remove every change. {% endcomment %}
{% raw %}
<style id="shopfix-css">${bundle.css}</style>
<script id="shopfix-js">${bundle.js}</script>
{% endraw %}
`;
}

export async function publish(bundle) {
  const theme = await mainTheme();
  if (theme.layout === null) throw new Error("Couldn't read layout/theme.liquid.");
  const files = [{ filename: SNIPPET, content: snippetBody(bundle) }];
  // The snippet is listed first: theme.liquid can't render a snippet that
  // doesn't exist yet.
  if (!theme.layout.includes(RENDER_TAG)) {
    if (!/<\/body>/i.test(theme.layout)) throw new Error("theme.liquid has no </body> to add our line before.");
    const layout = theme.layout.replace(/<\/body>/i, `  ${RENDER_TAG}\n</body>`);
    files.push({ filename: "layout/theme.liquid", content: layout });
  }
  await upsert(theme.id, files);
  return { theme: theme.name, store: process.env.SHOPIFY_STORE };
}

export async function undo() {
  const theme = await mainTheme();
  await upsert(theme.id, [
    { filename: SNIPPET, content: "{% comment %} ShopFix AU: no changes published. {% endcomment %}\n" },
  ]);
  return { theme: theme.name, store: process.env.SHOPIFY_STORE };
}
