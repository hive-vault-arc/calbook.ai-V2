# SaaS v1 Release Sprint

## Release objective

Ship CalBook.ai as a production SaaS for solo professionals: authenticated onboarding, organization setup, platform billing, paid bookings, tiered availability, reliable waitlists, and per-event-type subscriptions.

## Release baseline

- **Release branch:** `release/saas-v1`
- **Base:** `origin/main` at `176037d`
- **Integration strategy:** feature branches have unrelated Git history to `origin/main`; selectively cherry-pick focused commits onto this baseline. Do not use unrelated-history merges or rewrite existing feature branches.
- **Source-of-truth rule:** update this file after every completed task, new blocker, merged PR, verification run, and release decision.
- **Out of scope for SaaS v1:** Phase 2 AI scheduling intelligence.

## Existing feature branches

| Branch | Scope | Release state |
| --- | --- | --- |
| `feat/deploy-infra` | Landing page, health endpoint, CI, environment template | Pending upstream integration audit |
| `feat/multi-tenancy-onboarding` | Organization onboarding, profiles, membership safeguards | Pending upstream integration audit |
| `feat/auth-pages` | Branded auth screens | Pending upstream integration audit |
| `feat/billing-stripe` | CalBook platform Free/Pro/Enterprise billing | Pending upstream integration audit |
| `feat/monetization-paid-bookings` | Deposits, packages, tips | Cherry-picked onto `release/saas-v1` with migration and tests |
| `feat/monetization-tiered-availability` | Tiered schedules and initial waitlist | Cherry-picked onto `release/saas-v1` with migration and tests |

## Current release blockers

- [ ] **B0.1** The feature branches have unrelated Git history to `origin/main`; integrate only focused, reviewed cherry-picks.
- [x] **B0.2** Resolved stale generated Prisma client types that caused false failures in `RegularBookingService.ts` and `duplicate.handler.ts`. `yarn prisma generate`, web type-check, and tRPC declaration generation now pass on the release branch.
- [x] **B0.3** Monetization schema migration `20260820170008_add_paid_booking_foundation` created and applied to local PostgreSQL. Adds `BookingPackage` model, `BookingPackageStatus` enum, `DEPOSIT`/`TIP` values to `PaymentOption`, and `bookingPackageId` FK on `Booking`.
- [ ] **B0.4** Waitlist promotion is not release-ready: exact-slot matching, signed two-hour links, email delivery, atomic claiming, and abuse controls are missing.
- [x] **B0.5** Resolved: the original `calbook` remote had a corrupted object store (`f004349...`). Created a new repository `calbook.ai-V2` at `https://github.com/hive-vault-arc/calbook.ai-V2.git` and pushed `release/saas-v1` and `main` branches successfully. The old `calbook` remote is deprecated.
- [ ] **B0.6** The legacy `feat/billing-stripe` branch is not safe to cherry-pick: it creates a parallel billing system in user metadata instead of using the current `PlatformBilling` model, and replaces the webhook stub with a broad independent Stripe lifecycle. Reimplement platform billing against the canonical schema and existing Stripe abstractions.
- [x] **B0.7** Paid-booking schema, enum, and lifecycle changes cherry-picked from `feat/monetization-paid-bookings` onto `release/saas-v1` with a reviewed migration. Deposit (`createDeposit`/`chargeRemaining`), package (`BookingPackageService` with redemption flow), and tip (`createTip`) backends are integrated. 18 focused unit tests pass for `BookingPackageService`.
- [x] **B0.8** Resolved: local PostgreSQL cluster provisioned on port 5433 for migration development. `DATABASE_DIRECT_URL` configured per-command for `prisma migrate dev` without touching remote Neon settings.
- [ ] **B0.9** Transactional email now uses Resend with a verified transport health check. The remaining blocker is calendar-provider readiness: `GOOGLE_API_CREDENTIALS` is not configured and the test organizer has no connected calendar, so Google Calendar and Google Meet cannot synchronize real events yet.

## Non-negotiable release gates

