# Clausplex

Little Claus. Big maze.

A free, independent community adaptation of OpenSupaplex with Claus artwork and the original Supaplex puzzles. **Part I includes levels 1–37.**

[Play on Claus Network](https://claus.si/c/clausplex) · [Developer on X](https://x.com/0xlaplaced)

![Clausplex Part I](assets/screenshot.jpg)

## Play

Collect the required sparks and find the exit. Use the arrow keys to move; hold Space and a direction to grab an adjacent object. Press P to pause and R to restart. Touch controls are available on narrow screens.

No wallet, account, installation, or payment is required to play. The game is silent and progress is not saved; choose any of the 37 puzzles from **Levels**.

The puzzle maps, collision rules, timing, and gameplay simulation are preserved. Clausplex provides a new interface, terrain artwork, and a little Claus character over the OpenSupaplex engine.

## Run locally

Python 3.10+ is enough to serve the committed static game:

```sh
python3 -m http.server 8000 --directory docs
```

Open <http://localhost:8000/>. No application dependencies or API keys are needed.

## Edit and rebuild the interface

Edit `index.html`, `app.js`, `rankings.js`, or `theme.css`, then run:

```sh
python3 scripts/rebuild-site.py
```

This reuses the committed JavaScript engine when a local C build is absent, runs `package.py`, and updates `docs/`. Keep generated `docs/` files committed as the reproducible static release bundle. The public game is published on Claus Network; this repository stores its source and build artifacts. GitHub Pages is disabled.

For changes to C code or embedded resources, activate **Emscripten 6.0.12**, then run:

```sh
python3 build-portable.py
python3 scripts/rebuild-site.py
```

See [BUILD.txt](BUILD.txt) for the complete build, resource, and upstream details. The compiled game uses pure JavaScript to work within the Claus hosting restrictions. Engine files download in parallel when Play or Watch is selected, so the menu can open first.

## Verify

With Node.js and Python installed:

```sh
python3 scripts/rebuild-site.py
node validate_site.mjs
node tests/test-loader.mjs
node tests/test-progression.mjs
```

For a full simulation check of all 37 original solution recordings:

```sh
python3 build-portable.py --headless
python3 test-portable.py
```

The Part I release passed 37/37 recorded solution simulations, 37/37 result and navigation unit checks, and 7/7 loader unit checks. Browser smoke checks covered loading, level selection, levels 1 and 37, and returning home. These are not a complete manual playthrough of every puzzle.

The **Watch a solve** demonstration runs at the original 35 simulation steps per second (normal play speed). It stops on completion and does not submit a score.

## Optional verified times

On the canonical Claus page, enter your **Player name** before playing to start a ranked attempt. Leave it blank for anonymous play. Ranked attempts use a fixed original puzzle seed; ordinary play keeps the original seed behavior. Win the level, review the prefilled name, confirm publication, and submit. The nickname is carried in the level URL fragment between puzzles; it is not sent to a server until submission. Sign in using the official Claus page when requested. No transaction, token, NFT, payment, or prize is involved. Local builds support anonymous play and reading the public leaderboard; submissions use the canonical Claus shell.

The browser records the inputs actually consumed by the C simulation, seed, original map hash, build identity and simulation steps. A scheduled GitHub Action reconstructs the original map and replays those inputs in the same headless engine. Only a genuine winning replay produces a verified receipt. Times are server-calculated steps / 35; the displayed game clock is not trusted. Public reads pin the verifier's server-assigned author ID. Arbitrary records claiming to be verified are ignored.

There are Standard and Assisted categories, with each player's best time in each category and the top ten displayed. Known original solve recordings are automatically assisted. Replay verification proves a valid solution, **not human play**; scripts, shared solutions and multiple accounts cannot be reliably excluded. Names are public, unverified aliases; player IDs and submitted inputs are public too. Play anonymously if you do not want a persistent public submission.

Verification is queued, normally checked every five minutes. GitHub can delay or disable schedules; use **Check verification** later or the public leaderboard. The action can also be dispatched manually. Your Mac does not need to stay on. Pending unsent input recordings live only in the current page; leaving discards them. After submission the public queue persists independently of the browser.

Run the two-cycle regression suite:

```sh
node tests/test-verifier.mjs 1
node tests/test-verifier.mjs 2
node tests/test-rankings.mjs
```

This validates all 37 captured solutions twice, rejects malformed or incomplete inputs, checks process deadlines, forged records, duplicate submissions, cooldowns, daily limits, category isolation, best times, and recovery after lost replies or a crash between receipt and leaderboard writes. UI unit tests use stubs; live integration and browser checks are documented separately.

### Operations and limits

The worker's `CLAUS_VERIFIER_TOKEN` exists only in GitHub encrypted Actions secrets. It is an app.use-only delegated credential, not an owner credential or wallet key. Its public principal/expiry are in `backend/deployment.json`. Claus limits mandates to 30 days; renew the credential and encrypted secret before expiry, update the public expiry, rebuild and publish. If it expires, ranked submission is disabled and the worker reports paused; anonymous play and existing times remain available. Do not commit a credential to this repository.

Each player gets at most six submissions per UTC day, at least 60 seconds apart. The worker handles at most ten per batch, at most two per player. Replays are limited to 4096 encoded input bytes and 126000 steps; actual encoding may hit the byte limit earlier. Each replay runs in a credential-free child process with a 12-second deadline, output cap and 256 MiB JavaScript heap cap, using only repository-controlled maps and code. This bounds work; it does not stop a Sybil attack or prevent an attacker exhausting the platform's shared quotas.

Claus managed apps currently have 5000 records, 1000 mutations/day/app, 200/day/actor and 1000 memberships. A verified submission generally uses a run, receipt and board mutation. Monitor Actions errors and collection usage; additional capacity or an archival design is needed before these limits. Do not delete the receipt ledger without rebuilding the materialized boards. Keep the verifier ID pinned when rotating a credential for the same principal; migrating principals requires an explicit data migration.

The public API is the Claus managed records endpoint: `/v1/public/apps/{projectId}/records?collection=boards&authorId={verifierId}&limit=100`, using the origin, project and verifier IDs from `backend/deployment.json`. Follow `nextCursor` using `after`. Receipts and runs use the same endpoint with their collection names. Consumers must check `authorId`, gameVersion and schema, and must not trust a client-set flag. Ordinary anonymous plays are not counted or tracked.

## Source and credits

Based on [OpenSupaplex 7.2.2](https://github.com/sergiou87/open-supaplex), upstream commit `bad56a4e174e628643995284ea55d4c49af3137c`, by Sergio Padrino and contributors. Original Supaplex by Philip Jespersen and Michael Stopp.

The OpenSupaplex engine is GPLv3; see [LICENSE](LICENSE), the preserved source headers, and [NOTICE.md](NOTICE.md). Original levels, replay recordings, legacy fonts, and Claus branding retain their respective authors' rights; the engine license does not relicense them. Bricolage Grotesque uses the SIL Open Font License. Runtime and font licenses are included in `assets/`.

This is an independent community adaptation, not an official Claus product. Maintained by [@0xlaplaced](https://x.com/0xlaplaced).
