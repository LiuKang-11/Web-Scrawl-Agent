
"""
main.py - Minimal prototype for an AI Web Agent / Interactive Site Graph Mapper

What this prototype does:
- Opens a target URL with Playwright
- Optionally logs in if credentials and selectors are provided
- Extracts visible interactive elements from the page
- Builds a deterministic state fingerprint
- Uses an LLM to choose the next action from candidate elements
- Executes the action
- Records nodes and edges in a JSON graph

Notes:
- This is intentionally scoped for an interview prototype.
- It favors clarity and modularity over exhaustive coverage.
- LLM usage is narrow: semantic action selection only.
"""

import os
import json
import time
import hashlib
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional, Tuple

from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeoutError

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


# -----------------------------
# Environment loading
# -----------------------------

def load_env_file(path: str = ".env") -> None:
    """
    Load a minimal shell-style .env file.
    Supports lines like:
      OPENAI_API_KEY=...
      export OPENAI_API_KEY=...
    Ignores blank lines, comments, and non-assignment lines.
    """
    if not os.path.exists(path):
        return

    try:
        with open(path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue

                if line.startswith("export "):
                    line = line[len("export "):].strip()

                if "=" not in line:
                    continue

                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()

                if not key or key in os.environ:
                    continue

                if (
                    len(value) >= 2
                    and value[0] == value[-1]
                    and value[0] in {"'", '"'}
                ):
                    value = value[1:-1]

                os.environ[key] = value
    except Exception as e:
        print(f"[WARN] Failed to load {path}: {e}")


load_env_file()


# -----------------------------
# Configuration
# -----------------------------

OUTPUT_DIR = "agent_output"
SCREENSHOT_DIR = os.path.join(OUTPUT_DIR, "screenshots")
GRAPH_PATH = os.path.join(OUTPUT_DIR, "graph.json")

MAX_STATES = 5
MAX_STEPS = 12
WAIT_AFTER_ACTION_MS = 1200
DEFAULT_TIMEOUT_MS = 5000


# -----------------------------
# Data models
# -----------------------------

@dataclass
class InteractiveElement:
    id: str
    role: str
    text: str
    selector: str
    tag: str

@dataclass
class StateNode:
    id: str
    url: str
    title: str
    state_fingerprint: str
    interactive_elements: List[str]
    screenshot: str

@dataclass
class Edge:
    from_state: str
    to_state: str
    action: Dict[str, Any]


# -----------------------------
# Utility helpers
# -----------------------------

def ensure_dirs() -> None:
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]

def normalize_text(text: str) -> str:
    return " ".join((text or "").split()).strip()

def safe_page_wait(page: Page, timeout_ms: int = DEFAULT_TIMEOUT_MS) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except PlaywrightTimeoutError:
        pass
    page.wait_for_timeout(WAIT_AFTER_ACTION_MS)

