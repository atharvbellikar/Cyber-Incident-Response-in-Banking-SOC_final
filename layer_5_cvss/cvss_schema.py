from typing import TypedDict, Optional, Dict, Literal

# Type aliases for valid CVSS metric values
AttackVector = Literal["network", "adjacent", "local", "physical", "N", "A", "L", "P"]
AttackComplexity = Literal["low", "high", "L", "H"]
PrivilegesRequired = Literal["none", "low", "high", "N", "L", "H"]
UserInteraction = Literal["none", "required", "N", "R"]
ImpactMetric = Literal["high", "low", "none", "H", "L", "N"]
ScopeMetric = Literal["unchanged", "changed", "U", "C"]

class AIImpact(TypedDict, total=False):
    confidentiality: Optional[ImpactMetric]
    integrity: Optional[ImpactMetric]
    availability: Optional[ImpactMetric]

class AIAnalysisInput(TypedDict, total=False):
    intent: Optional[str]
    attack_vector: Optional[AttackVector]
    attack_complexity: Optional[AttackComplexity]
    privileges_required: Optional[PrivilegesRequired]
    user_interaction: Optional[UserInteraction]
    scope: Optional[ScopeMetric]
    impact: Optional[AIImpact]
    asset_criticality: Optional[Literal["low", "medium", "high", "critical"]]

class ExploitabilityMetrics(TypedDict):
    AV: str
    AC: str
    PR: str
    UI: str

class ImpactMetrics(TypedDict):
    C: str
    I: str
    A: str
    S: str

class ScoringResults(TypedDict):
    vector_string: str
    base_score: float
    severity: str

class FinalCVSSOutput(TypedDict):
    cvss: Dict[str, any]
