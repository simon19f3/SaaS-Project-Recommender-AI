# SaaS Logic-Tree Research Agent 

**Stack:** FastAPI · LangGraph · Next.js · React Flow · gemini

## Architecture

```
┌─────────────────────┐     SSE Stream      ┌──────────────────────┐
│    Next.js Frontend │ ←────────────────── │   FastAPI Backend     │
│  React Flow Tree    │    POST /research/  │   LangGraph ToT Agent │
│  Venture Dossier    │         stream      │   Beam Search k=3     │
└─────────────────────┘                     └──────────────────────┘
```

## Quick Start

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

## Research Phases (Tree Depth = 4)

| Depth | Phase | Description |
|-------|-------|-------------|
| 1 | Branch Generation | 6 diverse SaaS candidates |
| 2 | Beam Search (k=3) | Score all, keep Top-3 |
| 3 | Devil's Advocate | Fatal flaw + FMF analysis |
| 4 | Execution Paths | Path A (Lean) / B (AI-Moat) / C (Niche) |

## Scoring Matrix (100%)

| Metric | Weight |
|--------|--------|
| Market Pain | 20% |
| Revenue Velocity | 15% |
| Scalability & Moat | 15% |
| Market Saturation | 10% |
| Acquisition/Distribution | 10% |
| Technical Feasibility | 10% |
| Regulatory/Risk | 10% |
| Founder-Market Fit | 10% |

Every score includes: `{ score, confidence, range: [low, high], evidence_quality, data_sources }`
