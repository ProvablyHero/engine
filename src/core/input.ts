/** Shared browser/engine input contracts. Reject invalid input; never rewrite seeds. */
export type InputPolicy = {
  maxLength: number;
  kind: "integer" | "decimal" | "seed" | "hash";
  min?: number;
  max?: number;
  optional?: boolean;
};
export const INPUT = {
  serverSeed: { kind: "seed", maxLength: 256 },
  clientSeed: { kind: "seed", maxLength: 128 },
  demoSeed: { kind: "seed", maxLength: 64 },
  hash: { kind: "hash", maxLength: 64, optional: true },
  nonce: { kind: "integer", maxLength: 16, min: 0, max: Number.MAX_SAFE_INTEGER },
  bet: { kind: "decimal", maxLength: 18, min: 0.01, max: 1e6 },
  bankroll: { kind: "decimal", maxLength: 18, min: 1, max: 1e9 },
  target: { kind: "decimal", maxLength: 18, min: 0.01, max: 1e6 },
  drops: { kind: "integer", maxLength: 9, min: 1, max: 1e8 },
  simDrops: { kind: "integer", maxLength: 6, min: 1, max: 100000 },
  sessions: { kind: "integer", maxLength: 5, min: 1, max: 10000 },
} as const satisfies Record<string, InputPolicy>;

export function acceptsDraft(value: unknown, policy: InputPolicy): value is string {
  if (typeof value !== "string" || value.length > policy.maxLength || /\s/.test(value)) return false;
  switch (policy.kind) {
    case "integer": return /^\d*$/.test(value);
    case "decimal": return /^\d*(?:\.\d{0,8})?$/.test(value);
    case "seed": return /^[A-Za-z0-9._:-]*$/.test(value);
    case "hash": return /^[A-Fa-f0-9]*$/.test(value);
  }
}

export function inputError(value: unknown, policy: InputPolicy): string | null {
  if (!acceptsDraft(value, policy)) return `Use the allowed characters, without spaces, up to ${policy.maxLength} characters.`;
  if (value === "") return policy.optional ? null : "Enter a value.";
  if (policy.kind === "hash") return value.length === 64 ? null : "Enter exactly 64 hexadecimal characters.";
  if (policy.kind === "seed") return null;
  if (!/^\d+(?:\.\d+)?$/.test(value)) return "Enter a complete number.";
  const number = Number(value);
  if (!Number.isFinite(number) || (policy.kind === "integer" && !Number.isSafeInteger(number)) || number < (policy.min ?? 0) || number > (policy.max ?? Number.MAX_SAFE_INTEGER)) return `Enter ${policy.min ?? 0} to ${policy.max ?? Number.MAX_SAFE_INTEGER}${policy.kind === "integer" ? " (whole numbers only)" : ""}.`;
  return null;
}

export function parseNumber(value: unknown, policy: InputPolicy): number | null {
  return (policy.kind === "integer" || policy.kind === "decimal") && !inputError(value, policy) ? Number(value) : null;
}

export function assertSeed(value: unknown, policy: InputPolicy = INPUT.clientSeed): asserts value is string {
  if (inputError(value, policy)) throw new RangeError("Invalid seed");
}
