# Eligibility API Specification

Reference for developers building an **external eligibility provider** —
an HTTP API that ToraChain calls to decide whether a voter may enroll in an
election. Real voter registries are owned by third parties (a government
census, a member database, …); this contract keeps ToraChain
registry-agnostic.

A working reference implementation lives in
[`examples/simple-voters-database`](../examples/simple-voters-database), and
the backend code that calls providers is
[`apps/backend/app/integrations/`](../apps/backend/app/integrations).

## How it is configured

An admin attaches at most **one integration per election** (type `http_api`)
with:

| Setting             | Meaning                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `url`               | The endpoint ToraChain calls (single URL — used for both the eligibility check and enrollment) |
| `method`            | `GET` or `POST`                                                                                |
| `apiKeyHeaderName`  | Name of the API-key header, e.g. `x-api-key`                                                   |
| `apiKeyHeaderValue` | The key value sent on every request                                                            |

plus a list of **form fields** rendered on the voter's enrollment form and
forwarded to the provider:

| Field property | Meaning                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `id`           | Key used for this value in the request body (e.g. `national-id`)                                  |
| `label`        | Label shown to the voter                                                                          |
| `type`         | Rendering hint: `string`, `fingerprint`, or `eyes` (the latter two render demo biometric widgets) |
| `description`  | Help text shown under the input                                                                   |

## Request (ToraChain → provider)

Sent identically for the **eligibility check** and for **enrollment**
(enrollment re-verifies, then grants a voting number on ToraChain's side).

```
<method> <url>
content-type: application/json
<apiKeyHeaderName>: <apiKeyHeaderValue>
```

```json
{
  "election-id": "<ToraChain election id>",
  "voter-account-id": "<ToraChain voter account id>",
  "<form field id>": "<value the voter entered>",
  "...": "…one key per configured form field, spread at the top level"
}
```

Note: a JSON body is sent even when `method` is `GET`. The voter's email is
**not** included automatically — if the provider needs it, configure an
`email` form field.

## Response (provider → ToraChain)

| Case         | Status    | Body                                                                                                                  |
| ------------ | --------- | --------------------------------------------------------------------------------------------------------------------- |
| Eligible     | any `2xx` | `{ "id": "<provider's unique id for the voter>" }` — the id may instead be named `voterId`, `userId`, or `identifier` |
| Not eligible | `4xx`     | `{ "message": "<reason shown to the voter>" }`                                                                        |

The returned id is stored as the eligibility's `external_voter_id`. If the
provider is unreachable or the request throws, ToraChain surfaces an
external-API error (the voter is not enrolled).

## Example: the reference provider

`examples/simple-voters-database` (Next.js, JSON-file storage) exposes
**`POST /api/verify`**, protected by `x-api-key` (env `ELIGIBILITY_API_KEY`,
default `test-api-key-dev-only`). It requires `email` + `national-id`, plus a
matching demo `fingerprint` or `eyes` scan, looks the voter up in its
database, and answers:

- `200` `{ "id": "<voter uuid>" }` — voter found and biometrics matched
- `400` `{ "message": "Voter is not eligible for this election." }` — not found
- `401` `{ "message": "Invalid API key." }` — bad or missing key

```bash
curl -X POST http://localhost:3003/api/verify \
  -H "content-type: application/json" \
  -H "x-api-key: test-api-key-dev-only" \
  -d '{
    "election-id": "demo",
    "voter-account-id": "demo",
    "email": "alice@example.com",
    "national-id": "NID-001-ALICE",
    "fingerprint": "demo-fingerprint-scan-001"
  }'
```
