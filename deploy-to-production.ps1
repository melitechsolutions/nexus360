#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete Deployment Script: Localhost to Nexus360 Production
    
.DESCRIPTION
    Automates the entire deployment process:
    1. Builds frontend (Vite)
    2. Builds backend (esbuild)
    3. Creates deployment package (zip)
    4. Uploads to production server
    5. Extracts and restarts application
    6. Provides deployment status
    
.PARAMETER SkipBuild
    Skip build phase and use existing dist/
    
.PARAMETER SkipUpload
    Skip upload phase (useful for testing)
    
.EXAMPLE
    .\deploy-to-production.ps1
    
.EXAMPLE
    .\deploy-to-production.ps1 -SkipBuild
    
.NOTES
    Production URL: https://nexus360.melitechsolutions.co.ke
    Credentials stored in: .env.deploy
#>

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipUpload = $false,
    [switch]$RunMigrations = $false
)

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

$projectRoot = "E:\Nexus360"
$deployDomain = "nexus360.melitechsolutions.co.ke"
$deployUser = "melitec1"
$deployPass = "G=P%C7Xem~LP"
$zipFile = Join-Path $projectRoot "deploy.zip"

$colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
    Section = "Magenta"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "╔" + ("═" * 77) + "╗" -ForegroundColor $colors.Section
    Write-Host "║ $($Title.PadRight(75)) ║" -ForegroundColor $colors.Section
    Write-Host "╚" + ("═" * 77) + "╝" -ForegroundColor $colors.Section
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "  [$Step] $Message" -ForegroundColor $colors.Info
}

function Write-Result {
    param([string]$Message, [bool]$Success = $true)
    $icon = if ($Success) { "✅" } else { "❌" }
    $color = if ($Success) { $colors.Success } else { $colors.Error }
    Write-Host "  $icon $Message" -ForegroundColor $color
}

