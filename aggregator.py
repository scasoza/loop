from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from storage import (
    DEFAULT_GOALS_FILE,
    DEFAULT_OBSERVATIONS_FILE,
    DEFAULT_ROLLUPS_FILE,
    load_data,
    persist_data,
)


NUMERIC_FIELDS = ("mood", "energy", "sleep_hours")


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _group_by(observations: List[Dict[str, Any]], key_func):
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for obs in observations:
        grouped[key_func(obs)].append(obs)
    return grouped


def _aggregate_group(group: List[Dict[str, Any]]) -> Dict[str, Any]:
    totals: Dict[str, float] = defaultdict(float)
    counts: Dict[str, int] = defaultdict(int)

    for obs in group:
        for field in NUMERIC_FIELDS:
            value = _to_float(obs.get(field))
            if value is not None:
                totals[field] += value
                counts[field] += 1

    averages = {
        f"avg_{field}": (totals[field] / counts[field]) if counts[field] else None
        for field in NUMERIC_FIELDS
    }

    return {
        "count": len(group),
        **averages,
    }


def _aggregate_goal(goal_id: str, observations: List[Dict[str, Any]]) -> Dict[str, Any]:
    daily_groups = _group_by(
        observations,
        lambda obs: datetime.fromisoformat(obs["timestamp"]).date().isoformat(),
    )
    weekly_groups = _group_by(
        observations,
        lambda obs: "-W".join(
            map(str, datetime.fromisoformat(obs["timestamp"]).isocalendar()[:2])
        ),
    )

    daily_rollups = [
        {"date": date, **_aggregate_group(group)} for date, group in sorted(daily_groups.items())
    ]
    weekly_rollups = [
        {"week": week, **_aggregate_group(group)} for week, group in sorted(weekly_groups.items())
    ]

    return {"daily": daily_rollups, "weekly": weekly_rollups}


def build_rollups() -> Dict[str, Any]:
    goals = load_data(DEFAULT_GOALS_FILE)
    observations = load_data(DEFAULT_OBSERVATIONS_FILE)

    rollups: Dict[str, Any] = {}

    for goal in goals:
        goal_id = goal["id"]
        goal_observations = [obs for obs in observations if obs.get("goal_id") == goal_id]
        rollups[goal_id] = _aggregate_goal(goal_id, goal_observations)

    persist_data(DEFAULT_ROLLUPS_FILE, rollups)
    return rollups


if __name__ == "__main__":
    results = build_rollups()
    print("Computed rollups for", len(results), "goals")
