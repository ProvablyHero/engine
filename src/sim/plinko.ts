import { xoshiro128ss } from "../core/prng.ts";

/**
 * Session simulation (TZ 9.4, P0): fixed bet, starting bankroll, N drops per
 * session, up to 10,000 sessions. A session ends early when the balance can no
 * longer cover the bet (ruin). Fully reproducible from config + seed.
 *
 * One 32-bit draw per drop: each of the low `rows` bits is one fair bounce, so
 * the slot is the number of set bits. Fast enough for millions of drops.
 */

export type SimConfig = {
  multipliers: number[];
  bet: number;
  bankroll: number;
  dropsPerSession: number;
  sessions: number;
  seed: string;
};

export type SimResult = {
  sessions: number;
  ruin: number;
  profit: number;
  lose25: number;
  lose50: number;
  double: number;
  meanFinal: number;
  medianFinal: number;
  medianDrawdown: number;
  maxDrawdown: number;
  streak: { median: number; p90: number; max: number };
  /** Balance at each checkpoint (drop index), median over sessions and 50 sample sessions. */
  checkpoints: number[];
  median: number[];
  samples: number[][];
  /** Final balances in equal-width bins from 0 to the largest final balance. */
  histogram: { from: number; to: number; count: number }[];
};

export type Convergence = { drops: number; rtp: number }[];

const CHECKPOINTS = 120;
const SAMPLES = 50;
const BINS = 24;

function popcount(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function quantile(sorted: Float64Array | number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function simulate(config: SimConfig, onProgress?: (done: number) => void): SimResult {
  const { multipliers, bet, bankroll, dropsPerSession, sessions } = config;
  if (!Number.isFinite(bet) || bet <= 0 || !Number.isFinite(bankroll) || bankroll <= 0 || !Number.isInteger(sessions) || sessions < 1 || sessions > 10000 || !Number.isInteger(dropsPerSession) || dropsPerSession < 1 || dropsPerSession > 1000000 || sessions * dropsPerSession > 50000000) throw new RangeError("Invalid simulation inputs");
  const rows = multipliers.length - 1;
  if (rows < 1 || rows > 32 || multipliers.some(m => !Number.isFinite(m) || m < 0)) throw new RangeError("Invalid multiplier table");
  const mask = rows >= 32 ? 0xffffffff : (2 ** rows - 1) >>> 0;
  const rng = xoshiro128ss(`sim:${config.seed}`);

  const points = Math.min(CHECKPOINTS, dropsPerSession);
  const checkpoints = Array.from({ length: points + 1 }, (_, i) => Math.round((i * dropsPerSession) / points));
  const atCheckpoint = new Float64Array(sessions * (points + 1));
  const finals = new Float64Array(sessions);
  const drawdowns = new Float64Array(sessions);
  const streaks = new Float64Array(sessions);
  let ruin = 0, profit = 0, lose25 = 0, lose50 = 0, double = 0, sum = 0;

  for (let s = 0; s < sessions; s++) {
    let balance = bankroll;
    let peak = bankroll;
    let drawdown = 0;
    let streak = 0;
    let longest = 0;
    let next = 1;
    atCheckpoint[s * (points + 1)] = balance;
    for (let d = 1; d <= dropsPerSession; d++) {
      if (balance < bet) {
        // Ruined: the balance stays where it is for the rest of the session.
        for (; next <= points; next++) atCheckpoint[s * (points + 1) + next] = balance;
        break;
      }
      const m = multipliers[popcount(rng.next32() & mask)];
      balance += bet * (m - 1);
      if (m < 1) {
        streak++;
        if (streak > longest) longest = streak;
      } else streak = 0;
      if (balance > peak) peak = balance;
      else if (peak - balance > drawdown) drawdown = peak - balance;
      while (next <= points && checkpoints[next] === d) atCheckpoint[s * (points + 1) + next++] = balance;
    }
    if (balance < bet) ruin++;
    if (balance > bankroll) profit++;
    if (balance <= bankroll * 0.75) lose25++;
    if (balance <= bankroll * 0.5) lose50++;
    if (balance >= bankroll * 2) double++;
    finals[s] = balance;
    drawdowns[s] = drawdown / bankroll;
    streaks[s] = longest;
    sum += balance;
    if (onProgress && s % 200 === 199) onProgress(s + 1);
  }

  const sortedFinals = finals.slice().sort();
  const median: number[] = [];
  const column = new Float64Array(sessions);
  for (let i = 0; i <= points; i++) {
    for (let s = 0; s < sessions; s++) column[s] = atCheckpoint[s * (points + 1) + i];
    median.push(quantile(column.sort(), 0.5));
  }
  const step = Math.max(1, Math.floor(sessions / SAMPLES));
  const samples: number[][] = [];
  for (let s = 0; s < sessions && samples.length < SAMPLES; s += step) samples.push(Array.from(atCheckpoint.subarray(s * (points + 1), (s + 1) * (points + 1))));

  const top = Math.max(sortedFinals[sessions - 1], bankroll * 2);
  const width = top / BINS;
  const histogram = Array.from({ length: BINS }, (_, i) => ({ from: i * width, to: (i + 1) * width, count: 0 }));
  for (const f of finals) histogram[Math.min(BINS - 1, Math.floor(f / width))].count++;

  const sortedDd = drawdowns.slice().sort();
  const sortedStreaks = streaks.slice().sort();
  return {
    sessions,
    ruin: ruin / sessions,
    profit: profit / sessions,
    lose25: lose25 / sessions,
    lose50: lose50 / sessions,
    double: double / sessions,
    meanFinal: sum / sessions,
    medianFinal: quantile(sortedFinals, 0.5),
    medianDrawdown: quantile(sortedDd, 0.5),
    maxDrawdown: sortedDd[sessions - 1],
    streak: { median: quantile(sortedStreaks, 0.5), p90: quantile(sortedStreaks, 0.9), max: sortedStreaks[sessions - 1] },
    checkpoints,
    median,
    samples,
    histogram,
  };
}

/** Observed RTP after 100, 1k, 10k, 100k and 1M drops of one long run. */
export function convergence(multipliers: number[], seed: string, marks = [100, 1_000, 10_000, 100_000, 1_000_000]): Convergence {
  const rows = multipliers.length - 1;
  if (rows < 1 || rows > 32 || multipliers.some(m => !Number.isFinite(m) || m < 0)) throw new RangeError("Invalid multiplier table");
  const mask = (2 ** rows - 1) >>> 0;
  if (marks.some((m, i) => !Number.isSafeInteger(m) || m < 1 || m > 10000000 || (i > 0 && m <= marks[i - 1]))) throw new RangeError("Invalid convergence checkpoints");
  const rng = xoshiro128ss(`conv:${seed}`);
  const out: Convergence = [];
  let returned = 0;
  let mark = 0;
  for (let d = 1; mark < marks.length; d++) {
    returned += multipliers[popcount(rng.next32() & mask)];
    if (d === marks[mark]) out.push({ drops: d, rtp: returned / d }), mark++;
  }
  return out;
}
