# Public GitHub launch

Target organization: **ProvablyHero**, chosen by the project owner. The local workspace names can stay `proveitbro-engine` and `proveitbro-data`; transferring a GitHub repository does not require moving these directories.

## Prepared artifacts

- Engine v0.2.0: MIT license, README, examples, eight disclosed BCH.games vectors, a reference-only Stake adapter and synthetic vectors, tests and CI.
- `docs/organization-profile/profile/README.md`: copy to `profile/README.md` in the organization's separate `.github` repository. A profile nested in the engine repository will not become the organization overview.
- Website changes: engine link in the footer and version-specific source links in odds/simulator results.
- Data publication remains phase 1. Do not make its screenshots/history public just by transferring the engine. Review privacy and source rights separately, apply CC BY 4.0 to the data, and retain attribution for third-party sources.

## Publish in this order

1. Create the GitHub organization **ProvablyHero** and give the repository owner permission to transfer/create repositories. This requires the owner's GitHub account; SSH access alone cannot create an organization.
2. Transfer `spevson/proveitbro-engine` to the organization, then rename it `engine`. Keep it private during the final review. GitHub offers redirects for the previous address.
3. Update the local origin to `git@github.com:ProvablyHero/engine.git`; push the reviewed changes. Run `npm ci --ignore-scripts`, `npm test`, `npm run security:check`, `npm run security:history`, and `npm run security:audit`. Fetch all refs before the history scan. Inspect commit authors and messages too: a pattern scan cannot certify that all private information is absent.
4. Enable Issues. Change **only the engine** to Public after review. Confirm the README and code are readable without a GitHub login. Observe that Git history is public too; this is not npm publication.
5. Tag the reviewed engine commit `v0.2.0`, push the tag and confirm CI passes. Tag checks require it to match `package.json`, `package-lock.json`, `ENGINE_VERSION` and the changelog. Do not move an already published version tag to new code.
6. Create the public `.github` organization repository and copy the prepared profile README. Keep data marked phase 1 until it is public and reviewed.
7. Refresh file dependencies in the website/admin, verify they resolve to engine 0.2.0, rebuild and publish the website links only after `https://github.com/ProvablyHero/engine/tree/v0.2.0` is publicly accessible. Keep the site's `INDEXABLE=false` setting until its own launch is approved.

## Data phase 1

Before publishing `ProvablyHero/data`: inspect every source capture and the full history for account details, balances, login/session material and private URLs; strip or replace them in the public dataset as needed. Document CC BY 4.0 coverage and attribution without claiming ownership of operator screenshots/code. Preserve the current table paths and archive dates, validate all JSON, and keep the site's CSV downloads consistent with those table versions.

Do not advertise Stake as verified or add a real Stake operator payout table without independent data and disclosed-round evidence. The engine's reference adapter is usable for replay, but it does not change the site's supported-operator status.
