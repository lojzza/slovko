# ============================================================
#  Slovko — nasazení na GitHub Pages (bezplatná doména)
#  Spustí:  powershell -ExecutionPolicy Bypass -File deploy.ps1
# ============================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# PATH pro git a gh
$env:Path = "C:\Program Files\GitHub CLI;C:\Program Files\Git\cmd;$env:Path"

# 1) Přihlášení (jen pokud je potřeba)
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Prihlas se do GitHubu. Otevre se prohlizec, tam potvrd prihlaseni." -ForegroundColor Yellow
    gh auth login --web --hostname github.com --git-protocol https --skip-ssh-key
}

# 2) Jméno účtu
$user = gh api user --jq .login
Write-Host "Ucet: $user"

# 3) Git repo (založí, pokud neexistuje)
if (-not (Test-Path ".git")) {
    git init -b main | Out-Null
    git add -A
    git -c user.email="slovko@local" -c user.name="Slovko" commit -m "Slovko - gamifikovana vyuka jazyku" | Out-Null
}

# 4) Vytvoř / push repo na GitHub
gh repo view "$user/slovko" --json name *> $null
if ($LASTEXITCODE -ne 0) {
    gh repo create slovko --public --source . --push --description "Slovko - gamifikovana vyuka jazyku (japonstina, anglictina, cestina)"
} else {
    git remote remove origin 2>$null
    git remote add origin "https://github.com/$user/slovko.git"
    git push -u origin main
}

# 5) Zapni GitHub Pages (na main, kořen)
gh api "repos/$user/slovko/pages" -X POST -f build_type=legacy -f "source[branch]=main" -f "source[path]=/" *> $null
if ($LASTEXITCODE -ne 0) {
    # Pages už možná běží — zkus jen aktualizovat
    gh api "repos/$user/slovko/pages" -X PUT -f build_type=legacy -f "source[branch]=main" -f "source[path]=/" *> $null
}

Write-Host ""
Write-Host "Hotovo! Hra je na:  https://$user.github.io/slovko/" -ForegroundColor Green
Write-Host "(Publish muze trvat ~1 minutu.)" -ForegroundColor Green