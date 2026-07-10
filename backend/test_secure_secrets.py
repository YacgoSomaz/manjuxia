import unittest

from services.secure_secrets import decrypt_secret, encrypt_secret, is_encrypted_secret


class SecureSecretTests(unittest.TestCase):
    def test_windows_protected_secret_round_trips_without_plaintext_storage(self):
        plaintext = "sk-test-secret-123456"
        encrypted = encrypt_secret(plaintext)

        self.assertTrue(is_encrypted_secret(encrypted))
        self.assertNotIn(plaintext, encrypted)
        self.assertEqual(decrypt_secret(encrypted), plaintext)


if __name__ == "__main__":
    unittest.main()