- [ ] Every Prisma schema change has a reviewed migration that applies to an empty and seeded database.
- [ ] All payment, Stripe webhook, booking, and entitlement operations are idempotent.
- [ ] Availability and booking authorization is enforced server-side.
- [ ] No live Stripe, email, database, or authentication secrets are committed.
- [ ] Staging completes end-to-end Stripe test-mode journeys.
- [ ] Production environment, backups, alerts, rollback, and support ownership are documented.
- [ ] All required CI checks pass on the release candidate.

---

# Sprint 0 — Release Foundation

**Goal:** create a current, integrated, reproducible release baseline.

## Work items

- [x] **R0.1** Audit and integrate `feat/deploy-infra` against `origin/main`. **Finding:** feature histories are unrelated, so use focused cherry-picks rather than merge. Transplanted commits: `b1a8a8d`, `3a008ab`, `a0d4399`; landing-page lint was corrected after transplant. Targeted Biome check passes with warnings; web type-check remains blocked by B0.2.
- [x] **R0.2** Audit and transplant `feat/multi-tenancy-onboarding` against `origin/main`. Transplanted commits: `4dd7d52`, `d36fea7`, `8096e95`, `5cf1a42`. Kept only the new `organizations` router registration because upstream has no `home` or `recruiting` routers. Prisma and tRPC generation now complete successfully.
- [~] **R0.3** Audit `feat/auth-pages` against `origin/main`. Ported low-risk login branding and internal callback-preserving signup navigation. The branch's wholesale signup rewrite is deferred: it removes current upstream regional signup selection and routing, so it must be redesigned against the current signup flow rather than cherry-picked.
- [x] **R0.4** Audit `feat/billing-stripe` against `origin/main`. Do not transplant it: it stores subscription state in user metadata instead of canonical `PlatformBilling`, introduces an independent webhook lifecycle, and exceeds the review-size limit. Rebuild its intended Free/Pro/Enterprise experience as a dedicated model-aligned billing workstream.
- [x] **R0.5** Define integration order and split work into small PRs. Infrastructure and multi-tenancy were transplanted; auth was safely ported in part; platform billing, paid bookings, tiered availability, and waitlists require model-aligned reimplementation with migrations and focused tests.
- [ ] **R0.6** Integrate infrastructure, multi-tenancy, auth, and platform billing into `release/saas-v1`.
- [ ] **R0.7** Inventory staging and production environment variables, callback URLs, webhooks, email sender setup, Redis, and monitoring.
- [ ] **R0.8** Confirm whether `ROADMAP.md` is product documentation to commit or a local-only planning artifact.

## Acceptance criteria

- [ ] `release/saas-v1` is based on current `origin/main`.
- [ ] Integration conflicts are recorded and resolved through reviewable commits.
- [ ] No existing feature branch is rebased or force-pushed.
- [ ] Staging environment requirements are known before database or payment rollout.

---

# Sprint 1 — Monetization Database and Payment Reliability

**Goal:** make deposits, package bookings, and tips safely deployable.

## Work items

- [x] **R1.1** Created Prisma migration `20260820170008_add_paid_booking_foundation` for `BookingPackage`, `BookingPackageStatus` enum, `DEPOSIT`/`TIP` payment options, and `bookingPackageId` FK on `Booking`.
- [x] **R1.2** Added indexes (`organizerId`, `attendeeEmail`, `eventTypeId`, `status+expiresAt`, `bookingPackageId`), uniqueness constraints (`uid`, `stripePaymentId`), and transaction boundaries in `BookingPackageService.redeemSession`/`releaseSession`.
- [ ] **R1.3** Verify deposit checkout, remaining balance charge, cancellation, refund, and duplicate webhook behavior.
- [ ] **R1.4** Verify package purchase, redemption, expiration, exhaustion, and concurrent booking behavior.
- [ ] **R1.5** Verify tip creation, payment linkage, correct currency handling, and webhook idempotency.
- [x] **R1.6** Organizer booking rows show each payment's formatted amount and state for deposits, tips, paid, pending, refunded, and card-held payments, plus the remaining session balance for package bookings.

## Tests

- [x] Unit tests for `BookingPackageService` (18 tests: create, find, redeem, release, cancel, list).
- [x] Organizer booking-row payment and package-balance helpers (8 focused tests).
- [ ] Stripe webhook fixture/integration tests.
- [ ] E2E: deposit booking, package redemption, and tip checkout.
- [ ] Migration tests against empty and seeded databases.

