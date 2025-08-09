# Safeturned API Deployment Guide

This guide explains how to deploy your Safeturned API using GitHub Actions and Cloudflare Tunnel.

## Overview

The deployment setup includes:
- **GitHub Actions workflow** for automated builds and deployments
- **Cloudflare Tunnel** for secure HTTPS access without exposing public ports
- **Docker Compose** for managing the application stack
- **Health checks** and monitoring
- **Automatic backups** and rollback capabilities

## Architecture

```
GitHub Actions → Build & Deploy → Server → Cloudflare Tunnel → Internet
```

## Prerequisites

### Server Requirements
- Ubuntu/Debian server with Docker and Docker Compose installed
- SSH access with key-based authentication
- Cloudflare account and domain

### GitHub Secrets
Configure these secrets in your GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `SERVER_HOST` | Your server's IP address or hostname |
| `SERVER_USER` | SSH username (usually `root`) |
| `SSH_PRIVATE_KEY` | Private SSH key for server access |
| `SSH_PORT` | SSH port (optional, defaults to 22) |

## Quick Start

### 1. Set up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

```bash
SERVER_HOST=your-server-ip
SERVER_USER=root
SSH_PRIVATE_KEY=your-private-ssh-key
SSH_PORT=2222  # Only if you use a custom SSH port
```

### 2. Set up Cloudflare Tunnel

Follow the detailed guide in [CLOUDFLARE_TUNNEL_SETUP.md](./CLOUDFLARE_TUNNEL_SETUP.md)

### 3. Deploy

Push to `main` or `master` branch to trigger automatic deployment, or manually trigger the workflow.

## Workflow Files

### `.github/workflows/deploy.yml`
Main deployment workflow that:
- Builds the application with Aspire (handles containerization automatically)
- Creates docker-compose configuration
- Deploys to your server
- Configures for Cloudflare Tunnel

## Server Setup

### Directory Structure
```
/opt/safeturned/
├── docker-compose.yaml          # Aspire-generated compose file
├── docker-compose.override.yaml # Production overrides
├── deploy.sh                    # Deployment script
├── backups/                     # Automatic backups
└── .env                        # Environment variables
```

### Deployment Script

The `scripts/deploy.sh` script provides:

```bash
# Deploy the application
sudo ./deploy.sh deploy

# Check status
sudo ./deploy.sh status

# List backups
sudo ./deploy.sh backups

# Rollback to previous version
sudo ./deploy.sh rollback backup-20231201-143022.tar.gz
```

## Environment Configuration

### Production Environment Variables

Create `/opt/safeturned/.env`:

```bash
# Database
DATABASE_PASSWORD=your-secure-password

# API Configuration
SAFETURNED_API_IMAGE=safeturned-api:latest
SAFETURNED_API_PORT=80

# Hangfire (optional)
Hangfire__User=admin
Hangfire__Password=your-secure-password
Hangfire__DashboardPath=/hangfire
```

### Cloudflare Tunnel Configuration

Since you already have cloudflared running in Docker, you just need to:

1. **Get your tunnel token** from Cloudflare Dashboard → Zero Trust → Access → Tunnels
2. **Add it to your environment variables**:

```bash
# Add to /opt/safeturned/.env
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here
```

3. **Configure the hostname** in Cloudflare Dashboard:
   - Subdomain: `api` (or your preferred subdomain)
   - Domain: `yourdomain.com`
   - Service: `http://safeturned-api:80` (your container name)

The GitHub Actions workflow will automatically add cloudflared to your docker-compose setup.

## Monitoring and Health Checks

### Health Check Endpoints
- `/health` - Overall application health
- `/alive` - Liveness check

### Monitoring Commands

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs safeturned-api

# Check Cloudflare Tunnel
docker-compose logs cloudflared

# Test API
curl http://localhost:8080/health
```

## Security Considerations

### Firewall Configuration
Your server doesn't need to expose any ports to the internet:

```bash
# Allow SSH only
sudo ufw allow ssh
sudo ufw enable
```

### SSL/TLS
- Cloudflare Tunnel handles SSL termination
- No need for local SSL certificates
- Automatic HTTPS for all traffic

### Authentication
Consider adding authentication to your API endpoints:
- API keys for external clients
- JWT tokens for user authentication
- Rate limiting (already configured)

## Troubleshooting

### Deployment Issues

1. **Build fails**: Check GitHub Actions logs
2. **Deployment fails**: Check SSH connectivity and server permissions
3. **API not responding**: Check container logs and health checks

### Cloudflare Tunnel Issues

1. **Tunnel not connecting**: Check tunnel configuration and credentials
2. **DNS not resolving**: Verify CNAME records in Cloudflare dashboard
3. **SSL errors**: Ensure tunnel is running and DNS is configured correctly

### Common Commands

```bash
# Restart Cloudflare Tunnel
docker-compose restart cloudflared

# Restart API containers
cd /opt/safeturned && docker-compose restart

# View tunnel logs
docker-compose logs -f cloudflared

# Test tunnel manually
docker run --rm cloudflare/cloudflared:latest tunnel run $CLOUDFLARE_TUNNEL_TOKEN
```

## Backup and Recovery

### Automatic Backups
The deployment script creates automatic backups before each deployment.

### Manual Backup
```bash
cd /opt/safeturned
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz .
```

### Recovery
```bash
sudo ./deploy.sh rollback backup-filename.tar.gz
```

## Performance Optimization

### Docker Configuration
- Health checks ensure containers are ready
- Resource limits can be added to docker-compose.yaml
- Log rotation prevents disk space issues

### Cloudflare Settings
- Enable caching for static content
- Configure security rules
- Set up monitoring and alerts

## Support

For issues with:
- **GitHub Actions**: Check workflow logs in GitHub
- **Cloudflare Tunnel**: See [CLOUDFLARE_TUNNEL_SETUP.md](./CLOUDFLARE_TUNNEL_SETUP.md)
- **Docker/Deployment**: Use the deployment script's status command

## Benefits of This Setup

1. **Zero-downtime deployments** with health checks
2. **Automatic HTTPS** via Cloudflare Tunnel
3. **No public ports** exposed on your server
4. **Built-in DDoS protection** from Cloudflare
5. **Easy rollbacks** with automatic backups
6. **Monitoring and health checks** for reliability
