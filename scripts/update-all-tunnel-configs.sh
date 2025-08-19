#!/bin/bash

# =============================================================================
# UPDATE ALL TUNNEL CONFIGURATIONS
# =============================================================================
# Updates all gitSync repositories with new tunnel configuration
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
GITSYNC_ROOT="/Users/sawyer/gitSync"
CLOUDFLARED_DIR="/Users/sawyer/.cloudflared"

# Tunnel Configuration
RUNNER_HOSTNAME="runner.thoughtmarks.app"
GHOST_HOSTNAME="ghost.thoughtmarks.app"
EXPO_HOSTNAME="expo.thoughtmarks.app"
WEBHOOK_HOSTNAME="webhook.thoughtmarks.app"
HEALTH_HOSTNAME="health.thoughtmarks.app"
DEV_HOSTNAME="dev.thoughtmarks.app"

# Tunnel IDs
RUNNER_TUNNEL_ID="f1545c78-1a94-408f-ba6b-9c4223b4c2bf"
GHOST_TUNNEL_ID="c9a7bf54-dab4-4c9f-a05d-2022f081f4e0"
EXPO_TUNNEL_ID="c1bdbf69-73be-4c59-adce-feb2163b550a"
WEBHOOK_TUNNEL_ID="9401ee23-3a46-409b-b0e7-b035371afe32"
HEALTH_TUNNEL_ID="4d633ac0-9bfe-41e7-8ef7-6dfd7aecd378"
DEV_TUNNEL_ID="2becefa5-3df5-4ca0-b86a-bf0a5300c9c9"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Function to update environment files
update_env_files() {
    local repo_path="$1"
    local env_files=(".env" "env.example" ".env.local" ".env.production" ".env.development")
    
    for env_file in "${env_files[@]}"; do
        local full_path="$repo_path/$env_file"
        if [ -f "$full_path" ]; then
            log_info "Updating $env_file in $repo_path"
            
            # Backup original file
            cp "$full_path" "$full_path.backup"
            
            # Update tunnel URLs
            sed -i '' "s|https://.*\.thoughtmarks\.app|https://$RUNNER_HOSTNAME|g" "$full_path"
            sed -i '' "s|RUNNER_URL=.*|RUNNER_URL=https://$RUNNER_HOSTNAME|g" "$full_path"
            sed -i '' "s|ENDPOINT_URL=.*|ENDPOINT_URL=https://$WEBHOOK_HOSTNAME|g" "$full_path"
            sed -i '' "s|DASHBOARD_URL=.*|DASHBOARD_URL=https://$RUNNER_HOSTNAME/dashboard|g" "$full_path"
            sed -i '' "s|SLACK_REDIRECT_URI=.*|SLACK_REDIRECT_URI=https://$RUNNER_HOSTNAME/slack/oauth/callback|g" "$full_path"
            
            # Add new tunnel configurations
            echo "" >> "$full_path"
            echo "# New Tunnel Configuration" >> "$full_path"
            echo "EXPO_URL=https://$EXPO_HOSTNAME" >> "$full_path"
            echo "WEBHOOK_URL=https://$WEBHOOK_HOSTNAME" >> "$full_path"
            echo "HEALTH_URL=https://$HEALTH_HOSTNAME" >> "$full_path"
            echo "DEV_URL=https://$DEV_HOSTNAME" >> "$full_path"
            echo "GHOST_URL=https://$GHOST_HOSTNAME" >> "$full_path"
            
            log_info "✅ Updated $env_file"
        fi
    done
}

# Function to update package.json files
update_package_json() {
    local repo_path="$1"
    local package_file="$repo_path/package.json"
    
    if [ -f "$package_file" ]; then
        log_info "Updating package.json in $repo_path"
        
        # Backup original file
        cp "$package_file" "$package_file.backup"
        
        # Update any tunnel-related scripts or configurations
        sed -i '' "s|https://.*\.thoughtmarks\.app|https://$RUNNER_HOSTNAME|g" "$package_file"
        
        log_info "✅ Updated package.json"
    fi
}

