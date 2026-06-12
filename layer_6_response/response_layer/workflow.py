from typing import Optional
from response_layer.models import Incident, Severity, Playbook
from response_layer.playbook_evolution import PlaybookRepository
from response_layer.orchestrator import ActionOrchestrator
from response_layer.hitl import HITLInterface, DecisionAction
from response_layer.ticketing import SmartTicketingEngine
from response_layer.logger import logger

class PlaybookMatcher:
    def __init__(self, repo: PlaybookRepository):
        self.repo = repo

    async def find_best_playbook(self, incident: Incident) -> Optional[Playbook]:
        playbooks = await self.repo.get_all()
        # Simple mock matching logic: matching MITRE tactics
        incident_tactics = {t["id"] for t in incident.mitre_tactics}
        
        best_pb = None
        best_score = -1
        
        for pb in playbooks:
            pb_tactics = set(pb.trigger_conditions.get("mitre_tactics", []))
            if pb_tactics.intersection(incident_tactics):
                if pb.confidence_score > best_score:
                    best_pb = pb
                    best_score = pb.confidence_score
                    
        return best_pb

class MITREMapper:
    def map_indicators(self, incident: Incident):
        pass # Placeholder for enriching incident with MITRE data

class SeverityWorkflowEngine:
    def __init__(self, pb_matcher: PlaybookMatcher, orchestrator: ActionOrchestrator, 
                 hitl: HITLInterface, ticketing: SmartTicketingEngine):
        self.pb_matcher = pb_matcher
        self.orchestrator = orchestrator
        self.hitl = hitl
        self.ticketing = ticketing
        self.mapper = MITREMapper()

    def _enrich_incident(self, incident: Incident):
        logger.info(f"Enriching incident {incident.id}")
        self.mapper.map_indicators(incident)

    async def process_incident(self, incident: Incident):
        logger.info(f"Processing new incident: {incident.id} with Severity {incident.cvss.severity}")
        self._enrich_incident(incident)

        if incident.cvss.severity in [Severity.CRITICAL, Severity.HIGH]:
            await self._handle_high_severity(incident)
        elif incident.cvss.severity == Severity.MEDIUM:
            await self._handle_medium_severity(incident)
        elif incident.cvss.severity in [Severity.LOW, Severity.NONE]:
            await self._handle_low_severity(incident)
        else:
            logger.warning(f"Unknown severity for incident {incident.id}")

    async def _handle_high_severity(self, incident: Incident):
        best_pb = await self.pb_matcher.find_best_playbook(incident)
        # Immediate ticket
        ticket = await self.ticketing.create_smart_ticket(incident)
        
        if best_pb:
            logger.info("Executing High Severity Automated Response")
            await self.orchestrator.execute_playbook(best_pb, incident, requires_approval=False)
        else:
            logger.warning("No playbook found for High Severity incident.")

    async def _handle_medium_severity(self, incident: Incident):
        best_pb = await self.pb_matcher.find_best_playbook(incident)
        if best_pb:
            logger.info("Queueing Medium Severity incident for Analyst Triage with recommended playbook")
            # Request approval
            approval = await self.hitl.request_approval(f"EXEC-{incident.id}", best_pb, incident)
            if approval.decision == DecisionAction.APPROVE:
                await self.orchestrator.execute_playbook(best_pb, incident, requires_approval=True)
            else:
                logger.info(f"Analyst decided not to execute playbook (decision: {approval.decision})")
        else:
            logger.info("No playbook found. Just ticketing for manual triage.")
            
        await self.ticketing.create_smart_ticket(incident)

    async def _handle_low_severity(self, incident: Incident):
        logger.info(f"Low severity incident {incident.id} logged for continuous monitoring.")
        # Minimal action, no immediate alert or automated playbook execution
