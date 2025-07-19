#!/bin/bash
# Vault Runtime Injection Script
# Fetches all secrets from Vault and writes to .env
set -e

echo "🔐 Injecting secrets from HashiCorp Vault..."

# Check if vault CLI is available
if ! command -v vault &> /dev/null; then
    echo "❌ Vault CLI not found. Please install it first."
    exit 1
fi

# Set Vault address if not set
if [ -z "$VAULT_ADDR" ]; then
    export VAULT_ADDR=http://localhost:8200
fi

# Check if vault is running and accessible
if ! vault status &> /dev/null; then
    echo "❌ Vault not accessible. Please start vault with:"
    echo "   cd ~/gitSync/dev-tools && ./vault.sh"
    exit 1
fi

# Check if authenticated
if ! vault token lookup &> /dev/null; then
    echo "❌ Not authenticated to Vault. Please login first."
    exit 1
fi

# Fetch all secrets from Vault
echo "📝 Fetching secrets from Vault..."
SECRETS=$(vault kv get -format=json secret/data/sawyer-dev 2>/dev/null || echo '{"data": {"data": {}}}')

# Check if secrets exist
SECRET_COUNT=$(echo "$SECRETS" | jq -r '.data.data | keys | length')

if [ "$SECRET_COUNT" -eq 0 ]; then
    echo "⚠️  No secrets found in Vault at secret/data/sawyer-dev"
    echo "   To populate Vault, run:"
    echo "   cd ~/gitSync/dev-tools && ./vault-sync-env.js"
    echo ""
    echo "📝 Creating empty .env template..."
    echo "# Generated from HashiCorp Vault - $(date)" > .env
    echo "# No secrets found in Vault" >> .env
    echo "# To populate: cd ~/gitSync/dev-tools && ./vault-sync-env.js" >> .env
    echo "✅ Empty .env template created"
else
    # Extract and format secrets
    echo "# Generated from HashiCorp Vault - $(date)" > .env
    echo "# Usage: vault kv get secret/data/sawyer-dev" >> .env
    echo "" >> .env

    # Parse JSON and write to .env
    echo "$SECRETS" | jq -r '.data.data | to_entries[] | "\(.key)=\(.value)"' >> .env

    if [ $? -eq 0 ]; then
        echo "✅ .env generated from Vault"
        echo "📊 Found $SECRET_COUNT environment variables"
    else
        echo "❌ Failed to parse Vault secrets"
        exit 1
    fi
fi

echo "🚀 Ready to start application with Vault-backed secrets!" 