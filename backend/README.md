# SmartHire AI - Backend
```bash
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload      # docs at /docs
pytest -q
python scripts/demo_api.py         # live demo against the running server
```
Configuration lives in `.env` (copy from `.env.example`).
