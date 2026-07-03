---
id: TORA-CHAIN-12
title: use pub sub over nodes
stage: Todo
creation_date: 2026-07-03T04:59:56.928057Z
---

I am going to work on a very important task:

- We are going to remove @apps/tracability,
- We are going to instead use a pub sub over distributed nodes with pBFT.
- Merge @apps/blockchain/ and @apps/chain-node into @apps/torachain-cli
- Keep the blockc-chain infra logic as it is defined @apps/blockchain/
- The new voting flow is like this:-
  - After the backend cast a vote.
  - it is going to send a vote data to the master node.
  - The master node will receive the node and then push a new record in the pub sub.

  - Users who want to join the network will join the pub sub with a specific election to subscribe to.
  - Once they are joined they will be receiving new blocks, and then validate if the hash is expected if not It will log an error.
  - the chain-node-app will expose a frontend html and css for showing the block chain locally for non technical users.
  - This html will also be deployed under node started by our @iac/ for people to see the nodes.
  - The master node will use postgresql db for persisitance while the worker nodes it will use JSON for easier visualization.

Keep everything simple, clear and consize.
