"""Configuration for the evaluation harness.

Service URLs mirror ``packages/configs/src/links.ts`` (the *development*
branch, which is what ``make dev`` runs). Database URIs are read from the
gitignored ``apps/{backend,auth}/.env`` files so nothing secret is hardcoded
here — change the target database by editing those ``.env`` files, exactly as
the running services do.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path

# evaluations/toraeval/config.py -> repo root is two parents up from this file.
REPO_ROOT = Path(__file__).resolve().parents[2]

# --- dev service URLs (match links.ts, development branch) ------------------
IDP_URL = os.environ.get("EVAL_IDP_URL", "http://idp.localhost:8001")
API_URL = os.environ.get("EVAL_API_URL", "http://api.localhost:8000")
# Chain master + the first worker node (see the Makefile `dev` target).
CHAIN_MASTER_URL = os.environ.get("EVAL_CHAIN_MASTER_URL", "http://localhost:7100")
CHAIN_WORKER_URL = os.environ.get("EVAL_CHAIN_WORKER_URL", "http://localhost:7101")

# Namespacing so the harness only ever touches its own data on a shared DB.
EVAL_PREFIX = "[EVAL]"
EVAL_EMAIL_DOMAIN = "tora-eval.local"

DEV_PASSWORD = "Pa$$w0rd!"  # packages/configs/src/credentials.ts DEV_PASSWORD
ADMIN_EMAIL = os.environ.get("EVAL_ADMIN_EMAIL", "admin@localhost.dev")
ADMIN_NAME = "Admin User"

OUT_DIR = Path(__file__).resolve().parents[1] / "out"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _read_env_file(path: Path) -> dict[str, str]:
    """Parse a ``KEY=value`` .env file (ignoring comments/blank lines)."""
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
            val = val[1:-1]
        values[key] = val
    return values


@dataclass
class Settings:
    idp_url: str = IDP_URL
    api_url: str = API_URL
    chain_master_url: str = CHAIN_MASTER_URL
    chain_worker_url: str = CHAIN_WORKER_URL
    admin_email: str = ADMIN_EMAIL
    admin_name: str = ADMIN_NAME
    password: str = DEV_PASSWORD
    elections_db_uri: str | None = None
    auth_db_uri: str | None = None
    backend_env: dict[str, str] = field(default_factory=dict)
    auth_env: dict[str, str] = field(default_factory=dict)

    @classmethod
    def load(cls) -> "Settings":
        backend_env = _read_env_file(REPO_ROOT / "apps" / "backend" / ".env")
        auth_env = _read_env_file(REPO_ROOT / "apps" / "auth" / ".env")
        return cls(
            elections_db_uri=os.environ.get("EVAL_ELECTIONS_DB_URI")
            or backend_env.get("ELECTIONS_DB_URI"),
            auth_db_uri=os.environ.get("EVAL_AUTH_DB_URI")
            or auth_env.get("AUTH_DB_URI"),
            backend_env=backend_env,
            auth_env=auth_env,
        )


SETTINGS = Settings.load()
