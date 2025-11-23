# Loop context fact pipeline

This repository contains a minimal pipeline for extracting structured scheduling facts from capture transcripts using Gemini 1.5 Pro and storing them with validity ranges.

## Components
- **GeminiFactExtractor** (`src/loop/gemini_extractor.py`): builds the extraction prompt and parses the Gemini response into `ContextFact` objects.
- **ContextFactsStore** (`src/loop/context_store.py`): persists facts with `valid_from`/`valid_to` versioning and supports upsert semantics.
- **AgendaResolver** (`src/loop/resolver.py`): surfaces active scheduling/agenda facts for downstream query handling.

## Running tests
Ensure Python 3.11+ is available, install dev dependencies, then run pytest:

```bash
pip install -e .[dev]
pytest
```
