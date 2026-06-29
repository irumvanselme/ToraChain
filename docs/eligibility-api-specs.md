# Eligibility API Specs

This document is a reference for the Eligibility API Developers.

Integration schema:

- Path:
- Method:
- API Key header name:
- API Key header value:
- Form fields:
  - field id:
  - field label:
  - field type: string | null
  - field description:

Request body:
Headers
<api key name>: <api key value>

Body
election-id: <election id>  
voter-account-id: <voter account id>
... <form field id>: <form field value>

Response body:

- 200:
  - Voter is eligible for the election and this is the voter's unique identifier.
- 400:
  - Voter is not eligible for the election.
