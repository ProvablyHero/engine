import { test } from "node:test";
import assert from "node:assert/strict";
import { rtp, slotProbabilities } from "./distribution.ts";

test("probabilities sum to 1 and are symmetric", () => {
  const p = slotProbabilities(16);
  assert.equal(p.length, 17);
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.equal(p[0], p[16]);
  assert.equal(p[0], 1 / 65536);
});

test("rtp of a flat table equals the multiplier", () => {
  assert.ok(Math.abs(rtp(new Array(9).fill(0.99)) - 0.99) < 1e-12);
});
