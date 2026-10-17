import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { bchGamesPlinkoPath } from "./plinko-v1.ts";
import { demoDrop } from "../../games/plinko/demo.ts";

// BCH.games' published reference code, transcribed as is (provably-fair.ts, plinko-ball-path.ts).
function* bytesGenerator({ serverSeed, clientSeed, nonce }: { serverSeed: string; clientSeed: string; nonce: number }) {
  let currentRound = 0;
  let currentRoundCursor = currentRound * 32;
  while (true) {
    const hmac = createHmac("sha256", serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${currentRound}`);
    const buffer = hmac.digest();
    while (currentRoundCursor < 32) {
      yield Number(buffer[currentRoundCursor]);
      currentRoundCursor += 1;
    }
    currentRoundCursor = 0;
    currentRound += 1;
  }
}
function* floatsGenerator(options: { serverSeed: string; clientSeed: string; nonce: number }) {
  const byteRng = bytesGenerator(options);
  while (true) {
    const bytes = Array(4).fill(0).map(() => byteRng.next().value as number);
    yield bytes.reduce((result, value, i) => result + value / 256 ** (i + 1), 0);
  }
}
function referencePath(serverSeed: string, clientSeed: string, nonce: number, rows: number): ("left" | "right")[] {
  const rng = floatsGenerator({ serverSeed, clientSeed, nonce });
  return Array(rows).fill(0).map(() => (Math.floor((rng.next().value as number) * 2) === 0 ? "left" : "right"));
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
