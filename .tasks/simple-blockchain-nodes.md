---
id: TORA-CHAIN-17
title: simple block-chain nodes
stage: Todo
creation_date: 2026-06-24T06:29:39.734907Z
---

I am going to work on a simple blockchain node mechanism for my tora-chain (a cryptographically secure web-based voting platform).

The chain-node app will be located in the ./apps/chain-node folder. it is a cli application but which exposes some server.

The technology is going to be Typescript, ExpressJS, socket.io.
It is going to use the sqlite database for the blocks storage.

It will utilize exsing block chain algoritm located at ./apps/blockchain.

Key points:-

- We have a master node to route requests from the web2 to the block-chain. it is spin up by running ./apps/chain-node/start --master --port <port>
- Interested participants can join the network by running a node . it is spin up by running ./apps/chain-node/start --port <port>
- We will use pBFT consensus mechanism to ensure that the block-chain is secure.
- We are going to have another nextjs app under ./apps/tracability which will receive logs from block-nodes and then render a UI for demo and tracability points.
- If you start a node, it will start web socket server.
  - WS will be used to communicate with the master node.
- On every event (connection, disconnection, validate_block, write_block) a log will be pushed to the ./apps/tracability's api POST /api/events

Steps and constraints for my simple block-chain

1. Start the master node. It will start listening to the web socket port for incoming requests from the other nodes.
2. Start 3 auditing nodes. Each node will connect to the master node. By conecting you will fetch most recent block and validte if that is what you have, if not create a new one.
3. Master node will have a copy of the block chain.
4. When the vote is casted on the @apps/backend/, then it will be sent to the master node.
5. The master node can not process anything unless at least 3 nodes are connected.
6. It will send data to each node and ask for the hash. VALIDATE_BLOCK
7. If 2/3 nodes have the same hash, then it will send the block to all the nodes in the network with a task: NEW_BLOCK.

Tracability:

- I want to see the all the active nodes using a graph use https://www.sigmajs.org/ for rendering graphs.
- If a new vote comes show an animation showing that it is being dispatched to the worker nodes.
- If some of the fails, show a warning and show a noder line of animation which will show that now the nodes have agreed, it is now being pushed.
- Do not specifically choose sigmajs, you may chose another technology best feet for the activity.
- Create a new package under ./packages/specs where these event names can be re-used.
- Update the Makefile and also any necessary documentation.

Take your time, have a plan before the implementation
