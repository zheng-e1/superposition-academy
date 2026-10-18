# Project status snapshot (fast, read-only).
# Usage: npm run status
# ASCII-only: Windows PowerShell 5.1 reads UTF-8 without BOM as ANSI.

Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host '== repo ==' -ForegroundColor Cyan
Write-Host ("branch : " + (git branch --show-current))
Write-Host ("last   : " + (git log -1 --pretty=format:"%h %ad %s" --date=format:"%Y-%m-%d %H:%M"))

$dirty = git status --porcelain
if ($dirty) {
  Write-Host 'tree   : DIRTY (uncommitted changes)' -ForegroundColor Yellow
  $dirty | Select-Object -First 5
} else {
  Write-Host 'tree   : clean' -ForegroundColor Green
}

Write-Host ''
Write-Host '== content ==' -ForegroundColor Cyan
$lessons = (Get-ChildItem 'src\content\lessons' -Recurse -Filter '*.mdx').Count
$demos = (Get-ChildItem 'src\scripts\demos' -Filter '*.ts').Count
Write-Host ("lessons : " + $lessons)
Write-Host ("demo ts : " + $demos + " (includes kit.ts + loader.ts)")
if (Test-Path 'dist\exam.json') {
  $json = Get-Content 'dist\exam.json' -Raw -Encoding UTF8
  $exam = $json | ConvertFrom-Json
  Write-Host ("questions: " + $exam.total)
}

Write-Host ''
Write-Host '== build ==' -ForegroundColor Cyan
if (Test-Path 'dist\index.html') {
  $pages = (Get-ChildItem 'dist' -Recurse -Filter '*.html').Count
  Write-Host ("dist    : present, " + $pages + " html pages")
} else {
  Write-Host 'dist    : missing (run npm run build)' -ForegroundColor Yellow
}
if (Test-Path 'dist\pagefind\pagefind-entry.json') {
  Write-Host 'search  : pagefind index present'
} else {
  Write-Host 'search  : no pagefind index (dev mode uses JSON fallback)' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '== runtime ==' -ForegroundColor Cyan
Write-Host ("node    : " + (node -v))
if (Test-Path '.wrangler') { Write-Host 'wrangler: local cache present' }

Write-Host ''
Write-Host 'Next: read docs/DEVLOG.md for decisions and known issues.' -ForegroundColor Green
