#!/bin/bash

echo "🔍 Validating linting error fixes..."

# Check 1: Verify all Python files have newlines at end
echo "📝 Checking for missing newlines..."
find gpt_cursor_runner -name "*.py" -exec sh -c '
    if [ -s "$1" ] && [ "$(tail -c1 "$1" | wc -l)" -eq 0 ]; then
        echo "❌ Missing newline at end of $1"
    else
        echo "✅ $1 has proper newline"
    fi
' sh {} \;

# Check 2: Verify main.py structure
echo "🔧 Checking main.py structure..."
if grep -q "def webhook()" gpt_cursor_runner/main.py; then
    echo "✅ webhook function found in main.py"
else
    echo "❌ webhook function missing from main.py"
fi

if grep -q "def handle_slack_event" gpt_cursor_runner/slack_handler.py; then
    echo "✅ handle_slack_event function found in slack_handler.py"
else
    echo "❌ handle_slack_event function missing from slack_handler.py"
fi

if grep -q "def send_slack_response" gpt_cursor_runner/slack_handler.py; then
    echo "✅ send_slack_response function found in slack_handler.py"
else
    echo "❌ send_slack_response function missing from slack_handler.py"
fi

# Check 3: Verify type annotations
echo "🔤 Checking type annotations..."
if grep -q "-> Union\[Response, Tuple\[Response, int\]\]" gpt_cursor_runner/main.py; then
    echo "✅ Proper return type annotations found in main.py"
else
    echo "❌ Missing proper return type annotations in main.py"
fi

# Check 4: Verify no unused variables
echo "🧹 Checking for unused variables..."
if grep -q "summaries_dir = " gpt_cursor_runner/slack_handler.py; then
    echo "❌ Unused variable 'summaries_dir' still present"
else
    echo "✅ Unused variable 'summaries_dir' removed"
fi

if grep -q "second_arg = " gpt_cursor_runner/slack_handler.py; then
    echo "❌ Unused variable 'second_arg' still present"
else
    echo "✅ Unused variable 'second_arg' removed"
fi

# Check 5: Verify import structure
echo "📦 Checking import structure..."
if grep -q "from typing import" gpt_cursor_runner/main.py; then
    echo "✅ Typing imports found in main.py"
else
    echo "❌ Typing imports missing from main.py"
fi

# Check 6: Verify block comment format
echo "💬 Checking block comment format..."
if grep -q "^##" gpt_cursor_runner/main.py; then
    echo "❌ Block comment format issues found"
else
    echo "✅ Block comment format is correct"
fi

echo "🎉 Validation completed!"
