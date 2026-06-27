"""
Runnable browser action executor for FlowGuard UiPath jobs.

UiPath starts the job and calls this endpoint. Playwright performs the browser
work because it can execute the CSS selectors produced by the crawler.
"""

from __future__ import annotations

import base64
import time
from typing import Any
from urllib.parse import urljoin

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


def _full_url(base_url: str, action_url: str | None) -> str:
    if not action_url:
        return base_url
    return urljoin(base_url.rstrip("/") + "/", action_url.lstrip("/"))


async def _target_box(page: Any, selector: str | None, timeout_ms: int) -> dict[str, float] | None:
    if not selector:
        return None

    locator = page.locator(selector).first
    await locator.scroll_into_view_if_needed(timeout=timeout_ms)
    box = await locator.bounding_box(timeout=timeout_ms)
    if not box:
        return None

    return {
        "x": float(box["x"]),
        "y": float(box["y"]),
        "width": float(box["width"]),
        "height": float(box["height"]),
    }


async def _screenshot_frame(
    page: Any,
    *,
    test_case_id: str | None,
    index: int,
    action_type: str | None,
    label: str,
    status: str,
    bounding_box: dict[str, float] | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    screenshot = await page.screenshot(type="png")
    viewport = page.viewport_size or {"width": 1280, "height": 800}
    return {
        "test_case_id": test_case_id,
        "index": index,
        "type": action_type,
        "label": label,
        "status": status,
        "url": page.url,
        "bounding_box": bounding_box,
        "viewport": viewport,
        "screenshot_b64": base64.b64encode(screenshot).decode(),
        "error": error,
    }


async def run_action_package(
    base_url: str,
    test_cases: list[dict[str, Any]],
    *,
    headless: bool = True,
    timeout_ms: int = 15000,
) -> dict[str, Any]:
    started_at = int(time.time())
    results: list[dict[str, Any]] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})

        for test_case in test_cases:
            page = await context.new_page()
            case_logs: list[str] = []
            case_errors: list[str] = []
            action_results: list[dict[str, Any]] = []
            frames: list[dict[str, Any]] = []
            status = "passed"

            try:
                for index, action in enumerate(test_case.get("actions", []) or [], start=1):
                    action_type = action.get("type")
                    label = action.get("label") or action.get("selector") or action.get("url") or action_type
                    bounding_box: dict[str, float] | None = None

                    try:
                        if action_type == "navigate":
                            target = _full_url(base_url, action.get("url"))
                            await page.goto(target, wait_until="networkidle", timeout=timeout_ms)
                            case_logs.append(f"Navigated to {target}")
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="passed",
                            ))

                        elif action_type == "assert_page_loaded":
                            await page.wait_for_load_state("domcontentloaded", timeout=action.get("timeout_ms") or timeout_ms)
                            case_logs.append("Page loaded")
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="passed",
                            ))

                        elif action_type == "fill":
                            selector = action.get("selector")
                            if not selector:
                                raise ValueError("Missing selector for fill action")
                            bounding_box = await _target_box(page, selector, timeout_ms)
                            await page.locator(selector).first.fill(str(action.get("value", "")), timeout=timeout_ms)
                            case_logs.append(f"Filled {label}")
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="passed",
                                bounding_box=bounding_box,
                            ))

                        elif action_type == "select":
                            selector = action.get("selector")
                            if not selector:
                                raise ValueError("Missing selector for select action")
                            bounding_box = await _target_box(page, selector, timeout_ms)
                            await page.locator(selector).first.select_option(str(action.get("value", "")), timeout=timeout_ms)
                            case_logs.append(f"Selected {label}")
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="passed",
                                bounding_box=bounding_box,
                            ))

                        elif action_type == "click":
                            selector = action.get("selector")
                            if not selector:
                                raise ValueError("Missing selector for click action")
                            bounding_box = await _target_box(page, selector, timeout_ms)
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="running",
                                bounding_box=bounding_box,
                            ))
                            await page.locator(selector).first.click(timeout=timeout_ms)
                            await page.wait_for_load_state("domcontentloaded", timeout=timeout_ms)
                            case_logs.append(f"Clicked {label}")

                        elif action_type == "wait":
                            await page.wait_for_timeout(int(action.get("milliseconds") or 1000))
                            case_logs.append(f"Waited {action.get('milliseconds') or 1000}ms")
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="passed",
                            ))

                        elif action_type == "assert_no_browser_error":
                            case_logs.append("No browser automation error detected")
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="passed",
                            ))

                        else:
                            raise ValueError(f"Unsupported action type: {action_type}")

                        action_results.append({
                            "index": index,
                            "type": action_type,
                            "label": label,
                            "status": "passed",
                        })

                    except (PlaywrightTimeoutError, Exception) as exc:
                        status = "failed"
                        message = str(exc)
                        case_errors.append(message)
                        try:
                            frames.append(await _screenshot_frame(
                                page,
                                test_case_id=test_case.get("id"),
                                index=index,
                                action_type=action_type,
                                label=label,
                                status="failed",
                                bounding_box=bounding_box,
                                error=message,
                            ))
                        except Exception:
                            pass
                        action_results.append({
                            "index": index,
                            "type": action_type,
                            "label": label,
                            "status": "failed",
                            "error": message,
                        })
                        break

                screenshot_b64 = await page.screenshot(type="png", full_page=True)

            except Exception as exc:
                status = "failed"
                case_errors.append(str(exc))
                screenshot_b64 = b""
            finally:
                await page.close()

            results.append({
                "test_case_id": test_case.get("id"),
                "name": test_case.get("name"),
                "status": status,
                "logs": case_logs,
                "errors": case_errors,
                "actions": action_results,
                "frames": frames,
                "screenshot_bytes": len(screenshot_b64),
            })

        await browser.close()

    return {
        "status": "completed",
        "started_at": started_at,
        "finished_at": int(time.time()),
        "summary": {
            "total": len(results),
            "passed": sum(1 for result in results if result["status"] == "passed"),
            "failed": sum(1 for result in results if result["status"] == "failed"),
        },
        "results": results,
    }
