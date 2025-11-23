# Loop optimization goals prototype

A lightweight Flask prototype for defining optimization goals, logging daily observations, and tracking experiments. Data is stored in JSON files under `data/` for easy inspection.

## Features
- UI to capture **optimization goals** with tracked metrics and target ranges.
- **Observation logger** for mood, energy, sleep hours, social interactions, and free-form notes linked to goals.
- **Experiments** with goal alignment and free-form hypothesis/approach text.
- **Experiment events** to record execution milestones with timestamps.
- **Daily and weekly rollup worker** that aggregates observation metrics per goal.

## Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the Flask app:
   ```bash
   FLASK_APP=app.py flask run --host 0.0.0.0 --port 5000
   ```

The UI will be available at http://localhost:5000.

## Rollup worker
Compute aggregates for every goal based on logged observations:
```bash
python aggregator.py
```
The worker writes `data/rollups.json` containing daily and weekly counts plus average mood, energy, and sleep hours.
