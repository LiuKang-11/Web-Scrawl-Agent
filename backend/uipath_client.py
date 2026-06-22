"""
UiPath Automation Cloud / Orchestrator client.

The client uses OAuth client credentials for confidential external apps. It is
kept dependency-light so the backend can run with the current requirements.
"""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

try:
    import certifi
except ImportError:
    certifi = None


def load_env_files() -> None:
    """Load root .env.local/.env and backend .env files without overwriting env."""
    root = Path(__file__).resolve().parents[1]
    candidates = [
        root / ".env.local",
        root / ".env",
        Path(__file__).resolve().parent / ".env.local",
        Path(__file__).resolve().parent / ".env",
    ]

    for path in candidates:
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[len("export "):].strip()
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


class UiPathConfigError(RuntimeError):
    pass


class UiPathApiError(RuntimeError):
    pass


def _config() -> dict[str, str]:
    load_env_files()
    config = {
        "base_url": os.environ.get("UIPATH_BASE_URL", "https://cloud.uipath.com").rstrip("/"),
        "org": os.environ.get("UIPATH_ORG_NAME", ""),
        "tenant": os.environ.get("UIPATH_TENANT_NAME", ""),
        "client_id": os.environ.get("UIPATH_CLIENT_ID", ""),
        "client_secret": os.environ.get("UIPATH_CLIENT_SECRET", ""),
        "scopes": os.environ.get("UIPATH_SCOPES", ""),
        "folder_id": os.environ.get("UIPATH_FOLDER_ID", ""),
        "release_key": os.environ.get("UIPATH_RELEASE_KEY", ""),
    }
    missing = [
        key for key in ["org", "tenant", "client_id", "client_secret", "scopes"]
        if not config[key]
    ]
    if missing:
        raise UiPathConfigError(f"Missing UiPath config: {', '.join(missing)}")
    return config


def _request_json(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> dict[str, Any]:
    merged_headers = {
        "User-Agent": "FlowGuardAI/0.1 (+https://localhost)",
        **(headers or {}),
    }
    req = urllib.request.Request(url, data=body, method=method, headers=merged_headers)
    context = (
        ssl.create_default_context(cafile=certifi.where())
        if certifi
        else ssl.create_default_context()
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=context) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise UiPathApiError(f"UiPath API {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise UiPathApiError(f"UiPath API connection failed: {exc.reason}") from exc


def get_access_token() -> dict[str, Any]:
    config = _config()
    token_url = f"{config['base_url']}/{config['org']}/identity_/connect/token"
    body = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "scope": config["scopes"],
    }).encode("utf-8")
    return _request_json(
        token_url,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
    )


def orchestrator_url(path: str) -> str:
    config = _config()
    clean_path = path.lstrip("/")
    return f"{config['base_url']}/{config['org']}/{config['tenant']}/orchestrator_/{clean_path}"


def _auth_headers(token: str) -> dict[str, str]:
    config = _config()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if config.get("folder_id"):
        headers["X-UIPATH-OrganizationUnitId"] = config["folder_id"]
    return headers


def get_orchestrator_identity() -> dict[str, Any]:
    token = get_access_token()["access_token"]
    return _request_json(
        orchestrator_url("odata/Settings/UiPath.Server.Configuration.OData.GetLicense"),
        headers=_auth_headers(token),
    )


def start_job(input_arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    config = _config()
    if not config.get("release_key"):
        raise UiPathConfigError("Missing UiPath config: release_key")

    token = get_access_token()["access_token"]
    payload = {
        "startInfo": {
            "ReleaseKey": config["release_key"],
            "Strategy": "ModernJobsCount",
            "JobsCount": 1,
        }
    }
    if input_arguments:
        payload["startInfo"]["InputArguments"] = json.dumps(input_arguments)

    return _request_json(
        orchestrator_url("odata/Jobs/UiPath.Server.Configuration.OData.StartJobs"),
        method="POST",
        headers=_auth_headers(token),
        body=json.dumps(payload).encode("utf-8"),
    )


def get_job(job_id: int | str) -> dict[str, Any]:
    token = get_access_token()["access_token"]
    return _request_json(
        orchestrator_url(f"odata/Jobs({job_id})"),
        headers=_auth_headers(token),
    )


def uipath_status() -> dict[str, Any]:
    config = _config()
    token = get_access_token()
    return {
        "status": "ok",
        "base_url": config["base_url"],
        "org": config["org"],
        "tenant": config["tenant"],
        "scopes": token.get("scope", config["scopes"]),
        "token_type": token.get("token_type"),
        "expires_in": token.get("expires_in"),
        "folder_configured": bool(config.get("folder_id")),
        "release_configured": bool(config.get("release_key")),
    }
