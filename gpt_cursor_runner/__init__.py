"""
GPT-Cursor Runner

A Flask-based webhook handler for processing GPT-generated hybrid blocks 
and saving them as JSON patches.
"""

__version__ = "0.1.0"
__author__ = "Sawyer"

from .main import app, run_server
from .webhook_handler import process_hybrid_block

__all__ = ["app", "run_server", "process_hybrid_block"] 