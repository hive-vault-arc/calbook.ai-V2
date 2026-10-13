# External services and API lifecycle

This is the working register for third-party services used by CalBook.ai or required for its release. It records configuration names and maintenance triggers, never secret values. The status describes what the repository supports; it does not prove that a provider is configured in a particular Vercel environment. Verify the provider console before each release.

**Review owner:** CalBook maintainer  
**Review cadence:** quarterly, before a production release, and when a provider sends a deprecation/security notice  
**Last reviewed:** 2026-10-13

## Runtime and product services

| Service | CalBook use | Configuration / ownership | Status and what to review |
| --- | --- | --- | --- |
| Neon PostgreSQL | Primary application database. Prisma uses a pooled runtime connection and may use a direct connection for schema migrations. | `DATABASE_URL`, `DATABASE_DIRECT_URL`; separate production and preview databases in Vercel. | Core. Before a database or Prisma major upgrade, review Neon/PostgreSQL compatibility, pooler behavior, connection limits, SSL requirements, storage/compute quotas, and migration rollback strategy. Never point preview at production data. |
| Resend (SMTP fallback supported by upstream code) | Transactional mail: sign-in/account flows, booking lifecycle, and beta invitations. | `RESEND_API_KEY` (preferred), `NEXT_RESEND_API_KEY` (legacy alias), `RESEND_FROM`; fallback sender settings `EMAIL_FROM`, `EMAIL_FROM_NAME` or SMTP settings. Server-side only. | Core for reliable email. Review API/SDK changes, sending limits, verified-domain/sender requirements, bounce/complaint rate, and deliverability. Test booking, cancellation, reschedule, account, and beta-invitation messages after changes. |
| Unkey | Distributed rate limiting for authentication-sensitive endpoints. | `UNKEY_ROOT_KEY`; store as a secret in each deployment environment and use a separately scoped key for dev and production. | Core security dependency for fail-closed auth limits. Verify the key is active and can write to the rate-limit namespace and perform limit checks. Rotate/re-scope if exposed; test that unavailable or invalid credentials reject protected requests safely. Do not confuse this with Redis health checks. |
| Cloudflare Turnstile | Bot checks on signup and booking flows when enabled. | Public site key (browser-visible) and `CLOUDFLARE_TURNSTILE_SECRET` (server-only); `NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER` controls booking integration. | Security control. Verify hostname, widget/site-key pairing, server-side token verification, action configuration, and behavior on the actual production hostname. Re-test signup and booking after widget or verification API changes. |
| Google Cloud OAuth and Calendar API | Organizers connect their own Google accounts; Calendar availability/events and Google Meet conference links use that user-authorized connection. | `GOOGLE_API_CREDENTIALS` and canonical callback URL derived from `NEXT_PUBLIC_WEBAPP_URL`; user tokens remain in the app's encrypted credential store. | Core calendar integration. Review OAuth consent/publishing requirements, requested scopes, redirect URIs, Calendar API enablement/quotas, and provider changes. Smoke-test connect, availability, booking, cancellation, reschedule, and reconnect. Google Meet does not require each CalBook user to bring a separate API key. |
| Microsoft identity / Graph (Outlook Calendar and Teams) | Optional user-connected calendar and meeting-provider integrations. | Provider app registration and consent; `MICROSOFT_WEBHOOK_TOKEN` is used where the subscription webhook path requires it. User authorization is stored as an app credential. | Supported integration; tenant/app registration and webhook configuration must be checked for the environment. Review Graph permissions, OAuth redirect/consent, subscription renewal behavior, and API throttling/deprecations. Test with a work/school account before promoting as available. |
| Zoom | Optional user-connected video meeting provider. | Zoom app OAuth credentials/consent and connected user credential; inspect the installed-app configuration before changing deployment variables. | Supported integration, but availability depends on the provider app and user authorization. Review OAuth scopes, API/SDK version, account plan requirements, rate limits, and create/update/cancel behavior. |
| Tally | Public beta-interest form linked from the landing page. | Form URL is currently a source constant; submissions are reviewed manually and accepted applicants receive a separate CalBook invitation. | Active as a lightweight waitlist, not an account, payment, or automated email integration. Recheck form fields, destination, privacy copy, and thank-you instructions if the form changes. No Tally Pro automation is assumed. |
| Stripe | Planned CalBook paid plans and billing. Subscription and webhook code/configuration exist in the repository. | `STRIPE_PRIVATE_KEY`, public key, platform price IDs, and platform billing webhook secret(s); see `.env.example` and the billing checklist. | **Not a current beta-release gate; payments remain a final launch step.** Keep in test mode until checkout, portal, cancellation, failed payment, refund, idempotency, and webhook replay tests pass. Review Stripe API version, SDK version, webhook event/version configuration, tax/legal requirements, and plan IDs before charging users. |
| Upstash Redis | Redis REST integration is used by shared infrastructure and checked by `/api/health`; parts of the inherited codebase also use Redis-backed features. | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. | Configuration/production use must be verified in each environment. The current environment validator and health route treat Redis as an operational dependency, so resolve whether it is required for the chosen V1 surface and make health/readiness expectations match. It is separate from Unkey auth rate limiting. Review REST API/client compatibility, quotas, latency, and data retention. |
| Sentry | Error/performance monitoring hooks are present in the codebase. | `SENTRY_*`, `NEXT_PUBLIC_SENTRY_DSN*`; verify the project and environment values in the hosting console. | Optional until a real CalBook project receives a test event. Confirm source-map upload, environment/release tagging, sampling and privacy scrubbing; review SDK compatibility and quota before enabling broadly. Never send credentials, invite tokens, or unnecessary candidate data. |

