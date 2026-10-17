import { hmacSha256 } from "./crypto.ts";

/**
 * floats(): bytes → numbers in [0, 1), four bytes per float (TZ 9.1, a helper
 * for adapters that need it). The byte stream is HMAC-SHA256(serverSeed,
 * `${clientSeed}:${nonce}:${round}`) for round = 0, 1, … (32 bytes each), so
 * any count of floats is reproducible from the three inputs.
 */
export async function floats(serverSeed: string, clientSeed: string, nonce: number, count: number): Promise<number[]> {
  const needed = count * 4;
  const bytes: number[] = [];
  for (let round = 0; bytes.length < needed; round++) {
    bytes.push(...(await hmacSha256(serverSeed, `${clientSeed}:${nonce}:${round}`)));
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b, c, d] = bytes.slice(i * 4, i * 4 + 4);
    out.push(a / 256 + b / 256 ** 2 + c / 256 ** 3 + d / 256 ** 4);
  }
  return out;
}
