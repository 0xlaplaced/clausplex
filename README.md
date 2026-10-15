# Clausplex

Little Claus. Big maze.

A free, independent community adaptation of OpenSupaplex with Claus artwork and the original Supaplex puzzles. **Part I includes levels 1–37.**

[Play on Claus Network](https://claus.si/c/clausplex) · [Play on GitHub Pages](https://0xlaplaced.github.io/clausplex/) · [Developer on X](https://x.com/0xlaplaced)

![Clausplex Part I](assets/screenshot.jpg)

## Play

Collect the required sparks and find the exit. Use the arrow keys to move; hold Space and a direction to grab an adjacent object. Press P to pause and R to restart. Touch controls are available on narrow screens.

No wallet, account, installation, or payment is required. The game is silent and progress is not saved; choose any of the 37 puzzles from **Levels**.

The puzzle maps, collision rules, timing, and gameplay simulation are preserved. Clausplex provides a new interface, terrain artwork, and a little Claus character over the OpenSupaplex engine.

## Run locally

Python 3.10+ is enough to serve the committed static game:

```sh
python3 -m http.server 8000 --directory docs
```

Open <http://localhost:8000/>. No application dependencies or API keys are needed.

## Edit and rebuild the interface

Edit `index.html`, `app.js`, or `theme.css`, then run:

```sh
python3 scripts/rebuild-site.py
```

This reuses the committed JavaScript engine when a local C build is absent, runs `package.py`, and updates `docs/`. Keep generated `docs/` files committed. GitHub Pages serves **main /docs** automatically after a push.

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

## Source and credits

Based on [OpenSupaplex 7.2.2](https://github.com/sergiou87/open-supaplex), upstream commit `bad56a4e174e628643995284ea55d4c49af3137c`, by Sergio Padrino and contributors. Original Supaplex by Philip Jespersen and Michael Stopp.

The OpenSupaplex engine is GPLv3; see [LICENSE](LICENSE), the preserved source headers, and [NOTICE.md](NOTICE.md). Original levels, replay recordings, legacy fonts, and Claus branding retain their respective authors' rights; the engine license does not relicense them. Bricolage Grotesque uses the SIL Open Font License. Runtime and font licenses are included in `assets/`.

This is an independent community adaptation, not an official Claus product. Maintained by [@0xlaplaced](https://x.com/0xlaplaced).
