from datetime import datetime
from typing import Dict, List

from flask import Flask, redirect, render_template, request, url_for

from storage import (load_data, persist_data, DATA_DIR, DEFAULT_GOALS_FILE,
                     DEFAULT_OBSERVATIONS_FILE, DEFAULT_EXPERIMENTS_FILE,
                     DEFAULT_EXPERIMENT_EVENTS_FILE)

app = Flask(__name__)


@app.context_processor
def inject_defaults():
    return {
        "goal_options": load_data(DEFAULT_GOALS_FILE),
        "experiment_options": load_data(DEFAULT_EXPERIMENTS_FILE),
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/goals", methods=["GET", "POST"])
def goals():
    goals_data: List[Dict] = load_data(DEFAULT_GOALS_FILE)
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        metrics = request.form.get("metrics", "").strip()
        targets = request.form.get("targets", "").strip()
        description = request.form.get("description", "").strip()
        if title:
            goals_data.append(
                {
                    "id": f"goal-{len(goals_data) + 1}",
                    "title": title,
                    "metrics": metrics,
                    "targets": targets,
                    "description": description,
                    "created_at": datetime.utcnow().isoformat(),
                }
            )
            persist_data(DEFAULT_GOALS_FILE, goals_data)
        return redirect(url_for("goals"))

    return render_template("goals.html", goals=goals_data)


@app.route("/observations", methods=["GET", "POST"])
def observations():
    observations_data: List[Dict] = load_data(DEFAULT_OBSERVATIONS_FILE)
    if request.method == "POST":
        goal_id = request.form.get("goal_id") or None
        mood = request.form.get("mood", "").strip()
        energy = request.form.get("energy", "").strip()
        sleep_hours = request.form.get("sleep_hours", "").strip()
        social = request.form.get("social", "").strip()
        note = request.form.get("note", "").strip()
        observations_data.append(
            {
                "goal_id": goal_id,
                "mood": mood,
                "energy": energy,
                "sleep_hours": sleep_hours,
                "social": social,
                "note": note,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        persist_data(DEFAULT_OBSERVATIONS_FILE, observations_data)
        return redirect(url_for("observations"))

    return render_template("observations.html", observations=observations_data)


@app.route("/experiments", methods=["GET", "POST"])
def experiments():
    experiments_data: List[Dict] = load_data(DEFAULT_EXPERIMENTS_FILE)
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        goal_id = request.form.get("goal_id") or None
        hypothesis = request.form.get("hypothesis", "").strip()
        if title:
            experiments_data.append(
                {
                    "id": f"exp-{len(experiments_data) + 1}",
                    "goal_id": goal_id,
                    "title": title,
                    "hypothesis": hypothesis,
                    "created_at": datetime.utcnow().isoformat(),
                }
            )
            persist_data(DEFAULT_EXPERIMENTS_FILE, experiments_data)
        return redirect(url_for("experiments"))

    return render_template("experiments.html", experiments=experiments_data)


@app.route("/experiment-events", methods=["GET", "POST"])
def experiment_events():
    events: List[Dict] = load_data(DEFAULT_EXPERIMENT_EVENTS_FILE)
    if request.method == "POST":
        experiment_id = request.form.get("experiment_id") or None
        event_type = request.form.get("event_type", "").strip()
        note = request.form.get("note", "").strip()
        events.append(
            {
                "experiment_id": experiment_id,
                "event_type": event_type,
                "note": note,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        persist_data(DEFAULT_EXPERIMENT_EVENTS_FILE, events)
        return redirect(url_for("experiment_events"))

    return render_template("experiment_events.html", events=events)


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    app.run(debug=True, host="0.0.0.0", port=5000)
