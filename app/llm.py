from typing import Dict, List

TaskType = str


MODEL_BY_TASK: Dict[TaskType, str] = {
    "recap": "gemini-2.5-flash",
    "planning": "gemini-1.5-pro",
}


def select_model(task_type: TaskType) -> str:
    return MODEL_BY_TASK.get(task_type, "gemini-1.5-pro")


def format_prompt(user_query: str, data_frames: Dict[str, List[dict]], task_type: TaskType) -> str:
    header = [
        f"User query: {user_query}",
        f"Task type: {task_type}",
        "Context slices:",
    ]
    lines: List[str] = header

    for name, rows in data_frames.items():
        lines.append(f"- {name} ({len(rows)} rows)")
        for row in rows:
            kv = ", ".join(f"{key}={value}" for key, value in row.items())
            lines.append(f"    • {kv}")

    lines.append(
        "Return a short summary and actionable recommendation grounded in the provided rows."
    )

    return "\n".join(lines)


def mock_gemini_completion(model: str, prompt: str) -> str:
    teaser = prompt.splitlines()[0]
    if model == "gemini-2.5-flash":
        return (
            f"[Flash] {teaser}. Synthesized quick recap focusing on progress, risks, and next steps."
        )
    return (
        f"[Pro] {teaser}. Strategic recommendation with planning and optimization guidance."
    )
