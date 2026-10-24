# Beta service and performance register

Use this register alongside the [production environment checklist](production-environment-checklist.md). It records which external accounts may need a plan or quota change; it does **not** assert that an integration is enabled or tested. Check the provider dashboard before relying on a limit, since plans and usage allowances can change. Never copy credentials, invitation links, or connection strings into this file.

## External services

| Service | Current role | Beta readiness / evidence to collect | Upgrade or intervention trigger |
| --- | --- | --- | --- |
| Vercel | Hosts the web app and dev previews; build and cache usage. | Record production and dev deployment IDs, environment scopes, build duration, function usage, and ISR writes from the Vercel dashboard. | Builds, function usage, bandwidth, or ISR writes approach the current plan allowance; required cron schedules are unsupported. See [Hobby staging notes](vercel-hobby-staging.md). |
| Neon | Separate PostgreSQL projects for production and isolated dev. | Reconfirm each Vercel environment points to the intended database, migration head, backup/PITR availability, and a restore rehearsal. | Storage, compute, connection, backup, or recovery requirements exceed the current plan. |
| Resend | Transactional account, invitation, and booking email. | Verify sender domain and external-inbox delivery for signup, invitation, booking, reschedule, and cancellation; monitor bounces and spam placement. | Sending volume or deliverability needs exceed the current allowance. |
| Unkey | Shared rate limiting, including auth email protection. | Verify separate dev/prod keys, fail-closed auth behavior, and rate-limit responses; monitor request usage and provider errors. | Request volume or required reliability exceeds the current allowance. |
| Cloudflare Turnstile | Bot challenge for configured flows. | Verify site/secret key scoping and server-side token verification on the deployed host. | Challenge usage, analytics, or required controls exceed the current allowance. |
| Tally Free | Public beta application form and manual review. | Verify form destination, notifications, and manual application-to-invitation workflow; no Tally Pro dependency. | Application volume makes manual review unsustainable; assess a first-party form before purchasing automation. |
| GitHub Actions | Pull-request and branch validation. | Keep required checks green and record workflow duration and failures. | Runner minutes, storage, or queue time affect the release process. |
| Sentry | Application error monitoring where configured. | Confirm dev/prod project scoping and a sanitized test exception, then set an owner for alerts. | Event volume or retention needs exceed the current allowance. |
| Upstash Redis | Distributed cache/monitoring paths where configured. | Confirm whether each environment is configured and that `/api/health` reports its actual state. | Request, storage, or latency requirements exceed the current allowance. |
| Stripe | Future paid plans and payment flows; **not required to charge beta users**. | Keep live billing gated until test-mode checkout, webhook replay, cancellation, refund, and support procedures pass. | Payment volume or billing features require a plan change; never switch to live keys based on this register alone. |
| Google Calendar / Meet, Microsoft Teams, Zoom | Candidate/host integrations shown as **planned** on the landing page. | Keep each unavailable provider disabled or hidden until configuration, connect/reconnect, booking, cancellation, and reschedule acceptance pass. Google Calendar remains disabled in dev by operator choice. | Provider verification, consent-screen, API quota, or account tier blocks acceptance. See the [Google checklist](google-calendar-launch-checklist.md). |

For each provider, the launch owner should record the account/project owner, dashboard link, current plan and measured usage in a private operations record. Do not infer a plan from code or an environment-variable name.

## Separate prelaunch performance pass

Keep these changes separate from functional fixes and provider rollout. Profile before removing code or changing cache behavior; capture a before/after measurement and a regression test for each accepted change.

1. Measure Vercel build time by phase; remove duplicated checks only when required GitHub checks remain enforced. Keep the build reproducible.
2. Inspect Vercel ISR writes and cache invalidation for high-frequency paths. Avoid regeneration of authenticated or user-specific pages and unnecessary `revalidatePath`/`revalidateTag` calls. Verify freshness after any change.
3. Trace network calls and client renders on landing, signup, onboarding, event templates, and booking flows. Remove unused requests and fix repeated render loops without changing business behavior.
4. Audit inherited Cal.com code and dependencies for dead paths. Delete only after proving routes, imports, scheduled jobs, and integrations do not use them; split removals into small PRs.
5. Recheck bundle size, accessibility, mobile behavior, and the core booking journey after optimization.

## Release gates and deferred bugs

- Complete functional acceptance and the production deployment/rollback checklist before beta invitations are opened broadly.
- Track the known legacy Cal Video booking/reschedule presentation issue as a post-beta bug, per the beta acceptance decision. Do not mistake it for an enabled video integration.
- Secret rotation is the **last prelaunch gate**, as requested by the operator: rotate exposed or shared credentials in the secret managers, redeploy, and smoke-test affected auth, email, booking, and admin flows **before** inviting real beta users. Never publish secret values or store test-account passwords in this repository.
