import os
import unittest

from fastapi import HTTPException

from services import license_context
from utils.commercial_guard import require_active_commercial_context, requires_membership


class CommercialGuardTests(unittest.TestCase):
    def setUp(self):
        self._previous = os.environ.get("WANSHAN_REQUIRE_ACCOUNT_AUTH")
        os.environ["WANSHAN_REQUIRE_ACCOUNT_AUTH"] = "1"
        license_context.clear_context()

    def tearDown(self):
        license_context.clear_context()
        if self._previous is None:
            os.environ.pop("WANSHAN_REQUIRE_ACCOUNT_AUTH", None)
        else:
            os.environ["WANSHAN_REQUIRE_ACCOUNT_AUTH"] = self._previous

    def test_denies_local_feature_requests_without_verified_account_context(self):
        with self.assertRaises(HTTPException) as error:
            require_active_commercial_context()
        self.assertEqual(error.exception.status_code, 401)
        self.assertEqual(error.exception.detail, "account_required")

    def test_allows_only_the_current_product_and_entitlement_before_expiry(self):
        license_context.set_context(
            license_key="account:13800138000",
            machine_id="diagnostic-only",
            source="account",
            product_id="comic_shrimp",
            entitlement="comic_course",
            expires_at="2099-01-01T00:00:00.000Z",
            signed_until=4102444800,
        )
        require_active_commercial_context()

    def test_rejects_cross_product_or_expired_context(self):
        license_context.set_context(
            license_key="account:13800138000",
            machine_id="diagnostic-only",
            source="account",
            product_id="replay_shrimp",
            entitlement="livewatch",
            expires_at="2099-01-01T00:00:00.000Z",
            signed_until=4102444800,
        )
        with self.assertRaises(HTTPException) as cross_product:
            require_active_commercial_context()
        self.assertEqual(cross_product.exception.status_code, 403)

        license_context.set_context(
            license_key="account:13800138000",
            machine_id="diagnostic-only",
            source="account",
            product_id="comic_shrimp",
            entitlement="comic_course",
            expires_at="2099-01-01T00:00:00.000Z",
            signed_until=1,
        )
        with self.assertRaises(HTTPException) as expired:
            require_active_commercial_context()
        self.assertEqual(expired.exception.status_code, 401)
        self.assertEqual(expired.exception.detail, "account_signature_expired")

    def test_regular_members_can_browse_but_premium_actions_require_membership(self):
        self.assertFalse(requires_membership("GET", "/api/novels/"))
        self.assertFalse(requires_membership("HEAD", "/api/storyboards/novel/7"))
        self.assertFalse(requires_membership("POST", "/api/novels/upload"))
        self.assertFalse(requires_membership("POST", "/api/novels/7/parse-chapters"))
        self.assertFalse(requires_membership("POST", "/api/novels/7/incremental-import"))
        self.assertTrue(requires_membership("POST", "/api/scripts/convert"))
        self.assertTrue(requires_membership("PUT", "/api/novels/7/tags"))
        self.assertTrue(requires_membership("GET", "/api/storyboards/novel/7/export"))


if __name__ == "__main__":
    unittest.main()
