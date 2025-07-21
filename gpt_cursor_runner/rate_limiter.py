#!/usr/bin/env python3
"""
Rate Limiter Module for GHOST 2.0.

Manages request rates and prevents abuse.
"""

import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


class RateLimitType(Enum):
    """Types of rate limiting."""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"


@dataclass
class RateLimitRule:
    """Rate limiting rule configuration."""
    name: str
    pattern: str
    max_requests: int
    window_seconds: int
    limit_type: RateLimitType = RateLimitType.SLIDING_WINDOW
    burst_size: int = 0
    cost_per_request: int = 1


@dataclass
class RateLimitInfo:
    """Information about rate limiting status."""
    rule_name: str
    current_requests: int
    max_requests: int
    window_seconds: int
    reset_time: datetime
    is_limited: bool
    remaining_requests: int


class RateLimiter:
    """Handles rate limiting for different request types."""
    
    def __init__(self):
        self.rules: Dict[str, RateLimitRule] = {}
        self.counters: Dict[str, Dict[str, deque]] = defaultdict(lambda: defaultdict(deque))
        self._lock = threading.Lock()
        self._cleanup_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        # Register default rate limiting rules
        self._register_default_rules()
    
    def _register_default_rules(self):
        """Register default rate limiting rules."""
        self.rules = {
            # Webhook rate limiting
            "webhook": RateLimitRule(
                name="webhook",
                pattern="webhook",
                max_requests=100,
                window_seconds=60,
                limit_type=RateLimitType.SLIDING_WINDOW
            ),
            # API rate limiting
            "api": RateLimitRule(
                name="api",
                pattern="api",
                max_requests=1000,
                window_seconds=3600,
                limit_type=RateLimitType.SLIDING_WINDOW
            ),
            # Slack rate limiting
            "slack": RateLimitRule(
                name="slack",
                pattern="slack",
                max_requests=50,
                window_seconds=60,
                limit_type=RateLimitType.SLIDING_WINDOW
            ),
            # Health check rate limiting
            "health": RateLimitRule(
                name="health",
                pattern="health",
                max_requests=10,
                window_seconds=60,
                limit_type=RateLimitType.SLIDING_WINDOW
            ),
            # Resource monitoring rate limiting
            "resources": RateLimitRule(
                name="resources",
                pattern="resources",
                max_requests=20,
                window_seconds=60,
                limit_type=RateLimitType.SLIDING_WINDOW
            ),
            # Process management rate limiting
            "processes": RateLimitRule(
                name="processes",
                pattern="processes",
                max_requests=30,
                window_seconds=60,
                limit_type=RateLimitType.SLIDING_WINDOW
            ),
            # Processor rate limiting
            "processor": RateLimitRule(
                name="processor",
                pattern="processor",
                max_requests=200,
                window_seconds=60,
                limit_type=RateLimitType.SLIDING_WINDOW
            ),
            # Sequential processor rate limiting
            "sequential": RateLimitRule(
                name="sequential",
                pattern="sequential",
                max_requests=50,
                window_seconds=60,
                limit_type=RateLimitType.SLIDING_WINDOW
            )
        }
    
    def start(self):
        """Start the rate limiter cleanup thread."""
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            self._stop_event.clear()
            self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
            self._cleanup_thread.start()
            logger.info("Rate limiter started")
    
    def stop(self):
        """Stop the rate limiter cleanup thread."""
        self._stop_event.set()
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=5)
            logger.info("Rate limiter stopped")
    
    def _cleanup_loop(self):
        """Background loop for cleaning up expired rate limit entries."""
        while not self._stop_event.is_set():
            try:
                self._cleanup_expired_entries()
            except Exception as e:
                logger.error(f"Error in rate limiter cleanup loop: {e}")
            
            # Wait before next cleanup cycle
            self._stop_event.wait(30)
    
    def _cleanup_expired_entries(self):
        """Clean up expired rate limit entries."""
        current_time = time.time()
        
        with self._lock:
            for rule_name, client_counters in self.counters.items():
                for client_id, timestamps in client_counters.items():
                    # Remove timestamps older than the window
                    rule = self.rules.get(rule_name)
                    if rule:
                        cutoff_time = current_time - rule.window_seconds
                        while timestamps and timestamps[0] < cutoff_time:
                            timestamps.popleft()
    
    def is_allowed(self, client_id: str, rule_name: str) -> Tuple[bool, RateLimitInfo]:
        """Check if a request is allowed based on rate limiting rules."""
        rule = self.rules.get(rule_name)
        if not rule:
            return True, RateLimitInfo(
                rule_name=rule_name,
                current_requests=0,
                max_requests=0,
                window_seconds=0,
                reset_time=datetime.now(),
                is_limited=False,
                remaining_requests=0
            )
        
        current_time = time.time()
        
        with self._lock:
            # Get or create counter for this client and rule
            timestamps = self.counters[rule_name][client_id]
            
            # Clean up old timestamps
            cutoff_time = current_time - rule.window_seconds
            while timestamps and timestamps[0] < cutoff_time:
                timestamps.popleft()
            
            # Check if request is allowed
            current_requests = len(timestamps)
            is_allowed = current_requests < rule.max_requests
            
            if is_allowed:
                # Add current timestamp
                timestamps.append(current_time)
            
            # Calculate reset time
            reset_time = datetime.fromtimestamp(current_time + rule.window_seconds)
            
            rate_limit_info = RateLimitInfo(
                rule_name=rule_name,
                current_requests=current_requests,
                max_requests=rule.max_requests,
                window_seconds=rule.window_seconds,
                reset_time=reset_time,
                is_limited=not is_allowed,
                remaining_requests=max(0, rule.max_requests - current_requests)
            )
            
            if not is_allowed:
                logger.warning(f"Rate limit exceeded for {client_id} on {rule_name}: {current_requests}/{rule.max_requests}")
            
            return is_allowed, rate_limit_info
    
    def get_rate_limit_info(self, client_id: str, rule_name: str) -> Optional[RateLimitInfo]:
        """Get rate limit information for a client and rule."""
        rule = self.rules.get(rule_name)
        if not rule:
            return None
        
        current_time = time.time()
        
        with self._lock:
            timestamps = self.counters[rule_name][client_id]
            
            # Clean up old timestamps
            cutoff_time = current_time - rule.window_seconds
            while timestamps and timestamps[0] < cutoff_time:
                timestamps.popleft()
            
            current_requests = len(timestamps)
            reset_time = datetime.fromtimestamp(current_time + rule.window_seconds)
            
            return RateLimitInfo(
                rule_name=rule_name,
                current_requests=current_requests,
                max_requests=rule.max_requests,
                window_seconds=rule.window_seconds,
                reset_time=reset_time,
                is_limited=current_requests >= rule.max_requests,
                remaining_requests=max(0, rule.max_requests - current_requests)
            )
    
    def add_rule(self, rule: RateLimitRule):
        """Add a new rate limiting rule."""
        with self._lock:
            self.rules[rule.name] = rule
        logger.info(f"Added rate limiting rule: {rule.name}")
    
    def remove_rule(self, rule_name: str):
        """Remove a rate limiting rule."""
        with self._lock:
            if rule_name in self.rules:
                del self.rules[rule_name]
                # Clean up counters for this rule
                if rule_name in self.counters:
                    del self.counters[rule_name]
        logger.info(f"Removed rate limiting rule: {rule_name}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiter statistics."""
        with self._lock:
            total_clients = sum(len(clients) for clients in self.counters.values())
            total_rules = len(self.rules)
            active_limits = sum(
                1 for rule_clients in self.counters.values()
                for client_timestamps in rule_clients.values()
                if len(client_timestamps) > 0
            )
            
            return {
                'total_rules': total_rules,
                'total_clients': total_clients,
                'active_limits': active_limits,
                'rules': list(self.rules.keys())
            }
    
    def reset_client(self, client_id: str, rule_name: str = None):
        """Reset rate limiting for a client."""
        with self._lock:
            if rule_name:
                if rule_name in self.counters and client_id in self.counters[rule_name]:
                    self.counters[rule_name][client_id].clear()
            else:
                # Reset all rules for this client
                for rule_clients in self.counters.values():
                    if client_id in rule_clients:
                        rule_clients[client_id].clear()
        
        logger.info(f"Reset rate limiting for client {client_id}")


# Global rate limiter instance
rate_limiter = RateLimiter()

def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance."""
    return rate_limiter