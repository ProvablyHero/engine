# Replay vectors and provenance

These fixtures are deliberately small and self-contained. Tests never require the data repository, a casino account, an API key or network access.

## BCH.games: disclosed rounds

`bch-games-plinko-v1.json` contains eight rounds captured by the ProveItBro team on its own account on 2026-10-18. The seed commitments were recorded before play, then the server seeds were revealed by rotating them after play. The full path and slot were transcribed from the recorded verifier evidence. The first round has recorded game ID `11787321445`; the remaining seven are identified by seed hash and nonce, without invented game IDs.

The archived capture notes are in the separate data repository at `snapshots/bch-games/2026-10-18/rounds/NOTES.md`. Account screenshots are not copied into this public code repository. The JSON exposes only the rotated/revealed server seeds, commitments, client seeds, nonces, row counts, recorded paths and slots. These historical replay inputs are intentional public test data, not active credentials.

`src/adapters/bch-games/disclosed-rounds.test.ts` checks the SHA-256 commitment, every direction and the resulting slot. It does not verify payouts: multiplier tables and historical table selection belong to the data package. Passing eight historical vectors establishes replay agreement for those inputs, not a certification of every bet or the operator.

## Stake: synthetic reference vectors

`stake-plinko-v1.json` is explicitly `synthetic-reference`. Inputs are made up, expected paths were calculated independently with Python's standard-library HMAC-SHA256, and they are checked against both the adapter and a separate Node crypto oracle. They are not Stake bets or operator verification evidence.

Sources checked on 2026-10-19:
- https://stake.com/provably-fair/implementation
- https://stake.com/provably-fair/conversions
- https://stake.com/provably-fair/game-events

The byte stream is HMAC-SHA256 with the revealed server seed as its UTF-8 key and `clientSeed:nonce:round` as the message. Each direction consumes a four-byte big-endian fraction; values below 0.5 go left, others go right. A ninth row must consume the next 32-byte HMAC block.

## Adding evidence

1. Record the server seed commitment before the round and the supported algorithm version.
2. Record rows and the independently displayed path/slot. A game ID is optional; do not invent one.
3. Rotate the server seed after play, then verify its revealed value against the saved commitment.
4. Remove account identifiers, balances, session tokens and other private UI from any evidence shared publicly. Do not include unrevealed/active seeds.
5. Transcribe the expected outcome from evidence rather than generating it with the adapter being tested.
6. Add a fixture and a regression test. Include both an eight-row case and a longer case when the algorithm crosses a hash-block boundary.

A source-code comparison or synthetic vector alone is enough for `reference`, never for `verified`. Use Issues for public, already revealed reproducible examples. See [SECURITY.md](../SECURITY.md) for sensitive reports.
