# Reputation Risk Intelligence Platform

## Quick Start
```bash
docker compose up -d
# Wait for DB, then seed demo data:
docker compose exec backend python seed_demo_data.py
# Frontend: http://localhost:5173
# API: http://localhost:8000/docs
```

## Architecture
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL (port 8000)
- **Frontend:** React + Vite + Tailwind + Recharts (port 5173)
- **ML:** FinBERT sentiment analysis (ProsusAI/finbert)

## Key Files
- `backend/services/risk_engine.py` — Composite risk score (0-100)
- `backend/ml/sentiment.py` — FinBERT sentiment pipeline
- `backend/ingestion/cfpb_complaints.py` — CFPB public API ingestion
- `backend/ingestion/news.py` — NewsAPI ingestion + sentiment
- `backend/api/routes.py` — All REST endpoints
- `backend/seed_demo_data.py` — Demo data generator
- `frontend/src/pages/Dashboard.tsx` — Executive overview
- `frontend/src/pages/Monitoring.tsx` — Real-time signal feed

## API Endpoints
- `GET /api/dashboard/overview` — All banks with scores and drivers
- `GET /api/banks/{id}/risk-score` — Single bank composite score
- `GET /api/banks/{id}/risk-history` — Historical trend data
- `GET /api/signals` — Signal feed (filterable by bank/source)
- `GET /api/signals/volume` — Daily volume + sentiment
- `GET /api/complaints/summary` — CFPB complaint breakdown

## Risk Score Components (Phase 1)
| Component | Weight | Source |
|-----------|--------|--------|
| Media Sentiment | 45% | FinBERT on news |
| Customer Complaints | 35% | CFPB data |
| Market Signal | 20% | Placeholder (Phase 2) |

## Build Phases
- **Phase 1 (current):** MVP — scoring engine, CFPB + news ingestion, executive dashboard, monitoring
- **Phase 2:** SEC EDGAR, OCC enforcement, Yahoo Finance, peer benchmarking, regulatory intel pages
- **Phase 3:** Monte Carlo crisis simulation, XGBoost escalation, stakeholder impact
- **Phase 4:** Board report PDF export, Glassdoor/Reddit, auth, deploy
