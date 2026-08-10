const siteUrl = (process.env.PUBLIC_SITE_URL || "https://officialfawzaanstore.com").replace(
  /\/+$/,
  "",
);
const key = process.env.INDEXNOW_KEY || "7864d7e0b55641339f02b9d647bcfaad";
const sitemapUrl = `${siteUrl}/sitemap.xml`;

const sitemapResponse = await fetch(sitemapUrl);
if (!sitemapResponse.ok) {
  throw new Error(`Could not load ${sitemapUrl}: ${sitemapResponse.status}`);
}

const sitemap = await sitemapResponse.text();
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
if (!urlList.length) throw new Error("The sitemap did not contain any URLs.");

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList,
  }),
});

if (!response.ok) {
  throw new Error(`IndexNow rejected the submission: ${response.status} ${await response.text()}`);
}

console.log(`Submitted ${urlList.length} URLs to IndexNow (${response.status}).`);
