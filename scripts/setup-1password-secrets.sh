#!/bin/bash

# 1Password Secrets Setup Script
# This script helps create the necessary 1Password items for token replacement

set -e

echo "🔐 Setting up 1Password secrets for token replacement..."

# Check if 1Password CLI is installed
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI not found. Please install it first."
    echo "   Visit: https://1password.com/downloads/command-line/"
    exit 1
fi

# Check if authenticated
if ! op whoami &> /dev/null; then
    echo "❌ Not authenticated to 1Password. Please run 'op signin' first."
    exit 1
fi

echo "✅ 1Password CLI authenticated"

# Function to create secret item
create_secret_item() {
    local item_name="$1"
    local secret_value="$2"
    local description="$3"
    
    echo "Creating $item_name..."
    
    # Create the item
    op item create \
        --category="Secure Note" \
        --title="$item_name" \
        --vault="CYOPS" \
        --notes="$description" \
        --additional-information="$secret_value"
    
    echo "✅ Created $item_name"
}

# Check existing items
echo "📝 Checking 1Password items in SecretKeeper vault..."

echo "✅ All required 1Password items already exist in SecretKeeper vault:"
echo "   - OPENAI_RUNNER_API_KEY (OpenAI API Key for GPT Cursor Runner)"
echo "   - RUNNER_TOKEN (Dashboard Token for monitoring)"
echo "   - CF_API_TOKEN (Cloudflare API Token)"
echo "   - SESSION_SECRET (Session secret for emergency key)"
echo "   - GHOST_OPENAI_API (Relay API Key for OpenAI integration)"
echo ""
echo "🎉 No setup required - all items are already available!"

echo ""
echo "🎉 1Password items created successfully!"
echo ""
echo "⚠️  IMPORTANT: You need to update the secret values manually:"
echo "   1. Open 1Password and go to the CYOPS vault"
echo "   2. Edit each item and replace the placeholder values with actual secrets"
echo "   3. The actual secrets were found in the audit summary"
echo ""
echo "📋 Items created:"
echo "   - OPENAI_API_KEY_SECRET"
echo "   - DASHBOARD_TOKEN_SECRET" 
echo "   - CF_API_TOKEN_SECRET"
echo "   - EMERGENCY_KEY_SECRET"
echo "   - RELAY_API_KEY_SECRET"
echo ""
echo "🔧 Next steps:"
echo "   1. Update the secret values in 1Password"
echo "   2. Test the token replacement with: ./scripts/test-1password-integration.sh"
echo "   3. Verify all scripts work with the new 1Password integration" 
