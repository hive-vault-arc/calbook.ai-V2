# Support and incident response runbook

## Roles and authority

| Role | Responsibility |
| --- | --- |
| Launch owner | Incident commander, customer-impact decision maker, and sole authority for production rollback or PITR restoration. |
| Release engineer | Investigates logs, deploys or reverts application changes, and records technical actions. |
| Support owner | Receives customer reports through the production support contact, keeps customers updated, and maintains the incident record. |

Before launch, assign named people to these roles and set `NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS` to a monitored CalBook.ai support mailbox. Do not use a personal inbox as the published support channel.

## Severity and response target

| Severity | Definition | Acknowledge | Customer update |
| --- | --- | --- |
| SEV-1 | Booking, authentication, payments, or customer data are broadly unavailable or at risk. | 15 minutes | Within 60 minutes, then every 60 minutes. |
| SEV-2 | A major workflow is degraded for a meaningful subset of customers, with a workaround. | 1 hour | Within 4 hours. |
| SEV-3 | Isolated customer issue or non-critical defect. | 1 business day | On resolution or within 2 business days. |
| SEV-4 | Question, feedback, or cosmetic issue. | 2 business days | As agreed with the customer. |

## First response

1. Open an incident record with time, reporter, severity, affected workflow, and correlation ID if one is available.
2. Check `/api/health`, Sentry, and application logs. Preserve webhook event IDs and booking UIDs; never copy tokens, database URLs, or full customer data into the record.
3. For a recent release, stop further deployment and have the launch owner decide whether to roll back application code.
4. If an optional feature is the failure boundary, disable its feature flag first (`monetization-paid-bookings`, `tiered-availability`, `waitlist`, or `event-subscriptions`) to reduce impact while investigating.
5. Send the first customer update according to the severity target and update it only with confirmed facts.

## Workflow guides

### Booking or availability failure

Capture the booking URL, event type, timestamp, timezone, and correlation ID. Check calendar connectivity and the booking logs. If slots are wrong, pause the affected event type or feature flag; do not manually create a booking unless the organizer confirms the slot remains free.

### Email delivery failure

Check the email section of `/api/health`, the Resend/SMTP provider dashboard, and the correlated failure log. Preserve the booking UID and recipient domain. Retry only through the supported booking/email workflow; avoid manually sending messages that could duplicate a confirmation or cancellation.

### Access or OAuth failure

Confirm the affected provider and callback URL. For Google Calendar, verify the configured URL against the [Google Calendar launch checklist](google-calendar-launch-checklist.md). Never ask a customer to send an OAuth token or password by email.

### Payment or subscription failure

Record the Stripe event ID, correlation ID, account/customer identifier, and customer impact. Do not modify entitlements manually until the webhook and `PlatformBilling` state are understood. Escalate SEV-1 for duplicated charges, leaked payment information, or broad checkout failure. Stripe acceptance validation remains a final pre-launch gate.

### Data or migration incident

Freeze deployments, disable the affected feature if possible, and follow the [database backup and rollback runbook](database-backup-and-rollback.md). Only the launch owner may authorize a provider restore.

## Customer communication templates

**Initial update**

> We are investigating an issue affecting [workflow] that began around [time and timezone]. Our team has identified [confirmed impact]. We will provide another update by [time].

**Resolved update**

> The issue affecting [workflow] has been resolved as of [time and timezone]. [Brief confirmed impact]. If you still need help, contact us at [support address] and include [booking UID or reference].

**Individual support reply**

> Thanks for reporting this. We are reviewing your [booking/account] issue. Please send the booking link or booking UID and the approximate time it occurred. Do not send passwords, payment card details, or calendar access tokens.

## Closure and follow-up

The incident commander closes an incident only after health checks and an affected-workflow smoke test pass. Record the timeline, cause, customer impact, rollback/flag decision, and corrective action. A SEV-1 or SEV-2 requires a short post-incident review within five business days.
