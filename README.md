# Safeturned

<img src="web/src/public/favicon.jpg" width="64" alt="safeturned logo"/>

Security scanning service that protects Unturned servers from malicious plugins. Analyze .dll files for backdoors, suspicious patterns, and vulnerabilities.

**Live**: [https://safeturned.com](https://safeturned.com)

## What's in this repo

This is a monorepo containing all Safeturned services:

| Service         | Description                      | Tech            |
|-----------------|----------------------------------|-----------------|
| **API**         | REST API for plugin analysis     | ASP.NET Core 10 |
| **Website**     | Web interface & dashboard        | Next.js         |
| **Discord Bot** | Scan plugins directly in Discord | Discord.Net     |

All services are orchestrated with [.NET Aspire](https://aspire.dev/dashboard/overview/).

## What it detects

- Backdoors and malicious code
- Suspicious patterns and functions
- Security vulnerabilities
- Code obfuscation attempts

## Tech Stack

- **Orchestration**: .NET Aspire
- **API**: ASP.NET Core 10.0
- **Website**: Next.js 16, Tailwind CSS
- **Database**: PostgreSQL
- **Cache**: Redis
- **Background Jobs**: Hangfire
- **Logging**: Serilog
- **Error Tracking**: Sentry & [Bugsink](https://www.bugsink.com/)
- **Deployment**: GitHub Actions → GHCR → Docker Compose

## Project Structure

```
├── src/
│   ├── Safeturned.Api/           # REST API
│   ├── Safeturned.AppHost/       # Aspire orchestration
│   ├── Safeturned.DiscordBot/    # Discord bot
│   ├── Safeturned.MigrationService/
│   └── Safeturned.ServiceDefaults/
├── web/                          # Next.js website
└── FileChecker/                  # Plugin analysis engine (submodule)
```

## Documentation

- **[API Docs](https://safeturned.com/docs)** - Endpoint reference & playground
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Local setup guide

## Related Repositories

- **[Plugins](https://github.com/Safeturned/Plugins)** - Unturned Server loader that auto-scans plugins
- **[FileChecker](https://github.com/Safeturned/FileChecker)** - Core analysis engine

## License

MIT License - see [LICENSE](LICENSE) file.
