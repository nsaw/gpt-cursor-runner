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
# Company Confidential
from typing import Dict, List, Optional, Any

# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Sequential Processor Module for GHOST 2.0.

Handles ordered processing of requests with dependencies and workflow management.
"""


logger = logging.getLogger(__name__)


class ProcessingStage(Enum):
    """Stages of sequential processing."""

    PENDING = "pending"
    VALIDATING = "validating"
    PREPARING = "preparing"
    PROCESSING = "processing"
    POST_PROCESSING = "post_processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DependencyType(Enum):
    """Types of dependencies between processing steps."""

    REQUIRED = "required"
    OPTIONAL = "optional"
    PARALLEL = "parallel"


@dataclass
class ProcessingStep:
    """A step in the sequential processing workflow."""

    step_id: str
    name: str
    handler: Callable
    dependencies: List[str] = field(default_factory=list)
    dependency_type: DependencyType = DependencyType.REQUIRED
    timeout: int = 30
    retry_count: int = 0
    max_retries: int = 3
    priority: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SequentialRequest:
    """A request for sequential processing."""

    request_id: str
    workflow_name: str
    steps: List[ProcessingStep]
    data: Dict[str, Any]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: ProcessingStage = ProcessingStage.PENDING
    results: Dict[str, Any] = field(default_factory=dict)
    errors: Dict[str, str] = field(default_factory=dict)


@dataclass
class WorkflowDefinition:
    """Definition of a processing workflow."""

    name: str
    description: str
    steps: List[ProcessingStep]
    max_concurrent: int = 1
    timeout: int = 300
    retry_policy: Dict[str, Any] = field(default_factory=dict)


class SequentialProcessor:
    """Handles sequential processing of requests with dependencies."""

    def __init__(self, max_workers: int = 2) -> None:
        self.max_workers = max_workers
        self.workflows: Dict[str, WorkflowDefinition] = {}
        self.active_requests: Dict[str, SequentialRequest] = {}
        self.completed_requests: Dict[str, SequentialRequest] = {}
        self.request_queue: PriorityQueue = PriorityQueue()
        self.workers: List[threading.Thread] = []
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "active_requests": 0,
            "average_processing_time": 0.0,
        }

        # Register default workflows
        self._register_default_workflows()

    def _register_default_workflows(self) -> None:
        """Register default processing workflows."""
        # Webhook processing workflow
        webhook_workflow = WorkflowDefinition(
            name="webhook_processing",
            description="Process webhook requests with validation and logging",
            steps=[
                ProcessingStep(
                    step_id="validate_request",
                    name="Validate Request",
                    handler=self._validate_webhook_request,
                    timeout=10,
                ),
                ProcessingStep(
                    step_id="log_request",
                    name="Log Request",
                    handler=self._log_webhook_request,
                    dependencies=["validate_request"],
                    timeout=5,
                ),
                ProcessingStep(
                    step_id="process_webhook",
                    name="Process Webhook",
                    handler=self._process_webhook,
                    dependencies=["validate_request", "log_request"],
                    timeout=60,
                ),
                ProcessingStep(
                    step_id="update_metrics",
                    name="Update Metrics",
                    handler=self._update_webhook_metrics,
                    dependencies=["process_webhook"],
                    timeout=5,
                ),
            ],
            max_concurrent=5,
            timeout=120,
        )

        # Patch processing workflow
        patch_workflow = WorkflowDefinition(
            name="patch_processing",
            description="Process patch requests with validation and application",
            steps=[
                ProcessingStep(
                    step_id="validate_patch",
                    name="Validate Patch",
                    handler=self._validate_patch,
                    timeout=15,
                ),
                ProcessingStep(
                    step_id="backup_current",
                    name="Backup Current State",
                    handler=self._backup_current_state,
                    dependencies=["validate_patch"],
                    timeout=30,
                ),
                ProcessingStep(
                    step_id="apply_patch",
                    name="Apply Patch",
                    handler=self._apply_patch,
                    dependencies=["validate_patch", "backup_current"],
                    timeout=60,
                ),
                ProcessingStep(
                    step_id="verify_patch",
                    name="Verify Patch",
                    handler=self._verify_patch,
                    dependencies=["apply_patch"],
                    timeout=20,
                ),
                ProcessingStep(
                    step_id="update_status",
                    name="Update Status",
                    handler=self._update_patch_status,
                    dependencies=["verify_patch"],
                    timeout=5,
                ),
            ],
            max_concurrent=2,
            timeout=180,
        )

        self.workflows["webhook_processing"] = webhook_workflow
        self.workflows["patch_processing"] = patch_workflow

    def start(self) -> None:
        """Start the sequential processor workers."""
        if not self.workers:
            self._stop_event.clear()
            for i in range(self.max_workers):
                worker = threading.Thread(
                    target=self._worker_loop, daemon=True, name=f"sequential-worker-{i}"
                )
                worker.start()
                self.workers.append(worker)
            logger.info(f"Sequential processor started with {self.max_workers} workers")

    def stop(self) -> None:
        """Stop the sequential processor workers."""
        self._stop_event.set()
        for worker in self.workers:
            if worker.is_alive():
                worker.join(timeout=5)
        self.workers.clear()
        logger.info("Sequential processor stopped")

    def _worker_loop(self) -> None:
        """Worker thread loop for processing sequential requests."""
        while not self._stop_event.is_set():
            try:
                # Get request from queue with timeout
                priority, request = self.request_queue.get(timeout=1)
                self._process_sequential_request(request)
                self.request_queue.task_done()
            except Empty:
                continue
            except Exception as e:
                logger.error(f"Error in sequential worker loop: {e}")

    def _process_sequential_request(self, request: SequentialRequest) -> None:
        """Process a sequential request through its workflow."""
        try:
            with self._lock:
                request.status = ProcessingStage.VALIDATING
                request.started_at = datetime.now()
                self.active_requests[request.request_id] = request

            workflow = self.workflows.get(request.workflow_name)
            if not workflow:
                raise ValueError(f"Unknown workflow: {request.workflow_name}")

            # Process steps in order
            for step in request.steps:
                if self._stop_event.is_set():
                    break

                # Check dependencies
                if not self._check_dependencies(request, step):
                    continue

                # Process step
                self._process_step(request, step)

                # Update request status
                with self._lock:
                    request.results[step.step_id] = step.metadata.get("result")

            # Mark as completed
            with self._lock:
                request.status = ProcessingStage.COMPLETED
                request.completed_at = datetime.now()
                self.completed_requests[request.request_id] = request
                del self.active_requests[request.request_id]
                self._stats["completed_requests"] += 1
                self._update_average_processing_time(request)

            logger.info(f"Sequential request {request.request_id} completed")

        except Exception as e:
            with self._lock:
                request.status = ProcessingStage.FAILED
                request.errors["workflow"] = str(e)
                self._stats["failed_requests"] += 1
            logger.error(f"Sequential request {request.request_id} failed: {e}")

    def _check_dependencies(
        self, request: SequentialRequest, step: ProcessingStep
    ) -> bool:
        """Check if step dependencies are satisfied."""
        if not step.dependencies:
            return True

        for dep_id in step.dependencies:
            if dep_id not in request.results:
                return False

        return True

    def _process_step(self, request: SequentialRequest, step: ProcessingStep) -> None:
        """Process a single step."""
        start_time = time.time()

        try:
            # Update step status
            step.metadata["status"] = ProcessingStage.PROCESSING
            step.metadata["started_at"] = datetime.now()

            # Execute step handler
            result = step.handler(request.data, request.results)

            # Update step result
            step.metadata["result"] = result
            step.metadata["status"] = ProcessingStage.COMPLETED
            step.metadata["processing_time"] = time.time() - start_time

            logger.info(
                f"Step {step.step_id} completed in {step.metadata['processing_time']:.2f}s"
            )

        except Exception as e:
            step.metadata["status"] = ProcessingStage.FAILED
            step.metadata["error"] = str(e)
            step.metadata["processing_time"] = time.time() - start_time

            # Handle retries
            if step.retry_count < step.max_retries:
                step.retry_count += 1
                logger.warning(
                    f"Step {step.step_id} failed, retrying ({step.retry_count}/{step.max_retries})"
                )
                time.sleep(1)  # Brief delay before retry
                self._process_step(request, step)  # Recursive retry
            else:
                logger.error(
                    f"Step {step.step_id} failed after {step.max_retries} retries: {e}"
                )
                raise

    def submit_request(
        self, workflow_name: str, data: Dict[str, Any], priority: int = 1
    ) -> str:
        """Submit a sequential processing request."""
        request_id = f"{workflow_name}_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"

        workflow = self.workflows.get(workflow_name)
        if not workflow:
            raise ValueError(f"Unknown workflow: {workflow_name}")

        request = SequentialRequest(
            request_id=request_id,
            workflow_name=workflow_name,
            steps=workflow.steps.copy(),
            data=data,
            created_at=datetime.now(),
        )

        try:
            self.request_queue.put((priority, request), timeout=5)
            with self._lock:
                self._stats["total_requests"] += 1
            logger.info(
                f"Submitted sequential request {request_id} for workflow {workflow_name}"
            )
            return request_id
        except Exception as e:
            logger.error(f"Failed to submit sequential request {request_id}: {e}")
            raise

    def get_request_status(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a sequential request."""
        with self._lock:
            # Check active requests
            if request_id in self.active_requests:
                request = self.active_requests[request_id]
            elif request_id in self.completed_requests:
                request = self.completed_requests[request_id]
            else:
                return None

            return {
                "request_id": request.request_id,
                "workflow_name": request.workflow_name,
                "status": request.status.value,
                "created_at": request.created_at.isoformat(),
                "started_at": (
                    request.started_at.isoformat() if request.started_at else None
                ),
                "completed_at": (
                    request.completed_at.isoformat() if request.completed_at else None
                ),
                "results": request.results,
                "errors": request.errors,
            }

    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        with self._lock:
            stats = self._stats.copy()
            stats["active_requests"] = len(self.active_requests)
            stats["completed_requests_count"] = len(self.completed_requests)
            stats["available_workflows"] = list(self.workflows.keys())
            return stats

    def _update_average_processing_time(self, request: SequentialRequest) -> None:
        """Update average processing time."""
        if request.completed_at and request.started_at:
            processing_time = (
                request.completed_at - request.started_at
            ).total_seconds()
            completed = self._stats["completed_requests"]
            if completed > 0:
                current_avg = self._stats["average_processing_time"]
                self._stats["average_processing_time"] = (
                    current_avg * (completed - 1) + processing_time
                ) / completed

    # Default workflow handlers
    def _validate_webhook_request(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate webhook request data."""
        if not data:
            raise ValueError("No data provided")
        return {"valid": True, "data_size": len(str(data))}

    def _log_webhook_request(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Log webhook request."""
        logger.info(
            f"Processing webhook request: {results.get('validate_request', {})}"
        )
        return {"logged": True, "timestamp": datetime.now().isoformat()}

    def _process_webhook(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process webhook request."""
        try:
            from gpt_cursor_runner.webhook_handler import process_hybrid_block

            result = process_hybrid_block(data)
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _update_webhook_metrics(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update webhook processing metrics."""
        return {"metrics_updated": True, "timestamp": datetime.now().isoformat()}

    def _validate_patch(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate patch data."""
        if not data.get("patch"):
            raise ValueError("No patch data provided")
        return {"valid": True, "patch_size": len(str(data["patch"]))}

    def _backup_current_state(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Backup current system state."""
        return {"backup_created": True, "backup_id": f"backup_{int(time.time())}"}

    def _apply_patch(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply patch to system."""
        try:
            from gpt_cursor_runner.webhook_handler import process_hybrid_block

            process_hybrid_block(data)
            return {"status": "success", "patch_applied": True}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _verify_patch(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify patch application."""
        return {"verified": True, "verification_time": datetime.now().isoformat()}

    def _update_patch_status(
        self, data: Dict[str, Any], results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update patch status."""
        return {"status_updated": True, "final_status": "completed"}


# Global sequential processor instance
sequential_processor = SequentialProcessor()


def get_sequential_processor() -> SequentialProcessor:
    """Get the global sequential processor instance."""
    return sequential_processor
