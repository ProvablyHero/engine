import { stakePlinkoPath, sha256Hex } from "../src/index.ts";
const bet = { serverSeed: "synthetic-stake-reference-server", clientSeed: "synthetic-reference-client", nonce: 0, rows: 8, serverSeedHash: "7d532db31f6bc2455e8f4cbfd5e13954784391eef240c9575aaf33997e115267", slot: 2 };
if (await sha256Hex(bet.serverSeed) !== bet.serverSeedHash) throw new Error("Server seed commitment mismatch");
const result = await stakePlinkoPath(bet.serverSeed, bet.clientSeed, bet.nonce, bet.rows);
console.log({ matches: result.slot === bet.slot, slot: result.slot, path: result.path });
if (result.slot !== bet.slot) throw new Error("Recorded slot mismatch");
