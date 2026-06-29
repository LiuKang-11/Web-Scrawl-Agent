"""Small SQLite persistence layer for FlowGuard run artifacts."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any


_LOCK = threading.Lock()
_DEFAULT_PATH = Path(__file__).resolve().parents[1] / "data" / "flowguard.db"


def _connect() -> sqlite3.Connection:
    path = Path(os.environ.get("FLOWGUARD_DB_PATH", str(_DEFAULT_PATH)))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS artifacts (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            status TEXT,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
        """
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_artifacts_kind_updated ON artifacts(kind, updated_at DESC)"
    )
    return connection


def save_artifact(artifact_id: str, kind: str, payload: dict[str, Any], status: str | None = None) -> None:
    now = int(time.time())
    encoded = json.dumps(payload, separators=(",", ":"), default=str)
    with _LOCK, _connect() as connection:
        connection.execute(
            """
            INSERT INTO artifacts(id, kind, status, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                kind=excluded.kind,
                status=excluded.status,
                payload=excluded.payload,
                updated_at=excluded.updated_at
            """,
            (artifact_id, kind, status, encoded, now, now),
        )


def get_artifact(artifact_id: str) -> dict[str, Any] | None:
    with _LOCK, _connect() as connection:
        row = connection.execute("SELECT * FROM artifacts WHERE id = ?", (artifact_id,)).fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "kind": row["kind"],
        "status": row["status"],
        "payload": json.loads(row["payload"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_artifacts(kind: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 200))
    with _LOCK, _connect() as connection:
        if kind:
            rows = connection.execute(
                "SELECT * FROM artifacts WHERE kind = ? ORDER BY updated_at DESC LIMIT ?",
                (kind, safe_limit),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT * FROM artifacts ORDER BY updated_at DESC LIMIT ?", (safe_limit,)
            ).fetchall()
    return [
        {
            "id": row["id"],
            "kind": row["kind"],
            "status": row["status"],
            "payload": json.loads(row["payload"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
        for row in rows
    ]
