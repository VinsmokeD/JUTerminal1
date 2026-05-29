from enum import Enum
from pydantic import BaseModel, field_validator
from typing import Any, Optional


class SeverityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    INFO = "INFO"


class SiemEventOut(BaseModel):
    id: str
    session_id: str
    severity: str
    message: str
    mitre_technique: Optional[str] = ""
    source: Optional[str] = "attacker"
    timestamp: Optional[str] = None
    raw_log: Optional[str] = ""

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, v: Any) -> str:
        if not isinstance(v, str):
            return "INFO"
        v_upper = v.upper()
        # Map MED to MEDIUM to keep frontend/backend enums aligned
        if v_upper == "MED":
            return "MEDIUM"
        if v_upper in (item.value for item in SeverityEnum):
            return v_upper
        return "INFO"
