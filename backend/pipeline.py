"""
Agent pipeline for FlowGuard AI.

This module turns a crawler graph into product-level features, test scenarios,
UiPath-ready execution packages, and failure analysis records. The UiPath step
is intentionally a dry-run adapter unless credentials and project mappings are
added, so the app can demo the full workflow without faking external execution.
"""

from __future__ import annotations

import os
import json
import time
import uuid
from dataclasses import dataclass, asdict
from typing import Any
from urllib.parse import urlparse

from uipath_client import UiPathApiError, UiPathConfigError, load_env_files, start_job


@dataclass
class Feature:
    feature: str
    page: str
    elements: list[str]
    runnable_elements: list[dict[str, Any]]
    possible_tests: list[str]
    signals: list[str]
    risk: str = "medium"


@dataclass
class GeneratedTestCase:
    id: str
    name: str
    priority: str
    category: str
    source: str
    steps: list[str]
    actions: list[dict[str, Any]]
    expected_result: str
    feature: str


def _route(url: str) -> str:
    try:
        parsed = urlparse(url)
        return parsed.path or "/"
    except Exception:
        return url or "/"


def _element_name(element: dict[str, Any]) -> str:
    text = element.get("text") or element.get("name") or element.get("id")
    tag = element.get("tag") or element.get("role") or "element"
    kind = element.get("type") if element.get("tag") == "input" else element.get("role")
    parts = [value for value in [text, kind, tag] if value]
    return " ".join(str(parts[0]).split()) if len(parts) == 1 else f"{parts[0]} ({parts[-1]})"


def _runnable_element(element: dict[str, Any]) -> dict[str, Any]:
    return {
        "selector": element.get("selector"),
        "tag": element.get("tag"),
        "role": element.get("role"),
        "type": element.get("type"),
        "name": element.get("name"),
        "text": element.get("text"),
        "href": element.get("href"),
        "disabled": bool(element.get("disabled")),
        "visible": element.get("visible", True),
    }


def _test_value_for_input(element: dict[str, Any], invalid: bool = False) -> str:
    name = f"{element.get('name', '')} {element.get('id', '')} {element.get('type', '')}".lower()
    if "email" in name:
        return "not-an-email" if invalid else "flowguard@example.com"
    if "password" in name:
        return "" if invalid else "FlowGuard123!"
    if "phone" in name or "tel" in name:
        return "abc" if invalid else "5551234567"
    if "zip" in name or "postal" in name:
        return "bad" if invalid else "10001"
    return "" if invalid else "FlowGuard test value"


def _build_actions(feature: dict[str, Any], invalid: bool = False) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = [
        {"type": "navigate", "url": feature.get("page", "/")},
        {"type": "assert_page_loaded", "timeout_ms": 15000},
    ]

    elements = feature.get("runnable_elements", []) or []
    inputs = [
        element for element in elements
        if element.get("selector")
        and element.get("visible") is not False
        and not element.get("disabled")
        and element.get("tag") in {"input", "textarea", "select"}
    ]
    click_targets = [
        element for element in elements
        if element.get("selector")
        and element.get("visible") is not False
        and not element.get("disabled")
        and (element.get("tag") in {"button", "a"} or element.get("role") in {"button", "tab", "link"})
    ]

    for element in inputs[:4]:
        action_type = "select" if element.get("tag") == "select" else "fill"
        actions.append({
            "type": action_type,
            "selector": element["selector"],
            "value": _test_value_for_input(element, invalid=invalid),
            "label": element.get("name") or element.get("text") or element.get("selector"),
        })

    if click_targets:
        target = click_targets[0]
        actions.append({
            "type": "click",
            "selector": target["selector"],
            "label": target.get("text") or target.get("name") or target.get("selector"),
        })

    actions.append({"type": "wait", "milliseconds": 1000})
    actions.append({
        "type": "assert_no_browser_error",
        "expected": "Page remains available and no automation exception is thrown.",
    })
    return actions


