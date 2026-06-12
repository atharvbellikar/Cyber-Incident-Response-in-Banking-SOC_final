import json
from typing import List, Dict, Any
from response_layer.models import Incident, Ticket
from response_layer.interfaces import JiraClient, ElasticsearchClient
from response_layer.logger import logger

class SmartTicketingEngine:
    def __init__(self, jira: JiraClient, es: ElasticsearchClient):
        self.jira = jira
        self.es = es

    async def create_smart_ticket(self, incident: Incident) -> Ticket:
        logger.info(f"Creating smart ticket for incident: {incident.id}")
        related = await self._find_related_incidents(incident)
        iocs = self._extract_iocs(incident)
        desc = self._format_ticket_description(incident, related, iocs)
        
        issue_type = "Incident"
        custom_fields = {
            "severity": incident.cvss.severity.value,
            "asset_criticality": incident.asset_criticality
        }
        
        jira_resp = await self.jira.create_ticket(
            summary=f"[{incident.cvss.severity.value.upper()}] {incident.summary}",
            description=desc,
            issue_type=issue_type,
            custom_fields=custom_fields
        )
        
        return Ticket(
            ticket_id=jira_resp["key"],
            incident_id=incident.id,
            status="Open"
        )

    async def _find_related_incidents(self, incident: Incident) -> List[Dict[str, Any]]:
        # Mock ES query to find similar incidents
        return []

    def _extract_iocs(self, incident: Incident) -> List[str]:
        iocs = []
        if incident.source_ip:
            iocs.append(f"IP: {incident.source_ip}")
        return iocs

    def _format_ticket_description(self, incident: Incident, related: List[dict], iocs: List[str]) -> str:
        mitre_links = "\n".join([f"- [{t['id']}] {t.get('name', '')}" for t in incident.mitre_tactics])
        iocs_str = "\n".join([f"- {ioc}" for ioc in iocs])
        
        return f"""
h2. Incident Details
*ID:* {incident.id}
*Affected User:* {incident.affected_user}
*Asset:* {incident.asset_id}
*Criticality:* {incident.asset_criticality}

h3. MITRE ATT&CK Mapping
{mitre_links}

h3. IOCs
{iocs_str}

h3. Anomaly Data
Confidence: {incident.confidence}
Anomaly Score: {incident.anomaly_score}
"""
