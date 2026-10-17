/**
 * The simulation PRNG (TZ 9.4): xoshiro128**, seeded from a string. Fast and
 * reproducible, never cryptographic: simulations are statistics, not replays
 * of an operator's rounds, and the methodology page says so.
 */

/** cyrb128: a string to four 32-bit words, to seed xoshiro. */
function seedWords(seed: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const w: [number, number, number, number] = [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  // xoshiro must not start from all zeros.
  if (w.every((x) => x === 0)) w[0] = 1;
  return w;
}

export type Prng = { next32: () => number; float: () => number };

export function xoshiro128ss(seed: string): Prng {
  let [a, b, c, d] = seedWords(seed);
  const next32 = () => {
    const result = Math.imul(((Math.imul(b, 5) << 7) | (Math.imul(b, 5) >>> 25)) >>> 0, 9) >>> 0;
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = (d << 11) | (d >>> 21);
    return result;
  };
  return { next32, float: () => next32() / 4294967296 };
}

/** A short random seed for a new simulation, e.g. "K7X4M9Q2". */
export function simulationSeed(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => alphabet[b % alphabet.length]).join("");
}
