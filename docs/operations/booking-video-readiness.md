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

1. Review the dev-targeted fix and require GitHub static analysis to pass.
2. Verify hosted dev booking without a conferencing app: confirmation and both
   invitation emails must not advertise Cal Video or a missing meeting URL.
3. Verify a connected, supported meeting provider still generates a usable URL.
4. Promote only after dev testing; repeat the approved production smoke test.

The existing production test booking is not automatically changed or resent by
this code fix. Attendee inbox delivery has not yet been confirmed. Obtain approval
before creating another production booking or sending replacement notifications.
