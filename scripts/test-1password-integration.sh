#!/bin/bash

# 1Password Integration Test Script
# This script tests the 1Password CLI integration for token replacement

set -e

echo "🧪 Testing 1Password integration for token replacement..."

# Check if 1Password CLI is installed
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI not found"
    exit 1
fi

# Check if authenticated
if ! op whoami &> /dev/null; then
    echo "❌ Not authenticated to 1Password"
    exit 1
fi

echo "✅ 1Password CLI authenticated"

# Function to test secret retrieval
test_secret() {
    local secret_name="$1"
    local description="$2"
    
    echo "Testing $secret_name..."
    
    # Try to read the secret
    if op read "op://SecretKeeper/$secret_name/credential" &> /dev/null; then
        echo "✅ $description - SUCCESS"
        return 0
    else
        echo "❌ $description - FAILED"
        return 1
    fi
}

# Test all secrets
echo ""
echo "🔍 Testing secret retrieval..."

tests_passed=0
tests_failed=0

# Test each secret
if test_secret "OPENAI_RUNNER_API_KEY" "OpenAI API Key"; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

if test_secret "RUNNER_TOKEN" "Dashboard Token"; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

if test_secret "CF_API_TOKEN" "Cloudflare API Token"; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

if test_secret "SESSION_SECRET" "Session Secret"; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

if test_secret "***REMOVED***_OPENAI_API" "Relay API Key"; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

echo ""
echo "📊 Test Results:"
echo "   ✅ Passed: $tests_passed"
echo "   ❌ Failed: $tests_failed"

if [ $tests_failed -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! 1Password integration is working correctly."
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Run the unified boot script to test the full integration"
    echo "   2. Verify all services start correctly with 1Password secrets"
    echo "   3. Check that no hardcoded tokens remain in the codebase"
else
    echo ""
    echo "⚠️ Some tests failed. Please check:"
    echo "   1. 1Password items exist in CYOPS vault"
    echo "   2. Secret values are properly set"
    echo "   3. Authentication is working correctly"
    exit 1
fi 
