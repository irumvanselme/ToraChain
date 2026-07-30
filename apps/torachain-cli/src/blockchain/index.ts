// Core blockchain logic: the chain, its blocks, and the ports they depend on.
// Node roles (src/node/) drive the chain through this surface — they never
// build a block or a hash by hand.
export {
  BlockChain,
  type AcceptResult,
  type BlockChainOptions,
  type ElectionBlockInput,
} from "./block-chain.ts";
export { ElectionBlock, GENESIS_HASH, GENESIS_INDEX } from "./block.ts";
export { ElectionsBlockData } from "./block-data.ts";
export { bigIntToHex, hash, hexToBigInt, replacer } from "./hashing.ts";
export { idToBigInt } from "./identity.ts";
export type { IBlockChainStorageService } from "./storage-service.ts";
