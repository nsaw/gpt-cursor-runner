#!/bin/bash
mkdir -p /Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/.archive
for src in \
  "/Users/sawyer/gitSync/gpt-cursor-runner/summaries" \
  "/Users/sawyer/gitSync/tm-mobile-cursor/summaries" \
  "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/tasks/summaries/.archived" \
  "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/src-nextgen/summaries" \
  "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/tasks/summaries"
  do
    if [ -d "$src" ]; then
      find "$src" -name '*.md' -exec mv {} /Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/.archive/ \;
    fi
done 
