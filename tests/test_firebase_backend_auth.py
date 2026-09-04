"""Unit and integration tests for Firebase Authentication and Access Control in FastAPI backend."""

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from firebase_admin import auth as firebase_auth

from backend.main import create_app
from backend.auth import AuthenticatedUser, auth_manager


class TestFirebaseAuthBackend(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = TestClient(self.app)

    def test_missing_token_returns_401(self):
        """Verify protected endpoints reject requests without Authorization header."""
        res = self.client.get("/projects")
        self.assertEqual(res.status_code, 401)
        self.assertIn("Authorization header missing", res.json()["detail"])

    def test_invalid_token_returns_401(self):
        """Verify invalid tokens fail verification."""
        with patch.object(firebase_auth, "verify_id_token", side_effect=ValueError("Invalid token")):
            res = self.client.get("/projects", headers={"Authorization": "Bearer invalid.token.xyz"})
            self.assertEqual(res.status_code, 401)
            self.assertIn("Authentication token is invalid", res.json()["detail"])

    def test_expired_token_returns_401(self):
        """Verify expired tokens fail verification."""
        with patch.object(firebase_auth, "verify_id_token", side_effect=firebase_auth.ExpiredIdTokenError("Token expired", None)):
            res = self.client.get("/projects", headers={"Authorization": "Bearer expired.token.xyz"})
            self.assertEqual(res.status_code, 401)
            self.assertIn("Authentication token has expired", res.json()["detail"])

    def test_valid_token_allows_access(self):
        """Verify valid Firebase ID token permits project listing and creation."""
        mock_claims = {
            "uid": "test-user-alice",
            "email": "alice@example.com",
            "name": "Alice Developer",
        }
        with patch.object(firebase_auth, "verify_id_token", return_value=mock_claims):
            # Create project
            res = self.client.post(
                "/projects",
                json={"project_description": "Alice project", "technology_stack": ["Python"]},
                headers={"Authorization": "Bearer valid.jwt.token"},
            )
            self.assertEqual(res.status_code, 201)
            created_data = res.json()
            self.assertEqual(created_data["owner_id"], "test-user-alice")

            # List projects for Alice
            list_res = self.client.get("/projects", headers={"Authorization": "Bearer valid.jwt.token"})
            self.assertEqual(list_res.status_code, 200)
            projects = list_res.json()
            self.assertTrue(any(p["project_id"] == created_data["project_id"] for p in projects))

    def test_wrong_project_owner_forbidden_403(self):
        """Verify user B cannot access user A's project merely by changing the project ID."""
        alice_claims = {"uid": "user-alice", "email": "alice@example.com"}
        bob_claims = {"uid": "user-bob", "email": "bob@example.com"}

        # Alice creates project
        with patch.object(firebase_auth, "verify_id_token", return_value=alice_claims):
            res = self.client.post(
                "/projects",
                json={"project_description": "Alice secret project", "technology_stack": ["Python"]},
                headers={"Authorization": "Bearer alice.token"},
            )
            self.assertEqual(res.status_code, 201)
            alice_pid = res.json()["project_id"]

        # Bob tries to access Alice's project -> Expect 403 Forbidden
        with patch.object(firebase_auth, "verify_id_token", return_value=bob_claims):
            get_res = self.client.get(
                f"/projects/{alice_pid}",
                headers={"Authorization": "Bearer bob.token"},
            )
            self.assertEqual(get_res.status_code, 403)
            self.assertIn("Access denied: You do not own this project", get_res.json()["detail"])

            # Bob tries to access Alice's files
            file_res = self.client.get(
                f"/projects/{alice_pid}/files",
                headers={"Authorization": "Bearer bob.token"},
            )
            self.assertEqual(file_res.status_code, 403)

            # Bob tries to run Alice's project
            run_res = self.client.post(
                f"/projects/{alice_pid}/run",
                headers={"Authorization": "Bearer bob.token"},
            )
            self.assertEqual(run_res.status_code, 403)

    def test_correct_project_owner_allowed(self):
        """Verify legitimate owner can access their own project and files."""
        alice_claims = {"uid": "user-alice", "email": "alice@example.com"}

        with patch.object(firebase_auth, "verify_id_token", return_value=alice_claims):
            create_res = self.client.post(
                "/projects",
                json={"project_description": "Alice authorized project", "technology_stack": ["Python"]},
                headers={"Authorization": "Bearer alice.token"},
            )
            self.assertEqual(create_res.status_code, 201)
            pid = create_res.json()["project_id"]

            get_res = self.client.get(
                f"/projects/{pid}",
                headers={"Authorization": "Bearer alice.token"},
            )
            self.assertEqual(get_res.status_code, 200)
            self.assertEqual(get_res.json()["project_id"], pid)

    def test_unauthorized_websocket_rejected(self):
        """Verify WebSocket connection without token or invalid token is immediately rejected."""
        # Connecting with no token
        with self.assertRaises(Exception):
            with self.client.websocket_connect("/ws/projects/prj_dummy/runtime"):
                pass

        # Connecting with invalid token
        with patch.object(firebase_auth, "verify_id_token", side_effect=ValueError("Invalid token")):
            with self.assertRaises(Exception):
                with self.client.websocket_connect("/ws/projects/prj_dummy/runtime?token=bad_token"):
                    pass


if __name__ == "__main__":
    unittest.main()
