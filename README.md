# @proveitbro/engine

The engine (TZ 9.1): pure, deterministic TypeScript that runs in the browser,
Workers and Node. Planned to be open-sourced (phase 1–2), so nothing here may
depend on site code, secrets or operator affiliate data.

- `src/core/` — types, `ENGINE_VERSION`, simulation PRNG, `floats()`.
- `src/adapters/<operator>/` — `ProvablyFairAdapter` per operator and version,
  each with test vectors from disclosed rounds.
- `src/games/plinko/` — distribution, RTP, stats, path → slot.
- `src/sim/` — simulations, ruin metrics, convergence.

Consumed as source by `proveitbro-web` and `proveitbro-admin`
(`"@proveitbro/engine": "file:../proveitbro-engine"`).

```
npm test   # typecheck + unit tests and test vectors
```
