from enum import Enum
from pydantic import BaseModel
import asyncio
from response_layer.models import Incident, Playbook
from response_layer.interfaces import RedisClient, PostgreSQLClient
from response_layer.logger import logger
from response_layer.config import settings

class DecisionAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    OVERRIDE = "override"

class ApprovalResult(BaseModel):
    decision: DecisionAction
    feedback_notes: str
    timed_out: bool = False

class HITLInterface:
    def __init__(self, redis: RedisClient, db: PostgreSQLClient):
        self.redis = redis
        self.db = db
        self.pending_approvals = {}

    async def request_approval(self, execution_id: str, playbook: Playbook, incident: Incident) -> ApprovalResult:
        logger.info(f"Requesting human approval for {execution_id} (Incident: {incident.id}, Playbook: {playbook.name})")
        
        # Publish to WS/Queue (Mock via saving state locally for wait to pick up)
        self.pending_approvals[execution_id] = None

        logger.info("Notifying analysts via WebSocket/Queue...")
        
        # Wait up to timeout
        timeout = settings.hitl_timeout_seconds  # Default 300s / 5 mins
        result = await self._wait_for_decision(execution_id, timeout)
        
        await self._record_feedback(execution_id, result, incident, playbook)
        return result

    async def _wait_for_decision(self, execution_id: str, timeout: int) -> ApprovalResult:
        logger.info(f"Waiting up to {timeout}s for decision on {execution_id}")
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            decision = self.pending_approvals.get(execution_id)
            if decision:
                return decision
            await asyncio.sleep(1) # Poll every second
            
            # Mock simulate a decision for tests
            if getattr(self, "_mock_decision", None):
                return self._mock_decision
                
        # Default to reject/manual review on timeout
        logger.warning(f"Approval for {execution_id} timed out. Defaulting to manual review.")
        return ApprovalResult(decision=DecisionAction.REJECT, feedback_notes="Timeout: Defaulted to manual review", timed_out=True)

    async def _record_feedback(self, execution_id: str, result: ApprovalResult, incident: Incident, playbook: Playbook):
        logger.info(f"Recording feedback for {execution_id}: {result.decision}")
        # Store in Postgres Database
        query = "INSERT INTO feedback (execution_id, decision, notes, incident_id, playbook_id) VALUES ($1, $2, $3, $4, $5)"
        params = (execution_id, result.decision.value, result.feedback_notes, incident.id, playbook.id)
        await self.db.execute(query, params)
