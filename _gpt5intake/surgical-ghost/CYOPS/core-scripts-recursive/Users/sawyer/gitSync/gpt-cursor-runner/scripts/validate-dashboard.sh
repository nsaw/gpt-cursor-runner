#!/usr/bin/env bash
set -e

echo "🔍 Installing validation tools and type stubs..."
pip install --quiet flake8 mypy black types-requests types-psutil

echo "🎨 Running Black code formatter check..."
black --check dashboard/app.py

echo "🔍 Running Flake8 linting..."
flake8 dashboard/app.py

echo "🔍 Running Mypy strict type checking..."
mypy --strict dashboard/app.py

echo "📋 Checking documentation compliance..."
if ! grep -q "Dashboard Daemon/Monitor Resilience Policy" docs/current/SYSTEMS_CONFIGURATION.md; then
    echo "❌ SYSTEMS_CONFIGURATION.md missing Dashboard Daemon/Monitor Resilience Policy"
    exit 1
fi

if ! grep -q "Compliance & Validation" ../thoughtpilot-commercial/clean-tier-packages/README-clean-packages.md; then
    echo "❌ README-clean-packages.md missing Compliance & Validation section"
    exit 1
fi

echo "📦 Validating distribution package files..."
# Check all JSON files in thoughtpilot-commercial packages
if ! find ../thoughtpilot-commercial/clean-tier-packages -type f -name "*.json" -exec jq . {} \; > /dev/null 2>&1; then
    echo "❌ Invalid JSON found in distribution packages"
    exit 1
fi

# Check package.json files with jsonlint
if command -v npx > /dev/null 2>&1; then
    if ! find ../thoughtpilot-commercial/clean-tier-packages -type f -name "package.json" -exec npx --yes jsonlint {} \; > /dev/null 2>&1; then
        echo "❌ Invalid package.json found in distribution packages"
        exit 1
    fi
else
    echo "⚠️ npx not available, skipping package.json validation"
fi

echo "🔧 Checking dashboard components..."
if [ ! -f "dashboard/components/AlertEngine.jsx" ]; then
    echo "❌ AlertEngine.jsx component missing"
    exit 1
fi

if [ ! -f "dashboard/components/DaemonStatus.jsx" ]; then
    echo "❌ DaemonStatus.jsx component missing"
    exit 1
fi

if [ ! -f "dashboard/styles/alerts.css" ]; then
    echo "❌ alerts.css styles missing"
    exit 1
fi

echo "✅ All validation checks passed!" 
