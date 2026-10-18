# Push this repository to GitHub (first-time setup).
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/push-to-github.ps1 -User your-github-name
#
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads UTF-8 without BOM
# as ANSI, so non-ASCII literals would break parsing.

param(
  [Parameter(Mandatory = $true)][string]$User,
  [string]$Repo = 'superposition-academy'
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path '.git')) {
  throw 'Not a git repository. Run this from the quantum-site folder.'
}

$url = "https://github.com/$User/$Repo.git"
Write-Host "Target: $url" -ForegroundColor Cyan
Write-Host 'Create an EMPTY repo at https://github.com/new first (no README, no .gitignore, no license).' -ForegroundColor Yellow

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $url
} else {
  git remote add origin $url
}

git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host 'Push OK.' -ForegroundColor Green
  Write-Host 'Next: Cloudflare Pages -> Connect to Git -> build "npm run build", output "dist", env PUBLIC_SITE_URL=https://<project>.pages.dev' -ForegroundColor Green
} else {
  Write-Host 'Push failed.' -ForegroundColor Yellow
  Write-Host '404: the repository does not exist yet, or the name/user is wrong.' -ForegroundColor Yellow
  Write-Host 'Auth cancelled: run "git push -u origin main" again and finish the browser login.' -ForegroundColor Yellow
}
