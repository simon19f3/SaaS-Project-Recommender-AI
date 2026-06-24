"""
SaaS Logic-Tree Research Agent — FastAPI + LangGraph Backend
"""
import asyncio
import json
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import run_tot_agent, UserContext

app = FastAPI(title="SaaS ToT Research Agent", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    region: str
    industry: str
    budget: str
    background: str
    api_key: str


@app.post("/research/stream")
async def stream_research(req: ResearchRequest):
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            ctx = UserContext(
                region=req.region,
                industry=req.industry,
                budget=req.budget,
                background=req.background,
                api_key=req.api_key,
            )
            async for event in run_tot_agent(ctx):
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0)
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
def health():
    return {"status": "ok"}
