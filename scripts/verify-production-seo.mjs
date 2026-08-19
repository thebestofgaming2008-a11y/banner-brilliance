const SITE_URL = (process.env.SEO_SITE_URL || "https://officialfawzaanstore.com").replace(
  /\/+$/,
  "",
);
const EXPECTED_ORIGIN = new URL(SITE_URL).origin;
const BRAND_NAME = "Fawzaan Store";
const LEGACY_HOST = "fawzaanstore.pages.dev";
const PRIVATE_PATHS = [
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/order/",
  "/search",
  "/track-order",
  "/unsubscribe",
  "/wishlist",
];

function fail(message) {
  throw new Error(`[SEO verification] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function elementContent(html, pattern, label) {
  const match = html.match(pattern);
  assert(match, `Missing ${label}`);
  return decodeXml(match[1].trim());
}

async function load(url, init) {
  const response = await fetch(url, {
    headers: { "user-agent": "FawzaanStore-SEO-Monitor/1.0" },
    ...init,
  });
  return { response, body: await response.text() };
}

async function verifyRedirect(source, expected) {
  const { response } = await load(source, { redirect: "manual" });
  assert(
    [301, 308].includes(response.status),
    `${source} returned ${response.status}, not 301/308`,
  );
  assert(
    response.headers.get("location") === expected,
    `${source} did not redirect to ${expected}`,
  );
}

async function verifyHtmlPage(url) {
  const { response, body } = await load(url);
  assert(response.status === 200, `${url} returned ${response.status}`);
  assert(response.headers.get("content-type")?.includes("text/html"), `${url} did not return HTML`);
  assert(!/noindex/i.test(response.headers.get("x-robots-tag") || ""), `${url} has noindex`);

  const title = elementContent(body, /<title[^>]*>([\s\S]*?)<\/title>/i, `title on ${url}`);
  assert(title.includes(BRAND_NAME), `${url} title does not contain ${BRAND_NAME}`);

  const canonical = elementContent(
    body,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    `canonical on ${url}`,
  );
  assert(canonical === url, `${url} canonical is ${canonical}`);

  const head = body.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
  assert(!head.includes(LEGACY_HOST), `${url} head references ${LEGACY_HOST}`);
  const h1Count = (body.match(/<h1(?:\s|>)/gi) || []).length;
  assert(h1Count === 1, `${url} has ${h1Count} H1 headings`);

  const schemas = [
    ...body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  schemas.forEach((match, index) => {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      fail(`${url} has invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  });
}

async function main() {
  await verifyRedirect(
    `https://www.officialfawzaanstore.com/shop?collection=shemaghs`,
    `${SITE_URL}/shop?collection=shemaghs`,
  );
  await verifyRedirect(
    `https://${LEGACY_HOST}/products/makkah-gloves`,
    `${SITE_URL}/products/makkah-gloves`,
  );

  const { response: robotsResponse, body: robots } = await load(`${SITE_URL}/robots.txt`);
  assert(robotsResponse.status === 200, "robots.txt is unavailable");
  assert(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`), "robots.txt has the wrong sitemap");
  PRIVATE_PATHS.forEach((path) => {
    assert(robots.includes(`Disallow: ${path}`), `robots.txt does not protect ${path}`);
  });

  const { response: sitemapResponse, body: sitemap } = await load(`${SITE_URL}/sitemap.xml`);
  assert(sitemapResponse.status === 200, "sitemap.xml is unavailable");
  assert(!sitemap.includes(LEGACY_HOST), `sitemap.xml references ${LEGACY_HOST}`);
  const urls = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) =>
    decodeXml(match[1].trim()),
  );
  assert(urls.length >= 10, `sitemap.xml contains only ${urls.length} URLs`);
  assert(new Set(urls).size === urls.length, "sitemap.xml contains duplicate URLs");
  assert(
    urls.some((url) => url.includes("/products/")),
    "sitemap.xml has no product URLs",
  );
  urls.forEach((url) => {
    assert(new URL(url).origin === EXPECTED_ORIGIN, `${url} is outside the official domain`);
    assert(
      !PRIVATE_PATHS.some((path) => new URL(url).pathname.startsWith(path)),
      `${url} is private`,
    );
  });

  for (const url of urls) await verifyHtmlPage(url);

  const { response: feedResponse, body: feed } = await load(`${SITE_URL}/merchant-feed.xml`);
  assert(feedResponse.status === 200, "merchant-feed.xml is unavailable");
  assert(!feed.includes(LEGACY_HOST), `merchant-feed.xml references ${LEGACY_HOST}`);
  assert(feed.includes("<g:title>"), "merchant-feed.xml has no Google product titles");
  assert(feed.includes(`<g:link>${SITE_URL}/products/`), "merchant-feed.xml has no product links");
  assert(feed.includes(`<g:image_link>${SITE_URL}/`), "merchant-feed.xml images are not canonical");

  console.log(`SEO verification passed for ${urls.length} public URLs on ${SITE_URL}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
