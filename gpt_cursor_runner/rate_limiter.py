"""
Rate Limiter for GPT-Cursor Runner.

Prevents spam and abuse from Slack commands and webhooks.
"""

import time
import threading
from collections import defaultdict, deque
from typing import Dict, Any, Optional


class RateLimiter:
    """Rate limiter for API endpoints and Slack commands."""

    def __init__(self):
        self.limits = {
            "slack_command": {"requests": 10, "window": 60},  # 10 requests per minute
            "slack_webhook": {"requests": 30, "window": 60},  # 30 requests per minute
            "patch_creation": {"requests": 20, "window": 60},  # 20 patches per minute
            "patch_application": {
                "requests": 5,
                "window": 60,
            },  # 5 applications per minute
            "api_request": {
                "requests": 100,
                "window": 60,
            },  # 100 API requests per minute
        }
        self.requests = defaultdict(lambda: deque())
        self.lock = threading.Lock()

    def is_allowed(self, key: str, limit_type: str = "api_request") -> bool:
        """Check if request is allowed based on rate limits."""
        with self.lock:
            now = time.time()
            limit = self.limits.get(limit_type, self.limits["api_request"])
            window = limit["window"]
            max_requests = limit["requests"]

            # Clean old requests outside the window
            while self.requests[key] and self.requests[key][0] < now - window:
                self.requests[key].popleft()

            # Check if we're under the limit
            if len(self.requests[key]) < max_requests:
                self.requests[key].append(now)
                return True

            return False

    def get_remaining_requests(self, key: str, limit_type: str = "api_request") -> int:
        """Get remaining requests for a key."""
        with self.lock:
            now = time.time()
            limit = self.limits.get(limit_type, self.limits["api_request"])
            window = limit["window"]
            max_requests = limit["requests"]

            # Clean old requests
            while self.requests[key] and self.requests[key][0] < now - window:
                self.requests[key].popleft()

            return max(0, max_requests - len(self.requests[key]))

    def get_reset_time(
        self, key: str, limit_type: str = "api_request"
    ) -> Optional[float]:
        """Get time when rate limit resets for a key."""
        with self.lock:
            if not self.requests[key]:
                return None

            limit = self.limits.get(limit_type, self.limits["api_request"])
            window = limit["window"]

            return self.requests[key][0] + window

    def is_slack_command_allowed(self, user_id: str) -> bool:
        """Check if Slack command is allowed for user."""
        return self.is_allowed(f"slack_user_{user_id}", "slack_command")

    def is_slack_webhook_allowed(self, channel_id: str) -> bool:
        """Check if Slack webhook is allowed for channel."""
        return self.is_allowed(f"slack_channel_{channel_id}", "slack_webhook")

    def is_patch_creation_allowed(self, user_id: str) -> bool:
        """Check if patch creation is allowed for user."""
        return self.is_allowed(f"patch_user_{user_id}", "patch_creation")

    def is_patch_application_allowed(self, user_id: str) -> bool:
        """Check if patch application is allowed for user."""
        return self.is_allowed(f"apply_user_{user_id}", "patch_application")

    def get_slack_rate_limit_info(self, user_id: str) -> Dict[str, Any]:
        """Get rate limit info for Slack user."""
        remaining = self.get_remaining_requests(
            f"slack_user_{user_id}", "slack_command"
        )
        reset_time = self.get_reset_time(f"slack_user_{user_id}", "slack_command")

        return {
            "remaining": remaining,
            "reset_time": reset_time,
            "limit": self.limits["slack_command"]["requests"],
            "window": self.limits["slack_command"]["window"],
        }

    def create_rate_limit_response(
        self, key: str, limit_type: str = "api_request"
    ) -> Dict[str, Any]:
        """Create a rate limit response."""
        remaining = self.get_remaining_requests(key, limit_type)
        reset_time = self.get_reset_time(key, limit_type)

        if reset_time is None:
            message = "Rate limit exceeded. Try again later."
        else:
            message = (
                f"Rate limit exceeded. Try again in {int(reset_time - time.time())} "
                "seconds."
            )

        return {
            "error": "rate_limit_exceeded",
            "message": message,
            "remaining": remaining,
            "reset_time": reset_time,
            "limit": self.limits[limit_type]["requests"],
            "window": self.limits[limit_type]["window"],
        }


class SlackRateLimiter:
    """Specialized rate limiter for Slack interactions."""

    def __init__(self):
        self.rate_limiter = RateLimiter()
        self.user_cooldowns = {}  # Track user cooldowns for repeated commands

    def check_command_rate_limit(self, user_id: str, command: str) -> Dict[str, Any]:
        """Check rate limit for Slack command."""
        # Check general rate limit
        if not self.rate_limiter.is_slack_command_allowed(user_id):
            return {
                "allowed": False,
                "reason": "rate_limit_exceeded",
                "info": self.rate_limiter.get_slack_rate_limit_info(user_id),
            }

        # Check command-specific cooldown
        cooldown_key = f"{user_id}_{command}"
        now = time.time()

        if cooldown_key in self.user_cooldowns:
            last_time = self.user_cooldowns[cooldown_key]
            cooldown_period = 5  # 5 seconds between same command

            if now - last_time < cooldown_period:
                return {
                    "allowed": False,
                    "reason": "cooldown",
                    "message": (
                        f"Please wait {int(cooldown_period - (now - last_time))} "
                        "seconds before using this command again."
                    ),
                }

        # Update cooldown
        self.user_cooldowns[cooldown_key] = now

        return {"allowed": True}

    def check_webhook_rate_limit(self, channel_id: str) -> Dict[str, Any]:
        """Check rate limit for Slack webhook."""
        if not self.rate_limiter.is_slack_webhook_allowed(channel_id):
            return {
                "allowed": False,
                "reason": "rate_limit_exceeded",
                "info": self.rate_limiter.create_rate_limit_response(
                    f"slack_channel_{channel_id}", "slack_webhook"
                ),
            }

        return {"allowed": True}

    def get_rate_limit_headers(self, user_id: str) -> Dict[str, str]:
        """Get rate limit headers for API responses."""
        info = self.rate_limiter.get_slack_rate_limit_info(user_id)

        return {
            "X-RateLimit-Remaining": str(info["remaining"]),
            "X-RateLimit-Reset": (
                str(int(info["reset_time"])) if info["reset_time"] else "0"
            ),
            "X-RateLimit-Limit": str(info["limit"]),
        }


# Global instances
rate_limiter = RateLimiter()
slack_rate_limiter = SlackRateLimiter()
