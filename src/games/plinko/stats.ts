import { slotProbabilities } from "./distribution.ts";

/** Standard deviation of one drop's multiplier: sqrt(sum P(k) m(k)^2 - RTP^2). */
export function stdDev(multipliers: readonly number[]): number {
  const p = slotProbabilities(multipliers.length - 1);
  const mean = multipliers.reduce((s, m, k) => s + p[k] * m, 0);
  const square = multipliers.reduce((s, m, k) => s + p[k] * m * m, 0);
  return Math.sqrt(Math.max(0, square - mean * mean));
}

/** Chance that one drop pays at least `threshold` times the bet. */
export function hitProbability(multipliers: readonly number[], threshold: number): number {
  const p = slotProbabilities(multipliers.length - 1);
  return multipliers.reduce((s, m, k) => (m >= threshold ? s + p[k] : s), 0);
}

/** P(at least one hit in K drops) = 1 - (1 - p)^K. */
export function atLeastOnce(p: number, drops: number): number {
  return p >= 1 ? 1 : 1 - Math.exp(drops * Math.log1p(-p));
}

/** Drops needed for a `target` chance of at least one hit: ceil(ln(1 - q) / ln(1 - p)). */
export function dropsFor(p: number, target: number): number {
  if (p <= 0) return Infinity;
  if (p >= 1) return 1;
  return Math.ceil(Math.log1p(-target) / Math.log1p(-p));
}

/** Standard normal CDF (Abramowitz-Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/**
 * Bankroll after N drops of `bet`, normal approximation (TZ 9.5: shown with a
 * caveat and a link to the simulator for the exact answer).
 */
export function bankrollOutlook(multipliers: readonly number[], bet: number, drops: number, rtpValue: number) {
  const sigma = stdDev(multipliers) * bet * Math.sqrt(drops);
  const expectedLoss = drops * bet * (1 - rtpValue);
  return {
    expectedLoss,
    sigma,
    low: -expectedLoss - 2 * sigma,
    high: -expectedLoss + 2 * sigma,
    profitChance: sigma > 0 ? 1 - normalCdf(expectedLoss / sigma) : expectedLoss < 0 ? 1 : 0,
  };
}
