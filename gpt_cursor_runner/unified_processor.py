#!/usr/bin/env python3
"""
Unified Processor Module for GHOST 2.0.

Handles different types of requests through a unified processing interface.
"""

import threading
import time
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
import logging
from queue import Queue, Empty

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
    timestamp: datetime = None


class UnifiedProcessor:
    """Unified processor for handling different types of requests."""
    
    def __init__(self, max_workers: int = 4, queue_size: int = 100):
        self.max_workers = max_workers
        self.request_queue: Queue = Queue(maxsize=queue_size)
        self.results: Dict[str, ProcessingResult] = {}
        self.workers: List[threading.Thread] = []
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._request_handlers: Dict[RequestType, Callable] = {}
        self._stats = {
            'total_requests': 0,
            'completed_requests': 0,
            'failed_requests': 0,
            'average_processing_time': 0.0
        }
        
        # Register default handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default request handlers."""
        self._request_handlers = {
            RequestType.WEBHOOK: self._handle_webhook,
            RequestType.PATCH: self._handle_patch,
            RequestType.SUMMARY: self._handle_summary,
            RequestType.SLACK_COMMAND: self._handle_slack_command,
            RequestType.SLACK_EVENT: self._handle_slack_event,
            RequestType.HEALTH_CHECK: self._handle_health_check,
            RequestType.RESOURCE_CHECK: self._handle_resource_check,
            RequestType.PROCESS_CHECK: self._handle_process_check
        }
    
    def start(self):
        """Start the unified processor workers."""
        if not self.workers:
            self._stop_event.clear()
            for i in range(self.max_workers):
                worker = threading.Thread(target=self._worker_loop, daemon=True, name=f"processor-{i}")
                worker.start()
                self.workers.append(worker)
            logger.info(f"Unified processor started with {self.max_workers} workers")
    
    def stop(self):
        """Stop the unified processor workers."""
        self._stop_event.set()
        for worker in self.workers:
            if worker.is_alive():
                worker.join(timeout=5)
        self.workers.clear()
        logger.info("Unified processor stopped")
    
    def _worker_loop(self):
        """Worker thread loop for processing requests."""
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
    
    def _process_request(self, request: ProcessingRequest):
        """Process a single request."""
        start_time = time.time()
        
        try:
            # Update request status
            with self._lock:
                self.results[request.request_id] = ProcessingResult(
                    request_id=request.request_id,
                    status=ProcessingStatus.PROCESSING,
                    timestamp=datetime.now()
                )
            
            # Get handler for request type
            handler = self._request_handlers.get(request.request_type)
            if not handler:
                raise ValueError(f"No handler registered for request type: {request.request_type}")
            
            # Process request
            result = handler(request.data)
            
            # Update result
            processing_time = time.time() - start_time
            with self._lock:
                self.results[request.request_id] = ProcessingResult(
                    request_id=request.request_id,
                    status=ProcessingStatus.COMPLETED,
                    result=result,
                    processing_time=processing_time,
                    timestamp=datetime.now()
                )
                self._stats['completed_requests'] += 1
                self._update_average_processing_time(processing_time)
            
            logger.info(f"Request {request.request_id} completed in {processing_time:.2f}s")
            
        except Exception as e:
            processing_time = time.time() - start_time
            error_msg = str(e)
            
            # Handle retries
            if request.retry_count < request.max_retries:
                request.retry_count += 1
                request.timestamp = datetime.now()
                self.request_queue.put(request)
                logger.warning(f"Request {request.request_id} failed, retrying ({request.retry_count}/{request.max_retries})")
            else:
                # Final failure
                with self._lock:
                    self.results[request.request_id] = ProcessingResult(
                        request_id=request.request_id,
                        status=ProcessingStatus.FAILED,
                        error=error_msg,
                        processing_time=processing_time,
                        timestamp=datetime.now()
                    )
                    self._stats['failed_requests'] += 1
                
                logger.error(f"Request {request.request_id} failed after {request.max_retries} retries: {error_msg}")
    
    def _update_average_processing_time(self, new_time: float):
        """Update average processing time."""
        completed = self._stats['completed_requests']
        if completed > 0:
            current_avg = self._stats['average_processing_time']
            self._stats['average_processing_time'] = (current_avg * (completed - 1) + new_time) / completed
    
    def submit_request(self, request_type: RequestType, data: Dict[str, Any], 
                      priority: int = 1, timeout: int = 30) -> str:
        """Submit a request for processing."""
        request_id = f"{request_type.value}_{int(time.time() * 1000)}"
        
        request = ProcessingRequest(
            request_id=request_id,
            request_type=request_type,
            data=data,
            timestamp=datetime.now(),
            priority=priority,
            timeout=timeout
        )
        
        try:
            self.request_queue.put(request, timeout=5)
            with self._lock:
                self._stats['total_requests'] += 1
            logger.info(f"Submitted request {request_id} of type {request_type.value}")
            return request_id
        except Exception as e:
            logger.error(f"Failed to submit request {request_id}: {e}")
            raise
    
    def get_result(self, request_id: str, timeout: float = 10.0) -> Optional[ProcessingResult]:
        """Get the result of a request."""
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
            stats['queue_size'] = self.request_queue.qsize()
            stats['active_workers'] = len([w for w in self.workers if w.is_alive()])
            stats['pending_requests'] = len([r for r in self.results.values() 
                                           if r.status == ProcessingStatus.PENDING])
            return stats
    
    # Request handlers
    def _handle_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle webhook requests."""
        try:
            from gpt_cursor_runner.webhook_handler import process_hybrid_block
            result = process_hybrid_block(data)
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def _handle_patch(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle patch requests."""
        try:
            from gpt_cursor_runner.webhook_handler import process_hybrid_block
            result = process_hybrid_block(data)
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def _handle_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle summary requests."""
        try:
            from gpt_cursor_runner.webhook_handler import process_summary
            result = process_summary(data)
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def _handle_slack_command(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack command requests."""
        try:
            from gpt_cursor_runner.slack_handler import handle_slack_command
            result = handle_slack_command(data)
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def _handle_slack_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack event requests."""
        try:
            from gpt_cursor_runner.slack_handler import handle_slack_event
            result = handle_slack_event(data)
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def _handle_health_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle health check requests."""
        try:
            from gpt_cursor_runner.health_aggregator import get_health_aggregator
            health_agg = get_health_aggregator()
            result = health_agg.get_health_json()
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def _handle_resource_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle resource check requests."""
        try:
            from gpt_cursor_runner.resource_monitor import get_resource_monitor
            resource_monitor = get_resource_monitor()
            result = resource_monitor.get_alerts_json()
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def _handle_process_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle process check requests."""
        try:
            from gpt_cursor_runner.process_cleanup import get_process_cleanup
            process_cleanup = get_process_cleanup()
            result = {
                'processes': process_cleanup.get_process_list(),
                'cleanup_history': process_cleanup.get_cleanup_history(),
                'stats': process_cleanup.get_stats()
            }
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def register_handler(self, request_type: RequestType, handler: Callable):
        """Register a custom handler for a request type."""
        self._request_handlers[request_type] = handler
        logger.info(f"Registered custom handler for {request_type.value}")


# Global unified processor instance
unified_processor = UnifiedProcessor()

def get_unified_processor() -> UnifiedProcessor:
    """Get the global unified processor instance."""
    return unified_processor 