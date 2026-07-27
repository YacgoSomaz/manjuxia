"""Verify the short-lived account entitlement inside the compiled backend.

The Electron process may transport an account_license envelope, but it is not
the authority for product, entitlement, or expiry fields. This module accepts
only the server-signed envelope and derives those fields after Ed25519
verification.
"""
from __future__ import annotations

import base64
import json
import time
from datetime import datetime, timezone
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


ACCOUNT_LICENSE_SCHEMA = "anyq.account-license.v1"
ACCOUNT_LICENSE_TYPE = "anyq.account-license.v1"
ACCOUNT_LICENSE_ISSUER = "https://anyq.site"
ACCOUNT_KEY_ID = "account-v1"
EXPECTED_PRODUCT_ID = "comic_shrimp"
EXPECTED_ENTITLEMENT = "comic_course"
MAX_LICENSE_DURATION_SECONDS = 600
MAX_CLOCK_SKEW_SECONDS = 120
MAX_PAYLOAD_BYTES = 32 * 1024
ED25519_SPKI_PREFIX = bytes.fromhex("302a300506032b6570032100")

# Public by design. It is compiled into the backend so a patched Electron main
# process cannot replace the verification key by changing a launch environment.
DEFAULT_ACCOUNT_PUBLIC_KEY = "CqLAEE2KnduTFtw1gVQIExS1qLRa-XI3TaWpbchMbKc"


class AccountLicenseError(ValueError):
    pass


def _base64url_decode(value: Any, label: str, maximum: int) -> bytes:
    if not isinstance(value, str) or not value or len(value) > maximum * 2:
        raise AccountLicenseError(f"invalid_{label}")
    if any(char not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-" for char in value):
        raise AccountLicenseError(f"invalid_{label}")
    try:
        decoded = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except Exception as exc:
        raise AccountLicenseError(f"invalid_{label}") from exc
    if not decoded or len(decoded) > maximum:
        raise AccountLicenseError(f"invalid_{label}")
    return decoded


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise AccountLicenseError("duplicate_key")
        result[key] = value
    return result


def _parse_expiry(value: Any) -> float:
    if not isinstance(value, str) or not value:
        raise AccountLicenseError("product_expired")
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).timestamp()
    except (TypeError, ValueError) as exc:
        raise AccountLicenseError("product_expired") from exc
    if timestamp <= time.time():
        raise AccountLicenseError("product_expired")
    return timestamp


def _public_key(encoded: str) -> Ed25519PublicKey:
    raw = _base64url_decode(encoded, "public_key", 128)
    if len(raw) == 32:
        return Ed25519PublicKey.from_public_bytes(raw)
    if len(raw) == len(ED25519_SPKI_PREFIX) + 32 and raw.startswith(ED25519_SPKI_PREFIX):
        return Ed25519PublicKey.from_public_bytes(raw[-32:])
    raise AccountLicenseError("invalid_public_key")


def verify_account_license(
    envelope: Any,
    *,
    now: int | None = None,
    public_key: str = DEFAULT_ACCOUNT_PUBLIC_KEY,
    product_id: str = EXPECTED_PRODUCT_ID,
    entitlement: str = EXPECTED_ENTITLEMENT,
) -> dict[str, Any]:
    if not isinstance(envelope, dict):
        raise AccountLicenseError("invalid_envelope")
    if envelope.get("schema") != ACCOUNT_LICENSE_SCHEMA or envelope.get("alg") != "Ed25519":
        raise AccountLicenseError("invalid_envelope")
    if envelope.get("key_id") != ACCOUNT_KEY_ID:
        raise AccountLicenseError("unknown_key")

    payload_bytes = _base64url_decode(envelope.get("payload"), "payload", MAX_PAYLOAD_BYTES)
    signature = _base64url_decode(envelope.get("signature"), "signature", 128)
    if len(signature) != 64:
        raise AccountLicenseError("invalid_signature")
    try:
        _public_key(public_key).verify(signature, payload_bytes)
    except (InvalidSignature, ValueError) as exc:
        raise AccountLicenseError("invalid_signature") from exc

    try:
        payload = json.loads(payload_bytes.decode("utf-8"), object_pairs_hook=_unique_object)
    except (UnicodeDecodeError, json.JSONDecodeError, AccountLicenseError) as exc:
        raise AccountLicenseError("invalid_signature_payload") from exc
    if not isinstance(payload, dict):
        raise AccountLicenseError("invalid_signature_payload")
    if payload.get("typ") != ACCOUNT_LICENSE_TYPE or payload.get("iss") != ACCOUNT_LICENSE_ISSUER:
        raise AccountLicenseError("payload_mismatch")
    if payload.get("aud") != product_id:
        raise AccountLicenseError("audience_mismatch")

    current = int(time.time()) if now is None else int(now)
    issued_at = payload.get("issued_at")
    signed_until = payload.get("signed_until")
    if type(issued_at) is not int or type(signed_until) is not int:
        raise AccountLicenseError("invalid_time_range")
    if signed_until <= current:
        raise AccountLicenseError("account_signature_expired")
    if issued_at > current + MAX_CLOCK_SKEW_SECONDS or signed_until <= issued_at or signed_until - issued_at > MAX_LICENSE_DURATION_SECONDS:
        raise AccountLicenseError("invalid_time_range")

    user = payload.get("user")
    products = payload.get("products")
    if not isinstance(user, dict) or not isinstance(products, list):
        raise AccountLicenseError("payload_incomplete")
    product = next((item for item in products if isinstance(item, dict) and item.get("product_id") == product_id), None)
    if not product or product.get("status") != "active":
        raise AccountLicenseError("product_entitlement_required")
    if entitlement not in product.get("entitlements", []):
        raise AccountLicenseError("product_entitlement_required")
    expires_at = product.get("expires_at")
    _parse_expiry(expires_at)
    account_id = user.get("id")
    if account_id is None:
        raise AccountLicenseError("payload_incomplete")

    return {
        "account_id": str(account_id),
        "license_key": f"account:{account_id}",
        "product_id": product_id,
        "entitlement": entitlement,
        "expires_at": expires_at,
        "signed_until": signed_until,
        "issued_at": issued_at,
    }
