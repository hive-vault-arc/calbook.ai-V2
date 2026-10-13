# Pre-launch performance and inherited-code audit

**Status:** Planned; deliberately separate from the current authentication hardening/release work.  
**Timing:** Complete before public beta expansion or paid launch; do not bundle speculative cleanup into security fixes.  
**Owner:** CalBook maintainer

The CalBook codebase is a large Cal.diy/Cal.com-derived monorepo. Optimize based on measured CalBook user journeys, preserve required upstream behavior, and keep the audit in focused, independently reviewable PRs.

## Audit backlog

- [ ] Capture a baseline for the public landing page, signup/login, recruiter dashboard, interview-template list, public booking flow, and booking confirmation. Record desktop/mobile performance, browser network requests, bundle sizes, and the largest regressions.
- [ ] Find duplicate, unused, or repeated API requests on those paths. Check client query keys, invalidation, server fetches, polling, retries, and waterfall dependencies; remove or consolidate only after confirming all consumers.
- [ ] Investigate avoidable React re-renders and unstable props/state on the same routes. Use React Profiler and browser traces; document a before/after result for each fix.
- [ ] Inspect slow database/API paths and Prisma query shape. Prefer narrow `select`s, suitable indexes, pagination, and safe caching; do not cache private or authorization-sensitive responses across users.
- [ ] Analyze production client bundles and route-level imports. Defer large optional integrations and admin-only code from public booking/signup routes when architecture safely permits.
- [ ] Identify dead or Cal.com-branded routes, components, API calls, and app-store entries that CalBook V1 does not use. Trace dependencies and tests before removing anything; retain licensed/required upstream code and avoid mass deletion.
- [ ] Check image/font loading, layout shifts, hydration warnings, accessibility, and reduced-motion behavior on the public marketing and booking pages.
- [ ] Re-run functional, security, and booking acceptance tests after each cleanup slice. Confirm no regressions in Google Calendar/Meet, Teams, Zoom, Resend, beta invitations, and auth rate limiting.

## Completion evidence

Before calling the audit complete, save:

1. A baseline and final measurement for the same routes/devices/build conditions.
2. A list of removed API calls/dead modules with proof they had no required consumer.
3. A short list of remaining known bottlenecks and why they are deferred.
4. Green relevant tests, type checks, lint, and hosted-dev acceptance checks for each merged optimization PR.

Avoid broad cleanup solely because code appears inherited. A change is ready only when there is evidence it is unused or a measured user-facing improvement and its removal is covered by tests.