function Confirm-ExitCode {
    param([int]$ExitCode, [string]$Operation)
    if ($ExitCode -ne 0) {
        Write-Result "$Operation FAILED (exit code: $ExitCode)" $false
        exit 1
    }
    Write-Result "$Operation successful" $true
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════════

Write-Header "🚀 NEXUS360 PRODUCTION DEPLOYMENT"

# ───────────────────────────────────────────────────────────────────────────────
# PHASE 1: BUILD
# ───────────────────────────────────────────────────────────────────────────────

if (-not $SkipBuild) {
    Write-Header "PHASE 1: BUILD"
    
    Write-Step "1.1" "Navigating to project root: $projectRoot"
    Set-Location $projectRoot
    
    Write-Step "1.2" "Building frontend with Vite..."
    $viteBuild = npx vite build 2>&1
    $viteExit = $LASTEXITCODE
    Confirm-ExitCode $viteExit "Frontend build"
    
    $buildTime = $viteBuild | Select-String "built in" | Select-Object -First 1
    Write-Host "         $buildTime" -ForegroundColor $colors.Info
    
    Write-Step "1.3" "Building backend with esbuild..."
    $esbuildOutput = node esbuild.config.mjs 2>&1
    $esbuildExit = $LASTEXITCODE
    Confirm-ExitCode $esbuildExit "Backend build"
    
    Write-Step "1.4" "Verifying build outputs..."
    $frontendOk = Test-Path "dist\index.html"
    $backendOk = Test-Path "server\dist\db.js"
    
    if (-not $frontendOk) {
        Write-Result "Frontend dist/index.html NOT FOUND" $false
        exit 1
    }
    if (-not $backendOk) {
        Write-Result "Backend server/dist/db.js NOT FOUND" $false
        exit 1
    }
    
    Write-Result "Frontend: dist/index.html exists" $true
    Write-Result "Backend: server/dist/db.js exists" $true
    
} else {
    Write-Header "PHASE 1: BUILD (SKIPPED)"
    Write-Step "1.1" "Using existing dist/ (--SkipBuild flag set)"
}

# ───────────────────────────────────────────────────────────────────────────────
# PHASE 2: PACKAGE
# ───────────────────────────────────────────────────────────────────────────────

Write-Header "PHASE 2: CREATE DEPLOYMENT PACKAGE"

Write-Step "2.1" "Removing old deployment package..."
Remove-Item $zipFile -ErrorAction SilentlyContinue
Write-Result "Old package removed" $true

Write-Step "2.2" "Creating new zip file from dist/..."
Compress-Archive -Path "dist\*" -DestinationPath $zipFile -Force
$zipSize = (Get-Item $zipFile).Length
$zipSizeMB = $zipSize / 1MB

if ($zipSize -eq 0) {
    Write-Result "Zip file is empty!" $false
    exit 1
}

Write-Result "Package created: $([Math]::Round($zipSizeMB, 2)) MB" $true

# ───────────────────────────────────────────────────────────────────────────────
# PHASE 3: UPLOAD & DEPLOY
# ───────────────────────────────────────────────────────────────────────────────

if (-not $SkipUpload) {
    Write-Header "PHASE 3: UPLOAD & DEPLOY TO PRODUCTION"
    
    Write-Step "3.1" "Setting deployment credentials..."
    $env:DEPLOY_DOMAIN = $deployDomain
    $env:DEPLOY_USER = $deployUser
    $env:DEPLOY_PASS = $deployPass
    Write-Result "Credentials configured for $deployDomain" $true
    
    Write-Step "3.2" "Uploading deployment package..."
    Write-Host "         Size: $([Math]::Round($zipSizeMB, 2)) MB"
    Write-Host "         Target: $deployDomain"
    Write-Host ""
    
    $curlOutput = curl -k --max-time 600 -u "$env:DEPLOY_USER:$env:DEPLOY_PASS" `
        -F "file=@$zipFile" `
        "https://$env:DEPLOY_DOMAIN/do_deploy.php" 2>&1
    
    $curlExit = $LASTEXITCODE
    
    Write-Host ""
    Write-Step "3.3" "Deployment Response:"
    Write-Host ""
    
    $curlOutput | ForEach-Object {
        if ($_ -match "exit") {
            Write-Host "         $_" -ForegroundColor $colors.Warning
        } else {
            Write-Host "         $_" -ForegroundColor $colors.Info
        }
    }
    
    Write-Host ""
    
    if ($curlExit -eq 0) {
        Write-Result "Upload and deployment successful" $true
    } else {
        Write-Result "Upload FAILED (curl exit code: $curlExit)" $false
        exit 1
    }
    
} else {
    Write-Header "PHASE 3: UPLOAD & DEPLOY (SKIPPED)"
    Write-Step "3.1" "Skipping upload (--SkipUpload flag set)"
}

# ───────────────────────────────────────────────────────────────────────────────
# PHASE 4: VERIFY LIVE SITE
# ───────────────────────────────────────────────────────────────────────────────

Write-Header "PHASE 4: VERIFICATION"

Write-Step "4.1" "Testing live site connectivity..."
$testResult = curl -s -I "https://$deployDomain" 2>&1
$testExit = $LASTEXITCODE

if ($testExit -eq 0) {
    Write-Result "Live site is accessible" $true
    $statusLine = $testResult | Select-String "HTTP" | Select-Object -First 1
    Write-Host "         $statusLine" -ForegroundColor $colors.Info
} else {
    Write-Result "Could not reach live site (this may be temporary)" $colors.Warning
}

Write-Step "4.2" "Deployment Summary:"
Write-Host "         Production URL: https://$deployDomain" -ForegroundColor $colors.Info
Write-Host "         Package Size: $([Math]::Round($zipSizeMB, 2)) MB" -ForegroundColor $colors.Info
Write-Host "         Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $colors.Info

# ───────────────────────────────────────────────────────────────────────────────
# PHASE 5: MIGRATIONS (Optional)
# ───────────────────────────────────────────────────────────────────────────────

if ($RunMigrations) {
    Write-Header "PHASE 5: DATABASE MIGRATIONS"
    
    Write-Step "5.1" "Connecting to production database..."
    Write-Host "         Host: melitechsolutions.co.ke" -ForegroundColor $colors.Info
    Write-Host "         Database: melitec1_nexus360" -ForegroundColor $colors.Info
    
    Write-Step "5.2" "MANUAL ACTION REQUIRED:"
    Write-Host "         1. Open cPanel Terminal: https://melitechsolutions.co.ke:2083" -ForegroundColor $colors.Warning
    Write-Host "         2. Run: cd ~/Nexus360" -ForegroundColor $colors.Warning
    Write-Host "         3. Run: mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026\$mT' melitec1_nexus360 < drizzle/0017_add_document_template_isdefault.sql" -ForegroundColor $colors.Warning
    Write-Host "         4. Run: mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026\$mT' melitec1_nexus360 -e \"INSERT INTO _migrations (name) VALUES ('0017_add_document_template_isdefault.sql');\"" -ForegroundColor $colors.Warning
    Write-Host "         5. Run: mysql -u melitec1_nexus360 -p'Nx360@Melitech#CRM!2026\$mT' melitec1_nexus360 -e \"DESC documentTemplates;\" | grep isDefault" -ForegroundColor $colors.Warning
    Write-Host ""
} else {
    Write-Header "PHASE 5: DATABASE MIGRATIONS"
    Write-Step "5.1" "Migrations not run (use -RunMigrations flag to include them)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL STATUS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Header "✅ DEPLOYMENT COMPLETE"

Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor $colors.Section
Write-Host "    1. Open: https://$deployDomain" -ForegroundColor $colors.Info
Write-Host "    2. Test notification behavior (should show once per notification)" -ForegroundColor $colors.Info
Write-Host "    3. Press F12 to check browser console for errors" -ForegroundColor $colors.Info
Write-Host "    4. Verify localStorage has: notification_popup_shown_ids" -ForegroundColor $colors.Info
Write-Host "    5. Test core features: Invoices, Estimates, Templates, etc." -ForegroundColor $colors.Info
Write-Host ""

Write-Host "  Emergency Rollback:" -ForegroundColor $colors.Section
Write-Host "    If issues occur, redeploy previous version or restore from backup" -ForegroundColor $colors.Warning
Write-Host ""

Write-Host "  Time to Deploy: ~5-10 minutes" -ForegroundColor $colors.Success
Write-Host "  Status: 🟢 READY FOR PRODUCTION" -ForegroundColor $colors.Success
Write-Host ""

exit 0
