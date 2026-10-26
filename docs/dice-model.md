Public release: engine v0.4.0, 2026-10-26. Dice tool pages and supported verifiers are now live. Capture chronology and earlier preparation notes below describe the evidence gathered before launch.

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

## BC.Game Classic Dice replay

`bcGameDiceRoll` is separate from the BCH.games and illustrative profiles. It implements the HMAC-SHA256 sliding-window algorithm in the official `classicdice_new.html` and `lib/utils.js`, retaining the captured API's integer floor before scaling by 100. It has 10001 ticks, including 100.00. Legacy Classic Dice and the separate Dice product are not interchangeable. Round 1880047227552134678, nonce 15, reproduces 76.28. Its hash was captured after the wager, before disclosure, so that capture alone supports Reference. No payout, stake limits or settlement profile is inferred from this losing round.

A second BC.Game round, 1880048288356627997, nonce 2, reproduces 35.84 and a reported Under 50 win at 1.96x. A pre-bet settings screenshot records the client seed, next nonce 1 and a matching 48-character hash prefix. Its filename supplies the time; the full hash is recorded only after play. The later disclosure matches both. This explicit prefix-based evidence supports Verified replay status without asserting a full pre-bet network hash, payout formula or settlement check.

## BC.Game Dice98 variant

`bcGameDiceRoll` and `bcGameDiceFromHash` accept an explicit fourth/second `BcDiceVariant` argument: `Dice98` or `ClassicDice98`. The existing default remains ClassicDice98. `BC_GAME_DICE_98_V1` identifies the separate 10000-event scale from official `dice.html`; ClassicDice98 remains 10001. Six additional disclosed rounds match the new variant. Its screenshot at next nonce 0 records matching 48-character hash and 21-character client prefixes; both full values are recorded later. Verified scope records these clipping and timing limits explicitly. Interval and payout observations are kept in data, without adding a payout/statistics profile.

Dice98 preserves the published JavaScript `parseInt(number)` conversion, including its scientific-notation behavior for extremely small nonzero fractions. It is not replaced by Math.floor. A constructed hash regression covers that edge; normal captured results are unchanged. This compatibility does not establish an exactly uniform distribution or payout model.

## Stake Dice Reference

Stake uses HMAC-SHA256(serverSeed, clientSeed:nonce:0), first four bytes, and a 10001-event grid. Official game-events documentation shows the raw float expression; captured fairness code confirms Math.floor(float*10001)/100. This is separate from BC.Game sliding-window HMAC extraction and BCH.games' 10000 scale. All 24 roll requests in the supplied Stake HAR returned data:null with locationDiscontinuedBanned; the active seed was still hashed. No real disclosed-round vector is invented. The adapter is Reference; synthetic examples test implementation only. Nominal 1% client payout arithmetic is documented separately, without a certified server payout, exact RTP or settlement profile.
