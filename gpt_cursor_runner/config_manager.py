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
            "target_directory": ".",
            "preferred_editor": "code"
        },
        "slack": {
            "rate_limit_per_minute": 60,
            "enable_notifications": True,
            "default_channel": "#general"
        },
        "patches": {
            "max_patches_per_day": 100,
            "auto_apply_safe_patches": False,
            "require_author_approval": True,
            "backup_retention_days": 30
        },
        "ui": {
            "show_metrics": True,
            "show_preview": True,
            "color_output": True,
            "verbose_logging": True
        },
        "integrations": {
            "enable_git": True,
            "enable_tests": True,
            "enable_backup": True,
            "enable_metrics": True
        },
        "gpt_slack": {
            "allow_gpt_slack_posts": True,
            "gpt_authorized_routes": ["/slack/cheatblock", "/slack/help", "/slack/dashboard-ping"],
            "default_channel": "#runner-control",
            "rate_limit_per_minute": 30,
            "require_approval": False,
            "allowed_actions": ["postMessage", "updateMessage", "deleteMessage"]
        }
    }
    
    def __init__(self, config_file: str = ".patchrc"):
        self.config_file = config_file
        self.config = self.load_config()
    
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from .patchrc file."""
        config_path = Path(self.config_file)
        
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    user_config = json.load(f)
                return self._merge_config(self.DEFAULT_CONFIG, user_config)
            except Exception as e:
                print(f"Warning: Error loading config file: {e}")
                return self.DEFAULT_CONFIG.copy()
        else:
            # Create default config file
            self.save_config(self.DEFAULT_CONFIG)
            return self.DEFAULT_CONFIG.copy()
    
    def _merge_config(self, default: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        """Merge user config with defaults."""
        result = default.copy()
        
        def merge_dicts(base: Dict[str, Any], override: Dict[str, Any]):
            for key, value in override.items():
                if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                    merge_dicts(base[key], value)
                else:
                    base[key] = value
        
        merge_dicts(result, user)
        return result
    
    def save_config(self, config: Dict[str, Any] = None):
        """Save configuration to .patchrc file."""
        if config is None:
            config = self.config
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Error saving config: {e}")
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """Get configuration value by dot-separated path."""
        keys = key_path.split('.')
        value = self.config
        
        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key_path: str, value: Any):
        """Set configuration value by dot-separated path."""
        keys = key_path.split('.')
        config = self.config
        
        # Navigate to the parent of the target key
        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]
        
        # Set the value
        config[keys[-1]] = value
        self.save_config()
    
    def get_defaults(self) -> Dict[str, Any]:
        """Get default settings."""
        return self.get("defaults", {})
    
    def get_slack_config(self) -> Dict[str, Any]:
        """Get Slack configuration."""
        return self.get("slack", {})
    
    def get_patches_config(self) -> Dict[str, Any]:
        """Get patches configuration."""
        return self.get("patches", {})
    
    def get_ui_config(self) -> Dict[str, Any]:
        """Get UI configuration."""
        return self.get("ui", {})
    
    def get_integrations_config(self) -> Dict[str, Any]:
        """Get integrations configuration."""
        return self.get("integrations", {})
    
    def get_gpt_slack_config(self) -> Dict[str, Any]:
        """Get GPT Slack dispatch configuration."""
        return self.get("gpt_slack", {})
    
    def is_gpt_slack_enabled(self) -> bool:
        """Check if GPT Slack posts are enabled."""
        return self.get("gpt_slack.allow_gpt_slack_posts", True)
    
    def get_gpt_authorized_routes(self) -> list:
        """Get authorized routes for GPT Slack dispatch."""
        return self.get("gpt_slack.gpt_authorized_routes", ["/slack/cheatblock", "/slack/help", "/slack/dashboard-ping"])
    
    def get_gpt_default_channel(self) -> str:
        """Get default channel for GPT Slack posts."""
        return self.get("gpt_slack.default_channel", "#runner-control")
    
    def get_gpt_allowed_actions(self) -> list:
        """Get allowed actions for GPT Slack dispatch."""
        return self.get("gpt_slack.allowed_actions", ["postMessage", "updateMessage", "deleteMessage"])
    
    def is_auto_confirm_enabled(self) -> bool:
        """Check if auto-confirm is enabled."""
        return self.get("defaults.auto_confirm", False)
    
    def is_dry_run_default(self) -> bool:
        """Check if dry-run is the default."""
        return self.get("defaults.dry_run", True)
    
    def get_rate_limit(self) -> int:
        """Get Slack rate limit per minute."""
        return self.get("slack.rate_limit_per_minute", 10)
    
    def should_show_metrics(self) -> bool:
        """Check if metrics should be shown."""
        return self.get("ui.show_metrics", True)
    
    def should_show_preview(self) -> bool:
        """Check if preview should be shown."""
        return self.get("ui.show_preview", True)
    
    def get_target_directory(self) -> str:
        """Get default target directory."""
        return self.get("defaults.target_directory", ".")
    
    def get_preferred_editor(self) -> str:
        """Get preferred editor."""
        return self.get("defaults.preferred_editor", "code")
    
    def create_sample_config(self):
        """Create a sample .patchrc file with comments."""
        sample_config = {
            "defaults": {
                "auto_confirm": False,
                "dry_run": True,
                "backup_files": True,
                "target_directory": ".",
                "preferred_editor": "code"
            },
            "slack": {
                "rate_limit_per_minute": 10,
                "enable_notifications": True,
                "default_channel": "#general"
            },
            "patches": {
                "max_patches_per_day": 100,
                "auto_apply_safe_patches": False,
                "require_author_approval": True,
                "backup_retention_days": 30
            },
            "ui": {
                "show_metrics": True,
                "show_preview": True,
                "color_output": True,
                "verbose_logging": False
            },
            "integrations": {
                "enable_git": True,
                "enable_tests": True,
                "enable_backup": True,
                "enable_metrics": True
            }
        }
        
        self.save_config(sample_config)
        print(f"✅ Created sample configuration file: {self.config_file}")
        print("📝 Edit this file to customize your settings")

# Global instance
config_manager = ConfigManager() 