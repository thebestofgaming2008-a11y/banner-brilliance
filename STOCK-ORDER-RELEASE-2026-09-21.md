# Homepage and shop ordering — 21 September 2026

User approved default availability-first ordering on both the homepage Shop All grid and `/shop`, with Saudi Red Shemagh first when available. This deliberately expands the previous information-page-only scope for these two listings only.

## Behaviour

1. Available `saudi-red-shemagh` first.
2. Other in-stock products, keeping their existing featured order.
3. Sold-out products, keeping their existing featured order.

Availability matches the existing product cards. If the Saudi shemagh sells out it moves to the sold-out group. Products are not ranked by exact remaining quantity. Explicit price-low and price-high sorting continues to use effective sale prices, unaffected by the new default priority. Filters continue to apply before ordering.

## Scope and provenance

- Baseline source: `c8f2e9f`; its runtime matches the previous production deployment.
- Previous production / rollback: `dd646658-7893-47db-ac88-f6c40353fe31`.
- Implementation: `f011a7a`; test correction: `78f85d5`.
- Preview: https://230063e5.fawzaanstore.pages.dev
- Production: https://officialfawzaanstore.com
- Production deployment: `d3a51789-7e9d-4a0b-80e2-afec9a0ee23d`, source `78f85d5`.
- Runtime changes: one pure helper, one import/call in the homepage listing, one import/call in the shop listing. Existing shared merchandising, homepage editor components and related-product ordering are untouched.
- No changes to admin actions, backend, product records, stock, prices, payments, cart, checkout, styles, assets, metadata, support pages, dependencies or hosting configuration. No Convex deployment. Source diff for these protected areas is empty against `c8f2e9f`.
- Original production source branch remains `agent/final-launch-handoff`; old GitHub `main` is not the current production source and was not changed.

## Verification

- Type checking, targeted lint and production build passed.
- All 41 unit tests passed, including sold-out priority fallback, stability, missing stock and immutable inputs.
- 20 desktop/mobile browser checks passed on preview (after correcting the test to use sale prices rather than regular prices), and all 20 passed together on the live domain after deployment.
- Checked server-rendered and hydrated default order, price-low and price-high, reset to Featured, collection filtering, product-to-cart-to-checkout navigation, gallery controls and vertical scrolling, account/tracking entry and admin authentication gate.
- Retained seven-page SEO/support checks. Product/cart/checkout markup still matches original baseline. Removed homepage/shop from the old exact-markup comparison because their ordering is now intentionally different and has dedicated tests.
- Visual review: desktop shop and mobile homepage Shop All show Saudi Red Shemagh first with unchanged layout.
- No real orders, payments, support messages or authenticated admin mutations were performed.

The historical `verify-support-release-scope.mjs` remains pinned to the September 11 information-page-only release; it is not the scope check for this newly authorized change.
