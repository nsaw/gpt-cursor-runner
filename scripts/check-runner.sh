#!/bin/bash
(sleep 1 && curl -s http://localhost:5051/health || echo "Runner not running") > /dev/null 2>&1 & 