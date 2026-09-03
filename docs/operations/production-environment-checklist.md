# CalBook.ai production environment checklist

Use this checklist for staging first, then production. Set secrets only in the deployment platform's secret manager. Do not paste secret values into tickets, chat, CI logs, or this repository.

## Core application

| Setting | Requirement |
| --- | --- |
| `DATABASE_URL` | Production PostgreSQL connection string. |
| `DATABASE_DIRECT_URL` | Direct PostgreSQL connection for Prisma migrations when `DATABASE_URL` uses a pooler. |
| `NEXT_PUBLIC_WEBAPP_URL` | Canonical HTTPS app URL, with no alternate host. |
| `NEXTAUTH_URL` | Same canonical URL for NextAuth. |
| `NEXTAUTH_SECRET` | Unique secret of at least 32 characters. |
| `CALENDSO_ENCRYPTION_KEY` | Unique encryption key retained for the life of encrypted credentials and two-factor data. |
| `ALLOWED_HOSTNAMES` | JSON-compatible list containing only the production hostnames. |
| `CRON_API_KEY` | Unique cron secret. Invoke protected cron routes only as `Authorization: Bearer <secret>`. |

Changing `CALENDSO_ENCRYPTION_KEY` without a planned credential migration can make existing calendar and two-factor data unreadable. Never reuse it between staging and production.

## Transactional email

Use Resend for the production sender:

| Setting | Requirement |
| --- | --- |
| `RESEND_API_KEY` | Server-side Resend key. `NEXT_RESEND_API_KEY` remains a compatibility alias only. |
| `RESEND_FROM` | Sender on a domain verified in Resend. |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Matching visible fallback sender identity. |

Before enabling signups, send a booking confirmation, cancellation, reschedule, waitlist promotion, and password/account email to external test inboxes. Verify the email subsystem in `/api/health` is `ok`.

## Calendar and video

Set `GOOGLE_API_CREDENTIALS` as the Google OAuth web-client JSON in the secret manager. Register the exact callback URL shown in the [Google Calendar launch checklist](google-calendar-launch-checklist.md). Complete the connect, booking, cancellation, and reconnect smoke test there before production traffic.

Only promote Google Calendar, Google Meet, Microsoft Teams, Outlook Calendar, and Zoom in the V1 integrations catalog. Keep an unavailable provider hidden rather than allowing a fallback that changes an interview's expected meeting format.

## Billing and monitoring

| Area | Required settings or action |
| --- | --- |
| Platform billing | `STRIPE_PRIVATE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, billing webhook secret, and valid Pro monthly/annual price IDs. |
| Billing verification | Stripe test-mode checkout, portal, cancellation, failed payment, refund, and duplicate webhook replay must pass before live keys are enabled. |
| Distributed monitoring | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; `/api/health` must report Redis `ok`. |
| Error reporting | Configure the CalBook Sentry project and verify a test exception is received without customer secrets. |

## Release validation

1. Run migrations against staging and record the migration head.
2. Confirm `/api/health` shows database, email, Redis, Stripe, and platform billing as `ok`.
3. Run the authenticated recruiter, candidate booking, waitlist, email, calendar, and payment acceptance journeys.
4. Complete the [backup restore rehearsal](database-backup-and-rollback.md) on a disposable restore target.
5. Rotate any development credentials that were ever shared outside the secret manager.
6. Record owners, results, known limitations, rollback commit, and Go/No-Go in the release decision record.

