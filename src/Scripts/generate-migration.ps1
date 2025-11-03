param(
    [string]$Context = "FilesDbContext",
    [string]$ScriptDirectory = "Files"
)

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$outputFile = "Scripts/${ScriptDirectory}/${timestamp}_migration.sql"

Write-Host "Generating migration script: $outputFile" -ForegroundColor Green
dotnet ef migrations script --output $outputFile --context $Context --idempotent

if ($LASTEXITCODE -eq 0) {
    Write-Host "Fixing PostgreSQL compatibility..." -ForegroundColor Yellow

    $content = Get-Content $outputFile -Raw
    # PostgreSQL requires $$ for DO blocks, not single $
    $content = $content -replace '\$EF\$', '$$$$'
    $content = $content -replace '(DO\s+)\$(?!\$)', '${1}$$$$'
    $content = $content -replace '(END\s+)\$(?!\$)', '${1}$$$$'
    $content = $content -replace 'CREATE TABLE "([^"]+)" \(', 'CREATE TABLE IF NOT EXISTS "$1" ('

    Set-Content $outputFile -Value $content -NoNewline

    Write-Host "Migration script fixed and ready to use!" -ForegroundColor Green
    Write-Host "File: $outputFile" -ForegroundColor Cyan
} else {
    Write-Host "Failed to generate migration script!" -ForegroundColor Red
    exit 1
}