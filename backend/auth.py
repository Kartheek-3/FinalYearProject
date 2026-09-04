"""Firebase Authentication & Authorization layer for SEAM FastAPI backend.

Verifies Firebase ID tokens using the Firebase Admin SDK.
Never trusts client-supplied UIDs without cryptographic verification.
"""

from __future__ import annotations

import os
import json
import logging
from typing import Optional, NamedTuple
from pathlib import Path

from fastapi import HTTPException, Security, WebSocket, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

logger = logging.getLogger("seam.auth")

# Security bearer scheme for FastAPI docs / header extraction
security_bearer = HTTPBearer(auto_error=False)


class AuthenticatedUser(NamedTuple):
    uid: str
    email: Optional[str]
    display_name: Optional[str]
    claims: dict


class FirebaseAuthManager:
    """Manages Firebase Admin SDK initialization and token validation."""

    def __init__(self) -> None:
        self._initialized = False
        self._init_firebase_admin()

    def _init_firebase_admin(self) -> None:
        """Initializes firebase_admin app once using Service Account or Project ID."""
        if firebase_admin._apps:
            self._initialized = True
            return

        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("VITE_FIREBASE_PROJECT_ID")

        try:
            if cred_path and Path(cred_path).exists():
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self._initialized = True
                logger.info("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_PATH: %s", cred_path)
            elif cred_json:
                data = json.loads(cred_json)
                cred = credentials.Certificate(data)
                firebase_admin.initialize_app(cred)
                self._initialized = True
                logger.info("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON")
            elif project_id:
                # Initialize with project options (allows verifying tokens via public certs when emulator/ADC or project options present)
                firebase_admin.initialize_app(options={"projectId": project_id})
                self._initialized = True
                logger.info("Firebase Admin initialized with projectId: %s", project_id)
            else:
                # Initialize default app (e.g., standard Google Application Default Credentials)
                firebase_admin.initialize_app()
                self._initialized = True
                logger.info("Firebase Admin initialized with application default credentials")
        except Exception as exc:
            logger.warning("Firebase Admin initialization deferred or failed: %s", exc)
            self._initialized = False

    def verify_id_token(self, token: str) -> AuthenticatedUser:
        """Cryptographically verifies a Firebase ID token.
        
        Raises HTTPException if missing, invalid, or expired.
        """
        if not token or not token.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = token.strip()

        # In local development without service account, allow a dev token ONLY if explicitly enabled
        dev_auth_enabled = os.getenv("SEAM_ALLOW_DEV_AUTH", "false").lower() == "true"
        if dev_auth_enabled and token.startswith("dev-token-"):
            uid = token.replace("dev-token-", "", 1) or "dev-user"
            return AuthenticatedUser(
                uid=uid,
                email=f"{uid}@developer.local",
                display_name=f"Developer {uid}",
                claims={"dev": True},
            )

        try:
            decoded_token = firebase_auth.verify_id_token(token, check_revoked=False)
            return AuthenticatedUser(
                uid=decoded_token.get("uid") or decoded_token["sub"],
                email=decoded_token.get("email"),
                display_name=decoded_token.get("name"),
                claims=decoded_token,
            )
        except firebase_auth.ExpiredIdTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        except (firebase_auth.InvalidIdTokenError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is invalid.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        except Exception as exc:
            logger.error("Unexpected error during Firebase token verification: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc


# Global instance
auth_manager = FirebaseAuthManager()


async def get_current_user(
    credentials_header: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> AuthenticatedUser:
    """FastAPI dependency to extract and verify the Authorization: Bearer <token>."""
    if not credentials_header or not credentials_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth_manager.verify_id_token(credentials_header.credentials)


async def get_ws_current_user(websocket: WebSocket) -> AuthenticatedUser:
    """Verifies token for WebSocket handshake.
    
    Extracts token from:
    1. 'Authorization' header or 'Sec-WebSocket-Protocol'
    2. 'token' query parameter (for standard browser WebSocket compatibility)
    """
    token = None

    # Check query params first
    query_token = websocket.query_params.get("token")
    if query_token:
        token = query_token
    else:
        # Check authorization headers
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")

    try:
        user = auth_manager.verify_id_token(token)
        return user
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        raise
