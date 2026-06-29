# FlowGuard AI

AI web app testing agent that crawls a user app, detects available features, generates test scenarios, prepares UiPath Test Suite execution packages, and routes failed results into Failure Analysis.

## Product Workflow

```text
User enters URL / local app
        ↓
Crawler scans pages
        ↓
Feature extractor detects buttons, forms, auth, flows, API calls
        ↓
AI generates test scenarios
        ↓
Pull or sync test cases from UiPath Test Manager
        ↓
Create test execution package
        ↓
Run tests using UiPath Orchestrator
        ↓
Collect logs, screenshots, errors
        ↓
Failure Analysis Agent explains problems
        ↓
Report + dashboard + suggested fixes
```

## Core Agents

### 1. Crawler Agent

Implemented in `backend/explorer.py`.

Scans a target web app with Playwright and captures:

- pages and state fingerprints
- buttons, links, forms, tabs, and inputs
- login/signup/navigation paths
- API calls made by `fetch` and XHR
- hidden/disabled/destructive features filtered by safety rules
- screenshots and page summaries

Supported targets include public URLs and local development apps such as:

```text
http://localhost:3000
http://127.0.0.1:5173
```

### 2. Feature Detection Agent

Implemented in `backend/pipeline.py`.

Turns crawler output into structured product features:

```json
{
  "feature": "Login",
  "page": "/login",
  "elements": ["email input", "password input", "submit button"],
  "possible_tests": [
    "valid credentials flow",
    "invalid credentials error state",
    "empty required fields"
  ]
}
```

### 3. Test Case Agent

Implemented in `backend/pipeline.py`, with LLM analysis support in `backend/llm_agent.py`.

Creates deterministic test case drafts from detected features. The LLM pipeline can also label critical flows, analyze coverage, generate Playwright tests, and flag security risks when `ANTHROPIC_API_KEY` is configured.

UiPath Test Manager Autopilot is the intended upstream/downstream integration point for generating or enriching tests from requirements.

### 4. UiPath Execution Agent

Scaffolded in `backend/pipeline.py`.

Creates a UiPath-ready execution package containing:

- base URL
- generated test cases
- screenshot/log/network capture requirements
- Test Manager sync metadata
- Orchestrator runner metadata

Current behavior is a safe dry run unless UiPath credentials are configured. Add tenant-specific API calls when these are available:

```env
UIPATH_BASE_URL=
UIPATH_ORG_NAME=
UIPATH_TENANT_NAME=
UIPATH_CLIENT_ID=
UIPATH_CLIENT_SECRET=
UIPATH_SCOPES=
UIPATH_FOLDER_ID=
UIPATH_RELEASE_KEY=
```

### 5. Failure Analysis Agent

Implemented as a structured result contract in `backend/pipeline.py` and represented in the frontend `Failure Analysis` tab.

The agent expects failed execution artifacts:

- failed step
- screenshot
- console logs
- network errors
- UiPath robot logs
- expected vs actual result

It produces:

- likely reason
- possible causes
- suggested fix
- report/dashboard payload

### 6. Orchestrator Agent

The backend API acts as the controller:

- starts crawler jobs
- polls job status
- builds the agent pipeline
- prepares UiPath execution packages
- routes results to analysis and dashboard views

## System Architecture

```text
Frontend Dashboard
    |
Backend API
    |
Agent Orchestrator
    |---------------- Crawler Agent
    |---------------- Feature Extractor Agent
    |---------------- Test Case Agent
    |---------------- UiPath Execution Agent
    |---------------- Failure Analysis Agent
    |
Database / job store
    |
UiPath Platform
    |---------------- Test Manager
    |---------------- Orchestrator
    |---------------- Robots
    |---------------- Test Results
```

The current prototype uses an in-memory job store. Production should replace this with Postgres, Redis, or another durable job/result store.

## API

### Health

```bash
curl http://127.0.0.1:8000/health
```

### Start Crawl

```bash
curl -X POST http://127.0.0.1:8000/explore \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "http://localhost:3000",
    "max_states": 30,
    "max_depth": 1,
    "max_actions_per_state": 40,
    "llm_rerank": false
  }'
```

### Poll Crawl

```bash
curl http://127.0.0.1:8000/explore/<job_id>
```

### Build Full Agent Pipeline

Pass the completed crawler graph:

```bash
curl -X POST http://127.0.0.1:8000/pipeline \
  -H "Content-Type: application/json" \
  -d '{"graph": {}}'
```

Returns:

- detected features
- generated test cases
- UiPath execution package
- dry-run or integration-ready execution result
- failure analysis payload

### Validate UiPath OAuth

Checks whether the backend can request a UiPath access token. It does not return the token or secret.

```bash
curl http://127.0.0.1:8000/uipath/status
```

Expected success shape:

```json
{
  "status": "ok",
  "base_url": "https://staging.uipath.com",
  "org": "novasquard",
  "tenant": "DefaultTenant",
  "token_type": "Bearer"
}
```

### LLM Analysis

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"graph": {}}'
```

Requires `ANTHROPIC_API_KEY`.

## Run Locally

### Docker (recommended)

Copy `.env.example` to `.env.local`, add the credentials you need, then run:

```bash
docker compose up --build
```

Open `http://localhost:3000`. The API and interactive documentation are at
`http://localhost:8000` and `http://localhost:8000/docs`.

Run automated backend checks with:

```bash
cd backend
../.venv/bin/python -m unittest discover -s tests -v
```

### Backend

```bash
cd "/Users/oz/Desktop/Ai test Agent/flowguard-ai/backend"
../.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd "/Users/oz/Desktop/Ai test Agent/flowguard-ai/frontend"
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:3001/
```

## Frontend Views

- `Dashboard`: summary, source connection, risk/coverage overview
- `App Explorer`: live crawler topology and page inspector
- `Test Cases`: generated or synced specs
- `Test Execution`: execution timeline view
- `Failure Analysis`: failed-result explanations and suggested fixes
- `Reports`: release/test reporting dashboard

## Implementation Status

Implemented:

- Playwright crawler
- FastAPI backend
- React dashboard
- feature extraction
- deterministic test case generation
- UiPath execution package contract
- dry-run UiPath execution result
- failure analysis result contract

Integration-ready:

- UiPath Test Manager test pull/sync
- UiPath Orchestrator job submission
- durable database/job store
- real artifact ingestion from robots
