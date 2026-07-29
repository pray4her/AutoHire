#Requires -Version 5.1
<#
.SYNOPSIS
  Backfill historical Extraction Export workbooks so 抽取结果.xlsx includes supplement_requests.

.DESCRIPTION
  Loads repo-root .env into the process environment, then runs the Bun backfill script.
  Requires FILE_STORAGE_MODE=oss and DATABASE_URL pointing at the target database.

.EXAMPLE
  .\scripts\backfill-extraction-export-supplement-requests.ps1

.EXAMPLE
  .\scripts\backfill-extraction-export-supplement-requests.ps1 -DryRun

.EXAMPLE
  .\scripts\backfill-extraction-export-supplement-requests.ps1 -Limit 10

.EXAMPLE
  .\scripts\backfill-extraction-export-supplement-requests.ps1 -ApplicationId "app_xxx"
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [ValidateRange(1, 100000)]
  [int]$Limit = 0,
  [string[]]$ApplicationId = @()
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$envFile = Join-Path $repoRoot ".env"
if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Missing .env at $envFile"
}

function Import-DotEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $lines = Get-Content -LiteralPath $Path -Encoding UTF8
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
      continue
    }

    $eq = $trimmed.IndexOf("=")
    if ($eq -lt 1) {
      continue
    }

    $name = $trimmed.Substring(0, $eq).Trim()
    $value = $trimmed.Substring($eq + 1).Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    Set-Item -Path "Env:$name" -Value $value
  }
}

Import-DotEnv -Path $envFile

if (-not $env:APP_RUNTIME_MODE -or $env:APP_RUNTIME_MODE -eq "auto") {
  $env:APP_RUNTIME_MODE = "prisma"
}

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is not set after loading .env"
}

if ($env:FILE_STORAGE_MODE -ne "oss") {
  throw "FILE_STORAGE_MODE must be oss (current: '$($env:FILE_STORAGE_MODE)'). Extraction Export writes to OSS."
}

$bun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bun) {
  throw "bun is not on PATH. Install Bun or open a shell where bun is available."
}

$argsList = @(
  "scripts/backfill-extraction-export-supplement-requests.ts"
)

if ($DryRun) {
  $argsList += "--dry-run"
}

if ($Limit -gt 0) {
  $argsList += @("--limit", "$Limit")
}

foreach ($id in $ApplicationId) {
  if ($id -and $id.Trim()) {
    $argsList += @("--application-id", $id.Trim())
  }
}

Write-Host "Repo: $repoRoot"
Write-Host "FILE_STORAGE_MODE=$($env:FILE_STORAGE_MODE) APP_RUNTIME_MODE=$($env:APP_RUNTIME_MODE)"
Write-Host ("Running: bun " + ($argsList -join " "))

& bun @argsList
exit $LASTEXITCODE
