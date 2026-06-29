"""Validation helpers for browser targets supplied by API clients."""

from __future__ import annotations

import ipaddress
import os
from urllib.parse import urlparse


_LOCAL_NAMES = {"localhost", "127.0.0.1", "::1"}


def validate_target_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Target URL must be an absolute http:// or https:// URL")
    if parsed.username or parsed.password:
        raise ValueError("Credentials must not be embedded in the target URL")

    hostname = parsed.hostname.lower().rstrip(".")
    allow_localhost = os.environ.get("FLOWGUARD_ALLOW_LOCALHOST", "true").lower() == "true"
    allow_private = os.environ.get("FLOWGUARD_ALLOW_PRIVATE_NETWORKS", "false").lower() == "true"
    if hostname in _LOCAL_NAMES:
        if not allow_localhost:
            raise ValueError("Localhost targets are disabled")
        return value

    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        return value

    if address.is_link_local or address.is_reserved or address.is_multicast or address.is_unspecified:
        raise ValueError("Link-local, reserved, multicast, and unspecified targets are blocked")
    if address.is_private and not allow_private:
        raise ValueError("Private-network targets are disabled")
    return value
