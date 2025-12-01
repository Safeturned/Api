# Safeturned API

Backend API for the Safeturned security scanning service that protects Unturned servers from malicious plugins. This API handles plugin analysis, threat detection, and provides REST endpoints for the web interface.

**Try it now**: [https://safeturned.com](https://safeturned.com) - Upload and scan your Unturned plugins instantly!

## What it does

This API processes Unturned plugin files (.dll) and scans them for:
- Backdoors and malicious code
- Suspicious patterns and functions
- Security vulnerabilities
- Code obfuscation attempts

## Tech Stack

- **Framework**: ASP.NET Core 10.0 with [Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/)
- **Database**: PostgreSQL, [dbup](https://dbup.readthedocs.io/) & EF Core migrations
- **Background Jobs**: [Hangfire](https://www.hangfire.io/)
- **Logging**: [Serilog](https://serilog.net/)
- **Error Tracking**: [Sentry](https://sentry.io/) & [Bugsink](https://www.bugsink.com/)
- **API Documentation**: Swagger/OpenAPI
- **Deployment**: GitHub Actions builds with Aspire, pushes to GHCR, and deploys via SSH, we do not make it via GH Release for simple!

## API Documentation

See our complete [API documentation](https://safeturned.com/docs) for:
- Full endpoint reference
- Request/response examples
- Authentication details
- Rate limiting info
- Live API playground

## For Developers

Want to contribute or run locally?

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Complete local setup guide

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