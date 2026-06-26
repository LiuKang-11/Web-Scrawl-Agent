"""
Layer 1: Web Exploration Engine
Uses Playwright to crawl a website via BFS/DFS, capturing states and transitions.
"""

import asyncio
import heapq
import json
import hashlib
import os
import time
import base64
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Page, BrowserContext

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None


@dataclass
class State:
    state_id: str
    url: str
    title: str
    page_summary: str
    screenshot_b64: Optional[str]
    screenshot_path: Optional[str]
    interactive_elements: list
    dom_fingerprint: str
    modal_context: Optional[str]
    backend_requests: list


@dataclass
class Transition:
    from_state: str
    to_state: str
    action_type: str       # click | submit | navigate | fill
    target_element: str
    action_description: str
    success: bool
    timestamp: float
    api_effects: list = field(default_factory=list)
    score: float = 0.0
    safety: str = "unknown"
    safety_reason: str = ""
    path: list = field(default_factory=list)


@dataclass(order=True)
class FrontierItem:
    priority: float
    order: int
    parent_state_id: str = field(compare=False)
    path_to_parent: list = field(compare=False)
    action: dict = field(compare=False)


class WebExplorer:
    """
    BFS-based web explorer that treats each unique DOM fingerprint as a new state.
    """

    def __init__(
        self,
        target_url: str,
        credentials: dict = None,
        max_states: int = 50,
        strategy: str = "bfs",   # "bfs" or "dfs"
        headless: bool = True,
        llm_rerank: bool = True,
        allow_external_links: bool = False,
        screenshot_dir: str = "screenshots",
    ):
        self.target_url = target_url
        self.credentials = credentials or {}
        self.max_states = max_states
        self.strategy = strategy
        self.headless = headless
        self.llm_rerank = llm_rerank
        self.allow_external_links = allow_external_links
        self.screenshot_dir = Path(screenshot_dir)

        self.states: dict[str, State] = {}
        self.transitions: list[Transition] = []
        self.filtered_actions: list[dict] = []
        self.visited_fingerprints: dict[str, str] = {}   # fingerprint -> state_id
        self._api_log: list[dict] = []
        self._frontier_order = 0
        self._scheduled_actions: set[tuple[str, str]] = set()
        self._state_paths: dict[str, list] = {}
        self._start_url_after_login = target_url
        self._llm_client = (
            Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            if llm_rerank and Anthropic and os.environ.get("ANTHROPIC_API_KEY")
            else None
        )

    # ------------------------------------------------------------------ #
    #  Public entry point                                                  #
    # ------------------------------------------------------------------ #

    async def explore(self) -> dict:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=self.headless)
            context = await browser.new_context(viewport={"width": 1280, "height": 800})
            context.on("request", self._on_request)

            page = await context.new_page()

            if self.credentials:
                await self._login(page)

            await page.goto(self.target_url, wait_until="networkidle")
            initial = await self._capture_state(page, "s0")
            self._register_state(initial)

            self._start_url_after_login = initial.url
            self._state_paths[initial.state_id] = []
            frontier: list[FrontierItem] = []
            self._expand_frontier(frontier, initial, [])

            while frontier and len(self.states) < self.max_states:
                item = heapq.heappop(frontier)
                parent = self.states[item.parent_state_id]
                target_id = await self._explore_frontier_item(context, parent, item)

                if target_id and target_id not in self._state_paths:
                    path = item.path_to_parent + [item.action]
                    self._state_paths[target_id] = path
                    self._expand_frontier(frontier, self.states[target_id], path)

            await browser.close()

        return self._export()

    # ------------------------------------------------------------------ #
    #  State capture                                                       #
    # ------------------------------------------------------------------ #

    async def _capture_state(self, page: Page, state_id: str) -> State:
        url = page.url
        title = await page.title()
        elements = await self._get_elements(page)
        summary = await page.evaluate(
            "() => document.body?.innerText?.slice(0, 400) || ''"
        )
        screenshot = await page.screenshot(type="png", full_page=True)
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)
        screenshot_path = self.screenshot_dir / f"{state_id}.png"
        screenshot_path.write_bytes(screenshot)
        modal = await self._get_modal(page)
        fingerprint = await self._state_fingerprint(page, url, title, elements, modal)
        requests = list(self._api_log[-5:])
        self._api_log.clear()

        return State(
            state_id=state_id,
            url=url,
            title=title,
            page_summary=summary.strip(),
            screenshot_b64=base64.b64encode(screenshot).decode(),
            screenshot_path=str(screenshot_path),
            interactive_elements=elements,
            dom_fingerprint=fingerprint,
            modal_context=modal,
            backend_requests=requests,
        )

    async def _get_elements(self, page: Page) -> list:
        return await page.evaluate("""() => {
            const sel = [
                'button',
                'a[href]',
                'input',
                'select',
                'textarea',
                '[role="button"]',
                '[role="link"]',
                '[role="tab"]',
                '[onclick]',
                'summary'
            ].join(',');

            function isVisible(el) {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style &&
                    style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    rect.width > 0 &&
                    rect.height > 0;
            }

            function cssEscape(value) {
                return String(value).replace(/["\\\\]/g, '\\\\$&');
            }

            function getText(el) {
                return (
                    el.innerText ||
                    el.value ||
                    el.getAttribute('aria-label') ||
                    el.placeholder ||
                    el.textContent ||
                    ''
                ).trim();
            }

            return [...document.querySelectorAll(sel)]
                .filter(isVisible)
                .slice(0, 40)
                .map((el, idx) => {
                    const tag = el.tagName.toLowerCase();
                    const text = getText(el).slice(0, 80);
                    const role = el.getAttribute('role') || tag;
                    const testid = el.getAttribute('data-testid');
                    const aria = el.getAttribute('aria-label');
                    let selector = '';

                    if (testid) {
                        selector = `[data-testid="${cssEscape(testid)}"]`;
                    } else if (aria) {
                        selector = `${tag}[aria-label="${cssEscape(aria)}"]`;
                    } else if (el.id) {
                        selector = `#${cssEscape(el.id)}`;
                    } else if (el.name) {
                        selector = `${tag}[name="${cssEscape(el.name)}"]`;
                    } else {
                        selector = `${tag}:nth-of-type(${idx + 1})`;
                    }

                    return {
                        tag,
                        text,
                        type: el.type || role || '',
                        role,
                        href: el.href || '',
                        id: el.id || '',
                        name: el.name || '',
                        selector,
                        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
                        visible: true,
                    };
                });
        }""")

    async def _get_modal(self, page: Page) -> Optional[str]:
        el = await page.query_selector('[role="dialog"],[aria-modal="true"],.modal')
        return (await el.inner_text())[:200] if el else None

    async def _state_fingerprint(
        self,
        page: Page,
        url: str,
        title: str,
        elements: list,
        modal: Optional[str],
    ) -> str:
        headings = await page.evaluate("""() =>
            [...document.querySelectorAll('h1,h2,h3')]
                .map(el => (el.innerText || el.textContent || '').trim())
                .filter(Boolean)
                .slice(0, 8)
        """)
        payload = {
            "url": url.split("#")[0],
            "title": " ".join(title.split()),
            "headings": [" ".join(h.split()) for h in headings],
            "actions": [
                {
                    "tag": e.get("tag", ""),
                    "role": e.get("role", ""),
                    "text": " ".join(e.get("text", "").split())[:80],
                    "href": e.get("href", "").split("#")[0],
                }
                for e in elements[:30]
            ],
            "modal": bool(modal),
        }
        return hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()

    # ------------------------------------------------------------------ #
    #  Exploration step                                                    #
    # ------------------------------------------------------------------ #

    async def _explore_frontier_item(
        self, ctx: BrowserContext, state: State, item: FrontierItem
    ) -> Optional[str]:
        page = await ctx.new_page()
        action = item.action
        try:
            await page.goto(self._start_url_after_login, wait_until="networkidle", timeout=10_000)
            await self._replay_path(page, item.path_to_parent)
            await self._click_action(page, action)
            await self._safe_wait(page)

            new_id = f"s{len(self.states)}"
            new_state = await self._capture_state(page, new_id)
            fp = new_state.dom_fingerprint

            if fp in self.visited_fingerprints:
                target_id = self.visited_fingerprints[fp]
            else:
                self._register_state(new_state)
                target_id = new_id

            self.transitions.append(Transition(
                from_state=state.state_id,
                to_state=target_id,
                action_type="click",
                target_element=action.get("text") or action.get("selector", ""),
                action_description=(
                    f"Click {action.get('tag','')} '{action.get('text','')}' "
                    f"(score={action.get('score', 0):.2f})"
                ),
                success=True,
                timestamp=time.time(),
                api_effects=list(self._api_log[-3:]),
                score=action.get("score", 0.0),
                safety=action.get("safety", "unknown"),
                safety_reason=action.get("safety_reason", ""),
                path=[
                    self._action_summary(a)
                    for a in item.path_to_parent + [action]
                ],
            ))
            return target_id

        except Exception as exc:
            self.transitions.append(Transition(
                from_state=state.state_id,
                to_state=state.state_id,
                action_type="click",
                target_element=action.get("text", ""),
                action_description=f"FAILED: {str(exc)[:80]}",
                success=False,
                timestamp=time.time(),
                score=action.get("score", 0.0),
                safety=action.get("safety", "unknown"),
                safety_reason=action.get("safety_reason", ""),
                path=[
                    self._action_summary(a)
                    for a in item.path_to_parent + [action]
                ],
            ))
            return None
        finally:
            await page.close()

    # ------------------------------------------------------------------ #
    #  Auth                                                                #
    # ------------------------------------------------------------------ #

    async def _login(self, page: Page):
        login_url = self.credentials.get("login_url", self.target_url + "/login")
        await page.goto(login_url, wait_until="networkidle")
        if u := self.credentials.get("username"):
            await page.fill(
                'input[type="email"],input[name="username"],input[name="email"]', u
            )
        if p := self.credentials.get("password"):
            await page.fill('input[type="password"]', p)
        await page.click('button[type="submit"],input[type="submit"]')
        await page.wait_for_load_state("networkidle")

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #

    def _register_state(self, s: State):
        self.states[s.state_id] = s
        self.visited_fingerprints[s.dom_fingerprint] = s.state_id

    def _expand_frontier(self, frontier: list[FrontierItem], state: State, path: list):
        actions = []
        for elem in state.interactive_elements:
            action = dict(elem)
            action["action_type"] = "click"
            action["action_key"] = self._action_key(action)

            safety, reason = self._classify_safety(action)
            action["safety"] = safety
            action["safety_reason"] = reason
            if safety != "safe":
                self.filtered_actions.append({
                    "state_id": state.state_id,
                    "text": action.get("text", ""),
                    "tag": action.get("tag", ""),
                    "href": action.get("href", ""),
                    "safety": safety,
                    "reason": reason,
                })
                continue

            schedule_key = (state.state_id, action["action_key"])
            if schedule_key in self._scheduled_actions:
                continue

            action["score"] = self._heuristic_score(state, action)
            action["score_reason"] = self._score_reason(state, action)
            actions.append(action)

        actions = self._llm_rerank_actions(state, actions)

        for action in actions[:10]:
            self._scheduled_actions.add((state.state_id, action["action_key"]))
            self._frontier_order += 1
            depth_penalty = len(path) * 0.05
            if self.strategy == "dfs":
                depth_penalty = -len(path) * 0.05
            priority = -(action["score"] - depth_penalty)
            heapq.heappush(
                frontier,
                FrontierItem(
                    priority=priority,
                    order=self._frontier_order,
                    parent_state_id=state.state_id,
                    path_to_parent=list(path),
                    action=action,
                ),
            )

    def _classify_safety(self, action: dict) -> tuple[str, str]:
        if not action.get("visible", True):
            return "unsafe", "Hidden action."
        if action.get("disabled"):
            return "unsafe", "Disabled action."

        combined = " ".join([
            action.get("text", ""),
            action.get("type", ""),
            action.get("role", ""),
            action.get("href", ""),
            action.get("selector", ""),
            action.get("name", ""),
        ]).lower()

        text = action.get("text", "")
        if self._looks_like_css_or_code(text):
            return "unsafe", "Candidate text looks like CSS/code, not a user action."

        destructive_keywords = [
            "delete", "remove", "destroy", "drop", "purge", "wipe",
            "cancel subscription", "close account", "deactivate account",
            "terminate", "unsubscribe", "refund", "charge", "pay now",
            "purchase", "buy now", "place order", "submit order",
            "transfer", "withdraw", "send money", "confirm payment",
        ]
        if any(keyword in combined for keyword in destructive_keywords):
            return "unsafe", "Matches destructive or irreversible action keyword."

        risky_input_types = {"password", "file", "hidden"}
        if action.get("tag") == "input" and action.get("type") in risky_input_types:
            return "unsafe", "Input type is not executable as a safe click action."

        href = action.get("href", "")
        if href and not self.allow_external_links and not self._same_origin(href):
            return "unsafe", "External navigation is outside the target origin."

        return "safe", "Allowed by deterministic safety rules."

    def _heuristic_score(self, state: State, action: dict) -> float:
        combined = " ".join([
            action.get("text", ""),
            action.get("type", ""),
            action.get("role", ""),
            action.get("href", ""),
            action.get("name", ""),
        ]).lower()

        score = 0.30
        high_value = [
            "login", "log in", "sign in", "signup", "sign up", "register",
            "checkout", "cart", "profile", "account", "settings", "admin",
            "search", "filter", "upload", "download", "continue", "next",
            "submit", "save", "edit", "create", "new", "add", "reset password",
        ]
        reveal_ui = [
            "menu", "more", "details", "view", "open", "expand", "tab",
            "modal", "dialog", "select", "dropdown",
        ]
        low_value = [
            "privacy", "terms", "cookie", "help", "docs", "blog", "about",
            "contact", "facebook", "twitter", "linkedin", "instagram",
            "theme", "dark mode", "language",
        ]

        for keyword in high_value:
            if keyword in combined:
                score += 0.18
        for keyword in reveal_ui:
            if keyword in combined:
                score += 0.08
        for keyword in low_value:
            if keyword in combined:
                score -= 0.18

        if action.get("role") in {"tab", "button"}:
            score += 0.08
        if action.get("tag") == "a" and action.get("href"):
            score += 0.05
        if action.get("tag") in {"select", "textarea"}:
            score -= 0.05
        if state.modal_context:
            score += 0.05

        text = action.get("text", "")
        if not text and not action.get("name"):
            score -= 0.15

        return max(0.0, min(score, 1.0))

    def _score_reason(self, state: State, action: dict) -> str:
        reasons = []
        combined = f"{action.get('text', '')} {action.get('href', '')}".lower()
        if any(k in combined for k in ["login", "sign", "checkout", "profile", "settings", "admin"]):
            reasons.append("critical-flow keyword")
        if any(k in combined for k in ["next", "continue", "submit", "save", "search"]):
            reasons.append("workflow-progress keyword")
        if state.modal_context:
            reasons.append("modal context")
        if not reasons:
            reasons.append("default safe action")
        return ", ".join(reasons)

    def _llm_rerank_actions(self, state: State, actions: list[dict]) -> list[dict]:
        if not self._llm_client or len(actions) < 2:
            return sorted(actions, key=lambda a: a.get("score", 0), reverse=True)

        payload = {
            "task": "Rerank safe UI actions by expected value for discovering test-worthy web app states.",
            "rules": [
                "Only rerank actions already marked safe.",
                "Do not introduce new actions.",
                "Prefer critical user flows, validation states, auth, forms, settings, search, and checkout.",
                "Deprioritize footer, marketing, social, docs, purely cosmetic, or duplicate-looking actions.",
            ],
            "state": {
                "id": state.state_id,
                "url": state.url,
                "title": state.title,
                "summary": state.page_summary[:300],
                "modal": state.modal_context,
            },
            "actions": [
                {
                    "key": a["action_key"],
                    "text": a.get("text", ""),
                    "tag": a.get("tag", ""),
                    "role": a.get("role", ""),
                    "href": a.get("href", ""),
                    "heuristic_score": a.get("score", 0),
                    "heuristic_reason": a.get("score_reason", ""),
                }
                for a in actions[:20]
            ],
            "output_schema": {
                "ranked_action_keys": ["action key in preferred order"]
            },
        }

        try:
            response = self._llm_client.messages.create(
                model=os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-5"),
                max_tokens=800,
                temperature=0,
                messages=[{"role": "user", "content": json.dumps(payload)}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw.strip())
            ranked_keys = data.get("ranked_action_keys", [])
            rank_map = {key: idx for idx, key in enumerate(ranked_keys)}
            for action in actions:
                if action["action_key"] in rank_map:
                    action["llm_rank"] = rank_map[action["action_key"]]
                    action["score"] = min(
                        1.0,
                        action.get("score", 0) + max(0.0, 0.20 - rank_map[action["action_key"]] * 0.02),
                    )
            return sorted(
                actions,
                key=lambda a: (a.get("llm_rank", 999), -a.get("score", 0)),
            )
        except Exception:
            return sorted(actions, key=lambda a: a.get("score", 0), reverse=True)

    async def _replay_path(self, page: Page, path: list):
        for action in path:
            await self._click_action(page, action)
            await self._safe_wait(page)

    async def _click_action(self, page: Page, action: dict):
        selector = action.get("selector") or self._selector(action)
        text = action.get("text", "").strip()
        try:
            locator = page.locator(selector)
            if text:
                locator = locator.filter(has_text=text)
            await locator.first.click(timeout=4_000)
            return
        except Exception:
            try:
                await page.locator(selector).first.click(timeout=2_000)
                return
            except Exception:
                pass
            if text:
                await page.get_by_text(text, exact=False).first.click(timeout=4_000)
                return
            raise

    async def _safe_wait(self, page: Page):
        try:
            await page.wait_for_load_state("networkidle", timeout=6_000)
        except Exception:
            pass
        await page.wait_for_timeout(400)

    def _same_origin(self, href: str) -> bool:
        parsed_href = urlparse(href)
        parsed_target = urlparse(self.target_url)
        if not parsed_href.netloc:
            return True
        return parsed_href.netloc == parsed_target.netloc

    def _action_key(self, action: dict) -> str:
        identity = {
            "tag": action.get("tag", ""),
            "role": action.get("role", ""),
            "type": action.get("type", ""),
            "text": action.get("text", ""),
            "href": action.get("href", ""),
            "selector": action.get("selector", ""),
            "name": action.get("name", ""),
        }
        return hashlib.md5(json.dumps(identity, sort_keys=True).encode()).hexdigest()[:12]

    def _looks_like_css_or_code(self, text: str) -> bool:
        if not text:
            return False
        css_markers = ["{", "}", ";", ":", "max-width", "object-fit", "display:"]
        return len(text) > 40 and sum(marker in text for marker in css_markers) >= 2

    def _action_summary(self, action: dict) -> dict:
        return {
            "type": action.get("action_type", "click"),
            "text": action.get("text", ""),
            "selector": action.get("selector", ""),
            "score": round(action.get("score", 0.0), 3),
        }

    def _selector(self, elem: dict) -> str:
        if elem.get("selector"):
            return elem["selector"]
        if elem.get("id"):
            return f"#{elem['id']}"
        text = elem.get("text", "").strip()
        if text:
            return f"text={text}"
        return elem.get("tag", "button")

    def _on_request(self, req):
        if req.resource_type in ("xhr", "fetch"):
            try:
                post_data = req.post_data
            except UnicodeDecodeError:
                post_data = "<binary request body>"
            except Exception as exc:
                post_data = f"<unavailable: {type(exc).__name__}>"

            self._api_log.append({
                "url": req.url, "method": req.method, "post": post_data
            })

    def _export(self) -> dict:
        return {
            "nodes": [asdict(s) for s in self.states.values()],
            "edges": [asdict(t) for t in self.transitions],
            "stats": {
                "total_states": len(self.states),
                "total_transitions": len(self.transitions),
                "filtered_actions": len(self.filtered_actions),
                "filtered_action_details": self.filtered_actions[:20],
                "success_rate": round(
                    sum(1 for t in self.transitions if t.success) /
                    max(len(self.transitions), 1), 2
                ),
            },
        }


# ------------------------------------------------------------------ #
#  CLI usage                                                           #
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    import argparse, sys

    parser = argparse.ArgumentParser(description="Web State Graph Explorer")
    parser.add_argument("url", help="Target URL to explore")
    parser.add_argument("--username", default="")
    parser.add_argument("--password", default="")
    parser.add_argument("--login-url", default="")
    parser.add_argument("--max-states", type=int, default=30)
    parser.add_argument("--strategy", choices=["bfs", "dfs"], default="bfs")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--output", default="graph.json")
    parser.add_argument("--screenshot-dir", default="screenshots")
    parser.add_argument("--no-llm-rerank", action="store_true")
    parser.add_argument("--allow-external-links", action="store_true")
    args = parser.parse_args()

    creds = {}
    if args.username:
        creds = {
            "username": args.username,
            "password": args.password,
            "login_url": args.login_url or args.url + "/login",
        }

    explorer = WebExplorer(
        args.url,
        credentials=creds,
        max_states=args.max_states,
        strategy=args.strategy,
        headless=not args.headed,
        llm_rerank=not args.no_llm_rerank,
        allow_external_links=args.allow_external_links,
        screenshot_dir=args.screenshot_dir,
    )
    graph = asyncio.run(explorer.explore())

    with open(args.output, "w") as f:
        json.dump(graph, f, indent=2, default=str)

    print(f"✓ Discovered {graph['stats']['total_states']} states, "
          f"{graph['stats']['total_transitions']} transitions → {args.output}")
