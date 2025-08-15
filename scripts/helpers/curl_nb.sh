#!/usr/bin/env bash
url="$1"; label="$2"; t=${3:-30}
( if curl --silent --max-time "$t" "$url" 2>/dev/null | grep -q '.'; then
    echo "✅ $label ok ($url)"
  else
    echo "❌ $label fail ($url)"
  fi ) &
PID=$!
sleep "$t"
disown $PID 2>/dev/null || true
