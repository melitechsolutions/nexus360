# PowerShell Script to Split dist-index-js.b64 into 100KB chunks

param(
    [string]$inputFile = "dist-index-js.b64",
    [int]$chunkSizeKB = 100
)

# Convert KB to bytes
$chunkSize = $chunkSizeKB * 1024

# Check if file exists
if (-not (Test-Path $inputFile)) {
    Write-Host "Error: File '$inputFile' not found" -ForegroundColor Red
    exit 1
}

# Get file info
$fileInfo = Get-Item $inputFile
$totalSize = $fileInfo.Length
$totalChunks = [Math]::Ceiling($totalSize / $chunkSize)

Write-Host "Processing file: $inputFile" -ForegroundColor Cyan
Write-Host "Total file size: $('{0:N0}' -f $totalSize) bytes" -ForegroundColor Cyan
Write-Host "Chunk size: $chunkSize bytes ($chunkSizeKB KB)" -ForegroundColor Cyan
Write-Host "Total chunks: $totalChunks" -ForegroundColor Green
Write-Host ""

# Read the file as bytes
$fileBytes = [System.IO.File]::ReadAllBytes($inputFile)

# Create chunks
$chunkFiles = @()
for ($i = 0; $i -lt $totalChunks; $i++) {
    $startIndex = $i * $chunkSize
    $currentChunkSize = [Math]::Min($chunkSize, $totalSize - $startIndex)
    
    $chunkData = $fileBytes[$startIndex..($startIndex + $currentChunkSize - 1)]
    $chunkFilename = "chunk-$('{0:D3}' -f ($i + 1)).txt"
    
    [System.IO.File]::WriteAllBytes($chunkFilename, $chunkData)
    $chunkFiles += $chunkFilename
    
    Write-Host "Created: $chunkFilename ($('{0:N0}' -f $chunkData.Length) bytes)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 80
Write-Host "CHUNK FILES CREATED SUCCESSFULLY" -ForegroundColor Green
Write-Host "=" * 80
Write-Host ""

# Generate concatenation commands for Linux/Unix server
Write-Host "Commands to reconstruct the file on the server:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Using cat (Unix/Linux):" -ForegroundColor Yellow
$chunkList = ($chunkFiles | ForEach-Object { $_ }) -join " "
Write-Host "cat $chunkList > dist-index-js.b64" -ForegroundColor White
Write-Host ""

Write-Host "2. Using PowerShell on Windows:" -ForegroundColor Yellow
Write-Host "Get-Content chunk-*.txt -Raw | Out-File -Encoding UTF8 dist-index-js.b64" -ForegroundColor White
Write-Host ""

Write-Host "3. Verify integrity (after concatenation):" -ForegroundColor Yellow
Write-Host "certutil -hashfile dist-index-js.b64 SHA256" -ForegroundColor White
Write-Host ""

# Calculate original file hash for verification
$originalHash = (Get-FileHash -Path $inputFile -Algorithm SHA256).Hash
Write-Host "Original file SHA256 hash: $originalHash" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "=" * 80
Write-Host "SUMMARY" -ForegroundColor Green
Write-Host "=" * 80
Write-Host "Total file size: $('{0:N0}' -f $totalSize) bytes ($('{0:N2}' -f ($totalSize / 1MB)) MB)" -ForegroundColor White
Write-Host "Number of chunks: $totalChunks" -ForegroundColor White
Write-Host "Chunk size: $chunkSizeKB KB" -ForegroundColor White
Write-Host "Output directory: $(Get-Location)" -ForegroundColor White
Write-Host ""
