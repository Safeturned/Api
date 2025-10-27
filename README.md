# Safeturned API

Backend API for the Safeturned security scanning service. Handles plugin analysis, threat detection, and provides REST endpoints for the web interface.

## What it does

This API processes Unturned plugin files (.dll) and scans them for:
- Backdoors and malicious code
- Suspicious patterns and functions
- Security vulnerabilities
- Code obfuscation attempts

## Tech Stack

- **Framework**: ASP.NET Core 9.0 with [Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/)
- **Database**: PostgreSQL, [dbup](https://dbup.readthedocs.io/) & EF Core migrations
- **Background Jobs**: [Hangfire](https://www.hangfire.io/)
- **Logging**: [Serilog](https://serilog.net/)
- **Error Tracking**: [Sentry](https://sentry.io/) & [Bugsink](https://www.bugsink.com/)
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: GitHub Actions builds with Aspire, pushes to GHCR, and deploys via SSH, we do not make it via GH Release for simple!

## Quick Start

### Prerequisites

- .NET 9.0 SDK
- Docker Desktop (required for Aspire to run services)

### Local Development

1. Clone and setup:
```bash
git clone https://github.com/Safeturned/Api.git
cd Api
```

2. Install Aspire CLI:
```bash
dotnet tool install --global Aspire.Cli
```

3. Run with Aspire (includes PostgreSQL and pgAdmin):
```bash
aspire run
```

4. Services will be available at:
   - API: `http://localhost:5000`
   - pgAdmin: `http://localhost:5050`
   - Hangfire Dashboard: `http://localhost:5000/hangfire`

### Production Deployment

The API is automatically deployed when you create a version tag:

```bash
git tag 1.0.0
git push origin 1.0.0
```

This triggers:
1. Build - Aspire publishes the application
2. Container - Docker image is built and pushed to GitHub Container Registry
3. Deploy - Files are copied to server and deployed via SSH

## API Endpoints

- `POST /v1/files` - Upload and scan a .dll plugin file
- `GET /v1/files/{id}` - Get scan results by file ID
- `GET /v1/analytics` - Get analytics data
- `GET /health` - Health check endpoint

**Note**: API requires authentication via API key and origin validation. In the short/long term future, we plan to make the API publicly available for everyone.

## Project Structure

```
Api/
├── src/                         # Main API project
├── Safeturned.AppHost/          # Aspire host
├── Safeturned.ServiceDefaults/  # Shared services
└── FileChecker/                 # Plugin analysis logic
```

## License

MIT License - see [LICENSE](LICENSE) file.