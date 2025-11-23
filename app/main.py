from typing import Dict, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .database import initialize_db, query_templates
from .llm import format_prompt, mock_gemini_completion, select_model

initialize_db()

app = FastAPI(title="Data Concierge API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")


class ConciergeRequest(BaseModel):
    user_query: str = Field(..., description="Natural language request")
    task_type: Literal["recap", "planning"] = Field(
        "planning", description="Choose recap for daily digest or planning for advice."
    )


class ConciergeResponse(BaseModel):
    model_used: str
    summary: str
    data_frames: Dict[str, list]
    prompt: str


@app.post("/api/data-concierge", response_model=ConciergeResponse)
def run_data_concierge(payload: ConciergeRequest) -> ConciergeResponse:
    data_frames = query_templates(payload.user_query)

    model_name = select_model(payload.task_type)
    prompt = format_prompt(payload.user_query, data_frames, payload.task_type)
    summary = mock_gemini_completion(model_name, prompt)

    return ConciergeResponse(
        model_used=model_name,
        summary=summary,
        data_frames=data_frames,
        prompt=prompt,
    )


@app.get("/")
def root() -> Dict[str, str]:
    return {"status": "ok", "message": "Data concierge is ready."}
