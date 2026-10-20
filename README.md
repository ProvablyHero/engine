# ProveItBro Engine

**Replay a revealed Plinko bet and check the mathematics behind it.** Pure TypeScript for browser-side odds, RTP, bankroll simulations and versioned provably fair adapters, used by [ProveItBro](https://proveitbro.com).

[Try the tools](https://proveitbro.com/plinko) · [Replay a supported bet](https://proveitbro.com/verify) · [Issues](https://github.com/ProveItBro/engine/issues) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE)

The runtime has no third-party dependencies, network requests, database access or secrets. It uses Web Crypto and runs in browsers, Cloudflare Workers and Node.

## Run it locally

Use **Node 22.18 or newer** (native TypeScript support) and npm:

```sh
git clone https://github.com/ProveItBro/engine.git
cd engine
npm ci --ignore-scripts
npm test
node examples/verify-stake.ts
node examples/verify-bch-games.ts
```

This is a source package, not a published npm package. `private: true` prevents accidental npm publication; it does not control GitHub visibility. Browser apps can import the TypeScript source through their bundler. In a sibling checkout, use `"@proveitbro/engine": "file:../engine"` and import `@proveitbro/engine`, `@proveitbro/engine/plinko` or `@proveitbro/engine/sim`.

## Replay Stake Plinko in five lines

The runnable [example](examples/verify-stake.ts) uses **synthetic reference inputs**, not a real Stake bet. Replace them with your revealed server seed, the commitment saved before play, client seed, nonce, rows and recorded slot:

```ts
import { stakePlinkoPath, sha256Hex } from "../src/index.ts";
const bet = { serverSeed: "synthetic-stake-reference-server", clientSeed: "synthetic-reference-client", nonce: 0, rows: 8, serverSeedHash: "7d532db31f6bc2455e8f4cbfd5e13954784391eef240c9575aaf33997e115267", slot: 2 };
if (await sha256Hex(bet.serverSeed) !== bet.serverSeedHash) throw new Error("Server seed commitment mismatch");
const result = await stakePlinkoPath(bet.serverSeed, bet.clientSeed, bet.nonce, bet.rows);
console.log({ matches: result.slot === bet.slot, slot: result.slot, path: result.path });
```

Stake support is `reference`: it implements the published scheme but we have no independently captured Stake rounds with recorded commitments. For an actual disclosed-round example, run `node examples/verify-bch-games.ts`.

A matching path/slot and server-seed commitment are specific checks. They do not prove operator solvency, withdrawals, every aspect of fairness or that a particular multiplier table was in use. The returned slot is **zero-based**; `0` means left and `1` means right in a path. This package does not supply operator payout tables or compare the payout of a bet.

Seeds are used verbatim as UTF-8 strings, not hex-decoded or trimmed. Current input policies accept `A–Z`, `a–z`, digits, `.`, `_`, `:` and `-`, with server seeds up to 256 characters and client seeds up to 128. Seeds outside this supported subset are rejected; a rejected seed is not evidence of an unfair bet. Nonces must be nonnegative safe integers.

## Supported adapters

| Operator / game | Adapter | Status | Evidence in this repository |
| --- | --- | --- | --- |
| BCH.games Plinko, 8–16 rows | `bch-games-plinko-v1` | **verified** | Eight disclosed rounds; commitment, full-path and slot checks |
| Stake Plinko, 8–16 rows | `stake-plinko-v1` | **reference** | Official scheme, four synthetic vectors, three community-reported historical paths (2018), independent Node crypto oracle |

`verified` means replay agreement with the captured disclosed rounds for the named adapter version. `reference` means an implementation of the documented algorithm without those independent real-round checks. Neither is a casino endorsement or a claim about future wins. Operator status on the website also depends on its separately reviewed data; adding an engine adapter does not automatically list an operator there.

Sources: [Stake implementation](https://stake.com/provably-fair/implementation), [float conversion](https://stake.com/provably-fair/conversions), [Plinko mapping](https://stake.com/provably-fair/game-events), [BCH.games](https://bch.games) and the ProveItBro capture notes described in [vector provenance](test-vectors/README.md).

## Exact mathematics and session estimates

```ts
import { slotProbabilities, rtp, atLeastOnce } from "../src/games/plinko/index.ts";
const probability = slotProbabilities(16)[0]; // 1 / 65,536 for one edge slot
const chanceIn1000 = atLeastOnce(probability, 1000);
const returnOfFlatTable = rtp(Array(9).fill(0.99)); // 0.99; example table, not an operator claim
```

- Slot probabilities: `C(rows, slot) / 2**rows`, with equal independent left/right decisions.
- RTP: the sum of slot probability × multiplier. The house edge is `1 - RTP`.
- Session simulation: seeded Monte Carlo estimates of balance paths, ruin, profit, drawdown and losing streaks. Rare outcomes may be missed. A deterministic simulation is reproducible, not a prediction of the next bet.
- Demo settlement and replay use bounded inputs; simulation workloads are capped.

## Tests and real-round vectors

```sh
npm test                 # types, unit tests, fixed vectors, release metadata and runnable examples
npm run test:unit        # mathematics, input limits, replay and simulation regressions
npm run security:check  # scan tracked files for known secret patterns
npm run security:history # scan fetched Git history and staged files
npm run security:audit  # lockfile dependency audit; needs network access
```

[Vector provenance and contribution rules](test-vectors/README.md) distinguish eight BCH.games disclosed rounds, synthetic Stake fixtures and historical community examples without recorded commitments. Tests run without fetching operator sites or the separate data repository. CI runs tests on Node 22.18, 24 and 26 with read-only repository permissions; the security workflow also runs weekly.

## Versions and layout

`ENGINE_VERSION`, package version and release tag must agree. The website displays the exported engine version in odds, simulation results and CSV downloads; it must rebuild when the engine changes. Algorithm version (`v1`) is separate from engine semver (`0.2.0`) and payout table version (a capture date).

```text
src/core/         Web Crypto, byte-to-float stream, input limits, PRNG and engine version
src/adapters/     Versioned BCH.games and Stake Plinko replay
src/games/plinko/ Exact distribution, RTP, statistics and demo settlement
src/sim/          Bounded session simulations and convergence
test-vectors/    Disclosed-round and explicitly synthetic fixtures
examples/         Runnable replay examples
```

The data project is a separate phase: versioned multiplier JSON, source captures and CSV downloads, intended for CC BY 4.0 publication after its own review. This code repository is MIT licensed; it does not grant rights to operator websites or their screenshots.

## Bugs and contributions

Found a wrong result? [Open an issue](https://github.com/ProveItBro/engine/issues) with engine/adapter versions, expected result and a minimal reproducer using already revealed seeds. [Contribution guide](CONTRIBUTING.md) · [Sensitive reports](SECURITY.md).
