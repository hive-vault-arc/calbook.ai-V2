# Beta known issues and follow-ups

Last reviewed: 2026-10-21. This register records evidence and release decisions;
it does not authorize merges, notifications, booking changes, or secret rotation.

## BUG-001 — Orphaned Cal Video location survives legacy reschedule

- Status: explicitly deferred until after beta launch by the operator on
  2026-10-20. Not a beta launch blocker under that accepted limitation.
- Tracking: [PR #64](https://github.com/hive-vault-arc/calbook.ai-V2/pull/64),
  draft targeting dev; not merged into dev or production.
- Scope: older bookings carrying an implicit Daily/Cal Video marker with no
  usable meeting URL or video reference. This does not mean every reschedule
  or every video provider is broken; prevalence is unknown.
- Symptom: rescheduling can retain the stale provider marker, advertise a
  missing video link, or attempt unavailable Daily provisioning.
- Evidence: observed during the production test lifecycle. The proposed fix
  passes 172 focused tests, including an in-memory persistence/email regression,
  and its required CI and Vercel preview passed. Hosted acceptance is incomplete.
  Browser access to the preview was blocked by a saved permission; do not bypass it.
- Fixture finding: the dev booking inspected read-only on 2026-10-20 has an empty
  location and no video reference, so it cannot validate this legacy condition.
- Workaround: support should confirm a real meeting location with the host and
  share an approved manual meeting link if needed. Do not promise an automatic
  Cal Video URL. Do not automatically rewrite old bookings, reschedule them,
  cancel them, or resend invitations without approval.
- Owner: project maintainer; assign an implementation owner before reopening.
- Revisit: first post-beta bug-fix sprint, or earlier if a beta user encounters it.

### Acceptance before closing BUG-001

1. Use a disposable, explicitly approved dev fixture with an orphaned Daily marker.
2. Confirm its event and organizer do not explicitly select a provider.
3. Reschedule on the candidate build with approval for any outgoing notifications.
4. Verify the replacement booking and both emails do not promise unavailable video;
   retain the canceled original's history and avoid unexpected video API calls.
5. Confirm explicit providers, stored meeting URLs, and configured providers remain
   unchanged. A mocked test does not replace connected-provider acceptance.
6. Review and merge to dev, then separately approve production promotion. Record
   the deployed revision and hosted test evidence before marking resolved.

## FIX-002 — Duplicated attendee cancellation-email event name

- Status: fixed on dev by [PR #63](https://github.com/hive-vault-arc/calbook.ai-V2/pull/63),
  revision `2dccb479`, and promoted by approved
  [PR #68](https://github.com/hive-vault-arc/calbook.ai-V2/pull/68), production
  revision `dd76c5eb`; its deployment was confirmed successful.
- Symptom: formatting an already-expanded booking title repeats participant names.
- Scope of fix: use the raw event type when constructing attendee cancellation titles.
- Validation: 59 related tests, targeted TypeScript, and required CI passed. The
  security audit passed after retrying a TLS transport failure, without weakening
  the check. No live cancellation email was sent for this promotion. Do not equate
  mocked tests or SMTP/Sent evidence with confirmed attendee Inbox delivery.

## Recently released

- [PR #65](https://github.com/hive-vault-arc/calbook.ai-V2/pull/65): canceled/rejected
  booking page metadata titles; production revision `0505bd22`, deployment confirmed.
- [PR #66](https://github.com/hive-vault-arc/calbook.ai-V2/pull/66): white confirmation
  outer background while preserving the purple dark-mode card; production revision
  `b48572a6`, deployment confirmed.

## Ordered pre-launch work (not covered by the bug deferral)

The operator requested this order on 2026-10-21. Deferral is scheduling, not a
completed security check or approval to launch with exposed credentials.

1. Validate supported connected integrations or keep unconfigured/untested options
  unavailable and marketing claims accurate. Google Calendar dev remains disabled
  by operator choice; connected-provider acceptance is not recorded as passed.
  Selective promotion of readiness reporting is draft PR #69, not yet deployed.
2. Verify production admin protection and email delivery/observability. Admin 2FA
  remains unverified; enrollment and recovery codes are user-controlled.
3. Keep the service/usage/upgrade inventory and runtime performance review separate:
  unused calls, unnecessary re-renders, and inherited dead code need measured review.
4. Vercel build-time optimization is the last optimization task; preserve required
  security and type-safety gates. No paid plan upgrade is authorized here.
5. Rotate exposed secrets as the final pre-launch security task, then redeploy and
   verify affected authentication, email and provider flows before the launch decision.
   Plan migration of encrypted data instead of blindly replacing encryption keys.
   Do not paste replacement secrets into chat, documentation, Git or logs.

## Operational follow-up

- Dev deployment retention caused a 410 on 2026-10-20. The deleted latest dev
  deployment was restored and its signed-in dashboard loaded. Review retention
  separately; restoration does not prove all login or booking flows passed.
