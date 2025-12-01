# Development Setup

## Requirements

You'll need:
- .NET 10.0 SDK
- Docker Desktop
- Git

## Getting Started

Clone the repo:
```bash
git clone https://github.com/Safeturned/Api.git
cd Api
```

Install Aspire CLI:
```bash
dotnet tool install --global Aspire.Cli
```

Run Docker Desktop

Start the API with Aspire (handles PostgreSQL, pgAdmin, etc):
```bash
aspire run
```

The API runs at http://localhost:5000

## API Key

The development API key is already configured in `appsettings.Development.json`:

```
sk_test_ABCDEFGHIJKLMNOPQRSTUVWXYZabcd
```

When the API starts, it prints this key. It persists across database resets, so you don't need to reconfigure it.

## Using the WebSite

To run the WebSite locally with the API:

1. Go to the WebSite folder:
```bash
cd ../WebSite/src
```

2. Create `.env.local`:
```bash
cp .env.example .env.local
```

3. Add the API key to `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
SAFETURNED_API_KEY=sk_test_ABCDEFGHIJKLMNOPQRSTUVWXYZabcd
```

4. Start it:
```bash
npm run dev
```

Now you have both API and WebSite running locally.

## Configuration

Edit `appsettings.Development.json` to add your Discord credentials:

```json
{
  "AdminSeed": {
    "Email": "your-email@example.com",
    "DiscordId": "your-discord-id"
  },
  "Discord": {
    "ClientId": "your-app-id",
    "ClientSecret": "your-secret"
  }
}
```