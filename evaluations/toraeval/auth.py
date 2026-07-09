"""Identity-provider interactions: user provisioning and JWT minting.

Voters and auditors self-register over HTTP; admins cannot (self-registration
is disabled for that domain), so the first admin is bootstrapped with the
``apps/auth`` ``create-admin`` script, exactly as an operator would.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass

import requests

from . import logutil
from .config import REPO_ROOT, SETTINGS
from .httpc import cookie_header, new_session


class AuthError(RuntimeError):
    pass


@dataclass
class Identity:
    """An authenticated principal with a Bearer JWT for the backend API."""

    email: str
    user_type: str  # "voters" | "admins" | "auditors"
    token: str

    def bearer(self) -> dict[str, str]:
        return {"authorization": f"Bearer {self.token}"}


def _domain_base(user_type: str) -> str:
    return f"{SETTINGS.idp_url}/{user_type}/api"


def sign_up(session: requests.Session, user_type: str, email: str, name: str,
            password: str) -> bool:
    """Create an account. Returns True if created, False if it already exists."""
    base = _domain_base(user_type)
    r = session.post(f"{base}/sign-up/email",
                     json={"email": email, "password": password, "name": name},
                     timeout=30)
    if r.ok:
        return True
    # Already exists -> a sign-in will succeed.
    signin = session.post(f"{base}/sign-in/email",
                          json={"email": email, "password": password}, timeout=30)
    if signin.ok:
        return False
    raise AuthError(
        f"could not provision {email} ({user_type}): "
        f"sign-up {r.status_code} {r.text[:200]}; "
        f"sign-in {signin.status_code} {signin.text[:200]}")


def mint_token(user_type: str, email: str, password: str) -> Identity:
    """Sign in and exchange the session cookie for a JWT (Bearer token)."""
    session = new_session()
    base = _domain_base(user_type)
    signin = session.post(f"{base}/sign-in/email",
                          json={"email": email, "password": password}, timeout=30)
    if not signin.ok:
        raise AuthError(
            f"sign-in failed for {email} ({user_type}): "
            f"{signin.status_code} {signin.text[:200]}")

    tok = session.get(f"{base}/token",
                      headers={"cookie": cookie_header(session)}, timeout=30)
    if not tok.ok:
        raise AuthError(
            f"token exchange failed for {email} ({user_type}): "
            f"{tok.status_code} {tok.text[:200]}")
    token = (tok.json() or {}).get("token")
    if not token:
        raise AuthError(f"token endpoint returned no token for {email}")
    return Identity(email=email, user_type=user_type, token=token)


def ensure_admin() -> Identity:
    """Return an admin identity, bootstrapping the account if it does not exist.

    Tries to sign in first; on failure runs ``bun run create-admin`` against the
    configured auth database (the same script an operator uses for the first
    admin) and retries.
    """
    email, password = SETTINGS.admin_email, SETTINGS.password
    try:
        return mint_token("admins", email, password)
    except AuthError:
        logutil.warn(f"admin {email} not found — bootstrapping via create-admin")

    auth_dir = REPO_ROOT / "apps" / "auth"
    proc = subprocess.run(
        ["bun", "run", "create-admin", "--",
         "--name", SETTINGS.admin_name, "--email", email, "--password", password],
        cwd=auth_dir, capture_output=True, text=True)
    if proc.returncode != 0 and "existing" not in (proc.stdout + proc.stderr).lower():
        # A duplicate-email failure is fine (account already there); anything
        # else is fatal.
        combined = (proc.stdout + proc.stderr)
        if "already exists" not in combined.lower():
            raise AuthError(
                "create-admin failed (is `bun` installed and the auth .env "
                f"database reachable?):\n{combined.strip()}")
    return mint_token("admins", email, password)
