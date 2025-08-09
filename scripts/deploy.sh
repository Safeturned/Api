#!/bin/bash

# Safeturned API Deployment Script
# This script manages the deployment of the Safeturned API with Cloudflare Tunnel support

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="/opt/safeturned"
BACKUP_DIR="/opt/safeturned/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Create backup
create_backup() {
    log_info "Creating backup of current deployment..."
    mkdir -p "$BACKUP_DIR"
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    if [ -d "$DEPLOY_DIR" ]; then
        tar -czf "$BACKUP_DIR/$backup_name.tar.gz" -C "$DEPLOY_DIR" .
        log_info "Backup created: $BACKUP_DIR/$backup_name.tar.gz"
    fi
}

# Pull latest image from GHCR
pull_latest_image() {
    log_info "Pulling latest image from GHCR..."
    
    # Try to pull the latest image
    if docker pull ghcr.io/safeturned/api:latest; then
        log_info "Latest image pulled successfully"
    else
        log_warn "Failed to pull latest image from GHCR"
        log_info "Will use locally available image"
    fi
}

# Stop existing containers
stop_containers() {
    log_info "Stopping existing containers..."
    cd "$DEPLOY_DIR"
    docker-compose down || true
    log_info "Containers stopped"
}

# Start containers
start_containers() {
    log_info "Starting containers..."
    cd "$DEPLOY_DIR"
    
    # Pull latest images for other services
    docker-compose pull || log_warn "Failed to pull some images"
    
    # Start with new configuration
    docker-compose up -d
    
    log_info "Containers started"
}

# Wait for health checks
wait_for_health() {
    log_info "Waiting for services to be healthy..."
    cd "$DEPLOY_DIR"
    
    local timeout=300
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if docker-compose ps | grep -q "healthy"; then
            log_info "Services are healthy"
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        log_info "Waiting for health checks... ($elapsed/$timeout seconds)"
    done
    
    log_warn "Health check timeout reached"
    return 1
}

# Check Cloudflare Tunnel
check_tunnel() {
    log_info "Checking Cloudflare Tunnel status..."
    
    # Check if cloudflared container is running
    if docker-compose ps cloudflared 2>/dev/null | grep -q "Up"; then
        log_info "Cloudflare Tunnel (Docker) is running"
    elif docker ps --filter "name=cloudflared" --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
        log_info "Cloudflare Tunnel (standalone Docker) is running"
    else
        log_warn "Cloudflare Tunnel is not running"
        log_info "To start the tunnel: docker-compose up -d cloudflared"
    fi
}

# Test API
test_api() {
    log_info "Testing API endpoint..."
    
    # Get the port from environment variable
    local api_port=${SAFETURNED_API_PORT:-8081}
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:$api_port/health > /dev/null; then
            log_info "API is responding correctly on port $api_port"
            return 0
        fi
        
        log_info "API not ready yet, attempt $attempt/$max_attempts"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "API failed to respond after $max_attempts attempts"
    return 1
}

# Cleanup
cleanup() {
    log_info "Cleaning up deployment files..."
    cd "$DEPLOY_DIR"
    rm -f safeturned-api.tar.gz
    log_info "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting Safeturned API deployment..."
    
    check_root
    create_backup
    pull_latest_image
    stop_containers
    start_containers
    
    if wait_for_health; then
        test_api
        check_tunnel
        cleanup
        log_info "Deployment completed successfully!"
        log_info "Your API is available on port 8081 for Cloudflare Tunnel"
    else
        log_error "Deployment failed - health checks did not pass"
        exit 1
    fi
}

# Rollback function
rollback() {
    log_info "Rolling back to previous deployment..."
    
    if [ -z "$1" ]; then
        log_error "Please specify a backup file to rollback to"
        exit 1
    fi
    
    local backup_file="$BACKUP_DIR/$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    stop_containers
    
    log_info "Restoring from backup: $backup_file"
    cd "$DEPLOY_DIR"
    tar -xzf "$backup_file"
    
    start_containers
    wait_for_health
    test_api
    
    log_info "Rollback completed successfully"
}

# Show available backups
list_backups() {
    log_info "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || log_warn "No backups found"
    else
        log_warn "Backup directory does not exist"
    fi
}

# Show status
status() {
    log_info "Checking deployment status..."
    
    cd "$DEPLOY_DIR"
    
    # Get the port from environment variable
    local api_port=${SAFETURNED_API_PORT:-8081}
    
    echo "=== Docker Containers ==="
    docker-compose ps
    
    echo -e "\n=== Cloudflare Tunnel ==="
    if docker-compose ps cloudflared 2>/dev/null | grep -q "Up"; then
        log_info "Cloudflare Tunnel (Docker Compose) is running"
        docker-compose logs --tail=10 cloudflared
    elif docker ps --filter "name=cloudflared" --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
        log_info "Cloudflare Tunnel (standalone Docker) is running"
        docker logs --tail=10 $(docker ps -q --filter "name=cloudflared")
    else
        log_warn "Cloudflare Tunnel is not running"
    fi
    
    echo -e "\n=== API Health Check ==="
    if curl -f -s http://localhost:$api_port/health > /dev/null; then
        log_info "API is healthy on port $api_port"
    else
        log_error "API is not responding on port $api_port"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy     Deploy the application"
    echo "  rollback   Rollback to a previous backup (requires backup filename)"
    echo "  status     Show deployment status"
    echo "  backups    List available backups"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 rollback backup-20231201-143022.tar.gz"
    echo "  $0 status"
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback "$2"
        ;;
    status)
        status
        ;;
    backups)
        list_backups
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
