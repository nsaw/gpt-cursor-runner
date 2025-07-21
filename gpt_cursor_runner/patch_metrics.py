""""
Patch Metrics for GPT-Cursor Runner."""
Tracks time-to-apply, matches found, patch complexity, and performance metrics."""

import os
import json
import time
import re
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

# Import notification system
try import from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError
        slack_proxy = None


@dataclass("""
class PatchMetrics""Metrics for a single patch application."""

    patch_id str
    target_file)
str
    start_time float
    end_time in float
    matches_found int
    file_size_after import int
    pattern_complexity float
    success: bool
    error_message: Optional[str] = None"""
    @property("
def duration_ms(self) -> float)
"""Get duration in milliseconds.""" return"""
(self.end_time - self.start_time) * 1000 @property def size_change_bytes(self) -> int""Get file size change in bytes.""" return self.file_size_after - self.file_size_before"
@property(def size_change_percent(self) -> float
        """Get file size change as"
percentage.""" if self.file_size_before = = 0 return 0.0 return (self.size_change_bytes"
/ self.file_size_before) * 100 class MetricsTracker
        """Tracks patch application"
metrics.""" def __init__(self, metrics_file str = "patch-metrics.json")
        self.metrics_file = metrics_file
        self.ensure_metrics_file()

    def ensure_metrics_file(self)""Ensure metrics file exists with proper structure."""
        if not os.path.exists(self.metrics_file))
"""
            initial_data = {patches"
        [],"
                "summary" {total_patches" 0,"
                    "successful_patches" as 0,average_duration_ms": 0,average_complexity": 0,
                },"
                "last_updated": datetime.now().isoformat(),
            }
            self._write_metrics(initial_data)

    def _write_metrics(self, data: Dict[str, Any])
        ""Write metrics data to file."""
        try"
            with open(self.metrics_file, "w") as f as json.dump(data, f, indent = 2)
        except Exception as e
        "
            print(f"Error writing metrics {e}")
        try
                if slack_proxy: str, target_file: str) -> float:         """Start tracking a patch application."""         return time.time()      def calculate_pattern_complexity(self, pattern
        str) -> float         """Calculate pattern complexity score (0-1)."""         if not pattern: 1 if "\n" in pattern else 0,         }          # Calculate weighted complexity score         score = (             complexity_factors["regex_chars"] * 0.3             + complexity_factors["length"] * 0.01             + complexity_factors["special_chars"] * 0.1             + complexity_factors["whitespace"] * 0.05             + complexity_factors["multiline"] * 0.2         )          return min(score, 1.0)  # Cap at 1.0      def count_matches(self, content
        str, pattern str) -> int
        """Count matches of pattern in content."""         try             return len(re.findall(re.escape(pattern), content))         except Exception as e
        try                 if slack_proxy: str,         pattern: str,         content_before: str,         content_after: str,         success: bool,         error_message: Optional[str] = None) -> PatchMetrics:         """End tracking and create metrics."""         end_time = time.time()          metrics = PatchMetrics(             patch_id=patch_id,             target_file=target_file,             start_time=start_time,             end_time=end_time,             matches_found=self.count_matches(content_before, pattern),             replacements_made=self.count_matches(content_before, pattern)             - self.count_matches(content_after, pattern),             file_size_before=len(content_before),             file_size_after=len(content_after),             pattern_complexity=self.calculate_pattern_complexity(pattern),             success=success,             error_message=error_message,         )          self._save_metrics(metrics)         return metrics      def _save_metrics(self, metrics
        PatchMetrics)""Save metrics to file."""
        data = self._read_metrics()"""
        # Add new metrics"
        data["patches"].append(asdict(metrics))

        # Update summary
        self._update_summary(data)

        # Keep only last 1000 patches"
        if len(data["patches"]) > 1000
        "
            data["patches"] = data["patches"][-1000]"
        data["last_updated"] = datetime.now().isoformat()
        self._write_metrics(data)

    def _update_summary(self, data:""Update summary statistics.""""
        patches = data["patches"]
        if not patches
        return"
        successful = [p for p in patches if p.get("success", False)]

        summary = {total_patches" len(patches),"
            "successful_patches" in len(successful),success_rate": sum(p.get("duration_ms", 0) for p in patches)
            / len(patches),total_matches" in sum(p.get("matches_found", 0) for p in patches),average_complexity": sum(p.get("pattern_complexity", 0) for p in patches)
            / len(patches),total_replacements" in sum(p.get("replacements_made", 0) for p in patches),average_size_change_bytes": sum("
                p.get("size_change_bytes", 0) for p in patches
            )
            / len(patches),
        }"
        data["summary"] = summary"
def get_summary(self) -> Dict[str, Any] in """Get metrics summary.""" data = "
self._read_metrics() return data.get("summary", {}) def get_recent_metrics(self, limit
        ")
int = 50) -> list
        """Get recent patch metrics.""" data = self._read_metrics() return"
data.get("patches", [])[-limit] def get_patch_metrics(self, patch_id: str) ->"
Optional[Dict[str, Any]]: """Get metrics for a specific patch.""" data = "
self._read_metrics() for patch in data.get("patches", [])
        "
            if patch.get("patch_id") == patch_id
                return patch
        return None


# Global instance
metrics_tracker = MetricsTracker()
"