# Runtime performance review — 2026-10-21

Read-only source audit, separate from integration fixes and final build optimization.
No browser timings, request traces, bundle measurements or savings are claimed.
Secret rotation remains the final pre-launch security task after this work and
build optimization, followed by verification before the launch decision.

Implementation follow-up: PERF-003 has a separate candidate patch extracting
`useOverflowFade`. Its seven regression tests pass for coalescing, overflow state,
both pending-frame cleanup stages, asynchronous content and Strict Mode. Provider
queries and onboarding submission are unchanged. Production promotion and hosted
visual acceptance are separate pending steps; no measured speedup is claimed.

## PERF-001 — Preserve conditionally mounted calendar list

- Evidence: `apps/web/components/apps/CalendarListContainer.tsx` declares a local
  `CalendarList` component, but also mounts it conditionally in the same module
  (line 166 in the reviewed revision). An initial partial source read missed that
  call site; the complete reference search rejected the dead-code hypothesis.
- Decision: do not remove it, its private props or imports. Its query runs only
  when mounted; verify request traces in that branch before calling it redundant.
- Preserve the container/skeleton, readiness panel, connection actions, mutation
  callbacks and cache invalidation. No dead-code saving is established here.

## PERF-002 — Measure dashboard query cost before consolidation

- Evidence: `apps/web/modules/home/RecruitingDashboard.tsx` makes three distinct
  `viewer.bookings.get` queries: upcoming list (five rows), today's total and
  unconfirmed total (one row each). The general booking handler returns bookings,
  recurring information and total count. A small result limit does not prove the
  underlying count or permission-filter queries are cheap.
- These queries are not redundant: their filters differ. Do not derive today's
  or unconfirmed totals from the first five upcoming bookings.
- Next: capture per-operation server timings, SQL count and serialized payload
  size using test accounts. Distinguish tRPC operations from batched HTTP requests.
- Consider a dedicated authorized summary only if measurement justifies it, with
  separate API and UI PRs. Preserve user/team scoping and error/loading states.
- Also test an open dashboard across local midnight: the memoized date window is
  created only at mount. Any correctness change needs explicit timezone tests.

## PERF-003 — Review onboarding observer scheduling

- Evidence: `apps/web/modules/onboarding/personal/calendar/personal-calendar-view.tsx`
  schedules nested animation frames, a timeout, ResizeObserver callbacks and a
  window resize handler. Cleanup clears the timeout and listeners/observer but
  does not cancel already queued animation frames.
- This is a bounded cleanup candidate, not proof of a render loop or production
  leak. Multiple triggers can schedule repeated measurements in the same frame.
- Consider one coalesced, cancelable measurement while preserving the fade on
  scroll, resize and async provider loading. No arbitrary memoization everywhere.
- Test pending-frame cleanup on unmount and Strict Mode, rapid resize/scroll,
  no-overflow and overflow transitions. Preserve onboarding submission behavior.

## PERF-004 — Validate freshness policies, not blanket caching

- Event template listing explicitly uses zero stale time and refetch on focus and
  mount. Calendar mutations invalidate data and revalidate server-rendered paths.
  These can be intentional freshness requirements, not unused calls.
- Capture mount/focus/mutation request counts before changing them. Preserve OAuth
  reconnect, template reorder and multi-tab behavior; never cache authenticated
  user data across users to reduce ISR or function usage.

## Review order and boundaries

1. Verify all references before any dead-code cleanup; no proven deletion identified
   in this pass. Do not remove permission code based on naming.
2. Measure dashboard requests and rendering before changing API contracts.
3. Independently test observer cleanup and any freshness-policy changes.
4. Review final build duration/caching separately, keeping security/type gates.
5. Complete the final secret-rotation and post-rotation verification gate.

No dependency additions, schema edits, provider enablement, real bookings or emails
are needed for this audit. Cross-package implementations, full builds and E2E
suites still require approval under the repository rules.
