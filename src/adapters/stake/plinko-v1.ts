import { floats } from "../../core/floats.ts";

/**
 * Original implementation of Stake's documented Plinko mapping, checked 2026-10-19.
 * Sources: https://stake.com/provably-fair/implementation and /game-events.
 * Reference only: no disclosed Stake rounds are included in this release.
 * Payout tables are separate data; this adapter replays the path and slot only.
 */
export const STAKE_PLINKO_V1 = {
  id: "stake-plinko-v1",
  operator: "stake",
  game: "plinko",
  algorithmVersion: "v1",
  status: "reference",
} as const;

export async function stakePlinkoPath(serverSeed: string, clientSeed: string, nonce: number, rows: number): Promise<{ path: (0 | 1)[]; slot: number }> {
  if (!Number.isInteger(rows) || rows < 8 || rows > 16) throw new RangeError("Stake rows must be 8 to 16");
  const path = (await floats(serverSeed, clientSeed, nonce, rows)).map(f => Math.floor(f * 2) as 0 | 1);
  return { path, slot: path.reduce<number>((sum, direction) => sum + direction, 0) };
}
