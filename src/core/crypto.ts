/** Web Crypto (browser, Workers, Node 19+). Hex in, hex out. */

const encoder = new TextEncoder();

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))));
}

export async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, encoder.encode(message)));
}

/** A random seed: 32 bytes as 64 hex characters, from the platform CSPRNG. */
export function randomSeed(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
