import { rtp } from "./distribution.ts";

/** One rows x risk configuration of a multiplier table. */
export type PlinkoConfig = { rows: number; risk: string; multipliers: number[] };

export function configKey(rows: number, risk: string): string {
  return `${rows}-${risk}`;
}

/** RTP of one configuration, exact: sum of P(k) * m(k). */
export function configRtp(multipliers: readonly number[]): number {
  return rtp(multipliers);
}

/** The largest multiplier and the chance of landing on one of its slots. */
export function maxWin(multipliers: readonly number[], probabilities: readonly number[]): { multiplier: number; p: number } {
  const multiplier = Math.max(...multipliers);
  const p = multipliers.reduce((s, m, k) => (m === multiplier ? s + probabilities[k] : s), 0);
  return { multiplier, p };
}
