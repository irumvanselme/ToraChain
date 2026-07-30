# Tora-Chain evaluation harness (`evaluations/`)

Python + matplotlib scripts that drive the running dev stack end-to-end and
produce the charts for **report §5.4 — "Evaluation results by metric."**

Each run **resets** this harness's prior data, **seeds** fresh voter accounts,
**exercises** the real APIs and blockchain network, and writes charts +
`results.json` + `summary.txt` to `out/`. Nothing is faked: block hashes are
recomputed with a byte-for-byte port of the chain library, ballots are sealed
with real AES-GCM, and every measurement comes from an actual HTTP call.

The charts are **clean for APA use** — no title or caption is baked into the
image. `out/summary.txt` gives, for every figure, the APA figure number, an
italic title-case title, and a two-sentence `Note.` filled with the run's real
numbers; paste those into the document above/below each figure.

## What it measures

| §     | Metric                        | Figure                         | How                                                                                                       |
| ----- | ----------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 5.4.1 | Tamper detection              | `fig-5-2-tamper-detection.png` | Re-hash real blocks, then mutate each field and confirm the hash changes (as a worker's `IsValid()` does) |
| 5.4.2 | Vote-casting latency          | `fig-5-3-latency.png`          | Time the `cast` API + the async anchoring lag until a block is visible on an independent node             |
| 5.4.3 | Throughput                    | `fig-5-4-throughput.png`       | Concurrent voters at rising concurrency levels → accepted votes/second                                    |
| 5.4.4 | Receipt verification          | `fig-5-5-verification.png`     | Valid receipts verify (accepted + on-chain + opens); corrupted receipts are rejected                      |
| 5.4.5 | Unlinkability (privacy)       | `fig-5-6-unlinkability.png`    | Structural inspection of the public chain: no identity, no candidate                                      |
| 5.4.6 | Reliability / fault isolation | `fig-5-7-fault-isolation.png`  | Votes stay accepted even when on-chain anchoring lags/fails                                               |
| 5.4.7 | Usability (human pilot)       | `fig-5-8-usability.png`        | **Formats** your acceptance-test CSV — the harness does not fabricate SUS/completion data                 |

### Test cases dropped from the earlier draft (not scriptable)

- **Multi-week production availability line chart.** Requires Cloud Run
  uptime/monitoring data collected over the pilot window — it cannot be produced
  from a single harness run. §5.4.6 keeps only the _fault-isolation_ test, which
  is measurable. Take the availability figure from your monitoring dashboard.
- **SUS score / task-completion rates (§5.4.7).** These are human-subject data
  from the acceptance pilot (§4.3.7). The harness only turns your collected CSV
  into the chart; it will not invent participant numbers.

## Running it

From the repo root, start the stack in one terminal:

```bash
make dev            # backend, auth, 3 frontends, chain master + 3 workers, example
```

Then, in a second terminal:

```bash
cd evaluations
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python evaluate.py                 # reset → seed → test → charts
```

Charts and `results.json` appear in `evaluations/out/`.

### Useful flags

```bash
python evaluate.py --scale quick        # tiny sample (fast smoke test)
python evaluate.py --scale full         # larger samples (concurrency up to 50)
python evaluate.py --only tamper,privacy
python evaluate.py --only resilience    # run after stopping the chain-master pane
python evaluate.py --reset-only         # just clear this harness's data
python evaluate.py --no-reset           # keep prior eval data
```

To reproduce the **fault-isolation** scenario with the audit trail actually
down: in the `make dev` window stop the `chain-master` process (Ctrl-C its pane,
or don't start it), then run `python evaluate.py --only resilience`. Votes still
get accepted (100%) while anchoring drops to 0% — graceful degradation.

To produce the **usability** chart, fill in `data/uat_results.csv` (a template
is written to `data/uat_results.sample.csv` on first run) with your pilot's
task-completion rates and SUS score, then `python evaluate.py --only usability`.

## Safety: the database is shared

`apps/backend/.env` and `apps/auth/.env` may point at a **shared** Postgres that
also backs the public demo. To stay safe there, the default reset is
**namespaced** — it deletes only rows this harness created (elections titled
`[EVAL] …` and voter accounts under `@tora-eval.local`) and never touches demo
data. The reset also prints the target host so you can see what it will modify.

A full wipe exists only behind an explicit, confirmed flag, intended for a
throwaway/local database:

```bash
python evaluate.py --wipe --yes         # TRUNCATE all elections-app tables
```

If `psycopg` is not installed the reset is skipped with a warning — every run
also uses a fresh, uniquely-titled election, so stale data never corrupts a
measurement.

## How it maps to the code (no magic values)

- Service URLs mirror `packages/configs/src/links.ts` (development branch:
  `idp.localhost:8001`, `api.localhost:8000`, chain master `localhost:7100`,
  worker `localhost:7101`). Override with `EVAL_*` env vars if needed.
- The block hash port lives in `toraeval/crypto.py` and is verified against
  `apps/torachain-cli/src/blockchain/` (`identity.ts` + `block.ts`).
- Auth follows the real flow: voters/auditors self-register; the admin is
  bootstrapped with `apps/auth`'s `create-admin` script if it doesn't exist,
  then a session cookie is exchanged for a JWT at `/{domain}/api/token`.

## Layout

```
evaluations/
  evaluate.py            # entrypoint / orchestrator
  requirements.txt
  toraeval/
    config.py            # URLs + reads DB URIs from apps/*/.env
    httpc.py auth.py api.py chain.py   # HTTP + identity + API + chain clients
    crypto.py            # chain-hash port + AES-GCM ballot sealing
    dbreset.py           # namespaced (default) / full wipe
    charts.py            # matplotlib theme (validated palette)
    scenario.py          # reset+seed+election fixture, voter factory
    metrics/*.py         # one module per §5.4 metric
  data/uat_results.sample.csv
  out/                   # generated charts + results.json
```
