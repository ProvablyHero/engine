import { test } from "node:test";
import assert from "node:assert/strict";
import { convergence, simulate } from "./plinko.ts";
import { rtp } from "../games/plinko/distribution.ts";
import { atLeastOnce, dropsFor, hitProbability, normalCdf, stdDev } from "../games/plinko/stats.ts";
import { xoshiro128ss } from "../core/prng.ts";

const flat = new Array(9).fill(0.99);
const table = [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6];

test("xoshiro: same seed, same stream; uniform enough", () => {
  const a = xoshiro128ss("x");
  const b = xoshiro128ss("x");
  const xs = Array.from({ length: 10000 }, () => a.float());
  assert.deepEqual(xs.slice(0, 5), Array.from({ length: 5 }, () => b.float()));
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  assert.ok(Math.abs(mean - 0.5) < 0.02);
});

test("a simulation is reproducible from its seed", () => {
  const cfg = { multipliers: table, bet: 1, bankroll: 100, dropsPerSession: 500, sessions: 300, seed: "S1" };
  assert.deepEqual(simulate(cfg), simulate(cfg));
  assert.notDeepEqual(simulate(cfg).medianFinal, simulate({ ...cfg, seed: "S2" }).medianFinal);
});

test("a flat 0.99 table loses exactly 1% a drop and never ruins a big bankroll", () => {
  const r = simulate({ multipliers: flat, bet: 1, bankroll: 1000, dropsPerSession: 100, sessions: 50, seed: "f" });
  assert.equal(r.ruin, 0);
  assert.ok(Math.abs(r.medianFinal - 999) < 1e-9);
  assert.equal(r.streak.max, 100);
});

test("ruin stops a session at once", () => {
  const r = simulate({ multipliers: [0, 0, 0], bet: 10, bankroll: 30, dropsPerSession: 100, sessions: 10, seed: "r" });
  assert.equal(r.ruin, 1);
  assert.equal(r.medianFinal, 0);
});

test("convergence approaches the exact RTP", () => {
  const c = convergence(table, "c");
  assert.equal(c.length, 5);
  assert.ok(Math.abs(c[4].rtp - rtp(table)) < 0.01, `${c[4].rtp} vs ${rtp(table)}`);
});

test("stats helpers", () => {
  assert.ok(stdDev(flat) < 1e-6);
  assert.equal(hitProbability(table, 5.6), 2 / 256);
  assert.ok(Math.abs(atLeastOnce(1 / 256, 256) - (1 - (255 / 256) ** 256)) < 1e-12);
  assert.equal(dropsFor(0.5, 0.75), 2);
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-7 && Math.abs(normalCdf(1.96) - 0.975) < 1e-3);
});

test("one 32-bit draw per drop gives binomial slots", () => {
  // A table that pays the slot index: the mean multiplier is the mean slot, rows / 2.
  const index = Array.from({ length: 17 }, (_, k) => k);
  const c = convergence(index, "binomial", [1_000_000]);
  assert.ok(Math.abs(c[0].rtp - 8) < 0.01, `mean slot ${c[0].rtp}`);
  const r = simulate({ multipliers: index.map((k) => (k === 0 ? 65536 : 0)), bet: 1, bankroll: 1e9, dropsPerSession: 200_000, sessions: 5, seed: "edge" });
  // Slot 0 pays 65,536x with p = 1/65,536, so each session's mean return is near 1x (noisy but bounded).
  assert.ok(r.meanFinal > 1e9 - 200_000 * 2 && r.meanFinal < 1e9 + 200_000 * 2);
});
