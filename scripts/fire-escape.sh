#!/bin/bash
mkdir -p _recovery && echo '[ESCAPE] Triggered. Dumping state...'
tar -czf _recovery/escape_$(date +%Y%m%d_%H%M%S).tar.gz . 
