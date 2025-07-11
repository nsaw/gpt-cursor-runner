#!/bin/bash
# Monitor log changes and summarize
while true; do 
    tail -n 10 logs/flyctl-latest.log > logs/log-summary.txt; 
    sleep 30; 
done & 