import base64
import json
import unittest

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from utils.account_license import AccountLicenseError, verify_account_license


NOW = 1_780_000_000


def raw_public_key(private_key):
    return base64.urlsafe_b64encode(
        private_key.public_key().public_bytes(
            serialization.Encoding.Raw,
            serialization.PublicFormat.Raw,
        )
    ).rstrip(b"=").decode("ascii")


def envelope(private_key, payload):
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return {
        "schema": "anyq.account-license.v1",
        "alg": "Ed25519",
        "key_id": "account-v1",
        "payload": base64.urlsafe_b64encode(payload_bytes).rstrip(b"=").decode("ascii"),
        "signature": base64.urlsafe_b64encode(private_key.sign(payload_bytes)).rstrip(b"=").decode("ascii"),
    }


def payload(**overrides):
    value = {
        "typ": "anyq.account-license.v1",
        "iss": "https://anyq.site",
        "aud": "comic_shrimp",
        "issued_at": NOW - 30,
        "signed_until": NOW + 570,
        "user": {"id": 7, "phone": "13800138000", "role": "regular"},
        "products": [{
            "product_id": "comic_shrimp",
            "status": "active",
            "expires_at": "2099-01-01T00:00:00.000Z",
            "entitlements": ["comic_course"],
        }],
    }
    value.update(overrides)
    return value


class AccountLicenseTests(unittest.TestCase):
    def setUp(self):
        self.private_key = Ed25519PrivateKey.generate()
        self.public_key = raw_public_key(self.private_key)

    def test_accepts_only_a_server_signed_current_product_claim(self):
        claims = verify_account_license(envelope(self.private_key, payload()), now=NOW, public_key=self.public_key)
        self.assertEqual(claims["product_id"], "comic_shrimp")
        self.assertEqual(claims["entitlement"], "comic_course")
        self.assertEqual(claims["signed_until"], NOW + 570)

    def test_rejects_tampering_cross_product_and_expired_snapshots(self):
        valid = envelope(self.private_key, payload())
        signature = base64.urlsafe_b64decode(valid["signature"] + "=" * (-len(valid["signature"]) % 4))
        valid["signature"] = base64.urlsafe_b64encode(bytes([signature[0] ^ 1]) + signature[1:]).rstrip(b"=").decode("ascii")
        with self.assertRaises(AccountLicenseError):
            verify_account_license(valid, now=NOW, public_key=self.public_key)

        with self.assertRaises(AccountLicenseError):
            verify_account_license(
                envelope(self.private_key, payload(aud="operation_shrimp")),
                now=NOW,
                public_key=self.public_key,
            )

        with self.assertRaises(AccountLicenseError) as expired:
            verify_account_license(
                envelope(self.private_key, payload(signed_until=NOW - 1)),
                now=NOW,
                public_key=self.public_key,
            )
        self.assertEqual(str(expired.exception), "account_signature_expired")


if __name__ == "__main__":
    unittest.main()
