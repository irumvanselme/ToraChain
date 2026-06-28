---
id: TORA-CHAIN-18
title: auditability application and auditing
stage: Todo
creation_date: 2026-06-25T09:07:52.976901Z
---

I am going to implement a feature for auditability.

Under the auth app under ./apps/auth add the onboarding step, where once they are registered they will create an organization using better-auth organisation, and there will be an approval process from admins.

And once they are approved, they will be able to see all completed and active elections and they can request download of the anonymised voting data, they can download the block chain for analysis and they can see some of the information like history of the elections.

Implement all the apis on the backend and ./apps/auditing-fe
