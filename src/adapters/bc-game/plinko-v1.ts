import { hmacSha512 } from "../../core/crypto.ts";
import { assertSeed, INPUT } from "../../core/input.ts";

/** Original implementation of bcgame-project/verify/plinko.html, checked 2026-10-20.
 * Classic normal mode only. Lightning and Left/Right side bias are outside this adapter.
 * Four captured rounds have a recorded pre-bet commitment and matching disclosure.
 * Seven additional outcome fixtures have weaker commitment provenance, documented separately.
 */
export const BC_GAME_PLINKO_V1 = {
  id: "bc-game-plinko-v1", operator: "bc-game", game: "plinko",
  algorithmVersion: "v1", status: "verified",
} as const;

export async function bcGamePlinkoPath(serverSeed: string, clientSeed: string, nonce: number, rows: number): Promise<{ path: (0 | 1)[]; slot: number }> {
  if (!Number.isSafeInteger(nonce) || nonce < 0 || !Number.isInteger(rows) || rows < 8 || rows > 16) throw new RangeError("Invalid BC.Game replay inputs");
  assertSeed(serverSeed, INPUT.serverSeed);
  assertSeed(clientSeed);
  const bytes = await hmacSha512(serverSeed, `${clientSeed}:${nonce}`);
  const path: (0 | 1)[] = [];
  for (let i = 0; i < rows; i++) {
    const offset = i * 4;
    const value = bytes[offset] / 256 + bytes[offset + 1] / 256 ** 2 + bytes[offset + 2] / 256 ** 3 + bytes[offset + 3] / 256 ** 4;
    // The official verifier uses strictly > .5 (exactly .5 is left).
    path.push(value > 0.5 ? 1 : 0);
  }
  return { path, slot: path.reduce<number>((sum, direction) => sum + direction, 0) };
}
