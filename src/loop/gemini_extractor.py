from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

import requests

from loop.captures import Capture, ContextFact


EXTRACTION_PROMPT = (
    "Extract concise, structured facts about scheduling, availability, and agenda items from the capture. "
    "Return ONLY JSON with a list under the `facts` key where each entry has category, detail, time_range, "
    "location, and confidence. Category examples: schedule, availability, agenda, reminder."
)


class GeminiFactExtractor:
    """Calls Gemini 1.5 Pro to transform captures into context facts."""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-pro-latest",
        api_base: str = "https://generativelanguage.googleapis.com/v1beta",
        http_session: Optional[requests.Session] = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.api_base = api_base.rstrip("/")
        self.http = http_session or requests.Session()

    def extract(self, capture: Capture, request_time: Optional[datetime] = None) -> List[ContextFact]:
        request_time = request_time or datetime.utcnow()
        response = self.http.post(
            f"{self.api_base}/models/{self.model}:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": self.api_key},
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": EXTRACTION_PROMPT},
                            {
                                "text": self._render_capture_input(capture),
                            },
                        ]
                    }
                ]
            },
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        text = self._extract_text(payload)
        parsed = json.loads(text)
        facts_payload = parsed.get("facts", []) if isinstance(parsed, dict) else parsed
        return [ContextFact.from_dict(item, capture.capture_id, request_time) for item in facts_payload]

    def _render_capture_input(self, capture: Capture) -> str:
        created_at = capture.created_at.isoformat() if capture.created_at else ""
        source = capture.source or ""
        return (
            "Capture metadata:\n"
            f"capture_id: {capture.capture_id}\n"
            f"source: {source}\n"
            f"created_at: {created_at}\n"
            "Transcript:\n"
            f"{capture.transcript}"
        )

    def _extract_text(self, payload: dict) -> str:
        try:
            return payload["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError("Unexpected Gemini response structure") from exc
