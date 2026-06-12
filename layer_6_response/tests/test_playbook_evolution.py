import pytest
import datetime
from response_layer.models import Incident, Severity, Playbook, Action
from response_layer.playbook_evolution import PlaybookEvolutionEngine, PlaybookRepository
from response_layer.interfaces import OllamaClient, ElasticsearchClient, PostgreSQLClient
from response_layer.exceptions import PlaybookValidationError

class MockOllama(OllamaClient):
    async def generate(self, prompt: str, temperature: float, max_tokens: int) -> str:
        return '''{
  "name": "Auto-Generated-Isolation",
  "trigger_conditions": {
    "mitre_tactics": ["TA0001"]
  },
  "actions": [
    {
      "step": 1,
      "action_type": "iam_disable",
      "target": "{{affected_user}}",
      "timeout": 30,
      "rollback_action": "iam_enable",
      "critical": true
    }
  ],
  "max_execution_time": 300,
  "requires_approval": false
}'''

@pytest.mark.asyncio
async def test_generate_playbook():
    mock_db = PostgreSQLClient()
    repo = PlaybookRepository(mock_db)
    engine = PlaybookEvolutionEngine(MockOllama(), ElasticsearchClient(), repo)
    
    incident_pattern = {
        "mitre_tactics": ["TA0001"],
        "severity": "HIGH"
    }
    
    pb = await engine.generate_playbook(incident_pattern)
    assert pb is not None
    assert pb.name == "Auto-Generated-Isolation"
    assert len(pb.actions) == 1
    assert pb.actions[0].action_type == "iam_disable"

@pytest.mark.asyncio
async def test_validate_playbook_safety_failures():
    mock_db = PostgreSQLClient()
    repo = PlaybookRepository(mock_db)
    engine = PlaybookEvolutionEngine(MockOllama(), ElasticsearchClient(), repo)
    
    invalid_pb = {
        "actions": [
            {
               "step": 1,
               "action_type": "iam_delete",
               "target": "user",
               "timeout": 10,
               "rollback_action": ""
            }
        ]
    }
    
    with pytest.raises(PlaybookValidationError):
        engine._validate_playbook_safety(invalid_pb)
