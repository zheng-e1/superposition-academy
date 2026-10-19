# Switch the production domain (canonical / sitemap / RSS).
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/set-domain.ps1 -Domain diejiacademy.com
#   powershell -ExecutionPolicy Bypass -File scripts/set-domain.ps1 -Domain diejiacademy.com -DryRun
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads UTF-8 without BOM as ANSI.

param(
  [Parameter(Mandatory = $true)][string]$Domain,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if ($Domain -notmatch '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$') {
  throw "Invalid domain: $Domain"
}

$url = "https://$Domain"
$pattern = 'https://superposition-academy\.[a-z0-9]+\.workers\.dev'
$targets = @('astro.config.mjs', 'src/config.ts')
$changed = 0

foreach ($file in $targets) {
  $path = (Resolve-Path $file).Path
  $text = [System.IO.File]::ReadAllText($path)
  if ($text -notmatch $pattern) {
    Write-Host "skip $file (no workers.dev fallback found)" -ForegroundColor Yellow
    continue
  }
  $updated = [regex]::Replace($text, $pattern, $url)
  if ($DryRun) {
    Write-Host "[dry-run] $file -> $url"
  } else {
    [System.IO.File]::WriteAllText($path, $updated)
    Write-Host "updated $file" -ForegroundColor Green
    $changed++
  }
}

if ($DryRun) {
  Write-Host "[dry-run] no files written, no build, no push"
  return
}

if ($changed -eq 0) {
  throw 'Nothing changed. Check that the current fallback URL matches the pattern.'
}

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed, nothing was pushed.' }

git add -A
git commit -m "Switch production domain to $Domain"
git push
if ($LASTEXITCODE -ne 0) { throw 'Push failed; the commit is local only.' }

Write-Host "Done. Canonical is now $url" -ForegroundColor Green
Write-Host 'Next: Cloudflare Worker -> Settings -> Domains & Routes -> Add custom domain.' -ForegroundColor Green
