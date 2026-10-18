import { sha256Hex } from "../../core/crypto.ts";
import { floats } from "../../core/floats.ts";

/**
 * The ProveItBro demo generator: our own provably fair scheme, used by the
 * demo for every table. It is NOT an operator's algorithm (those are adapters,
 * TZ 9.1); the demo says so next to the board.
 *
 * One float per row: below 0.5 the ball goes left (0), otherwise right (1).
 * The slot is the number of rights.
 */
export type Drop = { path: (0 | 1)[]; slot: number };

export async function demoDrop(serverSeed: string, clientSeed: string, nonce: number, rows: number): Promise<Drop> {
  const path = (await floats(serverSeed, clientSeed, nonce, rows)).map((f) => (f < 0.5 ? 0 : 1) as 0 | 1);
  return { path, slot: path.reduce<number>((s, d) => s + d, 0) };
}

/** Keep accounting at calculation precision; round only the displayed amount. */
export function settleDemo(balance: number, bet: number, multiplier: number): { balance: number; payout: number } {
  if (![balance, bet, multiplier].every(Number.isFinite) || bet < 0.01 || balance < bet || multiplier < 0) throw new RangeError("Invalid demo settlement");
  const payout = bet * multiplier;
  return { balance: balance - bet + payout, payout };
}

export async function verifyDemoDrop(serverSeed: string, row: { seedHash: string; clientSeed: string; nonce: number; rows: number; slot: number; multiplier: number; bet: number; payout: number }, multipliers: readonly number[]): Promise<boolean> {
  if (multipliers.length !== row.rows + 1 || await sha256Hex(serverSeed) !== row.seedHash) return false;
  const replay = await demoDrop(serverSeed, row.clientSeed, row.nonce, row.rows);
  return replay.slot === row.slot && multipliers[replay.slot] === row.multiplier && row.payout === row.bet * row.multiplier;
}
