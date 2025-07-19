#!/bin/bash
# Pre-start script to inject 1Password secrets before running the app
set -e

echo "🔑 Injecting secrets from 1Password..."

# Check if op CLI is available
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI not found. Please install it first."
    exit 1
fi

# Check if authenticated
if ! op account list &> /dev/null; then
    echo "❌ Not authenticated to 1Password. Please run 'op signin' first."
    exit 1
fi

# Create .env from 1Password template
if [ -f ~/gitSync/_global/.op.env ]; then
    echo "📝 Generating .env from 1Password template..."
    op inject -i ~/gitSync/_global/.op.env -o .env
    echo "✅ .env generated from 1Password"
else
    echo "⚠️  No .op.env template found at ~/gitSync/_global/.op.env"
    echo "   Creating basic .env from 1Password items..."
    
    # Fallback: create basic .env with common secrets
    cat > .env << 'EOF'
# Generated from 1Password - $(date)
SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN:password}
SLACK_APP_TOKEN=${SLACK_APP_TOKEN:password}
SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET:password}
OPENAI_API_KEY=${OPENAI_API_KEY:password}
DATABASE_URL=${DATABASE_URL:password}
EOF
    
    op inject -i .env -o .env
    echo "✅ Basic .env generated from 1Password"
fi

echo "🚀 Ready to start application with 1Password-backed secrets!" 