def save_graph(nodes: List[StateNode], edges: List[Edge]) -> None:
    payload = {
        "nodes": [
            {
                "id": n.id,
                "url": n.url,
                "title": n.title,
                "state_fingerprint": n.state_fingerprint,
                "interactive_elements": n.interactive_elements,
                "screenshot": n.screenshot,
            }
            for n in nodes
        ],
        "edges": [
            {
                "from": e.from_state,
                "to": e.to_state,
                "action": e.action,
            }
            for e in edges
        ],
    }
    with open(GRAPH_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

def build_state_fingerprint(
    url: str,
    title: str,
    headings: List[str],
    elements: List[InteractiveElement],
    dialog_present: bool,
) -> str:
    normalized = {
        "url": url.split("#")[0],
        "title": normalize_text(title),
        "headings": [normalize_text(h) for h in headings[:5]],
        "elements": [f"{el.role}:{normalize_text(el.text)}" for el in elements[:20]],
        "dialog": dialog_present,
    }
    return sha256_text(json.dumps(normalized, sort_keys=True))

def describe_elements_for_llm(elements: List[InteractiveElement]) -> List[Dict[str, Any]]:
    return [
        {
            "id": el.id,
            "role": el.role,
            "text": el.text,
            "tag": el.tag,
        }
        for el in elements
    ]


def parse_json_response(content: str) -> Dict[str, Any]:
    content = (content or "").strip()
    if not content:
        raise ValueError("LLM returned empty content.")

    if content.startswith("```"):
        lines = content.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        content = "\n".join(lines).strip()

    return json.loads(content)


# -----------------------------
# Page observation
# -----------------------------

def extract_headings(page: Page) -> List[str]:
    headings = page.locator("h1, h2, h3").all_inner_texts()
    cleaned = [normalize_text(h) for h in headings if normalize_text(h)]
    return cleaned[:10]

def extract_interactive_elements(page: Page) -> List[InteractiveElement]:
    """
    Pull visible clickable-ish elements.
    For an interview prototype, we keep this heuristic-based and simple.
    """
    js = """
    () => {
      const selectors = [
        'a[href]',
        'button',
        '[role="button"]',
        '[role="link"]',
        '[role="tab"]',
        'input[type="button"]',
        'input[type="submit"]',
        'summary'
      ];

      const nodes = Array.from(document.querySelectorAll(selectors.join(',')));

      function isVisible(el) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style &&
               style.visibility !== 'hidden' &&
               style.display !== 'none' &&
               rect.width > 0 &&
               rect.height > 0;
      }

      function getText(el) {
        return (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
      }

      return nodes
        .filter(isVisible)
        .slice(0, 40)
        .map((el, idx) => {
          const text = getText(el);
          const tag = (el.tagName || '').toLowerCase();
          const role = el.getAttribute('role') || tag;
          const testid = el.getAttribute('data-testid');
          const aria = el.getAttribute('aria-label');
          let selector = '';

          if (testid) {
            selector = `[data-testid="${testid}"]`;
          } else if (aria) {
            selector = `${tag}[aria-label="${aria}"]`;
          } else if (el.id) {
            selector = `#${el.id}`;
          } else if (text) {
            selector = `text=${text}`;
          } else {
            selector = `${tag}:nth-of-type(${idx + 1})`;
          }

          return {
            id: `el_${idx + 1}`,
            role,
            text,
            selector,
            tag
          };
        })
        .filter(x => x.text || x.role);
    }
    """
    raw = page.evaluate(js)
    seen = set()
    elements: List[InteractiveElement] = []
    for item in raw:
        key = (item["role"], item["text"], item["selector"])
        if key in seen:
            continue
        seen.add(key)
        elements.append(
            InteractiveElement(
                id=item["id"],
                role=normalize_text(item["role"]),
                text=normalize_text(item["text"])[:120],
                selector=item["selector"],
                tag=item["tag"],
            )
        )
    return elements[:20]

def is_dialog_present(page: Page) -> bool:
    try:
        return page.locator('[role="dialog"], dialog, [aria-modal="true"]').count() > 0
    except Exception:
        return False

def observe_page(page: Page, state_index: int) -> Tuple[StateNode, List[InteractiveElement]]:
    url = page.url
    title = page.title()
    headings = extract_headings(page)
    elements = extract_interactive_elements(page)
    dialog_present = is_dialog_present(page)

    fingerprint = build_state_fingerprint(
        url=url,
        title=title,
        headings=headings,
        elements=elements,
        dialog_present=dialog_present,
    )

    state_id = f"state_{state_index:03d}"
    screenshot_path = os.path.join(SCREENSHOT_DIR, f"{state_id}.png")
    page.screenshot(path=screenshot_path, full_page=True)

    node = StateNode(
        id=state_id,
        url=url,
        title=title,
        state_fingerprint=fingerprint,
        interactive_elements=[f"{e.id}:{e.role}:{e.text}" for e in elements],
        screenshot=screenshot_path,
    )
    return node, elements


# -----------------------------
# LLM integration
# -----------------------------

class ActionSelector:
    def __init__(self, model: Optional[str] = None):
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        self.client = None
        self.last_error: Optional[str] = None
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and OpenAI is not None:
            self.client = OpenAI(api_key=api_key)

    def choose_action(
        self,
        page_summary: Dict[str, Any],
        candidates: List[InteractiveElement],
        tried_action_ids: List[str],
    ) -> Optional[Dict[str, Any]]:
        remaining = [c for c in candidates if c.id not in tried_action_ids]
        if not remaining:
            return None

        self.last_error = None

        if self.client is None:
            # Deterministic fallback
            chosen = remaining[0]
            return {
                "action": "click",
                "target_id": chosen.id,
                "reason": "Fallback heuristic: first untried visible interactive element."
            }

        prompt = {
            "task": "Choose the single best next UI action to discover a new state in a web app.",
            "rules": [
                "Return valid JSON only.",
                "Choose exactly one action.",
                "Only select from the provided candidate elements.",
                "Prefer navigation, tabs, drawers, modals, and meaningful section changes.",
                "Avoid actions already tried in this state."
            ],
            "page": page_summary,
            "tried_action_ids": tried_action_ids,
            "candidates": describe_elements_for_llm(remaining),
            "output_schema": {
                "action": "click",
                "target_id": "el_1",
                "reason": "brief reason"
            }
        }

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": "You are a UI exploration planner. Return strict JSON only."
                    },
                    {
                        "role": "user",
                        "content": json.dumps(prompt)
                    }
                ]
            )
            content = response.choices[0].message.content.strip()
            decision = parse_json_response(content)
            target_ids = {c.id for c in remaining}
            if decision.get("action") == "click" and decision.get("target_id") in target_ids:
                return decision
            self.last_error = f"LLM returned unusable decision: {content}"
            print(f"[WARN] {self.last_error}")
        except Exception as e:
            self.last_error = f"{type(e).__name__}: {e}"
            print(f"[WARN] LLM action selection failed: {self.last_error}")

        chosen = remaining[0]
        return {
            "action": "click",
            "target_id": chosen.id,
            "reason": (
                f"Fallback after LLM failure: {self.last_error}"
                if self.last_error
                else "Fallback after LLM failure."
            )
        }


