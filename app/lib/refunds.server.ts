import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  coupons,
  lessonProgress,
  lessons,
  modules,
  purchases,
  refunds,
  videoWatchEvents,
  LessonProgressStatus,
  RefundStatus,
} from "~/db/schema";
import { checkRefundable, type RefundCheck } from "~/lib/refunds";

export function getLatestPurchase(userId: number, courseId: number) {
  return db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    .orderBy(sql`${purchases.createdAt} desc`)
    .get();
}

/** Gathers the facts about a Purchase and checks whether it is Refundable. */
export function checkPurchaseRefundable(
  purchase: typeof purchases.$inferSelect
): RefundCheck {
  const lessonIds = db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, purchase.courseId))
    .all()
    .map((row) => row.id);

  const requestedRefund = db
    .select({ id: refunds.id })
    .from(refunds)
    .where(
      and(
        eq(refunds.purchaseId, purchase.id),
        eq(refunds.status, RefundStatus.Requested)
      )
    )
    .get();

  const claimedSeat = db
    .select({ id: coupons.id })
    .from(coupons)
    .where(
      and(eq(coupons.purchaseId, purchase.id), isNotNull(coupons.redeemedAt))
    )
    .get();

  const completed = db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, purchase.userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    )
    .get();

  // Watch time is the furthest point reached in each lesson, added up.
  const furthestPerLesson = db
    .select({
      furthest: sql<number>`max(${videoWatchEvents.positionSeconds})`,
    })
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, purchase.userId),
        inArray(videoWatchEvents.lessonId, lessonIds)
      )
    )
    .groupBy(videoWatchEvents.lessonId)
    .all();

  return checkRefundable({
    purchasedAt: purchase.createdAt,
    amountPaid: purchase.amountPaid,
    now: new Date(),
    hasRequestedRefund: requestedRefund !== undefined,
    hasClaimedSeat: claimedSeat !== undefined,
    lessonCount: lessonIds.length,
    completedLessonCount: completed?.count ?? 0,
    secondsWatched: furthestPerLesson.reduce(
      (total, row) => total + row.furthest,
      0
    ),
  });
}
