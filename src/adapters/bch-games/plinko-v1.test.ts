import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { bchGamesPlinkoPath } from "./plinko-v1.ts";
import { demoDrop } from "../../games/plinko/demo.ts";

// Independent Node-crypto oracle for the documented HMAC stream and direction mapping.
function referencePath(serverSeed: string, clientSeed: string, nonce: number, rows: number): ("left" | "right")[] {
  return Array.from({ length: rows }, (_, index) => {
    const block = Math.floor(index / 8);
    const digest = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:${block}`).digest();
    return digest.readUInt32BE(index % 8 * 4) >= 0x80000000 ? "right" : "left";
  });
}

test("our adapter reproduces BCH.games' reference code exactly (2,000 random rounds, 8-16 rows)", async () => {
  for (let i = 0; i < 2000; i++) {
    const serverSeed = randomBytes(32).toString("hex");
    const clientSeed = randomBytes(6).toString("hex");
    const nonce = i * 7;
    const rows = 8 + (i % 9);
    const ours = await bchGamesPlinkoPath(serverSeed, clientSeed, nonce, rows);
    const theirs = referencePath(serverSeed, clientSeed, nonce, rows);
    assert.deepEqual(ours.path.map((d) => (d ? "right" : "left")), theirs);
    assert.equal(ours.slot, theirs.filter((m) => m === "right").length);
  }
});

test("the ProveItBro demo generator is the same scheme, so demo drops verify the same way", async () => {
  for (let nonce = 0; nonce < 200; nonce++) {
    assert.deepEqual((await demoDrop("s", "c", nonce, 16)).path, (await bchGamesPlinkoPath("s", "c", nonce, 16)).path);
  }
});
