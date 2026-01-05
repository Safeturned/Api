# Development Setup

## Requirements

- .NET 10.0 SDK
- Node.js 22+
- Docker Desktop
- Git

## Getting Started

Clone the repo:
```bash
git clone https://github.com/Safeturned/Safeturned.git
cd Safeturned
```

Install Aspire CLI:
```bash
dotnet tool install --global Aspire.Cli
```

Run Docker Desktop, then start everything with Aspire:
```bash
aspire run
```

This starts:
- **API**
- **Website**
- **PostgreSQL** + pgAdmin
- **Redis**
- **Discord Bot** (if configured)
- **FileChecker** (pulled from ghcr.io)

## FileChecker Local Development

By default, Aspire pulls the FileChecker image from `ghcr.io/safeturned/safeturned-filechecker:latest`.

To develop FileChecker locally, initialize the submodule:
```bash
git submodule update --init
```

Aspire will automatically detect and build from the local Dockerfile instead. Changes you make to FileChecker can be committed and pushed from within the `FileChecker/` directory.

## API Key

The development API key is configured in `src/Safeturned.AppHost/appsettings.Development.json`:

```
sk_test_ABCDEFGHIJKLMNOPQRSTUVWXYZabcd
```

## Website Development

The website is at `web/src`. Aspire runs it automatically, but you can also run it standalone:

```bash
cd web/src
npm install
npm run dev
```

## Configuration

Edit `src/Safeturned.AppHost/appsettings.Development.json` for Discord credentials:

```json
{
  "AdminSeed": {
    "Email": "your-email@example.com",
    "DiscordId": "your-discord-id"
  },
  "Discord": {
    "ClientId": "your-app-id",
    "ClientSecret": "your-secret",
    "BotClientId": "your-bot-client-id"
  }
}
```
