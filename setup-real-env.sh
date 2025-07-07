#!/bin/bash
# Setup script to create a real .env file with actual values
set -e

echo "🔧 Setting up real .env file for 1Password sync..."

# Check if .env already exists with real values
if [ -f .env ] && grep -q "sk-proj-" .env 2>/dev/null; then
    echo "✅ .env already contains real values"
    exit 0
fi

# Create .env from example
if [ -f env.example ]; then
    echo "📝 Creating .env from env.example..."
    cp env.example .env
    echo "✅ .env created from env.example"
    echo ""
    echo "🔑 Please edit .env with your actual values:"
    echo "   - GPT_API_KEY (from OpenAI)"
    echo "   - NGROK_AUTHTOKEN (from ngrok)"
    echo "   - Slack tokens (from your Slack app)"
    echo "   - Other required values"
    echo ""
    echo "💡 After editing .env, run:"
    echo "   cd ~/gitSync/dev-tools && ./sync-to-1pw.js --force"
    echo "   cd ~/gitSync/gpt-cursor-runner && ./prestart.sh"
else
    echo "❌ env.example not found"
    exit 1
fi 