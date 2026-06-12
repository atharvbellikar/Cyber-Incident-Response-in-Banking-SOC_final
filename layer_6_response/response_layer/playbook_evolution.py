import json
import time
from typing import List, Dict, Any, Optional
from response_layer.models import Playbook, PlaybookStatus, Incident
from response_layer.interfaces import OllamaClient, ElasticsearchClient, PostgreSQLClient
from response_layer.logger import logger
from response_layer.exceptions import PlaybookValidationError

class PlaybookRepository:
    def __init__(self, db: PostgreSQLClient):
        self.db = db
        # In-memory mock for now
        self.playbooks: Dict[str, Playbook] = {}

    async def save(self, playbook: Playbook):
        self.playbooks[playbook.id] = playbook
        logger.info(f"Saved playbook {playbook.id}")

    async def get(self, playbook_id: str) -> Optional[Playbook]:
        return self.playbooks.get(playbook_id)

    async def get_all(self) -> List[Playbook]:
        return list(self.playbooks.values())


class PlaybookEvolutionEngine:
    def __init__(self, ollama: OllamaClient, es: ElasticsearchClient, repo: PlaybookRepository):
        self.ollama = ollama
        self.es = es
        self.repo = repo

    def _build_generation_prompt(self, incident_pattern: dict, historical_examples: list) -> str:
        prompt = f"""You are a cybersecurity automation expert generating incident response playbooks.

INCIDENT PATTERN:
- MITRE Tactics: {incident_pattern.get('mitre_tactics')}
- Indicators: {incident_pattern.get('indicators')}
- Affected Assets: {incident_pattern.get('affected_assets')}
- Severity: {incident_pattern.get('severity')}

HISTORICAL SUCCESSFUL RESPONSES:
{json.dumps(historical_examples, indent=2)}

Generate a response playbook in JSON format:
{{
  "name": "descriptive_name",
  "trigger_conditions": {{
    "mitre_tactics": ["TA0001"],
    "severity_threshold": "high",
    "confidence_min": 0.85
  }},
  "actions": [
    {{
      "step": 1,
      "action_type": "iam_disable",
      "target": "{{{{affected_user}}}}",
      "timeout": 30,
      "rollback_action": "iam_enable",
      "critical": true
    }}
  ],
  "max_execution_time": 600,
  "requires_approval": false
}}

CRITICAL CONSTRAINTS:
- All actions must be reversible
- No data deletion allowed
- Maximum 5 actions per playbook
- Execution time < 10 minutes

PLAYBOOK JSON:"""
        return prompt

    def _validate_playbook_safety(self, pb_dict: dict):
        if len(pb_dict.get("actions", [])) > 5:
            raise PlaybookValidationError("Maximum 5 actions allowed")
        if pb_dict.get("max_execution_time", 0) > 600:
            raise PlaybookValidationError("Max execution time cannot exceed 600 seconds")
        
        for action in pb_dict.get("actions", []):
            if "delete" in action.get("action_type", "").lower() or "terminate" in action.get("action_type", "").lower():
                raise PlaybookValidationError(f"Destructive action not allowed: {action.get('action_type')}")
            if not action.get("rollback_action"):
                raise PlaybookValidationError(f"Rollback required for action: {action.get('action_type')}")
        
        triggers = pb_dict.get("trigger_conditions", {})
        if not triggers.get("mitre_tactics"):
            raise PlaybookValidationError("Must have at least one MITRE tactic specified in triggers")

    async def generate_playbook(self, incident_pattern: dict) -> Playbook:
        logger.info(f"Generating playbook for pattern: {incident_pattern}")
        # Fetch similar historical incidents from ES mock
        historical = await self.es.search("incidents", {"query": {"match_all": {}}})
        
        prompt = self._build_generation_prompt(incident_pattern, historical.get("hits", {}).get("hits", []))
        
        # Max try 3 times for valid JSON formatting from LLM
        for attempt in range(3):
            try:
                response = await self.ollama.generate(prompt=prompt, temperature=0.2, max_tokens=1000)
                # Parse JSON
                # Sometimes LLMs include markdown block ```json ... ```
                if "```json" in response:
                    response = response.split("```json")[1].split("```")[0]
                elif "```" in response:
                    response = response.split("```")[1].split("```")[0]
                    
                pb_dict = json.loads(response.strip())
                self._validate_playbook_safety(pb_dict)
                pb_dict["id"] = f"PB-{int(time.time())}"
                pb = Playbook(**pb_dict)
                await self.repo.save(pb)
                return pb
            except (json.JSONDecodeError, PlaybookValidationError) as e:
                logger.warning(f"Failed to generate valid playbook on attempt {attempt+1}: {str(e)}")
                if attempt == 2:
                    raise PlaybookValidationError("Failed to generate safe, valid playbook after 3 attempts.") from e

    async def score_playbook(self, playbook_id: str) -> float:
        pb = await self.repo.get(playbook_id)
        if not pb:
            return 0.0
        # Mock calculation based on prompt:
        success_rate = 0.9
        fp_rate = 0.05
        override_rate = 0.1
        time_improvement = 0.5
        
        score = (
            0.4 * success_rate +
            0.3 * (1 - fp_rate) +
            0.2 * (1 - override_rate) +
            0.1 * time_improvement
        )
        pb.confidence_score = score
        await self.repo.save(pb)
        return score

    async def retire_playbook(self, playbook_id: str, reason: str):
        pb = await self.repo.get(playbook_id)
        if pb:
            pb.status = PlaybookStatus.RETIRED
            logger.info(f"Retiring playbook {playbook_id}: {reason}")
            await self.repo.save(pb)

    async def evolve_playbooks(self):
        """Nightly batch job to evaluate and evolve playbooks"""
        playbooks = await self.repo.get_all()
        for pb in playbooks:
            score = await self.score_playbook(pb.id)
            if score > 0.85 and pb.status != PlaybookStatus.RETIRED:
                pb.status = PlaybookStatus.PROVEN
            elif score < 0.5:
                await self.retire_playbook(pb.id, "Low performance score")
        logger.info("Evolve playbooks job completed.")
