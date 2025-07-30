#!/usr/bin/env python3
"""
CORS Configuration Module for GHOST 2.0.

Handles cross-origin resource sharing configuration.
"""

import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
import logging
import re

logger = logging.getLogger(__name__)


class CorsPolicy(Enum):
    """CORS policy types."""
    ALLOW_ALL = "allow_all"
    RESTRICTED = "restricted"
    WHITELIST = "whitelist"
    BLACKLIST = "blacklist"


@dataclass
class CorsRule:
    """CORS rule configuration."""
    origin: str
    methods: List[str]
    headers: List[str]
    credentials: bool = False
    max_age: int = 86400
    enabled: bool = True


@dataclass
class CorsConfig:
    """CORS configuration."""
    policy: CorsPolicy = CorsPolicy.RESTRICTED
    allow_credentials: bool = False
    max_age: int = 86400
    allowed_origins: Set[str] = None
    allowed_methods: Set[str] = None
    allowed_headers: Set[str] = None
    exposed_headers: Set[str] = None
    rules: Dict[str, CorsRule] = None


class CorsManager:
    """Manages CORS configuration and validation."""
    
    def __init__(self, config: CorsConfig = None):
        self.config = config or CorsConfig()
        self.request_history: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self._cleanup_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        # Initialize default configuration
        self._initialize_default_config()
        
        # Start cleanup thread
        self.start()
    
    def _initialize_default_config(self):
        """Initialize default CORS configuration."""
        if self.config.allowed_origins is None:
            self.config.allowed_origins = {
                'http://localhost:3000',
                'http://localhost:8080',
                'http://localhost:8081',
                'http://localhost:8082',
                'http://localhost:8083',
                'https://slack.com',
                'https://hooks.slack.com',
                'https://webhook-thoughtmarks.thoughtmarks.app',
                'https://thoughtmarks.app',
                'https://*.thoughtmarks.app'
            }
        
        if self.config.allowed_methods is None:
            self.config.allowed_methods = {
                'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'
            }
        
        if self.config.allowed_headers is None:
            self.config.allowed_headers = {
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'Accept',
                'Origin',
                'Access-Control-Request-Method',
                'Access-Control-Request-Headers'
            }
        
        if self.config.exposed_headers is None:
            self.config.exposed_headers = {
                'X-Total-Count',
                'X-Page-Count',
                'X-Current-Page'
            }
        
        if self.config.rules is None:
            self.config.rules = {}
    
    def start(self):
        """Start the CORS manager cleanup thread."""
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            self._stop_event.clear()
            self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
            self._cleanup_thread.start()
            logger.info("CORS manager started")
    
    def stop(self):
        """Stop the CORS manager cleanup thread."""
        self._stop_event.set()
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=5)
            logger.info("CORS manager stopped")
    
    def _cleanup_loop(self):
        """Background loop for CORS cleanup."""
        while not self._stop_event.is_set():
            try:
                self._cleanup_old_requests()
            except Exception as e:
                logger.error(f"Error in CORS cleanup loop: {e}")
            
            # Wait before next cleanup cycle
            self._stop_event.wait(3600)  # Run every hour
    
    def _cleanup_old_requests(self):
        """Clean up old request history."""
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        with self._lock:
            self.request_history = [
                req for req in self.request_history 
                if req['timestamp'] > cutoff_time
            ]
        
        logger.info("Cleaned up old CORS request history")
    
    def validate_request(self, origin: str, method: str, headers: List[str] = None) -> Dict[str, Any]:
        """Validate a CORS request."""
        timestamp = datetime.now()
        
        # Check policy
        if self.config.policy == CorsPolicy.ALLOW_ALL:
            allowed = True
            reason = "Policy allows all origins"
        elif self.config.policy == CorsPolicy.RESTRICTED:
            allowed = self._check_restricted_policy(origin, method, headers)
            reason = "Restricted policy check"
        elif self.config.policy == CorsPolicy.WHITELIST:
            allowed = origin in self.config.allowed_origins
            reason = "Whitelist policy check"
        elif self.config.policy == CorsPolicy.BLACKLIST:
            allowed = origin not in self.config.allowed_origins
            reason = "Blacklist policy check"
        else:
            allowed = False
            reason = "Unknown policy"
        
        # Record request
        request_record = {
            'timestamp': timestamp,
            'origin': origin,
            'method': method,
            'headers': headers or [],
            'allowed': allowed,
            'reason': reason
        }
        
        with self._lock:
            self.request_history.append(request_record)
        
        # Generate CORS headers
        cors_headers = self._generate_cors_headers(origin, method, headers) if allowed else {}
        
        return {
            'allowed': allowed,
            'reason': reason,
            'headers': cors_headers,
            'timestamp': timestamp.isoformat()
        }
    
    def _check_restricted_policy(self, origin: str, method: str, headers: List[str] = None) -> bool:
        """Check restricted CORS policy."""
        # Check origin
        if origin not in self.config.allowed_origins:
            return False
        
        # Check method
        if method not in self.config.allowed_methods:
            return False
        
        # Check headers
        if headers:
            for header in headers:
                if header not in self.config.allowed_headers:
                    return False
        
        return True
    
    def _generate_cors_headers(self, origin: str, method: str, headers: List[str] = None) -> Dict[str, str]:
        """Generate CORS headers for allowed request."""
        cors_headers = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': ', '.join(self.config.allowed_methods),
            'Access-Control-Allow-Headers': ', '.join(self.config.allowed_headers),
            'Access-Control-Expose-Headers': ', '.join(self.config.exposed_headers),
            'Access-Control-Max-Age': str(self.config.max_age)
        }
        
        if self.config.allow_credentials:
            cors_headers['Access-Control-Allow-Credentials'] = 'true'
        
        return cors_headers
    
    def add_allowed_origin(self, origin: str):
        """Add an allowed origin."""
        with self._lock:
            self.config.allowed_origins.add(origin)
        logger.info(f"Added allowed origin: {origin}")
    
    def remove_allowed_origin(self, origin: str):
        """Remove an allowed origin."""
        with self._lock:
            self.config.allowed_origins.discard(origin)
        logger.info(f"Removed allowed origin: {origin}")
    
    def add_allowed_method(self, method: str):
        """Add an allowed method."""
        with self._lock:
            self.config.allowed_methods.add(method.upper())
        logger.info(f"Added allowed method: {method}")
    
    def remove_allowed_method(self, method: str):
        """Remove an allowed method."""
        with self._lock:
            self.config.allowed_methods.discard(method.upper())
        logger.info(f"Removed allowed method: {method}")
    
    def add_allowed_header(self, header: str):
        """Add an allowed header."""
        with self._lock:
            self.config.allowed_headers.add(header)
        logger.info(f"Added allowed header: {header}")
    
    def remove_allowed_header(self, header: str):
        """Remove an allowed header."""
        with self._lock:
            self.config.allowed_headers.discard(header)
        logger.info(f"Removed allowed header: {header}")
    
    def add_cors_rule(self, rule: CorsRule):
        """Add a CORS rule."""
        with self._lock:
            self.config.rules[rule.origin] = rule
        logger.info(f"Added CORS rule for origin: {rule.origin}")
    
    def remove_cors_rule(self, origin: str):
        """Remove a CORS rule."""
        with self._lock:
            if origin in self.config.rules:
                del self.config.rules[origin]
        logger.info(f"Removed CORS rule for origin: {origin}")
    
    def get_request_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get CORS request history."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self._lock:
            recent_history = [
                req for req in self.request_history 
                if req['timestamp'] > cutoff_time
            ]
        
        return [
            {
                'timestamp': req['timestamp'].isoformat(),
                'origin': req['origin'],
                'method': req['method'],
                'headers': req['headers'],
                'allowed': req['allowed'],
                'reason': req['reason']
            }
            for req in recent_history
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get CORS statistics."""
        with self._lock:
            total_requests = len(self.request_history)
            allowed_requests = len([req for req in self.request_history if req['allowed']])
            blocked_requests = total_requests - allowed_requests
            
            # Count by origin
            origin_counts = {}
            for req in self.request_history:
                origin = req['origin']
                origin_counts[origin] = origin_counts.get(origin, 0) + 1
            
            # Count by method
            method_counts = {}
            for req in self.request_history:
                method = req['method']
                method_counts[method] = method_counts.get(method, 0) + 1
        
        return {
            'total_requests': total_requests,
            'allowed_requests': allowed_requests,
            'blocked_requests': blocked_requests,
            'policy': self.config.policy.value,
            'allowed_origins_count': len(self.config.allowed_origins),
            'allowed_methods_count': len(self.config.allowed_methods),
            'allowed_headers_count': len(self.config.allowed_headers),
            'origin_counts': origin_counts,
            'method_counts': method_counts,
            'rules_count': len(self.config.rules)
        }
    
    def update_policy(self, policy: CorsPolicy):
        """Update CORS policy."""
        with self._lock:
            self.config.policy = policy
        logger.info(f"Updated CORS policy to: {policy.value}")
    
    def enable_credentials(self):
        """Enable credentials in CORS."""
        with self._lock:
            self.config.allow_credentials = True
        logger.info("Enabled CORS credentials")
    
    def disable_credentials(self):
        """Disable credentials in CORS."""
        with self._lock:
            self.config.allow_credentials = False
        logger.info("Disabled CORS credentials")
    
    def set_max_age(self, max_age: int):
        """Set CORS max age."""
        with self._lock:
            self.config.max_age = max_age
        logger.info(f"Set CORS max age to: {max_age}")
    
    def clear_request_history(self):
        """Clear request history."""
        with self._lock:
            self.request_history.clear()
        logger.info("Cleared CORS request history")


# Global CORS manager instance
cors_manager = CorsManager()

def get_cors_manager() -> CorsManager:
    """Get the global CORS manager instance."""
    return cors_manager 