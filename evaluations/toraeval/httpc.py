"""HTTP session helpers.

better-auth issues session cookies with the ``Secure`` attribute (it uses
``SameSite=None; Secure`` for cross-site SPA support). Python's ``cookiejar``
refuses to *send* a ``Secure`` cookie back over a plain-``http`` connection,
which is exactly what the dev stack uses on ``*.localhost``. Browsers treat
localhost as trustworthy and honour the cookie; we mirror that by relaxing the
cookie policy so the harness can complete the sign-in -> /token exchange.
"""

from __future__ import annotations

from http.cookiejar import DefaultCookiePolicy

import requests


class _LocalhostCookiePolicy(DefaultCookiePolicy):
    """Permit Secure cookies to be returned over http (dev localhost only)."""

    def return_ok_secure(self, cookie, request):  # noqa: D401, ANN001
        return True


def new_session() -> requests.Session:
    s = requests.Session()
    s.cookies.set_policy(_LocalhostCookiePolicy())
    s.headers.update({"accept": "application/json"})
    return s


def cookie_header(session: requests.Session) -> str:
    """Serialise the session's cookies into a ``Cookie`` header value.

    Sent explicitly because ``Secure`` cookies are not auto-attached over the
    plain-http dev origins even with a relaxed jar policy.
    """
    return "; ".join(f"{c.name}={c.value}" for c in session.cookies)


def is_up(url: str, timeout: float = 2.0) -> bool:
    """Best-effort reachability probe. Any HTTP answer counts as 'up'."""
    try:
        requests.get(url, timeout=timeout)
        return True
    except requests.RequestException:
        return False
