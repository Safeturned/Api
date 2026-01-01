# Migrations

To migrate a database, make sure to follow these steps:

1. Switch to Debug configuration mode.

2. Create a new migration:
```bash
dotnet ef migrations add <MigrationName> --context <NameDbContext>
```

3. Create migration Sql Script:

### Using PowerShell (Recommended)
```powershell
.\Scripts\generate-migration.ps1
```

### Manual PowerShell
```powershell
dotnet ef migrations script --output Scripts/<Name>/$(Get-Date -Format "yyyyMMddHHmmss")_migration.sql --context <NameDbContext> --idempotent
```

### Using Bash
```bash
dotnet ef migrations script --output Scripts/<Name>/$(date +"%Y%m%d%H%M%S")_migration.sql --context <NameDbContext> --idempotent
```