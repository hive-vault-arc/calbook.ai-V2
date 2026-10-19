# Auth production promotion order

Prepared 2026-10-18. This plan does not authorize production merges or deploys.

| Change | Review base while prerequisites are open | Required predecessor |
| --- | --- | --- |
| #48 dependency compatibility and sign-in template packaging | main | None |
| #55 email feedback, loading and cooldown | #48 branch | #48 |
| #56 sanitized email failure diagnostics | #48 branch | #48 |
| #57 branded email and 600-second expiry | #56 branch | #56 |
| #58 hydration-safe theme and signup state | #48 branch | #48 |

## Safe promotion procedure

1. Review and accept each prerequisite independently. Obtain explicit production
   merge approval; an instruction to continue preparing drafts is not approval.
2. Do not merge a stacked draft into its feature-branch base. Once the predecessor
   reaches main, retarget the successor to main and inspect the resulting diff.
3. Squash promotion can leave original commits in branch ancestry. Compare actual
   file content as well as GitHub's merge-base diff. If the review contains already
   promoted changes, prepare a clean main-based branch without force-pushing or
   rewriting shared history.
4. Require CalBook CI and a fresh hosted preview on the final main-based change.
   CI triggers only for main, dev and release targets. Two green Vercel checks on
   a feature-branch target are not the required static-analysis/unit-test gate.
5. Obtain approval for any additional test emails, production bookings or provider
   changes. Keep tests on isolated dev data unless production testing is explicitly
   approved. Never use destructive database-reset suites against either live data
   or the persistent Neon dev database.
6. Merge only after evidence and approval. Verify the actual production deployment
   revision and repeat the specifically approved smoke checks.

## Configuration safeguards

- Preserve main's existing Vercel duplicate-TypeScript-check policy. Required CI
  remains the type-safety gate; do not silently restore the duplicate build step.
- Keep template tracing narrow to the NextAuth route and its runtime HTML asset.
- Do not commit environment files or credentials. Local diagnostics use an ignored
  environment file and verified read-only database sessions.
- Ten-minute expiry affects newly issued links, not previously stored tokens.
- Windows spawn tsc ENOENT is a failed local workspace check, not a passing result;
  retain the separately reported focused-test and web-TypeScript results.

Branding, hydration and diagnostics have dev evidence, but each production-based
combination still requires acceptance. No provider enablement, payment launch,
credential rotation or production merge is performed by this document.
