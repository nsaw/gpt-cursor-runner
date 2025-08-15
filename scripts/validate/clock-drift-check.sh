# Check clock drift
drift=$(curl -s timeapi.io/api/Time/current/zone?timeZone=America/Los_Angeles | jq '.milliseconds_since_epoch')
epoch=$(date +%s%3N)
delta=$((epoch - drift))
[[ ${delta#-} -lt 60000 ]] || echo "[DRIFT] Warning: ${delta}ms" 
