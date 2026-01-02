#!/bin/bash
set -e

PROJECT="safeturned"
VERSION="$1"
BRANCH="$2"
ENVIRONMENT="$3"
REGISTRY_USER="$4"
REGISTRY_PASS="$5"

if [ -z "$VERSION" ] || [ -z "$BRANCH" ] || [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <version> <branch> <environment> [registry_user] [registry_pass]"
  exit 1
fi

echo "Deploying $PROJECT version $VERSION ($ENVIRONMENT)"

if [ -n "$REGISTRY_USER" ] && [ -n "$REGISTRY_PASS" ]; then
  echo "Logging into registry ghcr.io..."
  echo "$REGISTRY_PASS" | docker login ghcr.io -u "$REGISTRY_USER" --password-stdin
fi

# Set image versions
SAFETURNED_API_IMAGE="ghcr.io/${REGISTRY_USER}/${PROJECT}-api:${VERSION}"
SAFETURNED_DISCORDBOT_IMAGE="ghcr.io/${REGISTRY_USER}/${PROJECT}-discordbot:${VERSION}"
SAFETURNED_MIGRATIONS_IMAGE="ghcr.io/${REGISTRY_USER}/${PROJECT}-migrations:${VERSION}"
SAFETURNED_WEB_IMAGE="ghcr.io/${REGISTRY_USER}/${PROJECT}-web:${VERSION}"

echo "=== Image versions ==="
echo "API: $SAFETURNED_API_IMAGE"
echo "DiscordBot: $SAFETURNED_DISCORDBOT_IMAGE"
echo "Migrations: $SAFETURNED_MIGRATIONS_IMAGE"
echo "Web: $SAFETURNED_WEB_IMAGE"

# Update .env file (only the image lines, preserves everything else)
update_env_var() {
  local var_name=$1
  local var_value=$2
  if grep -q "^${var_name}=" .env 2>/dev/null; then
    sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" .env
  else
    echo "${var_name}=${var_value}" >> .env
  fi
}

update_env_var "SAFETURNED_API_IMAGE" "$SAFETURNED_API_IMAGE"
update_env_var "SAFETURNED_DISCORDBOT_IMAGE" "$SAFETURNED_DISCORDBOT_IMAGE"
update_env_var "SAFETURNED_MIGRATIONS_IMAGE" "$SAFETURNED_MIGRATIONS_IMAGE"
update_env_var "SAFETURNED_WEB_IMAGE" "$SAFETURNED_WEB_IMAGE"

echo "Updated .env with image versions"

# Pull images
echo "Pulling images..."
docker pull "$SAFETURNED_API_IMAGE" || echo "API pull failed"
docker pull "$SAFETURNED_DISCORDBOT_IMAGE" || echo "DiscordBot pull failed"
docker pull "$SAFETURNED_MIGRATIONS_IMAGE" || echo "Migrations pull failed"
docker pull "$SAFETURNED_WEB_IMAGE" || echo "Web pull failed"

# Deploy
docker compose down 2>/dev/null || true
docker compose up -d

echo "Deployment complete"
