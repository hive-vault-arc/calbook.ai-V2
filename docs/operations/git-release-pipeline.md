# CalBook Git and release pipeline

This pipeline keeps feature development isolated, verifies every promotion, and leaves hosting credentials in Vercel and Render rather than GitHub.

## Branch model

| Branch | Purpose | Deployment |
| --- | --- | --- |
| `codex/<short-name>` | One small sprint change | Vercel preview when a pull request is open |
| `release/saas-v1` | Integrated staging and acceptance testing | Current staging deployment |
| `main` | Reviewed production source | Production after the initial release promotion |

Do not push feature work directly to `release/saas-v1` or `main`. Create a `codex/*` branch, open a draft pull request into `release/saas-v1`, and keep it below 500 changed lines and 10 code files. A release pull request from `release/saas-v1` to `main` may be larger because it is a promotion of already-reviewed changes.

## Automated gates

`CalBook CI` runs without production secrets on pull requests and protected-branch pushes:

1. **Policy** validates conventional pull-request titles, rejects changed secret-bearing files, and enforces the normal change-size limit.
2. **Static analysis** performs an immutable install, generates the Prisma client, runs Biome, and runs the full TypeScript check.
3. **Unit tests** run in UTC for deterministic date behavior.
4. Vercel's pull-request deployment is the build and browser-preview gate.
5. `Deployment smoke test` checks successful deployment URLs from GitHub deployment events. It can also be run manually with the public web and API URLs.

Database migrations are deliberately not applied from pull-request CI. Apply them through a controlled release step with a dedicated migration credential before deploying code that requires the new schema.

## One-time GitHub settings

Create branch rulesets in **Settings → Rules → Rulesets**.

### `release/saas-v1`

- Require a pull request before merging.
- Require one approval when another reviewer is available.
- Dismiss stale approvals after new commits.
- Require conversation resolution.
- Require these status checks:
  - `Policy`
  - `Static analysis`
  - `Unit tests`
  - the Vercel deployment check shown on the first pipeline pull request
- Block force pushes and deletion.
- Allow squash merge; disable merge commits for feature pull requests.

### `main`

- Apply all rules above.
- Restrict updates to release pull requests from `release/saas-v1`.
- Require deployments to the staging environment before merging when GitHub environments are configured.
- Never allow force pushes or deletion.

Under **Settings → Actions → General**, set workflow permissions to **Read repository contents** and disable permission for Actions to create or approve pull requests. Grant write permissions only inside a future workflow that has a documented need.

Under **Settings → Code security**, enable secret scanning and push protection. Hosting credentials belong in Vercel or Render environment settings; CI-only credentials belong in GitHub environments with required reviewers.

This fork still contains inherited Cal.com workflows. In **Actions**, disable the inherited scheduled cron, package publishing, Docker release, post-release, and upstream PR workflows until CalBook explicitly adopts them. Keep only `CalBook CI`, `Deployment smoke test`, and Vercel's deployment integration enabled for the first release. Reintroduce reminders and recovery schedules through a separate, reviewed operations change rather than attaching production secrets to inherited workflows.

## Initial production promotion

`release/saas-v1` is currently ahead of `main`, so use this order once the pipeline pull request is green:

1. Merge the pipeline pull request into `release/saas-v1`.
2. Confirm the staging deployment and run `Deployment smoke test` manually with both hosted URLs.
3. Open a pull request from `release/saas-v1` to `main` titled `chore(release): promote SaaS V1 staging`.
4. Merge only after CI, preview deployment, booking, authentication, email, and calendar acceptance checks pass.
5. Set the Vercel and Render production branches to `main` only after that commit is deployed successfully.

## Normal sprint flow

```text
codex/feature -> pull request -> release/saas-v1 -> staging acceptance
release/saas-v1 -> release pull request -> main -> production smoke test
```

Use conventional commits and pull-request titles such as `feat(bookings): add recruiter follow-ups` or `fix(auth): preserve verified email state`.

## Rollback

For an application-only regression, redeploy the last known-good production commit in the hosting provider and then revert the faulty pull request. Never roll back a database migration by destroying or resetting production data. Use a forward-compatible corrective migration with a reviewed backup and recovery plan.