# -----------------------------
# Browser actions
# -----------------------------

def find_element_by_id(elements: List[InteractiveElement], target_id: str) -> Optional[InteractiveElement]:
    for el in elements:
        if el.id == target_id:
            return el
    return None

def execute_action(page: Page, action: Dict[str, Any], elements: List[InteractiveElement]) -> bool:
    target = find_element_by_id(elements, action["target_id"])
    if target is None:
        return False

    try:
        locator = page.locator(target.selector).first
        locator.click(timeout=DEFAULT_TIMEOUT_MS)
        safe_page_wait(page)
        return True
    except Exception:
        # fallback: try text-based click if selector is brittle
        try:
            if target.text:
                page.get_by_text(target.text, exact=False).first.click(timeout=DEFAULT_TIMEOUT_MS)
                safe_page_wait(page)
                return True
        except Exception:
            return False
    return False


# -----------------------------
# Optional login
# -----------------------------

def maybe_login(page: Page) -> None:
    """
    Optional environment variables:
    LOGIN_USERNAME
    LOGIN_PASSWORD
    LOGIN_USERNAME_SELECTOR
    LOGIN_PASSWORD_SELECTOR
    LOGIN_SUBMIT_SELECTOR
    """
    username = os.getenv("LOGIN_USERNAME")
    password = os.getenv("LOGIN_PASSWORD")
    user_sel = os.getenv("LOGIN_USERNAME_SELECTOR")
    pass_sel = os.getenv("LOGIN_PASSWORD_SELECTOR")
    submit_sel = os.getenv("LOGIN_SUBMIT_SELECTOR")

    if not all([username, password, user_sel, pass_sel, submit_sel]):
        return

    try:
        page.locator(user_sel).fill(username, timeout=DEFAULT_TIMEOUT_MS)
        page.locator(pass_sel).fill(password, timeout=DEFAULT_TIMEOUT_MS)
        page.locator(submit_sel).click(timeout=DEFAULT_TIMEOUT_MS)
        safe_page_wait(page)
    except Exception as e:
        print(f"[WARN] Login failed: {e}")


