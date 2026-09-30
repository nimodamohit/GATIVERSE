# GATIVERSE - ML Service

AI/ML microservice foundation for GATIVERSE.

## Purpose
This microservice will house delay prediction models, dynamic ETA inference engines, and feature preprocessing pipelines for railway operations.

## Current Phase 0 Scope
- FastAPI application structure
- `/health` endpoint for service verification
- Environment configuration

## Development Setup

1. Create Python Virtual Environment:
```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate
```

2. Install Dependencies:
```bash
pip install -r requirements.txt
```

3. Run FastAPI Dev Server:
```bash
uvicorn app.main:app --reload --port 8000
```
