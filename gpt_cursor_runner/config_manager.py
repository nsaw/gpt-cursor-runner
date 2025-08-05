"""
Configuration Manager for GPT-Cursor Runner.
Handles .patchrc configuration file and default settings.
"""

import json
from pathlib import Path
from typing import Dict, Any


class ConfigManager:
    """Manages configuration settings from .patchrc file."""

    DEFAULT_CONFIG = {
        "defaults": {
            "auto_confirm": False,
            "dry_run": True,
            "backup_files": True,
            "target_directory": "code",
        },
        "slack": {
            "rate_limit_per_minute": 10,
            "enable_notifications": True,
            "default_channel": "#general",
        },
        "patches": {
            "max_patches_per_day": 100,
            "auto_apply_safe_patches": False,
            "require_author_approval": True,
            "backup_retention_days": 30,
        },
        "ui": {
            "show_metrics": True,
            "show_preview": True,
            "color_output": True,
            "verbose_logging": False,
        },
        "integrations": {
            "enable_git": True,
            "enable_tests": True,
            "enable_backup": True,
            "enable_metrics": True,
        },
        "gpt_slack": {
            "allow_gpt_slack_posts": True,
            "gpt_authorized_routes": [
                "/slack/cheatblock",
                "/slack/help",
                "/slack/dashboard-ping",
            ],
            "default_channel": "#runner-control",
            "rate_limit_per_minute": 5,
            "require_approval": False,
            "allowed_actions": ["postMessage", "updateMessage", "deleteMessage"],
        },
    }

    def __init__(self, config_file: str = ".patchrc"):
        self.config_file = config_file
        self.config = self.load_config()

    def load_config(self) -> Dict[str, Any]:
        """Load configuration from .patchrc file."""
        config_path = Path(self.config_file)
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    user_config = json.load(f)
                return self._merge_config(self.DEFAULT_CONFIG, user_config)
            except Exception as e:
                print(f"Warning: Error loading config file: {e}")
                return self.DEFAULT_CONFIG.copy()
        else:
            # Create default config file
            self.save_config(self.DEFAULT_CONFIG)
            return self.DEFAULT_CONFIG.copy()

    def _merge_config(
        self, default: Dict[str, Any], user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge user config with defaults."""
        result = default.copy()

        def merge_dicts(base: Dict[str, Any], override: Dict[str, Any]):
            for key, value in override.items():
                if (
                    key in base
                    and isinstance(base[key], dict)
                    and isinstance(value, dict)
                ):
                    merge_dicts(base[key], value)
                else:
                    base[key] = value

        merge_dicts(result, user)
        return result

    def save_config(self, config: Dict[str, Any]) -> None:
        """Save configuration to .patchrc file."""
        try:
            with open(self.config_file, "w") as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Error saving config file: {e}")

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by key."""
        keys = key.split(".")
        value = self.config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value

    def set(self, key: str, value: Any) -> None:
        """Set configuration value by key."""
        keys = key.split(".")
        config = self.config
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        config[keys[-1]] = value
        self.save_config(self.config)

    def is_gpt_slack_enabled(self) -> bool:
        """Check if GPT Slack dispatch is enabled."""
        return self.get("gpt_slack.allow_gpt_slack_posts", True)

    def get_gpt_default_channel(self) -> str:
        """Get default GPT Slack channel."""
        return self.get("gpt_slack.default_channel", "#runner-control")

    def get_slack_rate_limit(self) -> int:
        """Get Slack rate limit per minute."""
        return self.get("slack.rate_limit_per_minute", 10)

    def is_auto_confirm_enabled(self) -> bool:
        """Check if auto-confirm is enabled."""
        return self.get("defaults.auto_confirm", False)

    def is_dry_run_enabled(self) -> bool:
        """Check if dry-run mode is enabled."""
        return self.get("defaults.dry_run", True)

    def get_target_directory(self) -> str:
        """Get target directory for patches."""
        return self.get("defaults.target_directory", "code")

    def get_max_patches_per_day(self) -> int:
        """Get maximum patches per day limit."""
        return self.get("patches.max_patches_per_day", 100)

    def is_backup_enabled(self) -> bool:
        """Check if backup is enabled."""
        return self.get("integrations.enable_backup", True)

    def is_git_enabled(self) -> bool:
        """Check if Git integration is enabled."""
        return self.get("integrations.enable_git", True)

    def is_tests_enabled(self) -> bool:
        """Check if tests are enabled."""
        return self.get("integrations.enable_tests", True)

    def is_metrics_enabled(self) -> bool:
        """Check if metrics are enabled."""
        return self.get("integrations.enable_metrics", True)

    def is_verbose_logging_enabled(self) -> bool:
        """Check if verbose logging is enabled."""
        return self.get("ui.verbose_logging", False)

    def create_sample_config(self) -> None:
        """Create a sample configuration file."""
        sample_config = {
            "defaults": {
                "auto_confirm": False,
                "dry_run": True,
                "backup_files": True,
                "target_directory": "code",
            },
            "slack": {
                "rate_limit_per_minute": 10,
                "enable_notifications": True,
                "default_channel": "#general",
            },
            "patches": {
                "max_patches_per_day": 100,
                "auto_apply_safe_patches": False,
                "require_author_approval": True,
                "backup_retention_days": 30,
            },
            "ui": {
                "show_metrics": True,
                "show_preview": True,
                "color_output": True,
                "verbose_logging": False,
            },
            "integrations": {
                "enable_git": True,
                "enable_tests": True,
                "enable_backup": True,
                "enable_metrics": True,
            },
        }

        self.save_config(sample_config)
        print(f"✅ Created sample configuration file: {self.config_file}")
        print("📝 Edit this file to customize your settings")


# Global instance
config_manager = ConfigManager()