# Function to update configuration files
update_config_files() {
    local repo_path="$1"
    
    # Update fly.toml files
    local fly_file="$repo_path/fly.toml"
    if [ -f "$fly_file" ]; then
        log_info "Updating fly.toml in $repo_path"
        sed -i '' "s|PUBLIC_RUNNER_URL = '.*'|PUBLIC_RUNNER_URL = 'https://$RUNNER_HOSTNAME'|g" "$fly_file"
        log_info "✅ Updated fly.toml"
    fi
    
    # Update Dockerfile files
    local dockerfile="$repo_path/Dockerfile"
    if [ -f "$dockerfile" ]; then
        log_info "Updating Dockerfile in $repo_path"
        sed -i '' "s|https://.*\.thoughtmarks\.app|https://$RUNNER_HOSTNAME|g" "$dockerfile"
        log_info "✅ Updated Dockerfile"
    fi
}

# Function to update script files
update_script_files() {
    local repo_path="$1"
    
    # Find and update all shell scripts
    find "$repo_path" -name "*.sh" -type f | while read -r script_file; do
        log_info "Updating script: $(basename "$script_file")"
        sed -i '' "s|https://.*\.thoughtmarks\.app|https://$RUNNER_HOSTNAME|g" "$script_file"
        sed -i '' "s|runner\.thoughtmarks\.app|$RUNNER_HOSTNAME|g" "$script_file"
        sed -i '' "s|ghost\.thoughtmarks\.app|$GHOST_HOSTNAME|g" "$script_file"
        sed -i '' "s|expo\.thoughtmarks\.app|$EXPO_HOSTNAME|g" "$script_file"
        sed -i '' "s|webhook\.thoughtmarks\.app|$WEBHOOK_HOSTNAME|g" "$script_file"
        sed -i '' "s|health\.thoughtmarks\.app|$HEALTH_HOSTNAME|g" "$script_file"
        sed -i '' "s|dev\.thoughtmarks\.app|$DEV_HOSTNAME|g" "$script_file"
    done
    
    # Find and update all JavaScript files
    find "$repo_path" -name "*.js" -type f | while read -r js_file; do
        log_info "Updating JavaScript: $(basename "$js_file")"
        sed -i '' "s|https://.*\.thoughtmarks\.app|https://$RUNNER_HOSTNAME|g" "$js_file"
        sed -i '' "s|runner\.thoughtmarks\.app|$RUNNER_HOSTNAME|g" "$js_file"
        sed -i '' "s|ghost\.thoughtmarks\.app|$GHOST_HOSTNAME|g" "$js_file"
        sed -i '' "s|expo\.thoughtmarks\.app|$EXPO_HOSTNAME|g" "$js_file"
        sed -i '' "s|webhook\.thoughtmarks\.app|$WEBHOOK_HOSTNAME|g" "$js_file"
        sed -i '' "s|health\.thoughtmarks\.app|$HEALTH_HOSTNAME|g" "$js_file"
        sed -i '' "s|dev\.thoughtmarks\.app|$DEV_HOSTNAME|g" "$js_file"
    done
    
    # Find and update all Python files
    find "$repo_path" -name "*.py" -type f | while read -r py_file; do
        log_info "Updating Python: $(basename "$py_file")"
        sed -i '' "s|https://.*\.thoughtmarks\.app|https://$RUNNER_HOSTNAME|g" "$py_file"
        sed -i '' "s|runner\.thoughtmarks\.app|$RUNNER_HOSTNAME|g" "$py_file"
        sed -i '' "s|ghost\.thoughtmarks\.app|$GHOST_HOSTNAME|g" "$py_file"
        sed -i '' "s|expo\.thoughtmarks\.app|$EXPO_HOSTNAME|g" "$py_file"
        sed -i '' "s|webhook\.thoughtmarks\.app|$WEBHOOK_HOSTNAME|g" "$py_file"
        sed -i '' "s|health\.thoughtmarks\.app|$HEALTH_HOSTNAME|g" "$py_file"
        sed -i '' "s|dev\.thoughtmarks\.app|$DEV_HOSTNAME|g" "$py_file"
    done
}

