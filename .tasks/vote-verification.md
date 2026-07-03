---
id: TORA-CHAIN-13
title: vote verification
stage: Todo
creation_date: 2026-07-03T05:09:36.801426Z
---

We are going to add a token verification feature.
The main concern is that the voter is the one and only person to verify the vote.

When they cast a vote, a new random aes key is goig to be generated on the client.
It will encrypt the data including (voting id, voter, candidate, cast time), the data will encrypted using the key and the user will get a string containing <voting-id, hash> they can also download it as qr code or save a string.

Then voting data is going to be sent to the backend alongside unencrypted data incling voted_candidate for counting,

Then anytime the user can come, and if they want to verify a vote, they will.

- say the voting id, to ensure that the unencrypted candidate ist he same as the one in encrypted data on the backend and the block chain network.
