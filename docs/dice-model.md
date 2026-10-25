# Dice illustrative model (unreleased)

Import from `@proveitbro/engine/dice`. This preparation is not an operator implementation and is not part of a tagged engine release yet.

- There are 10,000 uniform integer outcomes, `0..9999`, displayed by dividing by 100.
- `chanceBps` is a winning-outcome count, from 1 to 9999. Under wins at `roll < chanceBps`; Over wins at `roll > 9999-chanceBps`. Equality loses. Do not transfer these endpoints to an operator without checking its rules.
- Gross payout multiplier is `(1-houseEdge)/(chanceBps/10000)`. It includes returned stake. RTP is `1-houseEdge`; unit-stake return variance is `RTP²(1-p)/p`.
- `diceAtLeastOne` assumes a funded, fixed number of independent wagers; it is not a bankroll-ruin calculation.
- `drawDiceRoll` rejects uint32 words `>=4294960000` before taking `%10000`. Its default is browser cryptographic randomness. Simulator calls instead pass a deterministic xoshiro128** word source.
- Simulator validation bounds both dimensions and their product before arrays or loops are created. Paths retain remaining credits after an inability to fund another stake. Expected loss is based on actual simulated turnover, not the unused planned budget.
- No currency settlement rounding, KYC claims, operator payout caps, commitment checks or real-bet replay are implied. These require separate operator evidence and adapters.

Tests exhaustively count the winning outcomes for several thresholds in both directions, including extreme probabilities and equality. They also cover the rejection boundary, deterministic simulations, turnover/bankroll accounting and budget rejection.

## BCH.games captured profile (unreleased)

`profile: 'bch-games-v1'` selects the rules captured on 2026-10-25. Its nominal edge is fixed at 2%; chance counts are limited to 1..9799. Targets use the same integer comparisons, but payouts follow the captured client operations and round to four decimals. Actual probabilities count uint32 preimages, so rounded payouts can yield an effective RTP slightly different from exactly 98%. Simulations use that actual RTP for expected loss on completed turnover.

`bchGamesDiceRoll` is a separate HMAC replay adapter. Round 11807862209 at nonce 4 reproduces 28.08; its reported Under 96.30 multiplier is 1.0177. The available hash capture is after the wager, so that capture alone supports Reference. No currency-settlement rounding is certified.

A second captured vector, round 11807938076, reproduces 12.11 at nonce 14 and loses on Over 61.45 with an announced multiplier of 2.5428. Both Under and Over now have disclosed-round regression coverage. The second capture also records its hash after the wager, so that capture alone does not establish pre-bet commitment.

Round 11807972487 completes the pre-bet commitment sequence: hash captured with zero bets before the request, matching later disclosure, nonce 3, result 77.37, Over 99.43 and announced 175x. BCH.games Dice v1 is now Verified for this replay scope. Older vectors keep their post-bet provenance. Currency settlement remains unverified; Dice is not published on the site.