## Hosting and delivery services

| Service | CalBook use | Status and what to review |
| --- | --- | --- |
| Vercel | Next.js hosting, previews, environment variables, and production deployment. | Current web host. Review Next.js/runtime compatibility, build and function limits, data/cache/ISR writes, preview protection, environment separation, and plan quotas before framework or caching changes. See [Vercel Hobby staging](vercel-hobby-staging.md). |
| GitHub Actions | Pull-request CI and deployment smoke checks. | Current source/CI gate. Review pinned action versions, Node support, runner image changes, permissions, cache behavior, and required status-check names. Update actions in small PRs and retain least-privilege workflow permissions. |
| Render | Older release documentation mentions Render as a deployment target. | **Reconfirm whether any production API/service still runs on Render.** Current Vercel app deployment does not by itself prove Render has been decommissioned. If unused, remove stale operational instructions only in a separately reviewed docs change; if active, record service name, owner, health URL, env scope, and plan limits here. |

## Services not to mistake for active V1 dependencies

The upstream Cal.diy/Cal.com-derived monorepo contains adapters, environment variables, API schemas, and app-store entries for many providers beyond the integrations CalBook intends to expose. Presence in source or the app catalog does not mean CalBook has configured, tested, or supports that service in V1. Promote a provider only after its credentials/consent, end-to-end tests, support path, and customer-facing availability are confirmed.

The generic environment template also contains optional/upstream hooks for services such as Intercom, PostHog, Dub, Sink, Zendesk, Help Scout, Freshchat, SendGrid, Twilio, Formbricks, Vercel BotID/Edge Config, Trigger.dev, Retell, Huddle01, and web-push/VAPID. They are **not confirmed active CalBook V1 dependencies** by their presence in `.env.example`; verify actual deployment configuration and user-facing usage before adding them to the active-service list or scheduling upgrades.

## Code-level clients to track

The repository lockfile and workspace manifests are the source of truth for exact installed SDK versions. When upgrading a service, check the corresponding client as well as the provider API:

| Provider | Client / implementation area |
| --- | --- |
| PostgreSQL | Prisma packages and generated Prisma client; `packages/prisma`. |
| Resend | Server email transport and configuration; `packages/lib/getResendConfig.ts`, `packages/emails`, and `packages/features/auth`. |
| Unkey | `@unkey/ratelimit`; `packages/lib/rateLimit.ts` and auth call sites. |
| Turnstile | Cloudflare Siteverify REST call; `packages/lib/server/checkCfTurnstileToken.ts` and booking/signup callers. |
| Google | `@googleapis/calendar`, `googleapis-common`, and OAuth/calendar adapters in `packages/app-store/googlecalendar` and `packages/features`. |
| Microsoft / Zoom | Provider app-store packages and calendar/video adapters; review the specific package manifest and OAuth scopes when touching those integrations. |
| Stripe | `stripe`; billing/subscription packages and webhook routes. |
| Upstash | `@upstash/redis`; `packages/features/redis` and health-check consumers. |
| Sentry | `@sentry/nextjs` and `@sentry/nestjs`; web/API instrumentation and monitoring package. |

Avoid copying upstream API versions or SDK versions into this register without verifying the lockfile and provider configuration at the time of the upgrade. The PR that changes a client should state the old/new package version and provider API/version implications.

## Upgrade and change procedure

For each provider or client library change:

1. Record the provider/API or SDK version, affected CalBook feature, and reason for the upgrade in the change PR. Do not record credentials.
2. Read the provider's official changelog and deprecation/security notices; check pricing, quotas, and plan limits where relevant.
3. Test in the isolated dev environment with test accounts/data and provider sandbox/test mode where available.
4. Verify failure handling, webhook signature/idempotency, retry behavior, rate limits, and user-visible fallback—not only the happy path.
5. Deploy through the normal dev-to-production release path, then record the deployed change and next review trigger here.

Provider API versions and deployment configuration can change independently of this repository. This inventory is a maintenance register, not a claim that every service is currently configured or healthy. Reconcile it against Vercel, Neon, Resend, Unkey, Cloudflare, Google Cloud, Microsoft, Zoom, Stripe, Upstash, Sentry, GitHub, and Render consoles before beta expansion and before public launch.
