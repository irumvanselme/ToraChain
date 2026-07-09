"""Tora-Chain evaluation harness.

Drives the deployed dev stack (`make dev`) end-to-end and produces the charts
for report section 5.4 ("Evaluation results by metric").

See ``evaluations/README.md`` for usage.
"""

__all__ = ["config", "logutil", "httpc", "crypto", "auth", "api", "chain",
           "charts", "scenario", "dbreset"]
