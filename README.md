# Data concierge prototype

This FastAPI service exposes a server-side "data concierge" route that runs structured, read-only SQL templates over a small SQLite dataset (agenda, facts, observations, experiments). It selects the right Gemini model for the task (2.5 Flash for fast recaps, 1.5 Pro for planning/optimization), builds a reasoning prompt, and returns both the model output and the queried rows so you can "show your work".

## Getting started

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/static/index.html` in your browser to try the UI. The page calls `/api/data-concierge` and renders the model choice, prompt, summary, and each data frame slice.

## API

`POST /api/data-concierge`

```json
{
  "user_query": "Where are we blocked?",
  "task_type": "recap" | "planning"
}
```

- `recap` uses **Gemini 2.5 Flash** for low-stakes bulk summarization.
- `planning` uses **Gemini 1.5 Pro** for deeper reasoning.

Response includes the `model_used`, `summary`, `prompt`, and the four data frames (agenda, facts, observations, experiments). Model calls are mocked; integrate the Gemini API by swapping out `mock_gemini_completion`.