## Acceptance criteria

- [ ] Duplicate Stripe events cannot duplicate payments or package redemption.
- [ ] A confirmed booking cannot bypass required payment.
- [ ] Package balances cannot fall below zero.
- [ ] Schema migrations apply successfully in staging.

---

# Sprint 2 — Tiered Availability Completion

**Goal:** make tiered booking links configurable, safe, and operable.

## Work items

- [x] **R2.1** Created Prisma migration `20260820184822_add_tiered_schedules_and_waitlist` for `EventType.tierSchedules` (JSONB) and `BookingWaitlist` model with indexes.
- [x] **R2.2** Built organizer settings UI (`TierSchedulesConfig` component) in the availability tab to create tiers and assign a schedule to each tier. Added `tierSchedules` to the update schema, form values, and get handler select.
- [x] **R2.3** Validate tier schedule IDs in the update handler: all schedule IDs must exist and belong to the user or team. Malformed config is rejected with `BAD_REQUEST`/`FORBIDDEN`.
- [x] **R2.4** Canonical tier-link behavior: `/tier/pro/jane/consultation` redirects to `/jane/consultation?tier=pro`. The explicit `/tier/[tier]/[user]/[type]` namespace avoids conflicting with the standard `[user]/[type]` booking route; the embed equivalent is also implemented.
- [x] **R2.5** Reject invalid tiers server-side in `getSchedule` util: if `tierSchedules` is configured but the requested tier doesn't exist, throw `BAD_REQUEST` instead of silently falling back.
- [x] **R2.6** Tier context carried through: public event lookup (tierSchedules in getPublicEvent select), availability (resolveTierScheduleId in slots util), slot selection (tier param in getSchedule schema), booking creation (tier field in bookingCreateBodySchema), and waitlist (tier field in BookingWaitlist model and join schema).
- [x] **R2.7** Redesigned the availability index with a default-week coverage map, explicit bookable-day and timezone context, clearer schedule grouping/counts, a descriptive create action, and a matching loading skeleton.
- [x] **R2.8** Restructured the schedule editor around weekly hours, date overrides, and booking timezone; added truthful saved/unsaved feedback and reset the form baseline only after a successful persisted update.

## Tests

- [x] Tier schedule resolution unit tests (20 tests: parse, resolve, getAvailableTiers).
- [x] Weekly availability-summary unit tests (5 tests: recurring hours, split intervals, invalid data, and Sunday/Monday week starts).
- [x] Availability editor change-detection unit tests (4 tests: initialization, unchanged forms, weekly hours, and timezone metadata).
- [x] Waitlist service unit tests (14 tests: add with tier/slotEndTime, remove, atomic promote with token, tier-filtered promote, validate/consume token, get, expire).
- [ ] tRPC tests for valid, missing, and invalid tiers.
- [ ] E2E: organizer configuration and free/pro/premium booking links.
- [ ] Regression: ordinary event types retain standard availability.

## Acceptance criteria

- [ ] Organizers can configure tiers without direct database changes.
- [ ] A tier reveals only its assigned schedule.
- [ ] Invalid tier links reveal no unintended slots.

---

# Sprint 3 — Waitlist Reliability and Recovery

**Goal:** turn the initial waitlist into a correct, secure, automated booking recovery flow.

## Work items

