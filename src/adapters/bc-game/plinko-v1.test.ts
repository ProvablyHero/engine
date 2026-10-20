import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { BC_GAME_PLINKO_V1, bcGamePlinkoPath } from "./plinko-v1.ts";

test("BC.Game replays all captured paths; absent pre-bet commitment is not invented", async () => {
  const fixture = JSON.parse(readFileSync(new URL("../../../test-vectors/bc-game-plinko-v1.json", import.meta.url), "utf8"));
  assert.equal(BC_GAME_PLINKO_V1.status, "verified");
  assert.equal(fixture.recordedCommitment, null);
  assert.equal(fixture.vectors.length, 6);
  assert.equal(await createHash("sha256").update(fixture.serverSeed).digest("hex"), fixture.suppliedServerSeedHash);
  for (const v of fixture.vectors) assert.deepEqual(await bcGamePlinkoPath(fixture.serverSeed, fixture.clientSeed, v.nonce, v.rows), { path: v.path, slot: v.slot });
});

test("BC.Game agrees with independent SHA512 oracle across all supported rows and nonce bounds", async () => {
  for (let rows = 8; rows <= 16; rows++) for (const nonce of [0, 1, 30, Number.MAX_SAFE_INTEGER]) {
    const bytes = createHmac("sha512", "bc-reference").update(`client:${nonce}`).digest();
    const path = Array.from({ length: rows }, (_, i) => Number(bytes.readUInt32BE(i * 4) > 0x80000000));
    assert.deepEqual(await bcGamePlinkoPath("bc-reference", "client", nonce, rows), { path, slot: path.reduce((a,b) => a+b, 0) });
  }
});

test("BC.Game rejects invalid or excessive replay inputs", async () => {
  for (const rows of [7, 17, 8.5, NaN, Infinity]) await assert.rejects(bcGamePlinkoPath("s", "c", 0, rows), RangeError);
  for (const nonce of [-1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(bcGamePlinkoPath("s", "c", nonce, 16), RangeError);
  for (const seed of ["", "with space", "🙂", "a".repeat(257)]) await assert.rejects(bcGamePlinkoPath(seed, "c", 0, 16), RangeError);
});

test("BC.Game captured hash before disclosure matches the later revealed seed and x4 round; timing remains explicit", async () => {
  const f = JSON.parse(readFileSync(new URL("../../../test-vectors/bc-game-plinko-v1-disclosure.json", import.meta.url), "utf8"));
  const before = f.beforeDisclosure, after = f.afterDisclosure, v = f.vector;
  assert.equal(BC_GAME_PLINKO_V1.status, "verified");
  assert.equal(f.recordedBeforeBet, false);
  assert.equal(before.serverSeedRevealed, false);
  assert.ok(!("serverSeed" in before));
  assert.ok(Date.parse(v.betAt) < Date.parse(before.capturedAt));
  assert.ok(Date.parse(before.capturedAt) < Date.parse(after.capturedAt));
  assert.equal(before.clientSeed, after.clientSeed);
  assert.equal(before.serverSeedHash, after.serverSeedHash);
  assert.equal(createHash("sha256").update(after.serverSeed).digest("hex"), before.serverSeedHash);
  assert.deepEqual(await bcGamePlinkoPath(after.serverSeed, after.clientSeed, v.nonce, v.rows), { path: v.path, slot: v.slot });
});

test("BC.Game verified evidence links a pre-bet commitment, captured full paths and later disclosure", async () => {
  const f = JSON.parse(readFileSync(new URL("../../../test-vectors/bc-game-plinko-v1-verified.json", import.meta.url), "utf8"));
  assert.equal(BC_GAME_PLINKO_V1.status, "verified");
  assert.equal(f.kind, "disclosed-rounds-with-pre-bet-commitment");
  assert.equal(f.vectors.length, 4);
  assert.equal(f.commitment.nonce, 0);
  assert.equal(f.commitment.serverSeedHash, f.serverSeedHash);
  assert.equal(f.commitment.clientSeed, f.clientSeed);
  assert.equal(f.disclosure.serverSeed, f.serverSeed);
  assert.equal(f.disclosure.serverSeedHash, f.serverSeedHash);
  assert.equal(f.disclosure.clientSeed, f.clientSeed);
  assert.equal(createHash("sha256").update(f.serverSeed).digest("hex"), f.commitment.serverSeedHash);
  for (const v of f.vectors) {
    assert.equal(v.mode, "classic");
    assert.ok(Date.parse(f.commitment.capturedAt) < Date.parse(v.requestedAt));
    assert.ok(Date.parse(v.requestedAt) <= Date.parse(v.betAt));
    assert.ok(Date.parse(v.betAt) < Date.parse(f.disclosure.capturedAt));
    assert.deepEqual(await bcGamePlinkoPath(f.serverSeed, f.clientSeed, v.nonce, v.rows), { path: v.path, slot: v.slot });
  }
});
