import sqlite3
from pathlib import Path
from typing import Any, Dict, List

DB_PATH = Path(__file__).parent / "concierge.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    connection.execute("PRAGMA query_only = ON;")
    return connection


def initialize_db() -> None:
    if DB_PATH.exists():
        return

    connection = get_connection()
    cursor = connection.cursor()

    cursor.executescript(
        """
        CREATE TABLE agenda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            item TEXT NOT NULL,
            owner TEXT NOT NULL,
            status TEXT NOT NULL
        );

        CREATE TABLE facts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fact TEXT NOT NULL,
            source TEXT NOT NULL,
            captured_at TEXT NOT NULL
        );

        CREATE TABLE observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal TEXT NOT NULL,
            severity TEXT NOT NULL,
            seen_at TEXT NOT NULL
        );

        CREATE TABLE experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hypothesis TEXT NOT NULL,
            outcome TEXT NOT NULL,
            metric_delta REAL NOT NULL,
            concluded_at TEXT NOT NULL
        );
        """
    )

    agenda_rows = [
        ("2024-05-01", "Ship onboarding revamp", "Avery", "in-progress"),
        ("2024-05-05", "Finalize Q2 OKRs", "Jordan", "blocked"),
        ("2024-05-10", "Security tabletop", "Taylor", "scheduled"),
    ]

    fact_rows = [
        ("Activation rate up 8% after new tutorial", "product analytics", "2024-04-28"),
        ("Two enterprise renewals at risk", "account notes", "2024-04-30"),
        ("Support backlog cleared", "support dashboard", "2024-04-29"),
    ]

    observation_rows = [
        ("Users still struggle with billing addresses", "medium", "2024-04-27"),
        ("Infrastructure error budget healthy", "low", "2024-05-02"),
        ("Churn risk concentrated in EMEA", "high", "2024-05-01"),
    ]

    experiment_rows = [
        ("Reduce onboarding steps", "positive", 0.12, "2024-04-25"),
        ("Swap pricing copy", "neutral", -0.01, "2024-04-22"),
        ("Inline nudge for surveys", "negative", -0.05, "2024-04-20"),
    ]

    cursor.executemany(
        "INSERT INTO agenda (date, item, owner, status) VALUES (?, ?, ?, ?)",
        agenda_rows,
    )
    cursor.executemany(
        "INSERT INTO facts (fact, source, captured_at) VALUES (?, ?, ?)",
        fact_rows,
    )
    cursor.executemany(
        "INSERT INTO observations (signal, severity, seen_at) VALUES (?, ?, ?)",
        observation_rows,
    )
    cursor.executemany(
        "INSERT INTO experiments (hypothesis, outcome, metric_delta, concluded_at) VALUES (?, ?, ?, ?)",
        experiment_rows,
    )

    connection.commit()
    connection.close()


def query_templates(keyword: str) -> Dict[str, List[Dict[str, Any]]]:
    connection = get_connection()
    cursor = connection.cursor()

    wildcard = f"%{keyword.lower()}%"

    queries = {
        "agenda": (
            "SELECT date, item, owner, status FROM agenda "
            "WHERE lower(item) LIKE :kw OR lower(owner) LIKE :kw ORDER BY date"
        ),
        "facts": (
            "SELECT fact, source, captured_at FROM facts "
            "WHERE lower(fact) LIKE :kw OR lower(source) LIKE :kw ORDER BY captured_at DESC"
        ),
        "observations": (
            "SELECT signal, severity, seen_at FROM observations "
            "WHERE lower(signal) LIKE :kw ORDER BY seen_at DESC"
        ),
        "experiments": (
            "SELECT hypothesis, outcome, metric_delta, concluded_at FROM experiments "
            "WHERE lower(hypothesis) LIKE :kw OR lower(outcome) LIKE :kw "
            "ORDER BY concluded_at DESC"
        ),
    }

    results: Dict[str, List[Dict[str, Any]]] = {}
    for table, sql in queries.items():
        cursor.execute(sql, {"kw": wildcard})
        rows = [dict(row) for row in cursor.fetchall()]
        results[table] = rows

    connection.close()
    return results
