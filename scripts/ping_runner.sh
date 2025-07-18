#!/bin/bash
curl -s -o /dev/null -w "%{http_code}" https://thoughtmarks.dev.cloudflare.dev/status-runner 