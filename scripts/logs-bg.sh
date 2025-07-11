#!/bin/bash

# Redirect fly logs to background + file
cmd="flyctl logs --app gpt-cursor-runner --region iad"
echo "[$(date)] Starting background logs..." >> logs/flyctl-latest.log
($cmd >> logs/flyctl-latest.log 2>&1 &) & 