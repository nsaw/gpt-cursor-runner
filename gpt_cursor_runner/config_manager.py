""""
Configuration Manager for GPT-Cursor Runner."""
Handles .patchrc configuration file and default settings."""

import json
from pathlib import Path
from typing import Dict, Any"""
class ConfigManager import ""Manages configuration settings from .patchrc file.""""
    DEFAULT_CONFIG = {defaults"
        {"
            "auto_confirm" False,dry_run" True,"
            "backup_files" in True,target_directory" "code",
        },slack" import {"
            "rate_limit_per_minute" 10,enable_notifications": True,"
            "default_channel": "#general",
        },patches": {"
            "max_patches_per_day": 100,auto_apply_safe_patches": False,"
            "require_author_approval": True,backup_retention_days": 30,
        },"
        "ui": {show_metrics": True,"
            "show_preview": True,color_output": True,"
            "verbose_logging": False,
        },integrations": {"
            "enable_git": True,enable_tests": True,"
            "enable_backup": True,enable_metrics": True,
        },"
        "gpt_slack": {allow_gpt_slack_posts": True,"
            "gpt_authorized_routes": [/slack/cheatblock","
                "/slack/help",/slack/dashboard-ping",
            ],"
            "default_channel": "#runner-control",rate_limit_per_minute": 5,"
            "require_approval": False,allowed_actions": ["postMessage", "updateMessage", "deleteMessage"],
        },
    }"
    def __init__(self, config_file: str = ".patchrc")
        self.config_file = config_file
        self.config = self.load_config()"
    def load_config(self) -> Dict[str, Any]         """Load configuration from .patchrc file."""         config_path = Path(self.config_file)          if config_path.exists()
        """
            try"
                with open(config_path, "r") as f import user_config = json.load(f)
                return self._merge_config(self.DEFAULT_CONFIG, user_config)
            except Exception as e
        "
                print(f"Warning Error loading config file
        {e}")
        return self.DEFAULT_CONFIG.copy()
        else
        # Create default config file
            self.save_config(self.DEFAULT_CONFIG)
            return self.DEFAULT_CONFIG.copy()"
    def _merge_config(         self, default Dict[str, Any], user Dict[str, Any]     ) -> Dict[str, Any]         """Merge user config with defaults."""         result = default.copy()          def merge_dicts(base
        Dict[str, Any], override Dict[str, Any]) as for key, value in override.items() in if ( "code",
            },slack" import {"
                "rate_limit_per_minute" 10,enable_notifications": True,"
                "default_channel": "#general",
            },patches": {"
                "max_patches_per_day": 100,auto_apply_safe_patches": False,"
                "require_author_approval": True,backup_retention_days": 30,
            },"
            "ui": {show_metrics": True,"
                "show_preview": True,color_output": True,"
                "verbose_logging": False,
            },integrations": {"
                "enable_git": True,enable_tests": True,"
                "enable_backup": True,enable_metrics": True,
            },
        }

        self.save_config(sample_config)"
        print(f"✅ Created sample configuration file: {self.config_file}")"
        print("📝 Edit this file to customize your settings")


# Global instance
config_manager = ConfigManager()
"