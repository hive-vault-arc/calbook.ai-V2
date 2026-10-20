# Runtime timezone consistency

## Incident — October 2026

The browser displayed the production test booking at 10:00 Africa/Casablanca,
while the host email displayed 11:00 for the same 10:00 UTC instant. This was
not evidence of a bad stored timestamp. Current IANA data returns Morocco to
UTC+0 from September 20, 2026; older data still predicts UTC+1.

- Local Node 22.15.0 reported tzdb 2025a and formatted the October instant as 11:00.
- The tested Node 24.21.0 reports tzdb 2026c and correctly formats it as 10:00.
- The email mismatch is consistent with stale server data. Do not infer the
  deployed runtime version from the local runtime; verify deployment logs and
  a newly approved email after the preview passes.

Sources:
- https://github.com/eggert/tz/blob/main/africa (Morocco transition rules)
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions

## Runtime policy

- `.node-version`, Docker stages, and shared CI install action use Node 24.21.0.
- Root and web `engines.node` select 24.x; Vercel only accepts major runtime
  selection and rolls out minor/patch releases itself. Verify the actual runtime
  version and canary output in each preview build.
- CI native-module and install-state caches include the resolved Node version
  and architecture. Downloaded package archives remain shared.
- Web build/start and Docker build stages validate timezone behavior. Do not
  bypass a failed canary or hard-code an hour adjustment in application code.
- The required CI jobs run transition and ordinary-DST regression checks.
- Standalone/custom entrypoints that bypass the web start script must execute
  the checker explicitly as a deployment check.

## Acceptance and rollout

1. Run `node --test apps/web/scripts/verify-timezone-data.node-check.mjs` on Node 24.21.0.
2. Require normal type checks, unit tests, and an actual Vercel preview build.
3. Check native dependencies and runtime email-template packaging on the preview.
4. With separate approval, send a test email and compare its displayed time with
   the browser and exported UTC calendar instant. Existing emails do not change.
5. Deploy only after review. No database, booking, credential, or provider change
   is part of this runtime update. Do not shift or rewrite existing bookings.

Docker full builds and a complete E2E suite have not been run locally. Production
remains unchanged until this change is reviewed, approved, merged, and deployed.
