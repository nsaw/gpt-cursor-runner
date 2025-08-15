# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
import logging
import threading
import time
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
from queue import Queue, Empty
from typing import Dict, List, Optional, Any, Callable

# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Unified Processor Module for GHOST 2.0.

Handles different types of requests through a unified processing interface.
"""


logger = logging.getLogger(__name__)


class RequestType(Enum):
    """Types of requests that can be processed."""

    WEBHOOK = "webhook"
    PATCH = "patch"
    SUMMARY = "summary"
    SLACK_COMMAND = "slack_command"
    SLACK_EVENT = "slack_event"
    HEALTH_CHECK = "health_check"
    RESOURCE_CHECK = "resource_check"
    PROCESS_CHECK = "process_check"


class ProcessingStatus(Enum):
    """Status of request processing."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class ProcessingRequest:
    """A request to be processed."""

    request_id: str
    request_type: RequestType
    data: Dict[str, Any]
    timestamp: datetime
    priority: int = 1
    timeout: int = 30
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class ProcessingResult:
    """Result of request processing."""

    request_id: str
    status: ProcessingStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time: float = 0.0
    timestamp: Optional[datetime] = None


class UnifiedProcessor:
    """Unified processor for handling different types of requests."""

    def __init__(self, max_workers: int = 4, queue_size: int = 100) -> None:
        self.max_workers: int = max_workers
        self.request_queue: Queue[ProcessingRequest] = Queue(maxsize=queue_size)
        self.results: Dict[str, ProcessingResult] = {}
        self.workers: List[threading.Thread] = []
        self._stop_event: threading.Event = threading.Event()
        self._lock: threading.Lock = threading.Lock()
        self._request_handlers: Dict[
            RequestType, Callable[[Dict[str, Any]], Dict[str, Any]]
        ] = {}
        self._stats: Dict[str, Any] = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "average_processing_time": 0.0,
        }

        # Register default handlers
        self._register_default_handlers()

    def _register_default_handlers(self) -> None:
        """Register default request handlers."""
        self._request_handlers = {
            RequestType.WEBHOOK: self._handle_webhook,
            RequestType.PATCH: self._handle_patch,
            RequestType.SUMMARY: self._handle_summary,
            RequestType.SLACK_COMMAND: self._handle_slack_command,
            RequestType.SLACK_EVENT: self._handle_slack_event,
            RequestType.HEALTH_CHECK: self._handle_health_check,
            RequestType.RESOURCE_CHECK: self._handle_resource_check,
            RequestType.PROCESS_CHECK: self._handle_process_check,
        }

    def start(self) -> None:
        """Start the unified processor."""
        logger.info("Starting unified processor")
        self._stop_event.clear()

        # Start worker threads
        for i in range(self.max_workers):
            worker = threading.Thread(
                target=self._worker_loop, name=f"worker-{i}", daemon=True
            )
            worker.start()
            self.workers.append(worker)

        logger.info(f"Started {self.max_workers} worker threads")

    def stop(self) -> None:
        """Stop the unified processor."""
        logger.info("Stopping unified processor")
        self._stop_event.set()

        # Wait for workers to finish
        for worker in self.workers:
            worker.join(timeout=5)

        logger.info("Unified processor stopped")

    def _worker_loop(self) -> None:
        """Main worker loop for processing requests."""
        while not self._stop_event.is_set():
            try:
                # Get request from queue with timeout
                request = self.request_queue.get(timeout=1)
                self._process_request(request)
                self.request_queue.task_done()
            except Empty:
                continue
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")

    def _process_request(self, request: ProcessingRequest) -> None:
        """Process a single request."""
        start_time = time.time()
        logger.info(f"Processing request {request.request_id}")

        try:
            # Get handler for request type
            handler = self._request_handlers.get(request.request_type)
            if not handler:
                raise ValueError(f"No handler for request type: {request.request_type}")

            # Process request
            result = handler(request.data)

            # Create success result
            processing_result = ProcessingResult(
                request_id=request.request_id,
                status=ProcessingStatus.COMPLETED,
                result=result,
                processing_time=time.time() - start_time,
                timestamp=datetime.now(),
            )

        except Exception as e:
            logger.error(f"Error processing request {request.request_id}: {e}")

            # Create failure result
            processing_result = ProcessingResult(
                request_id=request.request_id,
                status=ProcessingStatus.FAILED,
                error=str(e),
                processing_time=time.time() - start_time,
                timestamp=datetime.now(),
            )

        # Store result
        with self._lock:
            self.results[request.request_id] = processing_result
            self._stats["total_requests"] += 1

            if processing_result.status == ProcessingStatus.COMPLETED:
                self._stats["completed_requests"] += 1
            else:
                self._stats["failed_requests"] += 1

            self._update_average_processing_time(processing_result.processing_time)

        logger.info(f"Completed request {request.request_id}")

    def _update_average_processing_time(self, new_time: float) -> None:
        """Update average processing time."""
        total_requests = self._stats["total_requests"]
        current_avg = self._stats["average_processing_time"]

        # Calculate new average
        new_avg = (current_avg * (total_requests - 1) + new_time) / total_requests
        self._stats["average_processing_time"] = new_avg

    def submit_request(
        self,
        request_type: RequestType,
        data: Dict[str, Any],
        priority: int = 1,
        timeout: int = 30,
    ) -> str:
        """Submit a request for processing."""
        import uuid

        request_id = str(uuid.uuid4())
        request = ProcessingRequest(
            request_id=request_id,
            request_type=request_type,
            data=data,
            timestamp=datetime.now(),
            priority=priority,
            timeout=timeout,
        )

        # Add to queue
        self.request_queue.put(request)
        logger.info(f"Submitted request {request_id}")

        return request_id

    def get_result(
        self, request_id: str, timeout: float = 10.0
    ) -> Optional[ProcessingResult]:
        """Get result for a request."""
        start_time = time.time()

        while time.time() - start_time < timeout:
            with self._lock:
                if request_id in self.results:
                    return self.results[request_id]
            time.sleep(0.1)

        return None

    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        with self._lock:
            stats = self._stats.copy()
            stats["queue_size"] = self.request_queue.qsize()
            stats["active_workers"] = len([w for w in self.workers if w.is_alive()])
            stats["timestamp"] = datetime.now().isoformat()
            return stats

    def _handle_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle webhook requests."""
        logger.info("Processing webhook request")
        return {"status": "webhook_processed", "data": data}

    def _handle_patch(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle patch requests."""
        logger.info("Processing patch request")
        return {"status": "patch_processed", "data": data}

    def _handle_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle summary requests."""
        logger.info("Processing summary request")
        return {"status": "summary_processed", "data": data}

    def _handle_slack_command(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack command requests."""
        logger.info("Processing Slack command request")
        return {"status": "slack_command_processed", "data": data}

    def _handle_slack_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack event requests."""
        logger.info("Processing Slack event request")
        return {"status": "slack_event_processed", "data": data}

    def _handle_health_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle health check requests."""
        logger.info("Processing health check request")
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "stats": self.get_stats(),
        }

    def _handle_resource_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle resource check requests."""
        logger.info("Processing resource check request")
        import psutil

        return {
            "status": "resource_check_complete",
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage("/").percent,
        }

    def _handle_process_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle process check requests."""
        logger.info("Processing process check request")
        return {
            "status": "process_check_complete",
            "active_processes": len(self.workers),
            "queue_size": self.request_queue.qsize(),
        }

    def register_handler(
        self,
        request_type: RequestType,
        handler: Callable[[Dict[str, Any]], Dict[str, Any]],
    ) -> None:
        """Register a custom handler for a request type."""
        self._request_handlers[request_type] = handler
        logger.info(f"Registered custom handler for {request_type}")


# Global instance
_unified_processor: Optional[UnifiedProcessor] = None


def get_unified_processor() -> UnifiedProcessor:
    """Get the global unified processor instance."""
    global _unified_processor
    if _unified_processor is None:
        _unified_processor = UnifiedProcessor()
    return _unified_processor
