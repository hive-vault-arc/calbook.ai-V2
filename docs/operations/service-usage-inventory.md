# Service usage and upgrade inventory

Reviewed 2026-10-21. Owner: project maintainer until individual owners are assigned.
This is an operational inventory, not a billing authorization or proof that every
integration in the monorepo is active. Never record keys, connection strings,
invitation tokens, or customer data here.

## Evidence and account verification

Repository support, operator-reported setup, and observed deployment are different
evidence levels. Actual account tier, allowance, billing cycle, and current usage
must be verified in each provider dashboard before launch; they were not inspected
for this inventory. Public limits change and account-specific allowances may differ.
No automatic upgrade or new subscription is authorized.

| Service | Evidence / purpose | Monitor and upgrade or remediation trigger |
| --- | --- | --- |
| Vercel | Confirmed production/preview deployments; Next.js pages and server routes. #69 deployed at `c16fad96`. | Verify plan eligibility before external beta. Track build duration/failures, CPU, memory, invocations, transfer, image optimization, ISR reads/writes, cron needs, and deployment retention. Optimize measured waste first; upgrade or choose eligible hosting when terms or capacity require it. |
| Neon PostgreSQL | Operator-configured production and isolated dev; read-only diagnostics verified `calbook_dev`. | Track storage growth, compute allowance, active connections, query latency, cold starts, restore history, and dev/prod resource contention. Upgrade when measured demand or recovery requirements exceed the verified allowance. Do not infer database identity from a branch named `production`. |
| Unkey rate limiting | Operator reported separate dev/prod root keys; shared limiter in `packages/lib/rateLimit.ts`. | Monitor rate-limit API requests, errors/timeouts, denials, and auth availability. Verify the API-management/rate-limit product allowance, not an unrelated compute plan. Capacity exhaustion must not be handled by disabling auth protection. |
| Transactional email: Resend or SMTP | Both paths supported; prior test email delivery observed. Active production transport and account plan need dashboard confirmation. | Track sends per day/month, API rate limits, bounces, spam complaints and delivery failures. Count host plus attendees and reschedules/cancellations/auth messages, not just bookings. Upgrade before normal legitimate traffic exceeds verified sending limits. Sent/SMTP success is not Inbox proof. |
| Cloudflare Turnstile | Operator-created widget; server token validation supported in `packages/lib/server/checkCfTurnstileToken.ts`. | Monitor hostname/action mismatches, token verification errors and challenge outcomes. Check widget/hostname limits before adding domains. Do not disable verification to hide quota/configuration failures. |
| GitHub / Actions | Confirmed repository, PR gates and workflow runs. | Track private-runner minutes, storage, cache/artifact usage, queue delays and retention. Preserve required type, policy and security checks; optimize redundant work separately. |
| Tally | Existing beta application URL in `apps/web/modules/marketing/constants.ts`; operator requires a no-Pro workflow. | Verify whether the currently deployed CTA still uses it. Track submissions, spam, export/reconciliation and privacy. No Tally Pro dependency; email confirmation/invitation handling must have a separately verified implementation. |
| Sentry | SDK/configuration supported; live ingestion and current plan unverified. | Confirm project ownership and sanitized error delivery. Monitor error/trace/replay volume, retention and dropped events; review sampling before considering an upgrade. Never capture secrets. |
| Upstash Redis | Optional monitoring/cache integration supported; active provisioning unverified. Not interchangeable with Unkey. | If enabled, track commands, storage, transfer, latency and throttling. Do not purchase or provision merely because example variables exist. |
| Render | Historical deployment reported earlier; current traffic dependency and billing unverified. | Confirm whether anything still routes to it and whether database/worker/cron duties remain. Monitor memory, sleep/cold starts and uptime if active. Do not delete or downgrade until dependencies and rollback needs are confirmed. |

## Optional or deferred providers

- Google Calendar/Meet, Microsoft Outlook/Teams, Zoom and Daily: repository support
  is not evidence of a working customer connection. Verify provider credentials,
  app enabled state, OAuth requirements, API quotas and connected lifecycle tests
  before advertising support. Google Calendar remains disabled in dev by operator
  choice; #69 reports unavailable configuration honestly rather than enabling it.
- Stripe: outside this free beta's scope; no claim of checkout acceptance or live
  billing readiness. Review pricing, webhooks and payment testing before paid launch.
- SMS, AI, object storage and other inherited Cal.com integrations: discover actual
  enabled calls before adding them to the paid-services budget. Example environment
  variables and installed libraries alone do not establish usage.

## Hosting eligibility and cron caveat

[Vercel's Hobby documentation](https://vercel.com/docs/plans/hobby) and
[plan overview](https://vercel.com/docs/plans) restrict Hobby to personal,
non-commercial use. Free access for beta users does not itself establish eligibility
for a business project. Confirm the applicable plan with Vercel or choose eligible
hosting before inviting external customers. No plan change was made during review.

The checked-in `apps/web/vercel.json` has no cron schedule. Required jobs must be
identified and an allowed scheduler verified before relying on reminders or cleanup.
Do not assume `apps/web/vercel.production.json` executes automatically.

## Usage review procedure

1. Before launch, record the actual tier, allowance/reset period, current usage,
   dashboard owner and alert destination for each active service. Leave unknowns
   explicitly unknown; do not copy secret values into this record.
2. During beta, review usage weekly and after onboarding batches or traffic spikes.
   As an internal policy, investigate at 70% of an allowance and prepare a capacity
   decision at 85%; these are proposed operating thresholds, not vendor guarantees.
3. Budget for dev, PR previews, tests and retries as well as production. Shared
   accounts can consume a common allowance even with separate API keys/databases.
4. Require human approval before spending, changing plans, disabling protections,
   or deleting resources. Record the reason, expected cost, rollback and owner.
5. Alert on real failures regardless of percentage: auth limiter outage, rejected
   emails, database connection errors and expired deployment URLs are actionable.

## Public reference links

Use live dashboards for account-specific numbers. Public references reviewed on
2026-10-21 include [Vercel limits](https://vercel.com/docs/limits),
[Neon plans](https://neon.com/pricing), [Unkey pricing](https://www.unkey.com/pricing),
[Resend pricing](https://resend.com/pricing), and
[Turnstile plans](https://developers.cloudflare.com/turnstile/plans/).
Unkey's pricing page includes multiple products; identify the relevant one first.

## Separate performance and launch order

Keep measured runtime performance work (unused calls, re-renders, inherited dead
code) separate from functional fixes and service-budget changes. Build-time
optimization is the final optimization task; preserve required CI checks. Secret
rotation is the final pre-launch security task at operator request, followed by
redeployment and verification before the launch decision. Admin 2FA and connected
provider acceptance remain unverified, not implicitly completed by this inventory.
