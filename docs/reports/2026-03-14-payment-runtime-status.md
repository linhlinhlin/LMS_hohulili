# Payment Runtime Status — 2026-03-14

This report captures the verified production state of the payment and revoke flow after the latest hardening batch.

## Scope

- student course-detail payment entrypoint
- payment completion -> entitlement handoff
- refund -> revoke access
- payout / revenue guardrails already shipped earlier in the same wave

## Production Verification Summary

Environment:

- frontend: [https://holilihu.online](https://holilihu.online)
- backend health: [https://holilihu.online/actuator/health](https://holilihu.online/actuator/health)
- verification date: 2026-03-14

Verified with real production data:

- `student@maritime.edu / student123`
- course `dff41f51-c212-49e9-8c4f-e9a4f4e98354`
- refunded payment `9929a58e-0e95-49f3-b484-78fcce022f42`

## What Passed

- before refund, the paid student could open the student course detail and continue into the learning route
- paid access was confirmed at both layers:
  - `GET /api/v3/payments/status/:courseId` returned `COMPLETED`
  - `GET /api/v3/payments/can-access/:courseId/lesson/3` returned `canAccess=true`
- refund succeeded through the admin payment flow
- after refund, entitlement was revoked consistently:
  - student course detail switched back to the paywall / trial presentation
  - the old learning route no longer rendered the paid lesson and redirected back to course detail
  - `GET /api/v3/payments/status/:courseId` returned `UNPAID`
  - `GET /api/v3/payments/can-access/:courseId/lesson/3` returned `canAccess=false`
  - student payment history retained the transaction with status `REFUNDED`

## Artifacts

- [payment-revoke-smoke.json](/E:/Sach/Sua/LMS_hohulili/coord/visuals/payment-smoke/2026-03-14/payment-revoke-smoke.json)
- [payment-revoke-pre-course-detail.png](/E:/Sach/Sua/LMS_hohulili/coord/visuals/payment-smoke/2026-03-14/payment-revoke-pre-course-detail.png)
- [payment-revoke-pre-learning.png](/E:/Sach/Sua/LMS_hohulili/coord/visuals/payment-smoke/2026-03-14/payment-revoke-pre-learning.png)
- [payment-revoke-post-course-detail.png](/E:/Sach/Sua/LMS_hohulili/coord/visuals/payment-smoke/2026-03-14/payment-revoke-post-course-detail.png)
- [payment-revoke-post-learning.png](/E:/Sach/Sua/LMS_hohulili/coord/visuals/payment-smoke/2026-03-14/payment-revoke-post-learning.png)

## Residuals

Remaining non-blocking items after this verification wave:

- malformed JSON submitted to auth endpoints should return `400`, not `500`
- a real repurchase transaction was intentionally not executed on production after refund, to avoid unnecessary financial side effects

The first residual is fixed by the follow-up backend hardening in this same session. The second remains intentionally unexecuted on production, but the local regression path for `refund -> repurchase` is covered and the production UI re-entry point now shows the correct paywall and checkout CTA after refund.

## Current Verdict

The primary production payment flow is now considered controlled and operational:

- payment entrypoint: pass
- completion -> entitlement: pass
- refund -> revoke: pass
- payout / admin-org guardrails: pass

The system is ready to move to the next product flow without leaving a known payment blocker behind.
