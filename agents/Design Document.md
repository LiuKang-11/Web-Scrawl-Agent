# Design Document: Interactive Site Graph Mapper

## Overview

This system explores a website like a user and builds a structured graph of discovered UI states and transitions.

It starts from a URL, optionally logs in, interacts with visible UI elements, and records:

- nodes: unique page states
- edges: actions that move from one state to another

The design follows a simple loop:

`observe -> define state -> choose action -> execute -> record graph`

---

## Goals

- Explore a modern website beyond static links
- Support optional login flows
- Distinguish states even when the URL does not change
- Output a JSON graph that is easy to inspect and extend

## Non-Goals

- Full browser test coverage
- Robust support for every custom widget
- Production-grade risk control for destructive actions

---

## Workflow

1. Open the target URL.
2. Log in if credentials and selectors are provided.
3. Observe the current page and collect visible interactive elements.
4. Build a compact representation of the current UI state.
5. Check whether this state is new or already visited.
6. Choose the next candidate action.
7. Execute the action with Playwright.
8. Record the transition in the graph.
9. Repeat until limits are reached or no useful actions remain.

---

## Main Components

### 1. Browser Controller

Uses Playwright to:

- open pages
- handle optional login
- click elements and submit simple interactions
- wait for page updates
- capture screenshots

### 2. Observer

Extracts a compact, actionable summary of the page, such as:

- URL
- title
- visible headings
- top visible interactive elements
- whether a modal/dialog is open
- screenshot path

The observer can be mostly Python-based, with optional LLM-assisted extraction in future versions.

### 3. State Manager

Creates a normalized state fingerprint from the observed page data.

This helps detect cases like:

- same URL, different visible content
- same URL, modal open vs. closed
- same URL, different tab or section selected

### 4. Planner

Chooses the next action from the current state's candidate elements.

In the current prototype, this can be:

- LLM-based action selection
- deterministic fallback when LLM is unavailable

### 5. Graph Manager

Maintains:

- the set of discovered states
- the transitions between them
- whether a state-action pair was already tried

It decides whether the new observation becomes:

- a new node
- or an edge to an already known node

---

## State Definition

A state is not defined by URL alone.

The current proposal is to define state using:

- URL
- title
- headings (`h1` / `h2` / `h3`)
- top interactive elements
- modal/dialog presence

This balances simplicity and usefulness for a prototype.

Example:

```json
{
  "url": "/settings",
  "title": "Settings",
  "headings": ["Profile", "Security"],
  "elements": ["Save", "Cancel", "Change password"],
  "dialog_open": false
}
```

---

## Exploration Strategy

The explorer should avoid clicking randomly.

Current strategy:

- collect visible candidate elements
- avoid repeating the same action in the same state
- prefer actions likely to reveal a new screen or UI mode
- stop when max states, max steps, or no remaining actions are reached

Possible traversal modes:

- DFS: deeper exploration of one branch first
- BFS: broader coverage across nearby states first

For the prototype, either is acceptable as long as we keep loop prevention and clear stop conditions.

---

## Output

The final artifact is a structured JSON graph.

### Node

Each node represents one discovered UI state and may include:

- state id
- URL
- title
- state fingerprint
- interactive elements
- screenshot path

### Edge

Each edge represents one action and transition:

- from state
- to state
- action type
- target element
- short description or reason

This output can later support visualization, replay, and test generation.

---

## Key Assumptions

- The most important signals for state identity are visible UI signals, not raw DOM alone.
- A lightweight page summary is enough for action planning in a prototype.
- Playwright handles execution; the planner only decides what to try next.
- A simple graph model is more valuable than a perfect state model at this stage.

---

## Future Trade-Offs To Discuss

### 1. State Precision vs. Simplicity

Using only URL, title, headings, and top elements is easy to explain and cheap to compute, but it may merge different states or split nearly identical ones.

Trade-off:

- simpler fingerprinting is easier to debug
- richer fingerprinting is more accurate but more fragile

### 2. Structured Extraction vs. Accessibility Tree vs. Screenshot

A small structured summary is fast and low-cost, but may miss layout-driven or visually distinct states.

Trade-off:

- structured extraction is cheaper and deterministic
- accessibility tree gives more semantic detail
- screenshots or vision models may catch visual changes but increase cost and complexity

### 3. LLM Planner vs. Hardcoded Heuristics

LLM planning is flexible and better at semantic choices, but depends on API cost, latency, and quota.

Trade-off:

- heuristics are reliable and predictable
- LLMs are smarter but operationally less stable

### 4. DFS vs. BFS

DFS may uncover deep flows faster, while BFS may produce a more balanced map.

Trade-off:

- DFS is simple and can find long workflows
- BFS can improve coverage near the root and reduce early branch bias

### 5. Exploration Speed vs. Safety

Aggressive exploration increases coverage, but also increases the risk of clicking destructive actions.

Trade-off:

- broad exploration finds more states
- conservative exploration is safer for real products

### 6. Deterministic State Matching vs. Similarity Matching

Exact fingerprints are simple, but small text changes can create false new states.

Trade-off:

- exact matching is easier to reason about
- similarity matching is more robust but harder to tune

---

## Next Steps

- add a clearer traversal policy (DFS or BFS)
- improve action ranking and action filtering
- support richer state signals for tabs, drawers, and forms
- add safeguards for destructive actions
- make the graph easier to visualize and replay
