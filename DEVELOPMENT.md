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

Initialize submodules:
```bash
git submodule update --init --recursive
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
