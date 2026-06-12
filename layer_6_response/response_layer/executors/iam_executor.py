from response_layer.models import Action, Incident
from response_layer.logger import logger

class IAMExecutor:
    async def execute(self, action: Action, incident: Incident, resolved_target: str) -> bool:
        logger.info(f"Executing IAM action {action.action_type} on {resolved_target}...")
        # Simulate API call latency
        import asyncio
        await asyncio.sleep(0.5)
        # Mock failure condition for testing
        if resolved_target == "fail_user":
            return False
        return True

    async def rollback(self, action: Action, incident: Incident, resolved_target: str) -> bool:
        logger.info(f"Rolling back IAM action {action.rollback_action} on {resolved_target}...")
        import asyncio
        await asyncio.sleep(0.5)
        return True
