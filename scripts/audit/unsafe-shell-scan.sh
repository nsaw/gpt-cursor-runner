#!/bin/bash

echo '🔍 Scanning for unsafe shell usage...'

grep -rE '\b(exec|spawn|execSync|spawnSync)\b' ./scripts | grep -v 'spawnSafe' || echo '✅ No unsafe patterns found' 