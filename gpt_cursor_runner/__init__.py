"""
GPT-Cursor Runner Package.

A production-ready CLI tool and webhook microservice for handling GPT-generated code patches.
"""

__version__ = "0.2.0"
__author__ = "GPT-Cursor Runner Team"

# Import main components
from .main import app, main
from .patch_runner import apply_patch, load_latest_patch
from .event_logger import EventLogger, event_logger
from .patch_viewer import list_patches, view_patch
from .event_viewer import main as event_viewer_main

__all__ = [
    "app",
    "main",
    "apply_patch",
    "load_latest_patch",
    "EventLogger",
    "event_logger",
    "list_patches",
    "view_patch",
    "event_viewer_main",
]
