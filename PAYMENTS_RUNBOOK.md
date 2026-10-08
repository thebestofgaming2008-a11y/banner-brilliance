# Payment and Order Runbook

This is the production baseline for Fawzaan Store and future stores using Convex and Razorpay.

## Reliability model

Every paid order has three independent confirmation paths:

1. The browser sends the Razorpay payment signature to the server for immediate verification.
2. Razorpay sends a signed webhook to the Convex HTTP endpoint.
3. Convex checks that checkout directly with Razorpay after approximately 5 minutes, 30 minutes,
   2 hours, and 24 hours. A small daily sweep catches anything still unresolved.

All paths are idempotent. A Razorpay payment ID and order ID can create only one store order.
Captured amount, currency, order ID, current product data, variants, stock, promotion usage, and gift
eligibility are checked on the server.

## Razorpay dashboard setup

Create a **Live mode** webhook using:

- URL: `https://steady-cobra-91.convex.site/razorpay/webhook`
- Secret: the exact value stored in Convex as `RAZORPAY_WEBHOOK_SECRET`
- Alert email: an address the store owner checks

Subscribe to:

- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `order.paid`
- `refund.created`
- `refund.processed`
- `refund.failed`
- `payment.dispute.created`
- `payment.dispute.won`
- `payment.dispute.lost`
- `payment.dispute.closed`
- `payment.dispute.under_review`
- `payment.dispute.action_required`

Send a live-mode test event after setup. The admin Orders screen must show **Live webhook: Verified**.
Having a webhook secret in Convex does not prove that the webhook is enabled in Razorpay.

## Required environment variables

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CHECKOUT_API_SECRET`
- `PUBLIC_SITE_URL`

Never expose the key secret, webhook secret, or checkout API secret to browser code.

## Stored data

- Orders, order items, refunds, and disputes are permanent financial records.
- Temporary checkout attempts and webhook deduplication receipts are deleted after 30 days.
- Raw Razorpay payloads, card data, settlement feeds, and unnecessary customer payment metadata are
  not stored.

Refunds and disputes are performed in the Razorpay Dashboard. Webhooks mirror their status into the
store admin. The website does not automatically issue refunds or submit dispute evidence.

## Admin response

- **Payment recovery:** use `Check Razorpay` once. An order is created only after Razorpay confirms
  capture. Never ask the customer to pay again while recovery is pending.
- **Failed refund:** inspect the refund in Razorpay, correct it there, and wait for the next webhook.
- **Open dispute:** open Razorpay immediately and respond before the displayed deadline.
- **Webhook not verified:** enable or repair the live webhook and send a test event.
- **API health failed:** verify live credentials and Razorpay availability before accepting orders.

## Reuse checklist for a new store

1. Use a new Razorpay account or credentials and a new webhook secret.
2. Change the webhook URL to that store's Convex HTTP deployment.
3. Keep browser verification, webhooks, scheduled recovery, idempotency, and retention together.
4. Run unit tests, TypeScript, lint, build, a live low-value payment, refund, and webhook test.
5. Confirm the admin shows the payment method, webhook verification, refund status, and no recovery
   items before launch.