def _feature_name(route: str, title: str, elements: list[dict[str, Any]]) -> str:
    probe = f"{route} {title} {' '.join(e.get('text', '') for e in elements)}".lower()
    if any(word in probe for word in ["login", "log in", "signin", "sign in"]):
        return "Login"
    if any(word in probe for word in ["signup", "sign up", "register", "/reg"]):
        return "Registration"
    if "checkout" in probe or "payment" in probe:
        return "Checkout"
    if "cart" in probe:
        return "Cart"
    if any(word in probe for word in ["search", "filter"]):
        return "Search"
    if any(word in probe for word in ["profile", "account", "settings"]):
        return "Account"
    if route == "/":
        return "Home Navigation"
    segment = route.strip("/").split("/")[-1].replace("-", " ").replace("_", " ")
    return segment.title() if segment else "Page Flow"


def extract_features(graph: dict[str, Any]) -> dict[str, Any]:
    features: list[Feature] = []
    api_calls: list[str] = []
    hidden_or_disabled: list[dict[str, str]] = []

    for node in graph.get("nodes", []):
        route = _route(node.get("url", ""))
        elements = node.get("interactive_elements", []) or []
        element_names = [_element_name(element) for element in elements[:12]]
        inputs = [element for element in elements if element.get("tag") in {"input", "select", "textarea"}]
        buttons = [
            element for element in elements
            if element.get("tag") == "button" or element.get("role") in {"button", "tab"}
        ]
        links = [element for element in elements if element.get("tag") == "a" or element.get("href")]

        for element in elements:
            if element.get("disabled") or element.get("visible") is False:
                hidden_or_disabled.append({
                    "page": route,
                    "element": _element_name(element),
                    "reason": "disabled" if element.get("disabled") else "hidden",
                })

        for request in node.get("backend_requests", []) or []:
            method = request.get("method", "GET")
            api_calls.append(f"{method} {_route(request.get('url', ''))}")

        signals = []
        possible_tests = ["page loads successfully", "navigation remains stable"]
        if inputs:
            signals.append("form")
            possible_tests.extend(["empty required fields", "invalid input validation"])
        if buttons:
            signals.append("button actions")
            possible_tests.append("primary button completes expected action")
        if links:
            signals.append("navigation")
            possible_tests.append("links route to expected pages")

        name = _feature_name(route, node.get("title", ""), elements)
        if name in {"Login", "Registration"}:
            possible_tests.extend(["valid credentials flow", "invalid credentials error state"])

        risk = "critical" if name in {"Login", "Checkout", "Registration"} else "medium"
        features.append(Feature(
            feature=name,
            page=route,
            elements=element_names,
            runnable_elements=[_runnable_element(element) for element in elements[:20]],
            possible_tests=sorted(set(possible_tests)),
            signals=signals or ["page"],
            risk=risk,
        ))

    return {
        "features": [asdict(feature) for feature in features],
        "api_calls": sorted(set(api_calls)),
        "hidden_or_disabled_features": hidden_or_disabled[:30],
        "summary": {
            "pages": len(graph.get("nodes", [])),
            "transitions": len(graph.get("edges", [])),
            "features": len(features),
            "api_calls": len(set(api_calls)),
        },
    }


def generate_test_cases(features_payload: dict[str, Any]) -> dict[str, Any]:
    tests: list[GeneratedTestCase] = []
    for index, feature in enumerate(features_payload.get("features", []), start=1):
        priority = "Critical" if feature.get("risk") == "critical" else "High"
        page = feature.get("page", "/")

        tests.append(GeneratedTestCase(
            id=f"AI-TC-{index:04d}",
            name=f"{feature['feature']} should support the expected user flow",
            priority=priority,
            category="UI",
            source="FlowGuard Feature Detection Agent",
            feature=feature["feature"],
            steps=[
                f"Open {page}",
                f"Locate feature: {feature['feature']}",
                "Interact with the primary visible controls",
                "Capture screenshot, console logs, and network requests",
            ],
            actions=_build_actions(feature),
            expected_result=f"{feature['feature']} completes without UI errors and keeps the user on an expected state.",
        ))

        if any("invalid" in test for test in feature.get("possible_tests", [])):
            tests.append(GeneratedTestCase(
                id=f"AI-TC-{index:04d}-NEG",
                name=f"{feature['feature']} should show useful validation errors",
                priority=priority,
                category="Security" if feature["feature"] in {"Login", "Registration"} else "UI",
                source="FlowGuard Test Case Agent",
                feature=feature["feature"],
                steps=[
                    f"Open {page}",
                    "Enter invalid or incomplete data",
                    "Submit the form",
                    "Capture validation message and page state",
                ],
                actions=_build_actions(feature, invalid=True),
                expected_result="The app blocks submission, explains the error, and does not navigate unexpectedly.",
            ))

    return {"test_cases": [asdict(test) for test in tests]}


