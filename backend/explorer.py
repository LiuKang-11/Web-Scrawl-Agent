"""
Layer 1: Web Exploration Engine
Uses Playwright to crawl a website via BFS/DFS, capturing states and transitions.
"""

import asyncio
import json
import hashlib
import time
import base64
from dataclasses import dataclass, field, asdict
from typing import Optional
from collections import deque

from playwright.async_api import async_playwright, Page, BrowserContext


@dataclass
class State:
    state_id: str
    url: str
    title: str
    page_summary: str
    screenshot_b64: Optional[str]
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
    ):
        self.target_url = target_url
        self.credentials = credentials or {}
        self.max_states = max_states
        self.strategy = strategy
        self.headless = headless

        self.states: dict[str, State] = {}
        self.transitions: list[Transition] = []
        self.visited_fingerprints: dict[str, str] = {}   # fingerprint -> state_id
        self._api_log: list[dict] = []

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

            # frontier: list of (state_id, page_url)
            frontier = deque([(initial.state_id, initial.url)])

            while frontier and len(self.states) < self.max_states:
                sid, url = (frontier.popleft() if self.strategy == "bfs"
                            else frontier.pop())
                current = self.states[sid]

                for elem in current.interactive_elements[:8]:   # cap per state
                    new_sid = await self._explore_element(
                        context, current, elem
                    )
                    if new_sid and new_sid not in [s for s, _ in frontier]:
                        frontier.append((new_sid, self.states[new_sid].url))

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
        screenshot = await page.screenshot(type="png")
        dom = await page.content()
        fingerprint = hashlib.md5(dom.encode()).hexdigest()
        modal = await self._get_modal(page)
        requests = list(self._api_log[-5:])
        self._api_log.clear()

        return State(
            state_id=state_id,
            url=url,
            title=title,
            page_summary=summary.strip(),
            screenshot_b64=base64.b64encode(screenshot).decode(),
            interactive_elements=elements,
            dom_fingerprint=fingerprint,
            modal_context=modal,
            backend_requests=requests,
        )

    async def _get_elements(self, page: Page) -> list:
        return await page.evaluate("""() => {
            const sel = 'button,a[href],input,select,textarea,[role="button"],[onclick]';
            return [...document.querySelectorAll(sel)].slice(0, 20).map(el => ({
                tag: el.tagName.toLowerCase(),
                text: (el.innerText || el.value || el.placeholder || '').slice(0, 60),
                type: el.type || el.getAttribute('role') || '',
                href: el.href || '',
                id: el.id || '',
                name: el.name || '',
                visible: el.offsetParent !== null,
            }));
        }""")

    async def _get_modal(self, page: Page) -> Optional[str]:
        el = await page.query_selector('[role="dialog"],[aria-modal="true"],.modal')
        return (await el.inner_text())[:200] if el else None

    # ------------------------------------------------------------------ #
    #  Exploration step                                                    #
    # ------------------------------------------------------------------ #

    async def _explore_element(
        self, ctx: BrowserContext, state: State, elem: dict
    ) -> Optional[str]:
        page = await ctx.new_page()
        try:
            await page.goto(state.url, wait_until="networkidle", timeout=10_000)
            selector = self._selector(elem)
            await page.click(selector, timeout=4_000)
            await page.wait_for_load_state("networkidle", timeout=6_000)

            dom = await page.content()
            fp = hashlib.md5(dom.encode()).hexdigest()

            if fp in self.visited_fingerprints:
                target_id = self.visited_fingerprints[fp]
            else:
                new_id = f"s{len(self.states)}"
                new_state = await self._capture_state(page, new_id)
                self._register_state(new_state)
                target_id = new_id

            self.transitions.append(Transition(
                from_state=state.state_id,
                to_state=target_id,
                action_type="click",
                target_element=elem.get("text", selector),
                action_description=f"Click {elem.get('tag','')} '{elem.get('text','')}'",
                success=True,
                timestamp=time.time(),
                api_effects=list(self._api_log[-3:]),
            ))
            return target_id

        except Exception as exc:
            self.transitions.append(Transition(
                from_state=state.state_id,
                to_state=state.state_id,
                action_type="click",
                target_element=elem.get("text", ""),
                action_description=f"FAILED: {str(exc)[:80]}",
                success=False,
                timestamp=time.time(),
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

    def _selector(self, elem: dict) -> str:
        if elem.get("id"):
            return f"#{elem['id']}"
        text = elem.get("text", "").strip()
        if text:
            return f"text={text}"
        return elem.get("tag", "button")

    def _on_request(self, req):
        if req.resource_type in ("xhr", "fetch"):
            self._api_log.append({
                "url": req.url, "method": req.method, "post": req.post_data
            })

    def _export(self) -> dict:
        return {
            "nodes": [asdict(s) for s in self.states.values()],
            "edges": [asdict(t) for t in self.transitions],
            "stats": {
                "total_states": len(self.states),
                "total_transitions": len(self.transitions),
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
    parser.add_argument("--max-states", type=int, default=30)
    parser.add_argument("--output", default="graph.json")
    args = parser.parse_args()

    creds = {}
    if args.username:
        creds = {"username": args.username, "password": args.password}

    explorer = WebExplorer(args.url, credentials=creds, max_states=args.max_states)
    graph = asyncio.run(explorer.explore())

    with open(args.output, "w") as f:
        json.dump(graph, f, indent=2, default=str)

    print(f"✓ Discovered {graph['stats']['total_states']} states, "
          f"{graph['stats']['total_transitions']} transitions → {args.output}")
