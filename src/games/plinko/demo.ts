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
