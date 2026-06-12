import json
import datetime
import asyncio
from response_layer.models import Incident
from response_layer.workflow import SeverityWorkflowEngine, PlaybookMatcher
from response_layer.playbook_evolution import PlaybookRepository
from response_layer.orchestrator import ActionOrchestrator
from response_layer.hitl import HITLInterface, ApprovalResult, DecisionAction
from response_layer.ticketing import SmartTicketingEngine
from response_layer.interfaces import PostgreSQLClient, RedisClient, JiraClient, ElasticsearchClient

async def main():
    json_input = """
{
    "cvss": {
        "vector": {
            "AV": "N",
            "AC": "L",
            "PR": "N",
            "UI": "R",
            "C": "H",
            "I": "N",
            "A": "N",
            "S": "U"
        },
        "vector_string": "AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N",
        "base_score": 6.5,
        "severity": "medium"
    }
}
"""
    data = json.loads(json_input)
    
    # Enriching our raw input with the required Incident metadata since CVSS is only part of an incident context
    incident_data = {
        "id": "INC-TEST-CVSS",
        "summary": "Incoming parsed alert test",
        "cvss": data["cvss"],
        "confidence": 0.88,
        "source_ip": "1.2.3.4",
        "affected_user": "bob@bank.com",
        "asset_id": "srv-db-01",
        "mitre_tactics": [{"id": "TA0040", "name": "Impact"}],
        "anomaly_score": 0.6,
        "asset_criticality": "HIGH"
    }

    # Deserializing via Pydantic
    try:
        incident = Incident(**incident_data)
        print(f"✅ Successfully loaded JSON into Incident Model!")
        print(f"Incident ID: {incident.id}")
        print(f"CVSS Severity: {incident.cvss.severity.value}")
        print(f"CVSS String: {incident.cvss.vector_string}")
    except Exception as e:
        print(f"Deserialization Error: {e}")
        return

    db = PostgreSQLClient()
    repo = PlaybookRepository(db)
    orchestrator = ActionOrchestrator()
    hitl = HITLInterface(RedisClient(), db)
    hitl._mock_decision = ApprovalResult(decision=DecisionAction.APPROVE, feedback_notes="Auto approved via example")
    
    ticketing = SmartTicketingEngine(JiraClient(), ElasticsearchClient())
    matcher = PlaybookMatcher(repo)
    workflow = SeverityWorkflowEngine(matcher, orchestrator, hitl, ticketing)

    print("\n--- Sending incident to the workflow engine ---")
    await workflow.process_incident(incident)

if __name__ == "__main__":
    asyncio.run(main())
