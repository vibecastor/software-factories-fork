export const REFUND_WINDOW_DAYS = 14;
const WATCH_LIMIT_SECONDS = 2 * 60 * 60;
const COMPLETION_LIMIT = 0.5;

export type NotRefundableReason =
  | "already_requested"
  | "seat_claimed"
  | "window_closed"
  | "completed_too_much"
  | "watched_too_much";

export type RefundFacts = {
  purchasedAt: string;
  amountPaid: number;
  now: Date;
  hasRequestedRefund: boolean;
  hasClaimedSeat: boolean;
  lessonCount: number;
  completedLessonCount: number;
  secondsWatched: number;
};

export type RefundCheck =
  | { refundable: true; amount: number; lastDayInWindow: string }
  | { refundable: false; reason: NotRefundableReason };

// The Refund Window is counted in whole days, not hours — a purchase at 23:00
// still gets the whole of its fourteenth day.
function calendarDay(when: Date): string {
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${when.getFullYear()}-${month}-${day}`;
}

/** Whether a Purchase is Refundable, and if so its Refund Amount. */
export function checkRefundable(facts: RefundFacts): RefundCheck {
  if (facts.hasRequestedRefund) {
    return { refundable: false, reason: "already_requested" };
  }

  // A claimed seat from a team purchase belongs to the team.
  if (facts.hasClaimedSeat) {
    return { refundable: false, reason: "seat_claimed" };
  }

  const windowEnd = new Date(facts.purchasedAt);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);
  const lastDayInWindow = calendarDay(windowEnd);

  if (calendarDay(facts.now) > lastDayInWindow) {
    return { refundable: false, reason: "window_closed" };
  }

  if (
    facts.lessonCount > 0 &&
    facts.completedLessonCount / facts.lessonCount >= COMPLETION_LIMIT
  ) {
    return { refundable: false, reason: "completed_too_much" };
  }

  if (facts.secondsWatched >= WATCH_LIMIT_SECONDS) {
    return { refundable: false, reason: "watched_too_much" };
  }

  return { refundable: true, amount: facts.amountPaid, lastDayInWindow };
}
