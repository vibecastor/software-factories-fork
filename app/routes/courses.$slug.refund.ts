import { data, redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/courses.$slug.refund";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import { courses, refunds, users, RefundStatus } from "~/db/schema";
import { eq } from "drizzle-orm";
import { parseFormData, parseParams } from "~/lib/validation";
import { REFUND_WINDOW_DAYS, type NotRefundableReason } from "~/lib/refunds";
import {
  checkPurchaseRefundable,
  getLatestPurchase,
} from "~/lib/refunds.server";
import { formatPrice } from "~/lib/utils";

const refundParamsSchema = z.object({
  slug: z.string().min(1),
});

const refundActionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Tell us a little more about why you'd like a refund.")
    .max(1000, "Please keep your reason under 1000 characters."),
});

const NOT_REFUNDABLE: Record<
  NotRefundableReason,
  { message: string; status: number }
> = {
  already_requested: {
    message: "You've already requested a refund for this purchase.",
    status: 409,
  },
  seat_claimed: {
    message:
      "This purchase can't be refunded because a team seat has already been claimed.",
    status: 403,
  },
  window_closed: {
    message: `The ${REFUND_WINDOW_DAYS}-day refund window has closed.`,
    status: 403,
  },
  completed_too_much: {
    message: "You've completed too much of this course to request a refund.",
    status: 403,
  },
  watched_too_much: {
    message: "You've watched too much of this course to request a refund.",
    status: 403,
  },
};

function getCourseBySlug(slug: string) {
  return db.select().from(courses).where(eq(courses.slug, slug)).get();
}

/**
 * The confirmation the buyer gets in their inbox. There is no mail
 * transport wired up yet, so the built message goes to the server log.
 */
function buildRefundRequestedEmail(input: {
  buyerName: string;
  buyerEmail: string;
  courseTitle: string;
  amount: number;
}) {
  return {
    to: input.buyerEmail,
    subject: `Refund requested — ${input.courseTitle}`,
    body: [
      `Hi ${input.buyerName},`,
      "",
      `We have your refund request for "${input.courseTitle}".`,
      `It is for ${formatPrice(input.amount)}, the amount you paid.`,
      "",
      "Our team reviews every refund request by hand. You do not need to do anything else — we'll email you once we've made a decision.",
      "",
      "— The Cadence team",
    ].join("\n"),
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("You must be logged in to request a refund.", { status: 401 });
  }

  const { slug } = parseParams(params, refundParamsSchema);
  const course = getCourseBySlug(slug);

  if (!course) {
    throw data("Course not found", { status: 404 });
  }

  const buyer = db
    .select()
    .from(users)
    .where(eq(users.id, currentUserId))
    .get();

  if (!buyer) {
    throw data("User not found", { status: 404 });
  }

  const purchase = getLatestPurchase(currentUserId, course.id);

  if (!purchase) {
    throw data("You have not bought this course.", { status: 403 });
  }

  const check = checkPurchaseRefundable(purchase);

  if (!check.refundable) {
    const { message, status } = NOT_REFUNDABLE[check.reason];
    throw data(message, { status });
  }

  const formData = await request.formData();
  const parsed = parseFormData(formData, refundActionSchema);

  if (!parsed.success) {
    return data({ errors: parsed.errors }, { status: 400 });
  }

  db.insert(refunds)
    .values({
      purchaseId: purchase.id,
      status: RefundStatus.Requested,
      reason: parsed.data.reason,
    })
    .returning()
    .get();

  const email = buildRefundRequestedEmail({
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    courseTitle: course.title,
    amount: check.amount,
  });

  console.log(`[email] to=${email.to} subject=${email.subject}\n${email.body}`);

  return redirect("/settings");
}
