#!/usr/bin/env bash
# Pre-commit is already installed and configured; just run it.
set -euo pipefail
pre-commit run --all-files --hook-stage manual
