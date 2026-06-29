"""
FastAPI server — REST API for the frontend
"""

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
import asyncio
import json
import uuid
import os

from action_runner import run_action_package
from explorer import WebExplorer
from llm_agent import run_full_analysis
from pipeline import build_agent_pipeline
from store import get_artifact, list_artifacts, save_artifact
from security import validate_target_url
from uipath_client import (
    UiPathApiError,
    UiPathConfigError,
    get_job,
    list_releases,
    start_job,
    uipath_status,
)

app = FastAPI(title="WebGraph Explorer API", version="0.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "FLOWGUARD_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
allowed_origin_regex = os.environ.get(
    "FLOWGUARD_CORS_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
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


class UiPathExecuteRequest(BaseModel):
    base_url: str
    test_cases: list[dict]
    package_id: Optional[str] = None


class RunActionsRequest(BaseModel):
    base_url: str
    test_cases: list[dict] | str
    package_id: Optional[str] = None
    headless: bool = True


# ------------------------------------------------------------------ #
#  Background exploration task                                         #
# ------------------------------------------------------------------ #

async def _run_exploration(job_id: str, req: ExploreRequest):
    jobs[job_id]["status"] = "running"
    jobs[job_id]["progress"] = "Starting Playwright..."
    save_artifact(job_id, "crawl", jobs[job_id], "running")

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
        )
        graph = await explorer.explore()
        jobs[job_id]["status"] = "done"
        jobs[job_id]["graph"] = graph
        jobs[job_id]["progress"] = f"Discovered {graph['stats']['total_states']} states"
        save_artifact(job_id, "crawl", jobs[job_id], "done")
    except Exception as exc:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(exc)
        save_artifact(job_id, "crawl", jobs[job_id], "error")


# ------------------------------------------------------------------ #
#  Endpoints                                                           #
# ------------------------------------------------------------------ #

@app.post("/explore")
async def start_exploration(req: ExploreRequest, bg: BackgroundTasks):
    """Launch async crawl job. Returns job_id to poll."""
    try:
        validate_target_url(req.target_url)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "progress": "Queued"}
    save_artifact(job_id, "crawl", jobs[job_id], "queued")
    bg.add_task(_run_exploration, job_id, req)
    return {"job_id": job_id}


@app.get("/explore/{job_id}")
async def get_exploration_status(job_id: str):
    """Poll crawl job status."""
    job = jobs.get(job_id)
    if job is None:
        stored = get_artifact(job_id)
        job = stored["payload"] if stored and stored["kind"] == "crawl" else None
    if job is None:
        raise HTTPException(404, "Job not found")
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
        result = build_agent_pipeline(req.graph)
        artifact_id = result.get("uipath_execution_package", {}).get("package_id", f"pipeline-{uuid.uuid4()}")
        save_artifact(artifact_id, "pipeline", result, result.get("execution", {}).get("status"))
        return result
    except Exception as exc:
        raise HTTPException(500, f"Pipeline failed: {exc}")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/uipath/status")
async def get_uipath_status():
    """Validate UiPath OAuth configuration without exposing secrets."""
    try:
        return uipath_status()
    except UiPathConfigError as exc:
        raise HTTPException(400, str(exc))
    except UiPathApiError as exc:
        raise HTTPException(502, str(exc))


@app.get("/uipath/releases")
async def get_uipath_releases(search: Optional[str] = None):
    """List Orchestrator releases so FlowGuard can find the ReleaseKey."""
    try:
        return list_releases(search)
    except UiPathConfigError as exc:
        raise HTTPException(400, str(exc))
    except UiPathApiError as exc:
        raise HTTPException(502, str(exc))


@app.post("/uipath/execute")
async def execute_uipath_tests(req: UiPathExecuteRequest):
    """Submit selected FlowGuard test cases to the configured UiPath process."""
    try:
        validate_target_url(req.base_url)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    package_id = req.package_id or f"FG-PKG-{uuid.uuid4().hex[:8].upper()}"
    try:
        response = start_job({
            "package_id": package_id,
            "base_url": req.base_url,
            "test_cases": json.dumps(req.test_cases),
        })
        submitted_jobs = response.get("value", []) if isinstance(response, dict) else []
        first_job = submitted_jobs[0] if submitted_jobs else {}
        result = {
            "status": "submitted",
            "package_id": package_id,
            "submitted_count": len(req.test_cases),
            "job_id": first_job.get("Id"),
            "job_key": first_job.get("Key"),
            "state": first_job.get("State"),
            "release_name": first_job.get("ReleaseName"),
            "orchestrator_response": response,
        }
        save_artifact(package_id, "uipath_execution", result, "submitted")
        return result
    except UiPathConfigError as exc:
        raise HTTPException(400, str(exc))
    except UiPathApiError as exc:
        raise HTTPException(502, str(exc))


@app.get("/uipath/jobs/{job_id}")
async def get_uipath_job(job_id: int):
    """Poll a UiPath Orchestrator job by numeric job id."""
    try:
        job = get_job(job_id)
        return {
            "id": job.get("Id"),
            "key": job.get("Key"),
            "state": job.get("State"),
            "source": job.get("Source"),
            "release_name": job.get("ReleaseName"),
            "start_time": job.get("StartTime"),
            "end_time": job.get("EndTime"),
            "creation_time": job.get("CreationTime"),
            "info": job.get("Info"),
            "raw": job,
        }
    except UiPathConfigError as exc:
        raise HTTPException(400, str(exc))
    except UiPathApiError as exc:
        raise HTTPException(502, str(exc))


@app.post("/uipath/run-actions")
async def run_uipath_actions(req: RunActionsRequest):
    """Execute UiPath-submitted generated test actions with Playwright."""
    try:
        validate_target_url(req.base_url)
        test_cases: Any = req.test_cases
        if isinstance(test_cases, str):
            test_cases = json.loads(test_cases)
        if not isinstance(test_cases, list):
            raise ValueError("test_cases must be a JSON array or a JSON string containing an array")

        result = await run_action_package(
            req.base_url,
            test_cases,
            headless=req.headless,
        )
        response = {
            "package_id": req.package_id,
            **result,
        }
        save_artifact(req.package_id or f"local-{uuid.uuid4()}", "playwright_execution", response, result.get("status"))
        return response
    except json.JSONDecodeError as exc:
        raise HTTPException(400, f"Invalid test_cases JSON: {exc}")
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Action runner failed: {exc}")


@app.get("/artifacts")
async def get_artifacts(kind: Optional[str] = None, limit: int = 50):
    """List persisted crawl, pipeline, and execution artifacts."""
    return {"artifacts": list_artifacts(kind, limit)}


@app.get("/artifacts/{artifact_id}")
async def get_persisted_artifact(artifact_id: str):
    artifact = get_artifact(artifact_id)
    if artifact is None:
        raise HTTPException(404, "Artifact not found")
    return artifact


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
