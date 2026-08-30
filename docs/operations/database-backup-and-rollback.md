# Database backup, restore, and migration rollback

## Ownership and targets

| Item | Owner | Target |
| --- | --- | --- |
| Production backup/PITR configuration | Launch owner | Confirm before launch |
| Restore rehearsal | Release engineer | At least once before release candidate |
| Migration rollback decision | Launch owner | Within 30 minutes of a confirmed migration incident |

Until the deployment provider is recorded, use an RPO of 24 hours and an RTO of 4 hours as release-blocking targets, not guarantees. Replace these with the provider's documented retention, point-in-time recovery window, and measured restore time before launch.

## Provider checklist

Before production launch, the launch owner must record the provider, project, backup retention period, PITR window, export procedure, and support escalation link in the release decision record. The production database must have automated backups and point-in-time recovery enabled. A restore must always go to a separate non-production database first.

Never paste a database URL, password, backup artifact, or customer data into an issue, chat, commit, or CI log.

## Restore rehearsal

Install PostgreSQL client tools (`pg_dump` and `pg_restore`) on the operator workstation or CI runner. Create a disposable database in the same provider/region class as production, then run:

```powershell
./scripts/rehearse-database-restore.ps1 `
  -SourceDatabaseUrl $env:PRODUCTION_DATABASE_URL `
  -RestoreDatabaseUrl $env:RESTORE_REHEARSAL_DATABASE_URL `
  -ConfirmTarget NON_PRODUCTION_RESTORE
```

The script creates a custom-format dump, then restores it with `--clean --if-exists`. It refuses to use the same host/port/database identity for source and target. The target is intentionally overwritten, so it must be disposable and non-production.

Record the start/end times, artifact location, schema migration head, restore target, data sanity-check result, and any failure in the release decision record. Delete the dump using the provider's approved retention process after the rehearsal; it can contain customer data.

## Migration rollback

Prisma migrations are forward-only in this project. Do not run `prisma migrate reset`, delete migration records, or use `migrate resolve` against production as an incident shortcut.

1. Freeze deployments and note the migration name from the deployment logs.
2. If the application remains compatible, roll back application code to the previous known-good commit and keep the schema change in place.
3. If data integrity is at risk, disable affected functionality with the existing feature flag before changing the database.
4. Prefer a new, reviewed forward-fix migration. Use a provider PITR restore only when the incident commander judges the data loss risk lower than the outage risk.
5. Re-run health checks, a booking smoke test, and migration status after recovery. Record the decision, timestamps, owner, and customer impact.

## Current rehearsal status

The repository has a guarded rehearsal procedure, but the workstation currently lacks PostgreSQL client tools and no disposable restore database or production provider configuration is recorded here. Therefore this item remains incomplete until the operator runs the rehearsal and records the measured result.