- [x] **R3.1** Created Prisma migration for `BookingWaitlist` with indexes on `[eventTypeId, slotTime]`, `[email]`, and `[promotionToken]`.
- [x] **R3.2** Added `slotEndTime`, `tier`, and `promotionToken` fields to `BookingWaitlist` (migration `20260820190000`). Waitlist entries now store exact UTC start/end and tier context.
- [x] **R3.3** Atomic promotion via `prisma.$transaction` — the findFirst + update happens inside a transaction so only one person gets promoted per released seat.
- [x] **R3.4** Generate signed, single-use `promotionToken` (32-byte random hex) with 2-hour expiry. `validatePromotionToken` checks validity and expiry; `consumePromotionToken` deletes the entry after use.
- [x] **R3.5** Deliver promotion email through `WaitlistPromotionEmail` template using the existing `BaseEmail.sendEmail()` infrastructure. Email sent after atomic promotion with booking link, slot time, tier, and 2-hour expiry. Errors are logged but don't break the promotion flow.
- [x] **R3.6** `expireOldNotifications` deletes expired entries; `promoteAfterExpiry` finds slots with unnotified entries and promotes the next eligible person.
- [x] **R3.7** Event validation (verify event type exists), deduplication (check existing entry before create), and rate limiting (5 requests/minute per email) in `joinWaitlistHandler`.
- [x] **R3.8** Organizer waitlist visibility: `getWaitlistForEventType` tRPC query (authed, ownership-checked) + `OrganizerWaitlistPanel` component in the availability tab showing email, name, slot, tier, and status (waiting/notified/expired).

## Tests

- [x] Invitation token and expiry tests (4 tests: valid, expired, non-existent, unnotified).
- [x] Atomic promotion tests (3 tests: promote with token, tier-filtered promote, empty waitlist).
- [ ] Concurrent cancellation/promotion tests.
- [ ] Email delivery/retry tests.
- [ ] E2E: full slot → waitlist → cancellation → invitation → booking.
- [ ] E2E: expired invitation and duplicate waitlist request.

## Acceptance criteria

- [ ] Cancellation promotes only the next person for the exact event, tier, and slot.
- [ ] An invitation cannot be reused or used after expiry.
- [ ] Failed notification delivery is visible and recoverable.

---

# Sprint 4 — Per-Event-Type Subscription Calendars

**Goal:** let signed-in bookers subscribe to individual event types for recurring access.

## Product decisions already made

- Bookers must be signed in.
- Each subscription unlocks one event type.
- Subscriber and non-subscriber booking windows are configured per event type.

## Work items

- [x] **R4.1** Added `requiresSubscription`, `subscriptionConfig`, `stripeSubscriptionPriceId` to EventType. New `EventSubscription` model tracking booker-side subscription state (status, period, Stripe IDs).
- [x] **R4.2** Created migration `20260821000000_add_event_subscriptions` with indexes on `[eventTypeId, email]`, `[eventTypeId, userId]`, `[stripeCustomerId]`, and unique on `stripeSubscriptionId`.
- [x] **R4.3** Organizers can create monthly/yearly Stripe products and prices using the platform Stripe API key; connected Stripe accounts are used automatically when configured but are optional.
- [x] **R4.4** `subscriptionsRouter.createCheckout` is authenticated, prevents duplicate active subscriptions, and creates checkout sessions scoped to the selected event type.
- [x] **R4.5** Checkout return synchronizes entitlement using `{CHECKOUT_SESSION_ID}` and `STRIPE_PRIVATE_KEY`; the idempotent webhook remains available as optional status-update hardening.
- [x] **R4.6** `subscriptionsRouter.createPortal` creates authenticated Stripe Customer Portal sessions and returns bookers to the event page.
- [x] **R4.7** Entitlement is enforced server-side in slot lookup and booking creation; subscription-aware slot cache keys prevent cross-user availability leakage.
- [x] **R4.8** Validated subscriber/non-subscriber booking windows are enforced in availability lookup.
- [x] **R4.9** Added organizer subscription controls and booking-page states for sign-in, checkout, active subscriber availability, and subscription management.

## Tests

- [x] Entitlement service tests for active, expired, and missing subscriptions.
- [x] Connected-account price, checkout, portal, and webhook replay service tests.
- [x] Booking-window selection and malformed-config tests.
- [x] Booking-boundary authorization tests for anonymous, unsubscribed, subscribed, non-gated, and reschedule requests.
- [ ] E2E: sign in → subscribe → webhook → book → portal → cancel → access revoked.

## Acceptance criteria

- [x] Only active subscribers may book subscriber-only event types.
- [x] Server-side availability and booking checks cannot be bypassed by the browser.
- [x] Stripe replay events do not create duplicate entitlements.

---

# Sprint 5 — Production Operations and Compliance

**Goal:** make the SaaS supportable after launch.

## Work items

