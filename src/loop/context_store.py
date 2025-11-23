from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Iterable, List, Optional

from loop.captures import ContextFact


SCHEMA = """
CREATE TABLE IF NOT EXISTS context_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    detail TEXT NOT NULL,
    time_range TEXT,
    location TEXT,
    confidence REAL NOT NULL,
    source_capture_id TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_to TEXT
);
"""


class ContextFactsStore:
    """Persists context facts with validity ranges and supports versioning."""

    def __init__(self, database_path: str = ":memory:") -> None:
        self.database_path = database_path
        self._connection = sqlite3.connect(self.database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self.initialize()

    def initialize(self) -> None:
        with self._connection:
            self._connection.executescript(SCHEMA)

    def upsert_fact(self, fact: ContextFact, effective_time: Optional[datetime] = None) -> None:
        """
        Insert or version a fact.

        If an active fact shares the same identity (category + detail + time_range + location),
        the current record is closed out by setting its valid_to and a new version is created.
        """

        effective_time = effective_time or datetime.utcnow()
        identity_params = (
            fact.category,
            fact.detail,
            fact.time_range,
            fact.time_range,
            fact.location,
            fact.location,
        )

        with self._connection:
            self._connection.execute(
                """
                UPDATE context_facts
                SET valid_to = ?
                WHERE valid_to IS NULL
                  AND category = ?
                  AND detail = ?
                  AND (time_range = ? OR (time_range IS NULL AND ? IS NULL))
                  AND (location = ? OR (location IS NULL AND ? IS NULL))
                """,
                (effective_time.isoformat(), *identity_params),
            )

            self._connection.execute(
                """
                INSERT INTO context_facts (
                    category, detail, time_range, location, confidence,
                    source_capture_id, valid_from, valid_to
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    fact.category,
                    fact.detail,
                    fact.time_range,
                    fact.location,
                    fact.confidence,
                    fact.source_capture_id,
                    effective_time.isoformat(),
                ),
            )

    def upsert_many(self, facts: Iterable[ContextFact], effective_time: Optional[datetime] = None) -> None:
        for fact in facts:
            self.upsert_fact(fact, effective_time=effective_time)

    def get_active_facts(self, reference_time: Optional[datetime] = None) -> List[ContextFact]:
        reference_time = reference_time or datetime.utcnow()
        cursor = self._connection.execute(
            """
            SELECT category, detail, time_range, location, confidence,
                   source_capture_id, valid_from, valid_to
            FROM context_facts
            WHERE valid_from <= ?
              AND (valid_to IS NULL OR valid_to > ?)
            ORDER BY valid_from DESC
            """,
            (reference_time.isoformat(), reference_time.isoformat()),
        )
        return [self._row_to_fact(row) for row in cursor.fetchall()]

    def _row_to_fact(self, row: sqlite3.Row) -> ContextFact:
        return ContextFact(
            category=row["category"],
            detail=row["detail"],
            time_range=row["time_range"],
            location=row["location"],
            confidence=row["confidence"],
            source_capture_id=row["source_capture_id"],
            valid_from=datetime.fromisoformat(row["valid_from"]),
            valid_to=datetime.fromisoformat(row["valid_to"]) if row["valid_to"] else None,
        )
