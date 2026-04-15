#!/usr/bin/env pwsh
# Melitech CRM - Database Test Launcher
# This script automatically starts Docker and runs the comprehensive database test suite

param(
    [string]$Mode = "full",
    [switch]$Help
)

function Show-Help {
    Write-Host @"
Melitech CRM - Database Testing & Validation Tool

USAGE:
    ./test-database.ps1 [OPTIONS]

OPTIONS:
    -Mode <mode>       Test mode to run (default: full)
                       - health      : Quick health check (2 min)
                       - full        : Complete validation (5 min)
                       - integrity   : Data integrity focus (3 min)
                       - performance : Performance analysis (2 min)
    
    -Help             Show this help message

EXAMPLES:
    ./test-database.ps1 -Mode health
    ./test-database.ps1 -Mode full
    ./test-database.ps1

WHAT IT DOES:
    1. Checks if Docker is installed
    2. Starts MySQL container (if not running)
    3. Waits for database readiness
    4. Runs selected test suite
    5. Generates test report
    6. Displays results

TEST SUITES:

    Health Check (2 minutes):
    ✓ Database connectivity
    ✓ Container status
    ✓ Basic table verification
    
    Full Validation (5 minutes) [DEFAULT]:
    ✓ All 29 entities structure verification
    ✓ Data integrity checks (orphaned records, NULLs, calculations)
    ✓ Relationship validation (foreign keys)
    ✓ CRUD operations tests (Create, Read, Update, Delete)
    ✓ Performance metrics (size, row counts, indexes)
    ✓ Constraint validation
    
    Data Integrity (3 minutes):
    ✓ Orphaned record detection
    ✓ NULL value validation
    ✓ Calculation consistency (invoices, payments)
    ✓ Duplicate detection (SKUs, emails, invoice numbers)
    
    Performance (2 minutes):
    ✓ Database size analysis
    ✓ Index verification
    ✓ Query performance metrics
    ✓ Row distribution analysis

REQUIREMENTS:
    - Docker Desktop installed and running
    - 4GB+ available RAM
    - Ports 3307 (MySQL) and 3000 (App) available
    - npm dependencies installed

REPORT OUTPUT:
    ✓ Console output with color-coded results
    ✓ database-test-report.json (structured data)
    ✓ Full detailed metrics per entity

TROUBLESHOOTING:
    If tests fail:
    1. Check Docker is running: docker ps
    2. Check logs: docker logs melitech_crm_db
    3. Verify DATABASE_URL: see .env.local-auth
    4. Run manually: npm run test:db

"@
}

if ($Help) {
    Show-Help
    exit 0
}

Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           MELITECH CRM - DATABASE TEST LAUNCHER                   ║" -ForegroundColor Cyan
Write-Host "║                   Testing All 29 Entities                         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "Test Mode: " -NoNewline
Write-Host $Mode.ToUpper() -ForegroundColor Green

# Check Docker
Write-Host ""
Write-Host "📦 Checking Docker..." -ForegroundColor Yellow
$dockerStatus = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running or not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "Or start Docker if already installed" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Check if MySQL container exists and is running
Write-Host ""
Write-Host "🔍 Checking MySQL container status..." -ForegroundColor Yellow
$containerRunning = docker ps --filter "name=melitech_crm_db" --quiet
if ($containerRunning) {
    Write-Host "✅ MySQL container is already running" -ForegroundColor Green
} else {
    Write-Host "⏳ Starting MySQL container..." -ForegroundColor Yellow
    docker-compose up -d db 2>&1 | Out-Null
    
    # Wait for container to be ready
    Write-Host "⏳ Waiting for MySQL to start (this may take 30 seconds)..." -ForegroundColor Yellow
    $retries = 0
    $maxRetries = 60
    while ($retries -lt $maxRetries) {
        $health = docker exec melitech_crm_db mysqladmin ping -u root -pR:vVl:m7J9x3Hr`|yWEUp 2>&1
        if ($health -match "mysqld is alive") {
            Write-Host "✅ MySQL container is ready" -ForegroundColor Green
            Start-Sleep -Seconds 3
            break
        }
        $retries++
        Start-Sleep -Seconds 1
    }
    
    if ($retries -eq $maxRetries) {
        Write-Host "⚠️  MySQL startup timeout - proceeding anyway" -ForegroundColor Yellow
    }
}

# Run selected test mode
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Starting Test Suite: $($Mode.ToUpper())" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Set database URL
$env:DATABASE_URL = "mysql://melitech_user:tjwzT9pW;NGYq1QxSq0B@db:3306/melitech_crm"

# Run test based on mode
switch ($Mode.ToLower()) {
    "health" {
        Write-Host "🏥 Running Health Check..." -ForegroundColor Yellow
        npm run db:health
    }
    "full" {
        Write-Host "✅ Running Full Database Test Suite..." -ForegroundColor Yellow
        npm run test:db
    }
    "integrity" {
        Write-Host "🔍 Running Data Integrity Tests..." -ForegroundColor Yellow
        Write-Host "This will check for orphaned records, NULL values, and calculation errors" -ForegroundColor Gray
        npm run test:db
    }
    "performance" {
        Write-Host "📊 Running Performance Analysis..." -ForegroundColor Yellow
        Write-Host "This will analyze database size, indexes, and query distribution" -ForegroundColor Gray
        npm run test:db
    }
    default {
        Write-Host "❌ Unknown mode: $Mode" -ForegroundColor Red
        Write-Host "Use -Help for available options" -ForegroundColor Yellow
        exit 1
    }
}

$testExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test Suite Complete" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($testExitCode -eq 0) {
    Write-Host "✅ Test suite completed successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Results:"
    Write-Host "   • Console output above shows detailed results"
    Write-Host "   • JSON report saved to: database-test-report.json" -ForegroundColor Gray
    Write-Host "   • View metrics: type database-test-report.json" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Test suite encountered errors (see output above)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check Docker logs: docker logs melitech_crm_db" -ForegroundColor Gray
    Write-Host "   2. Verify MySQL is running: docker ps" -ForegroundColor Gray
    Write-Host "   3. Check DATABASE_URL in .env.local-auth" -ForegroundColor Gray
    Write-Host "   4. Run migrations: npm run db:push" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   • Review DATABASE_TESTING_GUIDE.md for detailed information" -ForegroundColor Gray
Write-Host "   • Run other modes: ./test-database.ps1 -Mode [health|integrity|performance]" -ForegroundColor Gray
Write-Host "   • Stop container: docker-compose down" -ForegroundColor Gray
Write-Host ""

exit $testExitCode
