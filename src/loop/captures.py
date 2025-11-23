from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Capture:
    """Represents an upstream capture event that should be distilled into facts."""

    capture_id: str
    transcript: str
    source: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class ContextFact:
    """Structured fact generated from a capture and tracked with versioning."""

    category: str
    detail: str
    time_range: Optional[str]
    location: Optional[str]
    confidence: float
    source_capture_id: str
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None

    @classmethod
    def from_dict(cls, payload: dict, source_capture_id: str, timestamp: Optional[datetime]) -> "ContextFact":
        return cls(
            category=payload.get("category", "unspecified"),
            detail=payload.get("detail", ""),
            time_range=payload.get("time_range"),
            location=payload.get("location"),
            confidence=float(payload.get("confidence", 0.0)),
            source_capture_id=source_capture_id,
            valid_from=timestamp,
            valid_to=None,
        )
