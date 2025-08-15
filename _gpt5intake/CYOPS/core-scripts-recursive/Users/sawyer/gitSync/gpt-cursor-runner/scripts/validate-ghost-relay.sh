#!/bin/bash

echo "=== Ghost Relay Validation ===" > summaries/_ghost-relay-validation.log

# Test local ghost relay
echo "Testing local ghost relay..." >> summaries/_ghost-relay-validation.log
LOCAL_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health)
echo "Local ghost status code: $LOCAL_STATUS" >> summaries/_ghost-relay-validation.log

if [ "$LOCAL_STATUS" = "200" ]; then
  echo '✅ Local ghost relay operational.' >> summaries/_ghost-relay-validation.log
else
  echo '❌ Local ghost relay failed!' >> summaries/_ghost-relay-validation.log
fi

# Test external ghost relay
echo "Testing external ghost relay..." >> summaries/_ghost-relay-validation.log
EXTERNAL_STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://runner.thoughtmarks.app/health)
echo "External ghost status code: $EXTERNAL_STATUS" >> summaries/_ghost-relay-validation.log

if [ "$EXTERNAL_STATUS" = "200" ]; then
  echo '✅ External ghost relay operational.' >> summaries/_ghost-relay-validation.log
else
  echo '❌ External ghost relay failed!' >> summaries/_ghost-relay-validation.log
fi

# Check tunnel status
echo "Checking tunnel status..." >> summaries/_ghost-relay-validation.log
if command -v cloudflared &> /dev/null; then
  echo "Cloudflare tunnel found" >> summaries/_ghost-relay-validation.log
else
  echo "Cloudflare tunnel not found" >> summaries/_ghost-relay-validation.log
fi

# Overall status
if [ "$LOCAL_STATUS" = "200" ]; then
  echo '✅ Ghost relay validation: LOCAL OPERATIONAL' >> summaries/_ghost-relay-validation.log
  if [ "$EXTERNAL_STATUS" = "200" ]; then
    echo '✅ Ghost relay validation: FULLY OPERATIONAL' >> summaries/_ghost-relay-validation.log
  else
    echo '⚠️ Ghost relay validation: LOCAL ONLY (tunnel issue)' >> summaries/_ghost-relay-validation.log
  fi
else
  echo '❌ Ghost relay validation: FAILED' >> summaries/_ghost-relay-validation.log
fi

echo "Validation complete at $(date)" >> summaries/_ghost-relay-validation.log 
