# Booking video readiness

## Production test finding — 2026-10-15

The approved October 16 production test booking was accepted at 10:00–10:30 UTC.
The browser confirmation and raw database timestamps agreed. Local Node timezone
data was outdated for Morocco; do not infer a booking offset from that runtime.

The host notification reported failure to create a Daily video link. The template
had no location and the host had no conferencing preference, but the booking
service and shared location helper substituted Daily unconditionally.

## Fix behavior

- Implicit Cal Video requires an enabled `daily-video` app with a nonblank API key.
- Without it, a location-free booking stays location-free; no video URL is promised.
- Explicitly selected locations and manually supplied meeting links are preserved.
- Google Meet without Google Calendar cannot silently substitute unavailable Daily.
- Empty-location legacy bookings only schedule Daily-specific no-show work when
  Daily is configured. Dry runs perform no availability lookup.
- Provider credentials remain server-side. No new service, schema, or dependency
  is required by this fix.

## Release checks still required

Hosted dev passed the no-provider smoke test on revision `eb30d5a`: the October
16 booking at 10:00–10:15 Africa/Casablanca confirmed without a Cal Video link,
the host email arrived, and the attendee email showed the correct time. On
October 16 the operator confirmed receipt in the Outlook test inbox as well.

Google Calendar remains disabled in isolated dev at the operator's request.
Connected-provider testing is therefore still outstanding. UI readiness must
check the instance enabled state, not only OAuth environment configuration;
unconfigured Cal Video must not be presented as a connected/default integration.

1. Review the dev-targeted fix and require GitHub static analysis to pass.
2. Verify hosted dev booking without a conferencing app: confirmation and both
   invitation emails must not advertise Cal Video or a missing meeting URL.
3. Verify a connected, supported meeting provider still generates a usable URL.
4. Promote only after dev testing; repeat the approved production smoke test.

The existing production test booking is not automatically changed or resent by
this code fix. The earlier production test's attendee delivery is unverified. Obtain approval
before creating another production booking or sending replacement notifications.

## Legacy reschedule follow-up — 2026-10-20

The production lifecycle test exposed a second path: an old booking's implicit
Daily marker survived rescheduling, and the save helper restored it even after
location resolution intentionally returned an empty value.

The dev-targeted follow-up re-resolves only orphaned implicit Daily markers
through the existing guarded organizer default. It preserves explicit event
locations, host conferencing preferences, video/conferencing references, and
stored meeting URLs. Unrecognized metadata is left unchanged. Ordinary
calendar references without a meeting URL are retained.

The save helper keeps its existing inheritance behavior by default; only this
narrow repair can preserve an intentionally empty location. No migration,
credential change, or historical-booking rewrite is performed. Provider
availability uses the existing lookup rather than an extra query.

The mocked full-flow regression reproduced the original failure before the fix.
It checks the replacement booking, retained canceled history, absence of video
API calls, and both test emails. Hosted validation and connected-provider tests
remain required before production promotion; no real invitations were sent.
