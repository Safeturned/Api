# PowerShell script to generate PostgreSQL-compatible migration scripts
# Usage: .\generate-migration.ps1

param(
    [string]$Context = "FilesDbContext"
)

# Generate timestamp for filename
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$outputFile = "Scripts/Files/${timestamp}_migration.sql"

Write-Host "Generating migration script: $outputFile" -ForegroundColor Green

# Generate the migration script with idempotent flag
dotnet ef migrations script --output $outputFile --context $Context --idempotent

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration script generated successfully!" -ForegroundColor Green
    
    # Fix the generated script for PostgreSQL compatibility
    Write-Host "Fixing PostgreSQL compatibility..." -ForegroundColor Yellow
    
    # Read the file content
    $content = Get-Content $outputFile -Raw
    
    # Replace $EF$ with $$ (PostgreSQL standard)
    $content = $content -replace '\$EF\$', '$$'
    
    # Add IF NOT EXISTS to CREATE TABLE statements
    $content = $content -replace 'CREATE TABLE "([^"]+)" \(', 'CREATE TABLE IF NOT EXISTS "$1" ('
    
    # Write the fixed content back
    Set-Content $outputFile -Value $content -NoNewline
    
    Write-Host "Migration script fixed and ready to use!" -ForegroundColor Green
    Write-Host "File: $outputFile" -ForegroundColor Cyan
} else {
    Write-Host "Failed to generate migration script!" -ForegroundColor Red
    exit 1
}