- [x] **R5.1** Added production environment validation. `validateProductionEnv` checks DATABASE_URL (PostgreSQL format), NEXTAUTH_SECRET (min 32 chars), NEXTAUTH_URL and WEBAPP_URL (HTTP(S) format), Stripe key formats (sk_live_/sk_test_, pk_live_/pk_test_, whsec_), Resend key format (re_) and from-address email validity, SMTP host format, and ensures at least one email transport is configured. `assertProductionEnv` logs findings and throws on error-severity issues. 10 env validation tests pass.
- [ ] **R5.2** Confirm database backups, restoration procedure, and migration rollback procedure.
- [x] **R5.3** Added monitoring infrastructure for checkout, webhook, email, booking, payment, and subscription failures. Created `monitoring` module with `logFailure` (structured logging + Sentry capture with category tags) and `ErrorRateTracker` (sliding-window 5xx counter with cooldown-governed alerts). Enhanced `/api/health` endpoint with subsystem checks for database (latency), Stripe (key format/mode), email (transport), and Redis (URL). Integrated failure logging into subscription webhook and `SubscriptionService` checkout/subscription handlers. 8 monitoring tests pass.
- [x] **R5.4** Added feature-flag/controlled rollout strategy for monetization, tiers, waitlists, and subscriptions. Four global flags (`monetization-paid-bookings`, `tiered-availability`, `waitlist`, `event-subscriptions`) gate server-side entry points in tRPC routers, slot util, booking service, and cancel handler, plus client-side organizer config UI and booker wrapper. Flags default to enabled when no Feature row exists.
- [ ] **R5.5** Publish Terms, Privacy Policy, cancellation/refund policy, and support workflow.
- [~] **R5.6** Support and incident response runbook is documented; assign named launch, release, and support owners plus a monitored production support address before launch.

## Acceptance criteria

- [ ] Staging runs full Stripe test-mode journeys.
- [ ] Production monitoring identifies payment and booking failure quickly.
- [ ] Backup restoration has been rehearsed.
- [ ] Rollback owners and procedures are assigned.

---

# Sprint 5.5 — Pre-Launch Hardening and Revenue Readiness

**Goal:** close the remaining product, payment, reliability, and operational gaps before release-candidate verification.

**Scope rule:** this sprint is for making the existing SaaS v1 surface safe to sell. Do not start Phase 2 AI features or add new monetization concepts.

**Execution order:** finish non-payment product, reliability, operations, legal, and repository work first. Real Stripe journeys and payment lifecycle verification (`R5.5.1`, `R5.5.2`, and the payment portions of `R5.5.6`) are intentionally deferred to the final pre-launch gate after plans and product behavior are stable.

## Work items

