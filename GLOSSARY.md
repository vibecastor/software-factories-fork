# Cadence

A platform where people buy and take video courses.

## Language

### People

**Student**:
A person taking a course.
_Avoid_: Learner

**Buyer**:
The person who made a Purchase. For a team purchase, the Buyer need not be a Student of the course.
_Avoid_: Learner, customer

**Admin**:
A member of staff who runs the platform, and who approves or declines Refunds.

### Refunds

**Refund**:
The return of the money paid for a whole Purchase, requested by its Buyer. A Refund exists from the moment it is requested and is resolved by an Admin as either Approved or Declined.
_Avoid_: Cancellation, cancel a purchase, chargeback, reversal, partial refund

**Refund Amount**:
The money a Refund returns: the amount the Buyer paid for the Purchase.

**Requested**:
The status of a Refund that has been asked for and is waiting for review; it may still be declined.
_Avoid_: Pending, processing, open, raised

**Approved**:
The status of a Refund that review has accepted, so the money is returned.

**Declined**:
The status of a Refund that review has turned down, so no money is returned.
_Avoid_: Rejected, denied

**Refund Window**:
The 14 days after a Purchase during which a Refund can be requested.
_Avoid_: Cancel window, cancellation period

**Refundable**:
Describes a Purchase that meets every rule for requesting a Refund.
_Avoid_: Cancellable

**Chargeback**:
A return of money forced by the payer's bank without our agreement. Not a Refund, and not something the platform models.
