import pytest
import datetime
from response_layer.models import Incident, Severity, Playbook, Action
from response_layer.orchestrator import ActionOrchestrator

@pytest.mark.asyncio
async def test_orchestrator_success():
    incident = Incident(
        id="INC-1", summary="Test", severity=Severity.HIGH, confidence=0.9,
        source_ip="1.1.1.1", affected_user="user1", asset_id="asset1",
        mitre_tactics=[], anomaly_score=0.9, asset_criticality="High"
    )
    
    pb = Playbook(
        id="PB-1",
        name="Test",
        trigger_conditions={},
        actions=[
            Action(step=1, action_type="iam_disable", target="{{affected_user}}", timeout=30, rollback_action="iam_enable", critical=True),
            Action(step=2, action_type="edr_isolate", target="{{asset_id}}", timeout=30, rollback_action="edr_restore", critical=True)
        ],
        max_execution_time=300,
        requires_approval=False
    )
    
    orchestrator = ActionOrchestrator()
    result = await orchestrator.execute_playbook(pb, incident, requires_approval=False)
    
    assert result.success is True
    assert len(result.actions_executed) == 2
    assert result.rolled_back is False

@pytest.mark.asyncio
async def test_orchestrator_rollback():
    incident = Incident(
        id="INC-1", summary="Test", severity=Severity.HIGH, confidence=0.9,
        source_ip="1.1.1.1", affected_user="user1", asset_id="fail_user", # Triggers mock failure logic
        mitre_tactics=[], anomaly_score=0.9, asset_criticality="High"
    )
    
    pb = Playbook(
        id="PB-1",
        name="Test",
        trigger_conditions={},
        actions=[
            # Note first is EDR which will succeed
            Action(step=1, action_type="edr_isolate", target="{{asset_id}}", timeout=30, rollback_action="edr_restore", critical=True),
            # IAM will fail for fail_user
            Action(step=2, action_type="iam_disable", target="{{affected_user}}", timeout=30, rollback_action="iam_enable", critical=True)
        ],
        max_execution_time=300,
        requires_approval=False
    )
    
    # We need to hack our mock to make IAM fail for "user1"
    # Wait, in iam_executor, target == "fail_user" causes failure. So we change target to {{asset_id}} for iam for the test to fail.
    pb.actions[1].target = "{{asset_id}}" 
    
    orchestrator = ActionOrchestrator()
    result = await orchestrator.execute_playbook(pb, incident, requires_approval=False)
    
    assert result.success is False
    assert result.rolled_back is True
    assert "failed" in result.error
