# ThoughtPilot-AI Free Tier

## Overview
ThoughtPilot-AI Free Tier provides a powerful CLI for running GPT patches locally in your terminal. Perfect for solo developers and offline/local-only workflows.

## Features
- **CLI Interface**: Run GPT patches directly from your terminal
- **Local Patches**: Execute patches without external dependencies
- **Offline Support**: Work completely offline with local models
- **Simple Setup**: Minimal configuration required

## Quick Start

### Installation
```bash
pip install -e .
```

### Basic Usage
```bash
# Run a patch locally
python -m gpt_cursor_runner.main --patch path/to/patch.json

# Apply patches to files
python -m gpt_cursor_runner.apply_patch --target file.tsx --patch patch.json
```

### Configuration
Copy `env.example` to `.env` and configure:
```bash
cp env.example .env
# Edit .env with your settings
```

## CLI Commands

### Main Runner
```bash
python -m gpt_cursor_runner.main [options]
```

### Patch Application
```bash
python -m gpt_cursor_runner.apply_patch [options]
```

### Patch Viewer
```bash
python -m gpt_cursor_runner.patch_viewer [options]
```

## File Structure
```
Free/
├── gpt_cursor_runner/     # Core CLI package
├── tests/                 # Test suite
├── requirements.txt       # Python dependencies
├── setup.py             # Package setup
├── pyproject.toml       # Project configuration
├── env.example          # Environment template
└── README.md           # This file
```

## Limitations
- Local execution only
- No Slack integration
- No hosted dashboard
- No multi-user support
- No audit logs

## Support
For support, visit: https://thoughtmarks.app

## License
MIT License - see LICENSE file for details.

---

**Upgrade to Pro** for Slack integration and hosted dashboard features! 