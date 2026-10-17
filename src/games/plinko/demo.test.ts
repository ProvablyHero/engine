import { test } from "node:test";
import assert from "node:assert/strict";
import { demoDrop } from "./demo.ts";
import { floats } from "../../core/floats.ts";
import { sha256Hex } from "../../core/crypto.ts";
import { slotProbabilities } from "./distribution.ts";

test("sha256 matches a known vector", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("floats are deterministic, in [0, 1), and change with every input", async () => {
  const a = await floats("server", "client", 1, 20);
  assert.deepEqual(a, await floats("server", "client", 1, 20));
  assert.ok(a.every((f) => f >= 0 && f < 1));
  assert.notDeepEqual(a, await floats("server", "client", 2, 20));
  assert.notDeepEqual(a, await floats("server", "other", 1, 20));
  // More floats extend the stream; the first ones stay the same.
  assert.deepEqual((await floats("server", "client", 1, 40)).slice(0, 20), a);
});

test("a drop's slot is the number of right bounces", async () => {
  const d = await demoDrop("server", "client", 7, 16);
  assert.equal(d.path.length, 16);
  assert.equal(d.slot, d.path.filter((x) => x === 1).length);
});

test("20,000 drops follow the binomial distribution", async () => {
  const rows = 8;
  const counts = new Array(rows + 1).fill(0);
  const n = 20000;
  for (let nonce = 0; nonce < n; nonce++) counts[(await demoDrop("seed-x", "client", nonce, rows)).slot]++;
  const expected = slotProbabilities(rows).map((p) => p * n);
  const chi2 = counts.reduce((s, c, k) => s + (c - expected[k]) ** 2 / expected[k], 0);
  // 8 degrees of freedom: chi2 > 26.1 has a 0.1% chance under a fair generator.
  assert.ok(chi2 < 26.1, `chi2 = ${chi2.toFixed(2)}`);
});
