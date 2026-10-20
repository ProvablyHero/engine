import { bchGamesPlinkoPath, sha256Hex } from "../src/index.ts";
const bet = { serverSeed: "3ae1ba166e436cbcbee50b0d57a7bb1f2c9e74d2c509e602a6132ef8ddff8f63", clientSeed: "Lhhqh7pC1tJ7oKKP", nonce: 2, rows: 8, serverSeedHash: "f929408aa092415149925b95bbd3bc9eeb1d85546b26bac67ff26a2a19f72ec7", slot: 1 };
if (await sha256Hex(bet.serverSeed) !== bet.serverSeedHash) throw new Error("Server seed commitment mismatch");
const result = await bchGamesPlinkoPath(bet.serverSeed, bet.clientSeed, bet.nonce, bet.rows);
console.log({ matches: result.slot === bet.slot, slot: result.slot, path: result.path });
if (result.slot !== bet.slot) throw new Error("Recorded slot mismatch");
