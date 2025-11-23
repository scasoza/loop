from __future__ import annotations

from datetime import datetime
from typing import Iterable, List, Optional

from loop.captures import ContextFact
from loop.context_store import ContextFactsStore


class AgendaResolver:
    """Provides active facts tailored to scheduling and agenda lookups."""

    def __init__(self, store: ContextFactsStore) -> None:
        self.store = store

    def active_schedule(self, reference_time: Optional[datetime] = None) -> List[ContextFact]:
        return [fact for fact in self.store.get_active_facts(reference_time) if fact.category == "schedule"]

    def agenda_overview(self, reference_time: Optional[datetime] = None) -> List[ContextFact]:
        """Return active facts relevant to agenda or scheduling decisions."""

        return [
            fact
            for fact in self.store.get_active_facts(reference_time)
            if fact.category in {"schedule", "availability", "agenda", "reminder"}
        ]

    def format_for_response(self, facts: Iterable[ContextFact]) -> List[dict]:
        return [
            {
                "category": fact.category,
                "detail": fact.detail,
                "time_range": fact.time_range,
                "location": fact.location,
                "confidence": fact.confidence,
                "source_capture_id": fact.source_capture_id,
                "valid_from": fact.valid_from.isoformat() if fact.valid_from else None,
                "valid_to": fact.valid_to.isoformat() if fact.valid_to else None,
            }
            for fact in facts
        ]
