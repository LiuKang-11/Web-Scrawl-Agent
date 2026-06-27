"""
FastAPI server — REST API for the frontend
"""

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import uuid
import os

from explorer import WebExplorer
from llm_agent import run_full_analysis
from pipeline import build_agent_pipeline
from uipath_client import UiPathApiError, UiPathConfigError, uipath_status

app = FastAPI(title="WebGraph Explorer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (use Redis/DB in production)
jobs: dict[str, dict] = {}


# ------------------------------------------------------------------ #
#  Request models                                                      #
# ------------------------------------------------------------------ #

class ExploreRequest(BaseModel):
    target_url: str
    username: Optional[str] = None
    password: Optional[str] = None
    login_url: Optional[str] = None
    max_states: int = 30
    max_depth: int = 1
    max_actions_per_state: int = 40
    strategy: str = "bfs"   # bfs | dfs
    llm_rerank: bool = True
    allow_external_links: bool = False


class AnalyzeRequest(BaseModel):
    graph: dict   # pass the graph JSON directly


class PipelineRequest(BaseModel):
    graph: dict


# ------------------------------------------------------------------ #
#  Background exploration task                                         #
# ------------------------------------------------------------------ #

async def _run_exploration(job_id: str, req: ExploreRequest):
    jobs[job_id]["status"] = "running"
    jobs[job_id]["progress"] = "Starting Playwright..."

    creds = {}
    if req.username:
        creds = {
            "username": req.username,
            "password": req.password,
            "login_url": req.login_url or req.target_url + "/login",
        }

    try:
        explorer = WebExplorer(
            target_url=req.target_url,
            credentials=creds,
            max_states=req.max_states,
            max_depth=req.max_depth,
            max_actions_per_state=req.max_actions_per_state,
            strategy=req.strategy,
            llm_rerank=req.llm_rerank,
            allow_external_links=req.allow_external_links,
            progress_callback=lambda message: jobs[job_id].update({"progress": message}),
        )
        graph = await explorer.explore()
        jobs[job_id]["status"] = "done"
        jobs[job_id]["graph"] = graph
        jobs[job_id]["progress"] = f"Discovered {graph['stats']['total_states']} states"
    except Exception as exc:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(exc)


# ------------------------------------------------------------------ #
#  Endpoints                                                           #
# ------------------------------------------------------------------ #

@app.post("/explore")
async def start_exploration(req: ExploreRequest, bg: BackgroundTasks):
    """Launch async crawl job. Returns job_id to poll."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "progress": "Queued"}
    bg.add_task(_run_exploration, job_id, req)
    return {"job_id": job_id}


@app.get("/explore/{job_id}")
async def get_exploration_status(job_id: str):
    """Poll crawl job status."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    return {
        "status": job["status"],
        "progress": job.get("progress"),
        "graph": job.get("graph") if job["status"] == "done" else None,
        "error": job.get("error"),
    }


@app.post("/analyze")
async def analyze_graph(req: AnalyzeRequest):
    """Run full LLM analysis pipeline on a graph."""
    try:
        result = run_full_analysis(req.graph)
        return result
    except Exception as exc:
        raise HTTPException(500, f"Analysis failed: {exc}")


@app.post("/pipeline")
async def build_pipeline(req: PipelineRequest):
    """Build the agent workflow payload from a crawler graph."""
    try:
        return build_agent_pipeline(req.graph)
    except Exception as exc:
        raise HTTPException(500, f"Pipeline failed: {exc}")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "flowguard-web-agent", "version": app.version}


@app.get("/uipath/status")
async def get_uipath_status():
    """Validate UiPath OAuth configuration without exposing secrets."""
    try:
        return uipath_status()
    except UiPathConfigError as exc:
        raise HTTPException(400, str(exc))
    except UiPathApiError as exc:
        raise HTTPException(502, str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
