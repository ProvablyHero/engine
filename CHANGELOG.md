# Changelog

## [0.4.0] - 2026-10-26

- Add a Stake Dice Reference adapter from official HMAC documentation and captured fairness-client integer mapping. Synthetic examples are explicitly separate from disclosed rounds; all supplied roll requests were rejected by regional restrictions.

- Add explicit BC.Game Dice98 replay (10000-event scale) alongside ClassicDice98 (10001), six disclosed regression vectors and scoped pre-bet screenshot-prefix evidence. Existing Classic Dice calls keep their default variant; payout models remain separate.

- Add a separate BC.Game ClassicDice98 sliding-window replay adapter. Two disclosed rounds match. Nonce 2 is backed by a matching pre-bet 48-character hash-prefix screenshot and later full disclosure, supporting Verified replay; payout formulas remain unverified.

- Add BCH.games Dice v1 replay, captured payout rules and exact uint32 threshold probabilities. Three disclosed rounds match; a hash captured at zero bets before round 11807972487 supports Verified replay status. Currency settlement remains unverified. Dice tools are now published on the site.

- Prepare an illustrative Dice grid model, exact probability calculations, unbiased demo rolls and bounded fixed-stake simulations. Operator-specific replays are separate from the illustrative model. The public release exposes supported models and keeps operator payout evidence separate.

## [0.3.0] - 2026-10-20

- Add BC.Game Classic Plinko HMAC-SHA512 adapter with four captured pre-bet-committed Classic rounds (nonces 0–3) and seven additional outcome vectors with separately documented weaker provenance. Full paths and slots match; status is verified for Classic. Lightning and Left/Right bias are unsupported.
- Add browser-compatible HMAC-SHA512.


- Add three community-reported Stake Plinko paths from 2018 as historical regression vectors. No recorded pre-bet commitments are available; Stake remains reference; those historical vectors do not change the Stake replay algorithm.

## [0.2.0] - 2026-10-20

### Added
- First public-release preparation with MIT licensing, usage examples and contribution instructions.
- Stake Plinko v1 reference adapter, documented sources and fixed synthetic vectors. This does not make Stake verified or add it to the website's verified operator list.
- Eight BCH.games disclosed-round vectors inside this repository, with checks of seed commitments, complete paths and slots.
- CI for Node 22.18, 24 and 26; release checks keep package, lockfile, exported version and Git tags consistent.

### Unchanged
- Existing BCH.games replay, Plinko mathematics, simulation and input-validation behavior.
- Operator payouts remain separately versioned data. These adapters return a path and slot, not a validated payout.

## [0.1.0] - Private development baseline

Private development baseline before the public-release work:
- Exact binomial Plinko slot probabilities, RTP and session statistics.
- Web Crypto seed commitments and HMAC-based replay.
- BCH.games Plinko v1 adapter, promoted from reference after disclosed-round checks on 2026-10-18.
- Deterministic demo settlement, Monte Carlo sessions, ruin and drawdown metrics, convergence and bounded input validation.
