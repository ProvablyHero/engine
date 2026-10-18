import { floats } from "../../core/floats.ts";

/**
 * BCH.games Plinko, as published on its fairness page (snapshot in
 * proveitbro-data/snapshots/bch-games/2026-10-17/provably-fair/):
 *
 *   bytes  = HMAC-SHA256(key = serverSeed, `${clientSeed}:${nonce}:${round}`), round = 0, 1, …
 *   float  = b0/256 + b1/256² + b2/256³ + b3/256⁴, four bytes each
 *   move   = floor(float * 2): 0 left, 1 right; one float per row
 *   slot   = number of rights; multiplier = table[risk][rows][slot]
 *
 * Status: verified. Real disclosed rounds (proveitbro-data,
 * snapshots/bch-games/2026-10-18/rounds/) replay with this adapter (TZ 12.2).
 */
export const BCH_GAMES_PLINKO_V1 = {
  id: "bch-games-plinko-v1",
  operator: "bch-games",
  game: "plinko",
  algorithmVersion: "v1",
  status: "verified",
} as const;

export async function bchGamesPlinkoPath(serverSeed: string, clientSeed: string, nonce: number, rows: number): Promise<{ path: (0 | 1)[]; slot: number }> {
  const path = (await floats(serverSeed, clientSeed, nonce, rows)).map((f) => Math.floor(f * 2) as 0 | 1);
  return { path, slot: path.reduce<number>((s, d) => s + d, 0) };
}
