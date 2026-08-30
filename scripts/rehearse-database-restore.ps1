param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDatabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$RestoreDatabaseUrl,

  [Parameter(Mandatory = $true)]
  [ValidateSet("NON_PRODUCTION_RESTORE")]
  [string]$ConfirmTarget,

  [string]$ArtifactDirectory = (Join-Path $PSScriptRoot "..\\.artifacts\\database-restore")
)

$ErrorActionPreference = "Stop"

function Get-DatabaseIdentity {
  param([string]$ConnectionString)

  $uri = [Uri]$ConnectionString
  return "$($uri.Host):$($uri.Port)$($uri.AbsolutePath)"
}

foreach ($commandName in @("pg_dump", "pg_restore")) {
  if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
    throw "${commandName} is required. Install the PostgreSQL client tools before running this rehearsal."
  }
}

$sourceIdentity = Get-DatabaseIdentity -ConnectionString $SourceDatabaseUrl
$restoreIdentity = Get-DatabaseIdentity -ConnectionString $RestoreDatabaseUrl
if ($sourceIdentity -eq $restoreIdentity) {
  throw "Restore target must be a different database from the source."
}

New-Item -ItemType Directory -Force -Path $ArtifactDirectory | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$artifactPath = Join-Path $ArtifactDirectory "calbook-restore-rehearsal-$timestamp.dump"

Write-Host "Creating a backup artifact from $sourceIdentity"
& pg_dump --dbname=$SourceDatabaseUrl --format=custom --file=$artifactPath --no-owner --no-privileges
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed. The restore target was not modified."
}

Write-Host "Restoring into the non-production target $restoreIdentity"
& pg_restore --dbname=$RestoreDatabaseUrl --clean --if-exists --no-owner --no-privileges --exit-on-error $artifactPath
if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed. Inspect the target before retrying. The backup artifact is retained at $artifactPath."
}

Write-Host "Restore rehearsal completed. Artifact retained at $artifactPath"