# Function to update documentation files
update_doc_files() {
    local repo_path="$1"
    
    # Find and update all markdown files
    find "$repo_path" -name "*.md" -type f | while read -r md_file; do
        log_info "Updating documentation: $(basename "$md_file")"
        sed -i '' "s|https://.*\.thoughtmarks\.app|https://$RUNNER_HOSTNAME|g" "$md_file"
        sed -i '' "s|runner\.thoughtmarks\.app|$RUNNER_HOSTNAME|g" "$md_file"
        sed -i '' "s|ghost\.thoughtmarks\.app|$GHOST_HOSTNAME|g" "$md_file"
        sed -i '' "s|expo\.thoughtmarks\.app|$EXPO_HOSTNAME|g" "$md_file"
        sed -i '' "s|webhook\.thoughtmarks\.app|$WEBHOOK_HOSTNAME|g" "$md_file"
        sed -i '' "s|health\.thoughtmarks\.app|$HEALTH_HOSTNAME|g" "$md_file"
        sed -i '' "s|dev\.thoughtmarks\.app|$DEV_HOSTNAME|g" "$md_file"
    done
}

# Function to process a single repository
process_repository() {
    local repo_path="$1"
    local repo_name=$(basename "$repo_path")
    
    log_info "Processing repository: $repo_name"
    
    if [ ! -d "$repo_path" ]; then
        log_warn "Repository not found: $repo_path"
        return
    fi
    
    # Update environment files
    update_env_files "$repo_path"
    
    # Update package.json
    update_package_json "$repo_path"
    
    # Update configuration files
    update_config_files "$repo_path"
    
    # Update script files
    update_script_files "$repo_path"
    
    # Update documentation files
    update_doc_files "$repo_path"
    
    log_info "✅ Completed processing: $repo_name"
}

# Main execution
main() {
    log_info "Starting comprehensive tunnel configuration update..."
    
    # List of repositories to update
    repositories=(
        "/Users/sawyer/gitSync/gpt-cursor-runner"
        "/Users/sawyer/gitSync/tm-mobile-cursor"
        "/Users/sawyer/gitSync/scripts"
        "/Users/sawyer/gitSync/_global"
        "/Users/sawyer/gitSync/thoughtmarks-mobile"
        "/Users/sawyer/gitSync/ThoughtPilot-AI"
        "/Users/sawyer/gitSync/Thoughtmarks-landing"
        "/Users/sawyer/gitSync/tm-filesync"
        "/Users/sawyer/gitSync/dev-tools"
        "/Users/sawyer/gitSync/Projects"
        "/Users/sawyer/gitSync/Koder"
        "/Users/sawyer/gitSync/meshMaker"
    )
    
    # Process each repository
    for repo_path in "${repositories[@]}"; do
        process_repository "$repo_path"
    done
    
    log_info "✅ All repositories updated successfully!"
    
    # Create tunnel summary
    create_tunnel_summary
}

# Function to create tunnel summary
create_tunnel_summary() {
    local summary_file="/Users/sawyer/gitSync/TUNNEL_CONFIGURATION_SUMMARY.md"
    
    cat > "$summary_file" << EOF
# TUNNEL CONFIGURATION SUMMARY

## Generated: $(date)

### Tunnel Configuration
| Service | Hostname | Tunnel ID | Port | Purpose |
|---------|----------|-----------|------|---------|
| Main Runner | $RUNNER_HOSTNAME | $RUNNER_TUNNEL_ID | 5555 | Production GPT runner |
| Ghost Runner | $GHOST_HOSTNAME | $GHOST_TUNNEL_ID | 5556 | Secondary/backup runner |
| Expo/Metro | $EXPO_HOSTNAME | $EXPO_TUNNEL_ID | 8081 | React Native development |
| Webhook | $WEBHOOK_HOSTNAME | $WEBHOOK_TUNNEL_ID | 5555/webhook | Slack webhooks |
| Health | $HEALTH_HOSTNAME | $HEALTH_TUNNEL_ID | 5555/health | Monitoring |
| Development | $DEV_HOSTNAME | $DEV_TUNNEL_ID | 5051 | Development environment |

### DNS Configuration Required
All hostnames need DNS records pointing to their respective tunnel IDs.

### Updated Repositories
$(for repo in "${repositories[@]}"; do echo "- $(basename "$repo")"; done)

### Configuration Files Updated
- Environment files (.env, env.example, etc.)
- Package.json files
- Configuration files (fly.toml, Dockerfile)
- Script files (*.sh, *.js, *.py)
- Documentation files (*.md)

### Next Steps
1. Configure DNS for all hostnames
2. Test tunnel connectivity
3. Verify all services are accessible
4. Update any external references

EOF
    
    log_info "✅ Tunnel summary created: $summary_file"
}

# Run main function
main "$@" 
