# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- UI Dashboard for real-time monitoring
- Enhanced Slack integration with patch previews
- Automated GitHub releases
- Improved patch metrics and status reporting

### Changed

- Updated version to 0.2.0
- Enhanced Slack command handling with rich responses
- Improved error handling and logging

### Fixed

- Import issues in main application
- Dashboard integration
- Slack command response formatting

## [0.1.0] - 2025-01-06

### Added

- Initial release of GPT-Cursor Runner
- Flask webhook handler for GPT hybrid blocks
- Slack integration with slash commands
- Event logging and monitoring
- Patch runner with safety checks
- Configuration management with .patchrc
- Rate limiting for Slack commands
- Patch metrics tracking
- Role-based patch classification
- Patch reversion capabilities
- Comprehensive test suite
- GitHub Actions CI/CD pipeline

### Features

- Webhook endpoint for receiving GPT hybrid blocks
- Slack slash commands: `/patch`, `/patch-preview`, `/patch-status`
- Real-time event logging and monitoring
- Patch application with backup creation
- Safety checks for dangerous patterns
- JSON schema validation for patches
- Rate limiting to prevent spam
- Configuration management
- Metrics tracking for patch performance
- Role-based patch classification
- Patch reversion and backup management
