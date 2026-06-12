from response_layer.models import Action, Incident
from response_layer.logger import logger

class TicketExecutor:
    async def execute(self, action: Action, incident: Incident, resolved_target: str) -> bool:
        logger.info(f"Executing Ticket action {action.action_type} for {resolved_target}...")
        import asyncio
        await asyncio.sleep(0.5)
        return True

    async def rollback(self, action: Action, incident: Incident, resolved_target: str) -> bool:
        logger.info(f"Rolling back Ticket action {action.rollback_action} for {resolved_target}...")
        import asyncio
        await asyncio.sleep(0.5)
        return True
