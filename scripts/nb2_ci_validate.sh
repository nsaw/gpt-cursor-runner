#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"
mkdir -p summaries
SUMMARY="summaries/nb2-ci-validate-$(date +%Y%m%d-%H%M%S).md"

have_ts=false
have_eslint=false
have_tests=false

[[ -f tsconfig.json ]] && have_ts=true
grep -q '"eslint"' package.json 2>/dev/null && have_eslint=true || true
grep -q '"test"' package.json 2>/dev/null && have_tests=true || true

pass=true

{
  echo "# NB-2.0 CI Validate"
  echo
  if $have_ts; then
    echo "## TypeScript — tsc --noEmit"
    if timeout 30s npx tsc --noEmit; then echo "- PASS"; else echo "- FAIL"; pass=false; fi
    echo
  else
    echo "## TypeScript"; echo "- SKIP (no tsconfig.json)"; echo
  fi

  if $have_eslint; then
    echo "## ESLint"
    if timeout 30s npx eslint . --ext .ts,.tsx,.js --max-warnings=0; then echo "- PASS"; else echo "- FAIL"; pass=false; fi
    echo
  else
    echo "## ESLint"; echo "- SKIP (eslint not detected in package.json)"; echo
  fi

  if $have_tests; then
    echo "## Unit Tests"
    if timeout 30s npm run -s test -- --watchAll=false || timeout 30s yarn test --watchAll=false; then echo "- PASS"; else echo "- FAIL"; pass=false; fi
    echo
  else
    echo "## Unit Tests"; echo "- SKIP (no test script)"; echo
  fi

  echo "RESULT: $($pass && echo PASS || echo FAIL)"
} > "$SUMMARY"

$pass
