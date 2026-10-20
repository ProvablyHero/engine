import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { STAKE_PLINKO_V1, stakePlinkoPath } from "./plinko-v1.ts";
const fixture = JSON.parse(readFileSync(new URL("../../../test-vectors/stake-plinko-v1.json", import.meta.url), "utf8"));

test("Stake stays reference; fixed synthetic vectors are not labelled disclosed rounds", async () => {
  assert.equal(STAKE_PLINKO_V1.status, "reference");
  assert.equal(fixture.kind, "synthetic-reference");
  assert.equal(fixture.vectors.length, 4);
  for (const v of fixture.vectors) {
    assert.equal(createHash("sha256").update(v.serverSeed).digest("hex"), v.serverSeedHash);
    assert.deepEqual(await stakePlinkoPath(v.serverSeed, v.clientSeed, v.nonce, v.rows), { path: v.path, slot: v.slot });
  }
});

test("Stake replay agrees with an independent Node HMAC oracle, including crossing the 32-byte block", async () => {
  for (let rows = 8; rows <= 16; rows++) {
    for (const nonce of [0, 1, 9, 99999, Number.MAX_SAFE_INTEGER]) {
      const path = Array.from({ length: rows }, (_, i) => {
        const bytes = createHmac("sha256", "stake-test-server").update(`client:${nonce}:${Math.floor(i / 8)}`).digest();
        return Number(bytes.readUInt32BE(i % 8 * 4) >= 0x80000000);
      });
      assert.deepEqual(await stakePlinkoPath("stake-test-server", "client", nonce, rows), { path, slot: path.reduce((a,b)=>a+b,0) });
    }
  }
});

test("Stake rejects invalid replay inputs", async () => {
  for (const rows of [0, 7, 17, 8.5, NaN, Infinity]) await assert.rejects(stakePlinkoPath("s", "c", 0, rows), RangeError);
  for (const nonce of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(stakePlinkoPath("s", "c", nonce, 8), RangeError);
  await assert.rejects(stakePlinkoPath("", "c", 0, 8), RangeError);
});
