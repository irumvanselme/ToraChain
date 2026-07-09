"""Database reset for the evaluation harness.

IMPORTANT: ``apps/backend/.env`` and ``apps/auth/.env`` may point at a *shared*
Postgres that also backs the public demo. To stay safe on a shared database the
default reset is **namespaced** — it deletes only rows this harness created
(elections titled ``[EVAL] …`` and voter accounts under ``@tora-eval.local``).

A full ``wipe`` (truncate every elections-app table + delete eval auth users)
is available but must be explicitly requested; it prints the target host first
so you never wipe the wrong database by accident.

Requires ``psycopg`` (psycopg 3). If it is not installed the harness skips the
reset with a warning — every run also uses a fresh, uniquely-titled election, so
stale data never corrupts a measurement.
"""

from __future__ import annotations

from urllib.parse import urlparse

from . import logutil
from .config import EVAL_EMAIL_DOMAIN, EVAL_PREFIX, SETTINGS

try:  # optional dependency
    import psycopg  # type: ignore

    _HAVE_PG = True
except ImportError:  # pragma: no cover
    _HAVE_PG = False


def _host(uri: str) -> str:
    try:
        p = urlparse(uri)
        return f"{p.hostname}:{p.port or 5432}{p.path}"
    except Exception:
        return "<unparseable>"


def available() -> bool:
    return _HAVE_PG and bool(SETTINGS.elections_db_uri)


def reset_eval_data() -> bool:
    """Delete only this harness's data. Safe on a shared database."""
    if not _HAVE_PG:
        logutil.warn("psycopg not installed — skipping DB reset "
                     "(runs use fresh, uniquely-named elections regardless).")
        return False
    if not SETTINGS.elections_db_uri:
        logutil.warn("ELECTIONS_DB_URI not found in apps/backend/.env — "
                     "skipping DB reset.")
        return False

    like_title = f"{EVAL_PREFIX}%"
    like_email = f"%@{EVAL_EMAIL_DOMAIN}"

    logutil.info(f"elections db: {_host(SETTINGS.elections_db_uri)}")
    with psycopg.connect(SETTINGS.elections_db_uri, autocommit=True) as conn:
        with conn.cursor() as cur:
            # Votes -> eligibilities -> candidates cascade off the election, but
            # delete explicitly in dependency order to also clear standalone
            # eval voters.
            cur.execute(
                "DELETE FROM votes WHERE election_id IN "
                "(SELECT election_id FROM elections WHERE title LIKE %s)",
                (like_title,))
            votes = cur.rowcount
            cur.execute(
                "DELETE FROM eligibilities WHERE election_id IN "
                "(SELECT election_id FROM elections WHERE title LIKE %s)",
                (like_title,))
            elig = cur.rowcount
            cur.execute(
                "DELETE FROM candidates WHERE election_id IN "
                "(SELECT election_id FROM elections WHERE title LIKE %s)",
                (like_title,))
            cur.execute("DELETE FROM elections WHERE title LIKE %s",
                        (like_title,))
            elections = cur.rowcount
            cur.execute("DELETE FROM voters WHERE email LIKE %s", (like_email,))
            voters = cur.rowcount
    logutil.ok(f"cleared eval data: {elections} elections, {voters} voters, "
               f"{elig} eligibilities, {votes} votes")

    _delete_eval_auth_users(like_email)
    return True


def _delete_eval_auth_users(like_email: str) -> None:
    if not SETTINGS.auth_db_uri:
        return
    logutil.info(f"auth db: {_host(SETTINGS.auth_db_uri)}")
    try:
        with psycopg.connect(SETTINGS.auth_db_uri, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'DELETE FROM voter_accounts WHERE "userId" IN '
                    "(SELECT id FROM voter_users WHERE email LIKE %s)",
                    (like_email,))
                cur.execute(
                    'DELETE FROM voter_sessions WHERE "userId" IN '
                    "(SELECT id FROM voter_users WHERE email LIKE %s)",
                    (like_email,))
                cur.execute("DELETE FROM voter_users WHERE email LIKE %s",
                            (like_email,))
                removed = cur.rowcount
        logutil.ok(f"cleared {removed} eval voter accounts from auth db")
    except Exception as exc:  # non-fatal — accounts are reused via sign-in
        logutil.warn(f"could not clear eval auth users ({exc}); "
                     "existing accounts will be reused via sign-in.")


def wipe_all(confirm: bool = False) -> bool:
    """Truncate every elections-app table and delete all eval auth users.

    Destructive — only for a throwaway/local database. Requires ``confirm``.
    """
    if not confirm:
        logutil.fail("wipe_all requires explicit confirmation (--wipe --yes).")
        return False
    if not available():
        logutil.warn("psycopg/ELECTIONS_DB_URI unavailable — cannot wipe.")
        return False
    logutil.warn(f"WIPING ALL elections data at {_host(SETTINGS.elections_db_uri)}")
    with psycopg.connect(SETTINGS.elections_db_uri, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE votes, eligibilities, candidates, voters, "
                        "election_integrations, elections CASCADE")
    logutil.ok("truncated all elections-app tables")
    _delete_eval_auth_users(f"%@{EVAL_EMAIL_DOMAIN}")
    return True
