# Web Scrawl Agent

## Project Overview

This repository contains two related parts:

- A Python prototype for crawling a web page or app, taking automatic actions, and capturing discovered UI states.
- A React/Vite frontend for viewing and working with the agent experience.

The original agent output is stored in `agent_output/`, including the graph JSON and screenshots.

## Workflow

![Workflow](workflow.png)

## Project Files

- `main.py`: primary entry point for the Python agent logic
- `Design Document.md`: architectural notes and design decisions
- `prototype_run_notes.md`: test notes and observations
- `requirements.txt`: Python dependencies
- `agent_output/`: structured graph output and screenshots
- `workflow.png`: workflow illustration
- `src/`: React frontend source
- `package.json`: frontend scripts and dependencies

## Run The Python Agent

1. Create a virtual environment:
   `python -m venv .venv`
2. Activate it:
   `source .venv/bin/activate`
3. Install dependencies:
   `pip install -r requirements.txt`
4. Add any required environment variables to `.env`
5. Run the agent:
   `python main.py`

Adjust parameters in `main.py` as needed for target URL, credentials, timeouts, and exploration behavior.

## Run The Frontend

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` if the app needs Gemini access.
3. Run the app:
   `npm run dev`

## Workflow Details

The process is:

1. Start from a URL and optional login credentials.
2. Capture the current UI state, including URL, title, DOM summary, and candidate elements.
3. Manage discovered states and transitions as nodes and edges.
4. Use an exploration strategy such as BFS or DFS to choose the next action.
5. Execute actions with Playwright, such as click, fill, submit, or navigate.
6. Capture each new state and detect duplicates by URL and content.
7. Continue until all reachable states are explored or a timeout is reached.
8. Output graph data in `agent_output/graph.json`, with screenshots in `agent_output/screenshots/`.

## Edge Cases

- Same URL with different content, such as a modal or changed state.
- Same URL and same content, which is deduplicated as an existing state.
