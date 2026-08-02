import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "release abandoned checkout reservations",
  { minutes: 5 },
  internal.orders.cleanupExpiredCheckoutIntents,
);

crons.interval(
  "reconcile captured Razorpay payments",
  { minutes: 15 },
  internal.orders.reconcileCapturedPayments,
);

crons.interval(
  "remove expired Razorpay webhook receipts",
  { hours: 24 },
  internal.orders.cleanupRazorpayWebhookEvents,
);

export default crons;