- [~] **R5.5.1 Platform billing on the canonical model — final pre-launch gate** — Rebuild the Free/Pro/Enterprise subscription flow against `PlatformBilling` and the existing Stripe abstractions. Do not transplant the legacy `feat/billing-stripe` implementation. Checkout now prevents parallel subscriptions and uses a stable Stripe idempotency key; webhooks synchronize failed/recovered invoices, cancellation, and replay against `PlatformBilling`. A single plan-feature catalog now drives public plan data, inherited Pro/Enterprise capabilities, and typed server-side entitlement checks. The new `/settings/billing` workspace provides current-plan state, monthly/annual comparison, checkout, portal access, and a safe onboarding path. Pro trials use `User.trialEndsAt` for temporary catalog-driven access; onboarding no longer writes a parallel plan into user metadata. The managed Stripe Portal configuration derives its allowed prices from the plan catalog, supports prorated plan/interval changes, payment-method and invoice management, and period-end cancellation with reason collection. Production validation requires the Stripe key, Pro prices, and billing webhook secret; `/api/health` reports missing or malformed identifiers without exposing values, and legacy organization billing variables remain accepted as compatibility aliases. Fourteen service tests, five webhook endpoint fixtures, and the readiness checks pass. Deferred remainder: full Stripe test-mode journeys against real test products, portal sessions, and webhook delivery.
- [ ] **R5.5.2 Payment lifecycle verification — final pre-launch gate** — Add focused Stripe test-mode coverage for one-time paid bookings, deposits, remaining balances, packages, tips, refunds, cancellation fees, and duplicate webhook delivery. Confirm every payment mutation is idempotent and currency-safe.
- [x] **R5.5.3 Waitlist concurrency and recovery** — Waitlist joins use a database-enforced deterministic deduplication key. Promotion redemption uses an exact event/slot/tier/email claim with a 30-minute recovery lease, and only the winning claim can consume the single-use invitation. Promotion delivery retries three times without issuing a different token. A credential-protected five-minute cron replaces each expired invitation with at most one successor for the exact slot and tier in a single transaction; active redemption leases are preserved, recovery is concurrency-safe, and the previous unsafe broad queue scan was removed. Cancellation now uses a conditional status transition so duplicate concurrent requests cannot release two seats. New bookings snapshot their server-selected tier in reserved booking metadata, allowing cancellation to promote only the matching tier without a schema change; bookings created before this checkpoint have no tier snapshot and retain the legacy cross-tier fallback. Thirty-one focused service, endpoint, metadata, and database-backed cancellation tests pass. Migration `20260829173500_add_waitlist_redemption_claims` is applied to the development database.
- [x] **R5.5.4 Production monitoring hardening** — Replaced per-instance error windows and cooldowns with shared Upstash Redis batches and atomic cooldown claims. Production validation requires the actual Redis REST URL/token used by the application, while `/api/health` verifies Redis with a short-lived write/read/delete instead of trusting environment presence. Structured failures across checkout, webhook, booking, payment, email, and subscription categories now carry correlation IDs through application logs and Sentry; elevated alerts include the originating category and actionable context. Platform and event-subscription webhook failures await distributed tracking, return retryable 500 responses, and expose the same correlation ID in the response body and `x-correlation-id` header. Thirty-three focused monitoring, environment, health, and webhook tests pass.
- [~] **R5.5.5 Backup and rollback rehearsal** — Added a guarded PostgreSQL backup/restore rehearsal script and provider-neutral restore/migration rollback runbook. The script requires an explicit non-production confirmation and rejects a source/target identity match. Remaining release-blocking work: choose/record the production database provider, enable and confirm its backup/PITR settings, provision a disposable restore target, install PostgreSQL client tools, run the rehearsal, and record the measured RTO/RPO result.
- [ ] **R5.5.6 Staging acceptance journeys** — Run the complete Stripe test-mode and booking journeys in staging, including authentication, organization onboarding, payment, subscription access, waitlist promotion, cancellation, refund, email delivery, and webhook replay. Record failures as release blockers.
- [~] **R5.5.7 Legal, support, and incident readiness** — Added a support/incident runbook with escalation roles, severity targets, rollback authority, workflow guides, and customer communication templates. Remaining release-blocking work: assign named owners, publish a monitored support address, and publish Terms, Privacy, and cancellation/refund policies with final business details.
- [~] **R5.5.8 Product/documentation alignment** — App-store metadata for Google Calendar and Google Meet identifies CalBook.ai and no longer links users to Cal.com. The app-store presentation layer now treats legacy Cal.com/Cal.diy publisher records as CalBook.ai-managed, routing their public links and support contact to the configured CalBook.ai deployment while preserving genuine third-party publisher details. Brand defaults, public form/API titles, signup CTAs, embedded branding, payment setup copy, email-client search, and shared customer translations now use CalBook.ai; missing support/terms configuration no longer sends customers to a Cal.com address. A configurable CalBook.ai help-center layer now replaces Cal.com links in command search, embeds, booking guidance, API keys, blocklists, and webhooks; it remains inside the app until a public help center is configured. Remaining: migrate event-configuration help links and audit integration-specific setup copy, publish Terms and Privacy pages with final business details, set a monitored support mailbox and public help center, and complete a final customer-surface audit before launch. Verify branding and trademark assumptions before public launch.
- [~] **R5.5.9 Secret and repository hygiene** — Audited tracked configuration files and removed a fixed cron API key from `.env.example`. A pre-commit check now blocks local `.env` files and recognizable live Stripe, Resend, Google OAuth, webhook, and private-key material from staged content. Remaining release-blocking work: rotate previously shared credentials, confirm production secrets are injected by the deployment platform, and run the final provider-aware secret scan before launch.
- [ ] **R5.5.10 Release decision record** — Update this sprint file with test results, known limitations, owners, rollback decision, and an explicit Go/No-Go recommendation before Sprint 6 begins.
- [~] **R5.5.11 Transactional email and calendar-provider readiness** — Resend transport precedence, environment validation, and live health verification are complete. Local Gmail SMTP is verified reachable and a real booking (`muH8FxoojdeChzhZUiPSxf`) completed with an organizer, attendee, and added guest; organizer, attendee, and guest inbox delivery is confirmed. The calendar UI reports Google OAuth readiness and explains that calendar access is separate from email delivery. Google Calendar/Meet now has a production callback, consent-screen, and end-to-end release checklist, and the README no longer advises storing OAuth JSON in `.env`. Remaining: configure the production OAuth consent screen with final public legal/support URLs, verify the Google Calendar event/Meet link end-to-end, and remove the test event type's stale Daily-video location (the Daily app is not seeded; booking falls back to Cal Video).

