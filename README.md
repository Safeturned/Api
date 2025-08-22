# Safeturned API

Backend API for the Safeturned security scanning service. Handles plugin analysis, threat detection, and provides REST endpoints for the web interface.

## What it does

This API processes Unturned plugin files (.dll) and scans them for:
- Backdoors and malicious code
- Suspicious patterns and functions
- Security vulnerabilities
- Code obfuscation attempts

## Tech Stack

- **Framework**: ASP.NET Core 9.0 with Aspire
- **Database**: PostgreSQL with dbup migrations
- **Background Jobs**: Hangfire
- **Logging**: Serilog
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: Aspire generates Docker Compose for deployment

## Quick Start

### Prerequisites

- .NET 9.0 SDK
- PostgreSQL
- Docker (optional)

### Local Development

1. Clone and setup:
```bash
git clone https://github.com/Safeturned/Api.git
cd Api
```

2. Run with Aspire (includes PostgreSQL and pgAdmin):
```bash
dotnet run --project Safeturned.AppHost
```

3. Services will be available at:
   - API: `http://localhost:5000`
   - pgAdmin: `http://localhost:5050`
   - Hangfire Dashboard: `http://localhost:5000/hangfire`

### Docker

```bash
# Build and run with Aspire (generates docker-compose.yaml)
dotnet run --project Safeturned.AppHost

# Or use the generated docker-compose.yaml directly
docker compose up -d
```

## API Endpoints

- `POST /v1/files` - Upload and scan a .dll plugin file
- `GET /v1/files/{id}` - Get scan results by file ID
- `GET /v1/analytics` - Get analytics data
- `GET /health` - Health check endpoint

**Note**: API requires authentication via API key and origin validation.

## Project Structure

```
Api/
├── src/                    # Main API project
├── Safeturned.AppHost/     # Aspire host
├── Safeturned.ServiceDefaults/  # Shared services
└── FileChecker/           # Plugin analysis logic
```

## Development

The project uses:
- **Aspire** for local development and deployment
- **Submodules** for the FileChecker component
- **GitHub Actions** for CI/CD

## License

MIT License - see [LICENSE](LICENSE) file.