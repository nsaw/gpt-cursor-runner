"""
Patch Metrics for GPT-Cursor Runner.
Tracks time-to-apply, matches found, patch complexity, and performance metrics.
"""

import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class PatchMetrics:
    """Metrics for a single patch."""

    patch_id: str
    timestamp: datetime
    apply_time_ms: int
    complexity_score: int
    file_count: int
    line_count: int
    success: bool
    error_message: Optional[str] = None
    validation_time_ms: Optional[int] = None
    rollback_time_ms: Optional[int] = None


@dataclass
class PerformanceMetrics:
    """Performance metrics for the system."""

    total_patches: int
    successful_patches: int
    failed_patches: int
    average_apply_time_ms: float
    average_complexity: float
    total_files_modified: int
    total_lines_modified: int
    uptime_hours: float
    last_patch_time: Optional[datetime] = None


class PatchMetricsTracker:
    """Tracks and analyzes patch metrics."""

    def __init__(self, metrics_file: str = "patch_metrics.json"):
        self.metrics_file = metrics_file
        self.metrics: List[PatchMetrics] = []
        self.start_time = datetime.now()
        self.load_metrics()

    def start_patch(self, patch_id: str) -> str:
        """Start tracking a patch and return tracking ID."""
        return f"{patch_id}_{int(time.time())}"

    def record_patch_metrics(
        self,
        patch_id: str,
        apply_time_ms: int,
        complexity_score: int,
        file_count: int,
        line_count: int,
        success: bool,
        error_message: Optional[str] = None,
        validation_time_ms: Optional[int] = None,
        rollback_time_ms: Optional[int] = None,
    ) -> None:
        """Record metrics for a completed patch."""
        metrics = PatchMetrics(
            patch_id=patch_id,
            timestamp=datetime.now(),
            apply_time_ms=apply_time_ms,
            complexity_score=complexity_score,
            file_count=file_count,
            line_count=line_count,
            success=success,
            error_message=error_message,
            validation_time_ms=validation_time_ms,
            rollback_time_ms=rollback_time_ms,
        )

        self.metrics.append(metrics)
        self.save_metrics()

    def get_performance_metrics(self, hours: int = 24) -> PerformanceMetrics:
        """Get performance metrics for the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [m for m in self.metrics if m.timestamp >= cutoff_time]

        if not recent_metrics:
            return PerformanceMetrics(
                total_patches=0,
                successful_patches=0,
                failed_patches=0,
                average_apply_time_ms=0.0,
                average_complexity=0.0,
                total_files_modified=0,
                total_lines_modified=0,
                uptime_hours=self.get_uptime_hours(),
            )

        successful = [m for m in recent_metrics if m.success]
        failed = [m for m in recent_metrics if not m.success]

        total_apply_time = sum(m.apply_time_ms for m in recent_metrics)
        total_complexity = sum(m.complexity_score for m in recent_metrics)
        total_files = sum(m.file_count for m in recent_metrics)
        total_lines = sum(m.line_count for m in recent_metrics)

        return PerformanceMetrics(
            total_patches=len(recent_metrics),
            successful_patches=len(successful),
            failed_patches=len(failed),
            average_apply_time_ms=total_apply_time / len(recent_metrics),
            average_complexity=total_complexity / len(recent_metrics),
            total_files_modified=total_files,
            total_lines_modified=total_lines,
            uptime_hours=self.get_uptime_hours(),
            last_patch_time=(
                max(m.timestamp for m in recent_metrics) if recent_metrics else None
            ),
        )

    def get_patch_history(self, patch_id: str) -> List[PatchMetrics]:
        """Get history for a specific patch ID."""
        return [m for m in self.metrics if m.patch_id == patch_id]

    def get_success_rate(self, hours: int = 24) -> float:
        """Get success rate for the specified time period."""
        metrics = self.get_performance_metrics(hours)
        if metrics.total_patches == 0:
            return 0.0
        return metrics.successful_patches / metrics.total_patches

    def get_average_apply_time(self, hours: int = 24) -> float:
        """Get average apply time for the specified time period."""
        metrics = self.get_performance_metrics(hours)
        return metrics.average_apply_time_ms

    def get_complexity_trend(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get complexity trend over time."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [m for m in self.metrics if m.timestamp >= cutoff_time]

        # Group by hour
        hourly_data = {}
        for metric in recent_metrics:
            hour_key = metric.timestamp.replace(minute=0, second=0, microsecond=0)
            if hour_key not in hourly_data:
                hourly_data[hour_key] = []
            hourly_data[hour_key].append(metric.complexity_score)

        # Calculate averages
        trend = []
        for hour, scores in sorted(hourly_data.items()):
            trend.append(
                {
                    "timestamp": hour.isoformat(),
                    "average_complexity": sum(scores) / len(scores),
                    "patch_count": len(scores),
                }
            )

        return trend

    def get_error_analysis(self, hours: int = 24) -> Dict[str, int]:
        """Analyze error patterns."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [
            m
            for m in self.metrics
            if m.timestamp >= cutoff_time and not m.success and m.error_message
        ]

        error_counts = {}
        for metric in recent_metrics:
            error_type = self._categorize_error(metric.error_message)
            error_counts[error_type] = error_counts.get(error_type, 0) + 1

        return error_counts

    def _categorize_error(self, error_message: str) -> str:
        """Categorize error message into error type."""
        error_lower = error_message.lower()

        if any(word in error_lower for word in ["syntax", "parse", "invalid"]):
            return "syntax_error"
        elif any(word in error_lower for word in ["import", "module", "package"]):
            return "import_error"
        elif any(word in error_lower for word in ["permission", "access", "denied"]):
            return "permission_error"
        elif any(word in error_lower for word in ["timeout", "time out"]):
            return "timeout_error"
        elif any(word in error_lower for word in ["network", "connection", "http"]):
            return "network_error"
        else:
            return "other_error"

    def get_uptime_hours(self) -> float:
        """Get system uptime in hours."""
        uptime = datetime.now() - self.start_time
        return uptime.total_seconds() / 3600

    def save_metrics(self) -> None:
        """Save metrics to file."""
        try:
            data = {
                "start_time": self.start_time.isoformat(),
                "metrics": [asdict(m) for m in self.metrics],
            }
            with open(self.metrics_file, "w") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Warning: Could not save metrics: {e}")

    def load_metrics(self) -> None:
        """Load metrics from file."""
        try:
            with open(self.metrics_file, "r") as f:
                data = json.load(f)

            self.start_time = datetime.fromisoformat(data["start_time"])
            self.metrics = []

            for metric_data in data["metrics"]:
                # Convert timestamp string back to datetime
                metric_data["timestamp"] = datetime.fromisoformat(
                    metric_data["timestamp"]
                )
                if metric_data.get("last_patch_time"):
                    metric_data["last_patch_time"] = datetime.fromisoformat(
                        metric_data["last_patch_time"]
                    )

                self.metrics.append(PatchMetrics(**metric_data))
        except FileNotFoundError:
            # File doesn't exist yet, start fresh
            pass
        except Exception as e:
            print(f"Warning: Could not load metrics: {e}")

    def clear_metrics(self) -> None:
        """Clear all metrics."""
        self.metrics = []
        self.save_metrics()

    def export_metrics(self, format: str = "json") -> str:
        """Export metrics in specified format."""
        if format == "json":
            return json.dumps([asdict(m) for m in self.metrics], indent=2, default=str)
        elif format == "csv":
            import csv
            import io

            output = io.StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow(
                [
                    "patch_id",
                    "timestamp",
                    "apply_time_ms",
                    "complexity_score",
                    "file_count",
                    "line_count",
                    "success",
                    "error_message",
                ]
            )

            # Write data
            for metric in self.metrics:
                writer.writerow(
                    [
                        metric.patch_id,
                        metric.timestamp.isoformat(),
                        metric.apply_time_ms,
                        metric.complexity_score,
                        metric.file_count,
                        metric.line_count,
                        metric.success,
                        metric.error_message or "",
                    ]
                )

            return output.getvalue()
        else:
            raise ValueError(f"Unsupported format: {format}")


# Global instance
metrics_tracker = PatchMetricsTracker()
