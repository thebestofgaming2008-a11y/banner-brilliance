import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "release abandoned checkout reservations",
  { minutes: 5 },
  internal.orders.cleanupExpiredCheckoutIntents,
);

crons.daily(
  "Razorpay payment safety sweep",
  { hourUTC: 2, minuteUTC: 10 },
  internal.orders.reconcileCapturedPayments,
);

crons.hourly(
  "monitor Razorpay connection",
  { minuteUTC: 20 },
  internal.orders.monitorRazorpayHealth,
);

crons.daily(
  "remove expired payment technical records",
  { hourUTC: 2, minuteUTC: 40 },
  internal.orders.cleanupPaymentTechnicalRecords,
);

export default crons;
