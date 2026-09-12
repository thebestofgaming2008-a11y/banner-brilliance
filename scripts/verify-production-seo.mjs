const SITE_URL = (process.env.SEO_SITE_URL || "https://officialfawzaanstore.com").replace(
  /\/+$/,
  "",
);
const EXPECTED_ORIGIN = new URL(SITE_URL).origin;
const BRAND_NAME = "Fawzaan Store";
const LEGACY_HOST = "fawzaanstore.pages.dev";
const GOOGLEBOT_MOBILE =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const GOOGLEBOT_DESKTOP =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const LEGACY_PRODUCT_REDIRECTS = {
  "/products/yemeni-shemagh-red": "/products/yemeni-shemagh",
  "/products/ivory-embroidered-shemagh": "/shop?collection=shemaghs",
  "/products/rouge-niqab": "/products/Maroon-niqab",
  "/products/kashmir-multiflora-honey": "/shop?collection=honey",
  "/products/kashmir-acacia-honey": "/shop?collection=honey",
  "/products/kashmir-black-honey": "/shop?collection=honey",
  "/products/sabr-watch-green": "/shop?collection=watches",
  "/products/sabr-watch-blue": "/shop?collection=watches",
  "/products/sabr-watch-black": "/shop?collection=watches",
  "/products/sabr-watch-white": "/shop?collection=watches",
  "/products/leather-gloves": "/shop?collection=gloves",
};
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

async function load(url, init, userAgent = "FawzaanStore-SEO-Monitor/1.0") {
  const response = await fetch(url, {
    headers: { "user-agent": userAgent },
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
      const schema = JSON.parse(match[1]);
      if (schema?.["@type"] === "Product") {
        if (schema.aggregateRating) {
          assert(
            Number(schema.aggregateRating.reviewCount) > 0,
            `${url} has an aggregate rating without real reviews`,
          );
          assert(
            Number(schema.aggregateRating.ratingValue) >= 1 &&
              Number(schema.aggregateRating.ratingValue) <= 5,
            `${url} has an invalid aggregate rating`,
          );
        }
        if (schema.review) {
          const reviews = Array.isArray(schema.review) ? schema.review : [schema.review];
          assert(reviews.length > 0, `${url} has an empty review schema`);
          reviews.forEach((review) => {
            assert(review?.author?.name, `${url} has a review without an author`);
            assert(review?.reviewRating?.ratingValue, `${url} has a review without a rating`);
          });
        }
      }
    } catch (error) {
      fail(`${url} has invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  });
  return body;
}

function internalAnchorUrls(html, pageUrl) {
  const urls = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = decodeXml(match[1].trim());
    if (!href || href.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(href)) continue;
    const url = new URL(href, pageUrl);
    if (url.origin !== EXPECTED_ORIGIN) continue;
    url.hash = "";
    urls.push(url.href);
  }
  return urls;
}

async function verifyGooglebotResponse(url, userAgent) {
  const { response } = await load(url, { redirect: "manual" }, userAgent);
  assert(response.status < 500, `${url} returned ${response.status} to Googlebot`);
  assert(response.status !== 404, `${url} is an internally linked 404`);
  if ([301, 302, 307, 308].includes(response.status)) {
    const destination = new URL(response.headers.get("location"), url).href;
    const { response: destinationResponse } = await load(destination, undefined, userAgent);
    assert(
      destinationResponse.status === 200,
      `${url} redirects to ${destination}, which returned ${destinationResponse.status}`,
    );
  } else {
    assert(response.status === 200, `${url} returned unexpected status ${response.status}`);
  }
}

async function main() {
  await verifyRedirect(
    `https://www.officialfawzaanstore.com/shop?collection=shemaghs`,
    `${SITE_URL}/shop?collection=shemaghs`,
  );
  for (const [source, destination] of Object.entries(LEGACY_PRODUCT_REDIRECTS)) {
    await verifyRedirect(`${SITE_URL}${source}`, `${SITE_URL}${destination}`);
  }
  await verifyRedirect(
    `${SITE_URL}/shop?collection=Shemaghs`,
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

  const pageBodies = new Map();
  for (const url of urls) pageBodies.set(url, await verifyHtmlPage(url));

  const internalUrls = new Set();
  for (const [pageUrl, body] of pageBodies) {
    internalAnchorUrls(body, pageUrl).forEach((url) => internalUrls.add(url));
  }
  for (const url of internalUrls) {
    const parsed = new URL(url);
    const collection = parsed.pathname === "/shop" ? parsed.searchParams.get("collection") : null;
    assert(
      !collection || collection === collection.toLowerCase(),
      `${url} uses a duplicate mixed-case collection URL`,
    );
    await verifyGooglebotResponse(url, GOOGLEBOT_MOBILE);
  }

  for (const url of urls) {
    await verifyGooglebotResponse(url, GOOGLEBOT_MOBILE);
    await verifyGooglebotResponse(url, GOOGLEBOT_DESKTOP);
  }

  const { response: missingResponse } = await load(
    `${SITE_URL}/products/seo-monitor-intentional-missing-product`,
    { redirect: "manual" },
    GOOGLEBOT_MOBILE,
  );
  assert(missingResponse.status === 404, "Unknown product URLs do not return a real 404");
  assert(
    /noindex/i.test(missingResponse.headers.get("x-robots-tag") || ""),
    "404 responses are missing an X-Robots-Tag noindex directive",
  );

  const { response: feedResponse, body: feed } = await load(`${SITE_URL}/merchant-feed.xml`);
  assert(feedResponse.status === 200, "merchant-feed.xml is unavailable");
  assert(!feed.includes(LEGACY_HOST), `merchant-feed.xml references ${LEGACY_HOST}`);
  assert(feed.includes("<g:title>"), "merchant-feed.xml has no Google product titles");
  assert(feed.includes(`<g:link>${SITE_URL}/products/`), "merchant-feed.xml has no product links");
  assert(feed.includes(`<g:image_link>${SITE_URL}/`), "merchant-feed.xml images are not canonical");

  console.log(
    `SEO verification passed for ${urls.length} sitemap URLs and ${internalUrls.size} internal links on ${SITE_URL}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