# -----------------------------
# Main agent loop
# -----------------------------

def run_agent(start_url: str) -> Dict[str, Any]:
    ensure_dirs()

    nodes: List[StateNode] = []
    edges: List[Edge] = []

    state_fingerprint_to_id: Dict[str, str] = {}
    tried_actions_by_state: Dict[str, set] = {}

    selector = ActionSelector()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(start_url, wait_until="domcontentloaded")
        safe_page_wait(page)

        maybe_login(page)

        state_counter = 1
        current_node, current_elements = observe_page(page, state_counter)

        nodes.append(current_node)
        state_fingerprint_to_id[current_node.state_fingerprint] = current_node.id
        tried_actions_by_state[current_node.id] = set()

        step = 0
        while step < MAX_STEPS and len(nodes) < MAX_STATES:
            step += 1
            current_state_id = current_node.id

            page_summary = {
                "url": current_node.url,
                "title": current_node.title,
                "interactive_elements": describe_elements_for_llm(current_elements),
            }

            action = selector.choose_action(
                page_summary=page_summary,
                candidates=current_elements,
                tried_action_ids=list(tried_actions_by_state[current_state_id]),
            )

            if action is None:
                print(f"[INFO] No remaining actions in {current_state_id}. Stopping.")
                break

            tried_actions_by_state[current_state_id].add(action["target_id"])
            success = execute_action(page, action, current_elements)

            if not success:
                print(f"[WARN] Failed action in {current_state_id}: {action}")
                continue

            tentative_node, next_elements = observe_page(page, state_counter + 1)

            if tentative_node.state_fingerprint in state_fingerprint_to_id:
                next_state_id = state_fingerprint_to_id[tentative_node.state_fingerprint]
                edges.append(
                    Edge(
                        from_state=current_state_id,
                        to_state=next_state_id,
                        action={
                            "type": action["action"],
                            "target": action["target_id"],
                            "description": action.get("reason", ""),
                        },
                    )
                )
                # Reconstruct current_node by looking it up
                matched = [n for n in nodes if n.id == next_state_id][0]
                current_node = matched
                current_elements = next_elements
                tried_actions_by_state.setdefault(current_node.id, set())
            else:
                state_counter += 1
                current_node = StateNode(
                    id=f"state_{state_counter:03d}",
                    url=tentative_node.url,
                    title=tentative_node.title,
                    state_fingerprint=tentative_node.state_fingerprint,
                    interactive_elements=tentative_node.interactive_elements,
                    screenshot=tentative_node.screenshot,
                )
                nodes.append(current_node)
                state_fingerprint_to_id[current_node.state_fingerprint] = current_node.id
                tried_actions_by_state[current_node.id] = set()
                edges.append(
                    Edge(
                        from_state=current_state_id,
                        to_state=current_node.id,
                        action={
                            "type": action["action"],
                            "target": action["target_id"],
                            "description": action.get("reason", ""),
                        },
                    )
                )
                current_elements = next_elements

        browser.close()

    save_graph(nodes, edges)
    return {
        "nodes": [asdict(n) for n in nodes],
        "edges": [asdict(e) for e in edges],
        "graph_path": GRAPH_PATH,
    }


# -----------------------------
# CLI entry
# -----------------------------

if __name__ == "__main__":
    target_url = os.getenv("TARGET_URL", "https://google.com")
    result = run_agent(target_url)
    print(json.dumps(result, indent=2))
