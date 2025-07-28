#!/bin/bash
while true; do
  echo "[$(date)] Checking Fly app status..." >> logs/fly-status.log
  flyctl status --app gpt-cursor-runner >> logs/fly-status.log 2>&1
  echo "---" >> logs/fly-status.log
  sleep 60
done 