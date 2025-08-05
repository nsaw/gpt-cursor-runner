#!/bin/bash
# Self-Healing
PORTS=(4040 5051)
CMDS=("npm run tunnel" "npm run patch-runner")
for i in ${!PORTS[@]}; do
  lsof -i:${PORTS[$i]} >/dev/null 2>&1 || {
    echo "[HEAL] Restarting ${CMDS[$i]}..."
    eval "${CMDS[$i]} &"
  }
done 