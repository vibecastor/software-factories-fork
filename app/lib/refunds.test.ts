import { describe, expect, it } from "vitest";
import { checkRefundable } from "./refunds";

// Local-time dates, so the tests do not depend on the machine's timezone.
const purchasedAt = new Date(2026, 0, 1, 23, 0).toISOString();

const refundablePurchase = {
  purchasedAt,
  amountPaid: 5999,
  now: new Date(2026, 0, 5, 12, 0),
  hasRequestedRefund: false,
  hasClaimedSeat: false,
  lessonCount: 20,
  completedLessonCount: 3,
  secondsWatched: 600,
};

describe("checkRefundable", () => {
  it("offers the amount the Buyer paid as the Refund Amount", () => {
    expect(checkRefundable(refundablePurchase)).toEqual({
      refundable: true,
      amount: 5999,
      lastDayInWindow: "2026-01-15",
    });
  });

  it("is not Refundable once half the lessons are completed", () => {
    expect(
      checkRefundable({ ...refundablePurchase, completedLessonCount: 10 })
    ).toEqual({ refundable: false, reason: "completed_too_much" });
  });

  it("is Refundable just under half the lessons completed", () => {
    expect(
      checkRefundable({ ...refundablePurchase, completedLessonCount: 9 })
        .refundable
    ).toBe(true);
  });

  it("is Refundable for a course with no lessons", () => {
    expect(
      checkRefundable({
        ...refundablePurchase,
        lessonCount: 0,
        completedLessonCount: 0,
      }).refundable
    ).toBe(true);
  });

  it("is Refundable through the whole last day of the Refund Window", () => {
    expect(
      checkRefundable({
        ...refundablePurchase,
        now: new Date(2026, 0, 15, 23, 59),
      }).refundable
    ).toBe(true);
  });

  it("is not Refundable the day after the Refund Window ends", () => {
    expect(
      checkRefundable({
        ...refundablePurchase,
        now: new Date(2026, 0, 16, 0, 1),
      })
    ).toEqual({ refundable: false, reason: "window_closed" });
  });

  it("is not Refundable once two hours have been watched", () => {
    expect(
      checkRefundable({ ...refundablePurchase, secondsWatched: 7200 })
    ).toEqual({ refundable: false, reason: "watched_too_much" });
  });

  it("is not Refundable once a team seat has been claimed", () => {
    expect(
      checkRefundable({ ...refundablePurchase, hasClaimedSeat: true })
    ).toEqual({ refundable: false, reason: "seat_claimed" });
  });

  it("is not Refundable while a Refund is already Requested", () => {
    expect(
      checkRefundable({ ...refundablePurchase, hasRequestedRefund: true })
    ).toEqual({ refundable: false, reason: "already_requested" });
  });
});
