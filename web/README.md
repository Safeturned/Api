# Safeturned WebSite

A web application for scanning and analyzing Unturned server plugins for security threats and backdoors.

## What is Safeturned?

Safeturned is a security tool designed specifically for Unturned server administrators. It helps you identify malicious plugins that could compromise your server by performing deep static analysis of plugin source code.

## Features

The application provides several key capabilities:

- Code Analysis - Deep static analysis of plugin source code for suspicious patterns
- Threat Detection - Detection of backdoors 
- Fast Scanning - Analysis results in seconds with detailed reports
- Mobile Friendly - Responsive design that works on all devices
- Multi-language Support - Available in English and Russian

## Tech Stack

- Frontend: Next.js 15 with App Router
- Styling: Tailwind CSS
- Language: TypeScript
- Deployment: Docker ready

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Safeturned API running on port 5000

### Quick Start

```bash
cd WebSite/src
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

The website automatically connects to your API on port 5000 with default dev settings.

### Development Scripts

The project includes several useful scripts for development and validation:

```bash
# Run all linters and checks
npm run validate:all

# Individual validation commands
npm run lint              # ESLint code quality checks
npm run format:check      # Prettier formatting validation
npm run type-check        # TypeScript compilation check
npm run validate:locales  # Validate translation files

# Auto-fix issues
npm run lint:fix          # Fix ESLint issues automatically
npm run format            # Fix Prettier formatting issues
```

### Locale Validation

The project supports multiple languages (English and Russian) with automatic validation:

- **`validate:locales`** - Ensures all translation keys are present in both languages
- **`validate:all`** - Runs all validation checks including locale validation
- Missing or extra translation keys will cause the validation to fail
- This validation is automatically run in CI/CD to prevent deployment of incomplete translations

### Docker

You can also run the application using Docker:

```bash
cd src
docker build -t safeturned-website .
docker run -p 3000:3000 safeturned-website
```

## How it Works

1. Upload Plugin - Upload your .dll plugin file through the web interface
2. Code Analysis - Our system analyzes the code for suspicious functions and patterns
3. Get Results - Receive a detailed report with security assessment and recommendations

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This site is not affiliated with Smartly Dressed Games or Unturned. Unturned® is a registered trademark or trademark of Smartly Dressed Games Ltd. in the United States, Canada, and other countries.