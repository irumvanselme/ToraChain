"""Tiny console logging helpers (no dependencies, colourised when a TTY)."""

from __future__ import annotations

import sys

_USE_COLOR = sys.stdout.isatty()


def _c(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text


def step(msg: str) -> None:
    print(_c("1;36", f"\n=== {msg} ==="))


def info(msg: str) -> None:
    print(f"  {msg}")


def ok(msg: str) -> None:
    print(_c("32", f"  ✓ {msg}"))


def warn(msg: str) -> None:
    print(_c("33", f"  ! {msg}"))


def fail(msg: str) -> None:
    print(_c("31", f"  ✗ {msg}"))
