from datetime import datetime, timedelta
import json

from loop.captures import Capture, ContextFact
from loop.context_store import ContextFactsStore
from loop.gemini_extractor import GeminiFactExtractor
from loop.resolver import AgendaResolver


class DummyResponse:
    def __init__(self, data: dict, status_code: int = 200):
        self._data = data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise ValueError("HTTP error")

    def json(self):
        return self._data


class RecordingSession:
    def __init__(self, response: DummyResponse):
        self.response = response
        self.last_json = None
        self.last_url = None

    def post(self, url, headers=None, params=None, json=None, timeout=None):  # noqa: A003
        self.last_json = json
        self.last_url = url
        return self.response


def test_extractor_builds_prompt_and_parses_response():
    capture = Capture(
        capture_id="cap-123",
        transcript="Let's meet Friday at 3pm in the downtown office",
        source="call",
        created_at=datetime(2024, 1, 1, 12, 0, 0),
    )
    fact_payload = {
        "facts": [
            {
                "category": "schedule",
                "detail": "Meeting with Alex",
                "time_range": "Friday 3pm",
                "location": "Downtown office",
                "confidence": 0.92,
            }
        ]
    }
    dummy_text = json.dumps(fact_payload)
    response = DummyResponse(
        {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": dummy_text,
                            }
                        ]
                    }
                }
            ]
        }
    )
    session = RecordingSession(response)
    request_time = datetime(2024, 1, 2, 8, 30, 0)
    extractor = GeminiFactExtractor(api_key="test", http_session=session)

    facts = extractor.extract(capture, request_time=request_time)

    assert "gemini" in session.last_url
    assert capture.transcript in session.last_json["contents"][0]["parts"][1]["text"]
    assert facts[0].category == "schedule"
    assert facts[0].detail == "Meeting with Alex"
    assert facts[0].time_range == "Friday 3pm"
    assert facts[0].location == "Downtown office"
    assert facts[0].confidence == 0.92
    assert facts[0].source_capture_id == "cap-123"
    assert facts[0].valid_from == request_time


def test_context_store_versions_fact_and_marks_previous_record_inactive():
    store = ContextFactsStore()
    t1 = datetime(2024, 1, 1, 9, 0, 0)
    t2 = t1 + timedelta(hours=2)
    fact_v1 = ContextFact(
        category="schedule",
        detail="Works Friday",
        time_range="Fridays 3pm",
        location="HQ",
        confidence=0.8,
        source_capture_id="cap-a",
    )
    fact_v2 = ContextFact(
        category="schedule",
        detail="Works Friday",
        time_range="Fridays 3pm",
        location="HQ",
        confidence=0.9,
        source_capture_id="cap-b",
    )

    store.upsert_fact(fact_v1, effective_time=t1)
    store.upsert_fact(fact_v2, effective_time=t2)

    active = store.get_active_facts(reference_time=t2 + timedelta(minutes=1))
    assert len(active) == 1
    assert active[0].source_capture_id == "cap-b"
    assert active[0].valid_from == t2

    # older version should be closed out
    row = store._connection.execute(
        "SELECT valid_to FROM context_facts WHERE source_capture_id = ?",
        ("cap-a",),
    ).fetchone()
    assert row[0] == t2.isoformat()


def test_resolver_returns_agenda_facts_only():
    store = ContextFactsStore()
    t1 = datetime(2024, 1, 1, 9, 0, 0)
    agenda_fact = ContextFact(
        category="agenda",
        detail="Prepare quarterly review",
        time_range="Q1",
        location=None,
        confidence=0.85,
        source_capture_id="cap-1",
    )
    noise_fact = ContextFact(
        category="other",
        detail="Unrelated note",
        time_range=None,
        location=None,
        confidence=0.5,
        source_capture_id="cap-2",
    )

    store.upsert_many([agenda_fact, noise_fact], effective_time=t1)
    resolver = AgendaResolver(store)

    agenda = resolver.agenda_overview(reference_time=t1 + timedelta(minutes=1))
    assert len(agenda) == 1
    assert agenda[0].detail == "Prepare quarterly review"

    formatted = resolver.format_for_response(agenda)
    assert formatted[0]["category"] == "agenda"
    assert formatted[0]["valid_from"] == t1.isoformat()
