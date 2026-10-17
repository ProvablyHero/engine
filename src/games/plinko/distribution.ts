/** P(k) = C(n,k) / 2^n for a board of n rows: slot k of n + 1 (TZ 9.1). */
export function slotProbabilities(rows: number): number[] {
  if (!Number.isInteger(rows) || rows < 1 || rows > 64) throw new RangeError(`rows: ${rows}`);
  const probabilities = [1];
  for (let r = 0; r < rows; r++) {
    const next = new Array<number>(probabilities.length + 1).fill(0);
    probabilities.forEach((p, k) => {
      next[k] += p / 2;
      next[k + 1] += p / 2;
    });
    probabilities.splice(0, probabilities.length, ...next);
  }
  return probabilities;
}

/** RTP = sum of P(k) * m(k). */
export function rtp(multipliers: readonly number[]): number {
  const p = slotProbabilities(multipliers.length - 1);
  return multipliers.reduce((sum, m, k) => sum + p[k] * m, 0);
}
