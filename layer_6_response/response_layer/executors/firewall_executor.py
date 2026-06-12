from response_layer.models import Action, Incident
from response_layer.logger import logger

class FirewallExecutor:
    async def execute(self, action: Action, incident: Incident, resolved_target: str) -> bool:
        logger.info(f"Executing Firewall action {action.action_type} on {resolved_target}...")
        import asyncio
        await asyncio.sleep(0.5)
        return True

    async def rollback(self, action: Action, incident: Incident, resolved_target: str) -> bool:
        logger.info(f"Rolling back Firewall action {action.rollback_action} on {resolved_target}...")
        import asyncio
        await asyncio.sleep(0.5)
        return True
