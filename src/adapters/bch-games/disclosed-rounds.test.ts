import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BCH_GAMES_PLINKO_V1, bchGamesPlinkoPath } from "./plinko-v1.ts";
import { sha256Hex } from "../../core/crypto.ts";
const fixture = JSON.parse(readFileSync(new URL("../../../test-vectors/bch-games-plinko-v1.json", import.meta.url), "utf8"));

test("BCH.games verified status has eight disclosed-round commitment, path and slot checks", async () => {
  assert.equal(BCH_GAMES_PLINKO_V1.status, "verified");
  assert.equal(fixture.kind, "disclosed-rounds");
  assert.equal(fixture.vectors.length, 8);
  for (const v of fixture.vectors) {
    assert.equal(await sha256Hex(v.serverSeed), v.serverSeedHash);
    assert.equal(v.path.length, v.rows);
    assert.deepEqual(await bchGamesPlinkoPath(v.serverSeed, v.clientSeed, v.nonce, v.rows), { path: v.path, slot: v.slot });
  }
});
