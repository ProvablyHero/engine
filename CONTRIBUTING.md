# Contributing

Use Node 22.18+ and `npm ci --ignore-scripts`, then run `npm test`.

Report reproducible bugs through [Issues](https://github.com/ProvablyHero/engine/issues). Include the engine version, operator/adapter version, row count, expected and actual result, and an already revealed seed pair and nonce when relevant. Never share credentials, account cookies or active/unrevealed seeds.

Adapters must link to operator documentation, identify the algorithm version and describe any assumptions. A new adapter starts as `reference`. Follow [test-vectors/README.md](test-vectors/README.md) before proposing `verified` status. Do not copy operator code into this repository; implement the documented algorithm and cite its source.

Keep the runtime free of network calls, DOM-specific code, site secrets and affiliate data. Inputs must remain bounded. Test against an independent oracle or recorded outcomes, not a second call to the same implementation.

Before a release, update `package.json`, `package-lock.json`, `src/core/version.ts` and `CHANGELOG.md`. A release tag must be exactly `v` plus that version; `npm run test:release` enforces this. The website must rebuild against the same engine revision. Publishing on GitHub does not imply publishing to npm.
