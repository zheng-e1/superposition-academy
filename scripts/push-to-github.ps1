# 把本地仓库推到 GitHub（首次使用）
# 用法：powershell -ExecutionPolicy Bypass -File scripts/push-to-github.ps1 -User 你的GitHub用户名
param(
  [Parameter(Mandatory = $true)][string]$User,
  [string]$Repo = 'superposition-academy'
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path '.git')) {
  throw '当前目录不是 git 仓库，请确认在 quantum-site 下运行。'
}

$url = "https://github.com/$User/$Repo.git"
Write-Host "目标仓库：$url" -ForegroundColor Cyan
Write-Host '请先在 https://github.com/new 建一个空仓库（不要勾 README / .gitignore / license）。' -ForegroundColor Yellow

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $url
} else {
  git remote add origin $url
}

git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host '推送完成。下一步：Cloudflare Pages → Connect to Git → 选这个仓库。' -ForegroundColor Green
  Write-Host '构建命令 npm run build，输出目录 dist，环境变量 PUBLIC_SITE_URL=https://<项目名>.pages.dev' -ForegroundColor Green
}
