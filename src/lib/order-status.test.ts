import { describe, expect, it } from "vitest";

import { normalizeOrderStatus, orderStatusLabel } from "./order-status";

describe("order status presentation", () => {
  it("uses a clear fulfillment label for processing orders", () => {
    expect(orderStatusLabel("processing")).toBe("Processing / In Fulfillment");
  });

  it("supports the booked fulfillment step", () => {
    expect(normalizeOrderStatus("booked")).toBe("booked");
    expect(orderStatusLabel("booked")).toBe("Booked");
  });

  it("presents the legacy shipped value as Dispatch", () => {
    expect(normalizeOrderStatus("shipped")).toBe("shipped");
    expect(orderStatusLabel("shipped")).toBe("Dispatch");
  });

  it("normalizes display aliases without changing stored compatibility", () => {
    expect(normalizeOrderStatus("dispatch")).toBe("shipped");
    expect(normalizeOrderStatus("dispatched")).toBe("shipped");
  });
});