def create_uipath_execution_package(test_cases: dict[str, Any], graph: dict[str, Any]) -> dict[str, Any]:
    package_id = f"FG-PKG-{uuid.uuid4().hex[:8].upper()}"
    return {
        "package_id": package_id,
        "created_at": int(time.time()),
        "runner": "UiPath Orchestrator",
        "test_manager": {
            "sync_mode": "pull-or-generate",
            "autopilot_ready": True,
            "requires": ["UiPath project id", "test set id or folder id", "robot environment"],
        },
        "inputs": {
            "base_url": graph.get("nodes", [{}])[0].get("url", ""),
            "test_count": len(test_cases.get("test_cases", [])),
            "screenshot_capture": True,
            "console_log_capture": True,
            "network_log_capture": True,
        },
        "test_cases": test_cases.get("test_cases", []),
    }


def run_uipath_execution(package: dict[str, Any]) -> dict[str, Any]:
    load_env_files()
    configured = all([
        os.environ.get("UIPATH_BASE_URL"),
        os.environ.get("UIPATH_ORG_NAME"),
        os.environ.get("UIPATH_TENANT_NAME"),
        os.environ.get("UIPATH_CLIENT_ID"),
        os.environ.get("UIPATH_CLIENT_SECRET"),
        os.environ.get("UIPATH_SCOPES"),
    ])

    if not configured:
        return {
            "mode": "dry_run",
            "status": "ready_for_uipath_credentials",
            "message": "UiPath credentials are not configured; execution package was prepared but not submitted.",
            "orchestrator_job_id": None,
            "results": [
                {
                    "test_case_id": case["id"],
                    "status": "not_run",
                    "logs": ["Dry run only. Configure UiPath credentials to execute in Orchestrator."],
                    "screenshot": None,
                    "error": None,
                }
                for case in package.get("test_cases", [])
            ],
        }

    try:
        response = start_job({
            "package_id": package["package_id"],
            "base_url": package["inputs"]["base_url"],
            "test_cases": json.dumps(package["test_cases"]),
        })
        jobs = response.get("value", []) if isinstance(response, dict) else []
        return {
            "mode": "uipath_orchestrator",
            "status": "submitted",
            "message": "Execution package submitted to UiPath Orchestrator.",
            "orchestrator_job_id": jobs[0].get("Id") if jobs else None,
            "orchestrator_response": response,
            "results": [],
        }
    except (UiPathConfigError, UiPathApiError) as exc:
        return {
            "mode": "integration_ready",
            "status": "uipath_submission_failed",
            "message": str(exc),
            "orchestrator_job_id": None,
            "results": [],
        }


def analyze_failures(execution: dict[str, Any]) -> dict[str, Any]:
    failures = []
    for result in execution.get("results", []):
        if result.get("status") not in {"failed", "error"}:
            continue
        failures.append({
            "test_case_id": result.get("test_case_id"),
            "failure": result.get("error") or "UiPath test execution failed",
            "reason": "Failure Analysis Agent needs robot logs, screenshot, and expected-vs-actual assertion context.",
            "possible_causes": [
                "frontend selector changed",
                "application state did not match test preconditions",
                "API response delay or backend error",
                "UiPath robot/browser environment mismatch",
            ],
            "suggested_fix": "Review the failed step screenshot and robot logs, then update selectors or app validation logic.",
        })

    return {
        "failures": failures,
        "summary": {
            "failed": len(failures),
            "mode": execution.get("mode"),
            "status": execution.get("status"),
        },
    }


def build_agent_pipeline(graph: dict[str, Any]) -> dict[str, Any]:
    features = extract_features(graph)
    test_cases = generate_test_cases(features)
    package = create_uipath_execution_package(test_cases, graph)
    execution = run_uipath_execution(package)
    failure_analysis = analyze_failures(execution)

    return {
        "workflow": [
            "crawl_web_app",
            "extract_features",
            "generate_or_sync_test_cases",
            "package_for_uipath",
            "run_in_orchestrator",
            "collect_artifacts",
            "analyze_failures",
            "publish_dashboard_report",
        ],
        "features": features,
        "test_cases": test_cases,
        "uipath_execution_package": package,
        "execution": execution,
        "failure_analysis": failure_analysis,
    }
