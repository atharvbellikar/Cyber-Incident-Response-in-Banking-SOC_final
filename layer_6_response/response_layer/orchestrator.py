import asyncio
import time
from typing import List, Dict, Any, Optional
from response_layer.models import Playbook, Incident, Action, ExecutionResult, ActionResult
from response_layer.logger import logger
from response_layer.exceptions import ActionExecutionError, RollbackError
from response_layer.executors.iam_executor import IAMExecutor
from response_layer.executors.edr_executor import EDRExecutor
from response_layer.executors.firewall_executor import FirewallExecutor
from response_layer.executors.ticket_executor import TicketExecutor

class ExecutionStateManager:
    def __init__(self):
        self.state: List[ActionResult] = []

    def record_success(self, action: Action, details: str, exec_time: float):
        self.state.append(ActionResult(action=action, success=True, details=details, execution_time=exec_time))

    def record_failure(self, action: Action, details: str, exec_time: float):
        self.state.append(ActionResult(action=action, success=False, details=details, execution_time=exec_time))

    def get_executed_actions(self) -> List[ActionResult]:
        return self.state


class ActionOrchestrator:
    def __init__(self):
        self.executors = {
            "iam": IAMExecutor(),
            "edr": EDRExecutor(),
            "firewall": FirewallExecutor(),
            "ticket": TicketExecutor(),
        }

    def _resolve_action_variables(self, action: Action, incident: Incident) -> str:
        """Replace {{variables}} in target."""
        target = action.target
        for field, value in incident.model_dump().items():
            token = f"{{{{{field}}}}}"
            if token in target:
                target = target.replace(token, str(value))
        return target

    def _get_executor(self, action_type: str):
        prefix = action_type.split("_")[0]
        return self.executors.get(prefix)

    async def _execute_single_action(self, action: Action, incident: Incident) -> ActionResult:
        start_time = time.time()
        resolved_target = self._resolve_action_variables(action, incident)
        executor = self._get_executor(action.action_type)
        
        if not executor:
            return ActionResult(
                action=action, 
                success=False, 
                details=f"No executor found for {action.action_type}", 
                execution_time=time.time() - start_time
            )

        try:
            # 30s timeout per action
            success = await asyncio.wait_for(executor.execute(action, incident, resolved_target), timeout=action.timeout)
            exec_time = time.time() - start_time
            return ActionResult(action=action, success=success, details="Executed" if success else "Execution returned False", execution_time=exec_time)
        except asyncio.TimeoutError:
            exec_time = time.time() - start_time
            return ActionResult(action=action, success=False, details="Action timed out", execution_time=exec_time)
        except Exception as e:
            exec_time = time.time() - start_time
            return ActionResult(action=action, success=False, details=str(e), execution_time=exec_time)

    async def _rollback_execution(self, execution_state: ExecutionStateManager, incident: Incident) -> bool:
        logger.info("Initiating rollback procedure for past actions...")
        # Rollback in reverse order
        actions_to_rollback = [res.action for res in reversed(execution_state.get_executed_actions()) if res.success]
        
        all_rolled_back = True
        for action in actions_to_rollback:
            executor = self._get_executor(action.rollback_action)
            resolved_target = self._resolve_action_variables(action, incident)
            if not executor:
                logger.error(f"Cannot rollback {action.action_type}: No executor for {action.rollback_action}")
                all_rolled_back = False
                continue
                
            try:
                # Generous timeout for rollbacks
                success = await asyncio.wait_for(executor.rollback(action, incident, resolved_target), timeout=60)
                if not success:
                    all_rolled_back = False
            except Exception as e:
                logger.error(f"Rollback failed for {action.rollback_action}: {str(e)}")
                all_rolled_back = False
                
        return all_rolled_back

    async def execute_playbook(self, playbook: Playbook, incident: Incident, requires_approval: bool) -> ExecutionResult:
        logger.info(f"Starting execution of playbook {playbook.id} for incident {incident.id}")
        start_time = time.time()
        state_mgr = ExecutionStateManager()
        
        # We assume approval checking is handled by the caller/router.
        if requires_approval:
            logger.info("Playbook execution required approval, assuming granted here.")

        # Sort actions by step
        sorted_actions = sorted(playbook.actions, key=lambda a: a.step)
        
        for action in sorted_actions:
            result = await self._execute_single_action(action, incident)
            
            if result.success:
                state_mgr.record_success(action, result.details, result.execution_time)
            else:
                state_mgr.record_failure(action, result.details, result.execution_time)
                logger.warning(f"Action {action.step} ({action.action_type}) failed: {result.details}")
                
                if action.critical:
                    logger.error("Critical action failed, halting playbook execution and rolling back.")
                    rolled_back = await self._rollback_execution(state_mgr, incident)
                    return ExecutionResult(
                        playbook_id=playbook.id,
                        incident_id=incident.id,
                        success=False,
                        actions_executed=state_mgr.get_executed_actions(),
                        total_execution_time=time.time() - start_time,
                        error=f"Critical action {action.action_type} failed",
                        rolled_back=rolled_back
                    )
                else:
                    logger.info("Action was not critical, continuing execution...")

        total_time = time.time() - start_time
        return ExecutionResult(
            playbook_id=playbook.id,
            incident_id=incident.id,
            success=True,
            actions_executed=state_mgr.get_executed_actions(),
            total_execution_time=total_time
        )
