#!/bin/bash

CMD="$1"
TIMEOUT=${2:-30}

if command -v gtimeout &>/dev/null; then
  gtimeout $TIMEOUT bash -c "$CMD"
elif command -v timeout &>/dev/null; then
  timeout $TIMEOUT bash -c "$CMD"
else
  echo "⚠️ No timeout command available"
  bash -c "$CMD"
fi
