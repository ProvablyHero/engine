import { test } from "node:test";
import assert from "node:assert/strict";
import { INPUT, acceptsDraft, inputError, parseNumber, assertSeed } from "./input.ts";
import { floats } from "./floats.ts";
import { simulate } from "../sim/plinko.ts";

test("seed contracts reject whitespace, emoji, controls, markup and oversized pastes without rewriting", () => {
  for (const value of ["abc def", "abc\n", "abc\t", "😀", "abc\u200b", "abc\u202e", "<script>", "a' OR 1=1--", "abc\\def", "a".repeat(129)]) {
    assert.equal(acceptsDraft(value, INPUT.clientSeed), false, JSON.stringify(value));
    assert.throws(() => assertSeed(value), RangeError);
  }
  assert.equal(inputError("Abc_123.x:y-z", INPUT.clientSeed), null);
  assert.equal(inputError("", INPUT.clientSeed), "Enter a value.");
  assert.equal(inputError("a".repeat(256), INPUT.serverSeed), null);
});

test("numeric parsing rejects coercion, unsafe nonce, fractional counts and unbounded precision", () => {
  for (const value of ["", " ", "1\n", "-1", "+1", "1e3", "0x10", "Infinity", "NaN", "1,000", "１", "1.5", "9".repeat(1000)]) assert.equal(parseNumber(value, INPUT.simDrops), null, value);
  assert.equal(parseNumber("9007199254740991", INPUT.nonce), Number.MAX_SAFE_INTEGER);
  assert.equal(parseNumber("9007199254740992", INPUT.nonce), null);
  assert.equal(parseNumber("0", INPUT.nonce), 0);
  assert.equal(parseNumber("0", INPUT.simDrops), null);
  assert.equal(parseNumber("0.01", INPUT.bet), .01);
  assert.equal(parseNumber("1000001", INPUT.bet), null);
  assert.equal(parseNumber("0.123456789", INPUT.bet), null);
  assert.equal(acceptsDraft("1.", INPUT.bet), true);
  assert.notEqual(inputError("1.", INPUT.bet), null);
});

test("commitment is optional but a supplied hash must contain exactly 64 hex characters", () => {
  assert.equal(inputError("", INPUT.hash), null);
  assert.equal(inputError("A".repeat(64), INPUT.hash), null);
  assert.notEqual(inputError("a".repeat(63), INPUT.hash), null);
  assert.notEqual(inputError("g".repeat(64), INPUT.hash), null);
});

test("bypassing the UI still cannot run invalid seeds or enormous numeric inputs", async () => {
  await assert.rejects(floats("server", "has spaces", 0, 16), RangeError);
  const config = { seed: "valid", multipliers: new Array(9).fill(1), bet: 1, bankroll: 100, dropsPerSession: 10, sessions: 10 };
  assert.throws(() => simulate({ ...config, seed: "x".repeat(10000) }), RangeError);
  assert.throws(() => simulate({ ...config, bet: 1e100 }), RangeError);
  assert.throws(() => simulate({ ...config, multipliers: new Array(9).fill(1e100) }), RangeError);
});
