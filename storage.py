import json
from pathlib import Path
from typing import Any, Dict, List

DATA_DIR = Path("data")
DEFAULT_GOALS_FILE = DATA_DIR / "optimization_goals.json"
DEFAULT_OBSERVATIONS_FILE = DATA_DIR / "observations.json"
DEFAULT_EXPERIMENTS_FILE = DATA_DIR / "experiments.json"
DEFAULT_EXPERIMENT_EVENTS_FILE = DATA_DIR / "experiment_events.json"
DEFAULT_ROLLUPS_FILE = DATA_DIR / "rollups.json"


def _ensure_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("[]")


def load_data(path: Path) -> List[Dict[str, Any]]:
    _ensure_file(path)
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return []


def persist_data(path: Path, data: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


__all__ = [
    "DATA_DIR",
    "DEFAULT_GOALS_FILE",
    "DEFAULT_OBSERVATIONS_FILE",
    "DEFAULT_EXPERIMENTS_FILE",
    "DEFAULT_EXPERIMENT_EVENTS_FILE",
    "DEFAULT_ROLLUPS_FILE",
    "load_data",
    "persist_data",
]