## Tests and verification

- [x] Month-only public booking layout and Resend transport configuration/health regression suite (26 focused tests across layout policy, key/sender precedence, environment validation, SMTP selection, and reachable/unreachable health states).
- [x] Google Calendar readiness-state unit tests (3 tests: platform setup missing, ready to connect, and connected).
- [~] Focused unit tests for billing, payment idempotency, entitlement boundaries, and waitlist concurrency. Waitlist concurrency/retry/recovery coverage passes (31 tests); payment acceptance remains deferred to the final pre-launch gate.
- [ ] Targeted Playwright journeys pass in staging.
- [ ] Stripe webhook replay produces no duplicate payment, package redemption, or entitlement.
- [ ] Backup restoration and migration rollback are demonstrated and documented.
- [x] Multi-instance monitoring behavior is covered by shared-Redis tracker tests, including cross-instance thresholds and atomic alert cooldown claims.
- [ ] Secret scan and environment validation pass without exposing secret values.
- [ ] Organizer, attendee, and added-guest emails are captured locally and delivered through the staging provider; email health fails when its transport is unreachable.
- [ ] A user can connect Google Calendar, create a Google Meet booking, and see the synchronized event and conference link without sharing Gmail credentials with CalBook.ai.

## Acceptance criteria

- [ ] A real user can subscribe to a platform plan, configure a paid event, receive payment, and manage the subscription end-to-end.
- [ ] Failed, duplicated, delayed, and replayed payment/webhook events leave the database in a correct state.
- [ ] A released waitlist slot is promoted safely under concurrent cancellation, and its invitation is single-use and time-limited.
- [ ] The team can restore production data and roll back a migration using a rehearsed procedure.
- [ ] Support can respond to payment, booking, email, and access incidents using documented runbooks.
- [ ] No known critical or high-severity blocker remains for Sprint 6 release-candidate verification.

---

# Sprint 6 — Release Candidate and Launch

**Goal:** validate the integrated product and deploy safely.

## Release candidate verification

- [ ] `yarn prisma generate`
- [ ] `yarn type-check:ci --force`
- [ ] `yarn lint`
- [ ] `TZ=UTC yarn test`
- [ ] production build
- [ ] Prisma migration check and staging migration apply
- [ ] targeted Playwright E2E suite
- [ ] security audit
- [ ] manual desktop/mobile acceptance pass

## Manual acceptance journeys

- [ ] signup, login, password recovery, and organization onboarding
- [ ] platform plan checkout and customer portal
- [ ] one-time paid booking
- [ ] deposit and remaining balance
- [ ] package purchase/redemption
- [ ] tip payment
- [ ] tiered booking link
- [ ] waitlist promotion and expiring booking link
- [ ] event-type subscription checkout and access revocation
- [ ] cancellation, refund, email notification, and webhook replay

## Launch criteria

- [ ] All release gates and Sprint acceptance criteria are complete.
- [ ] Staging sign-off is recorded.
- [ ] Production rollback plan is rehearsed.
- [ ] Launch owner and support owner are assigned.
