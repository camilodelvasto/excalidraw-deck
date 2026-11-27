# AGENTS.md

Notes for coding agents working on this repository.

**Writing a deck, not changing the tool?** Read [docs/agent-brief.md](docs/agent-brief.md) instead. It describes the `slides.json` format. After each edit, run `npx excalidraw-deck check` in the deck folder.

## What this is

A CLI that turns a deck folder (`slides.json`, optional `deck.yaml`, `media/`) into a presentation on one Excalidraw canvas. It drives Vite through its JS API. Excalidraw itself is used unmodified.

## Layout

- `bin/deck.js`: CLI entry (`dev`, `build`, `deploy`, `check`).
- `src/project.js`: parses and validates `slides.json`, checks media files exist. Decks are pure data — nothing in a deck is ever executed; keep it that way.
- `src/config.js`: `deck.yaml` defaults and merge. Defaults live here and nowhere else.
- `src/build.js`: deck items → Excalidraw element skeletons. `ITEM_KEYS` and `ITEM_REQUIRED` are the slide-item contract.
- `src/presenter.jsx`: camera, reveals, overview, edit mode, media overlay.
- `src/behaviors.js`: input grammar (keys, tap/hold, tap zones), framework-free.
- `src/vite.js`: Vite config, virtual modules, dev asset middleware.
- `src/deploy/`: force-push of `dist/` over ssh; one adapter per forge.
- `app/`: the HTML shell the CLI serves.

## Commands

```
npm ci
npm test        # node --test, no browser needed
```

Node 20 and 22 run in CI. Run the full suite before proposing a change.

## Rules

- **Fail loud.** An unknown key, type, color, font or config value throws with a one-line message naming the key and what is allowed. Never add a silent default or fallback.
- **One contract, several declarations.** The slide format is defined in `src/build.js` and mirrored in `schemas/slides.schema.json`, `deck.d.ts` and `docs/agent-brief.md`. The deck.yaml format is defined in `src/config.js` and mirrored in `schemas/deck.schema.json` and the README. Tests pin the schema and type mirrors to their source; the prose mirrors (`docs/agent-brief.md`, README) are kept in sync by hand. If you change the format, update every mirror in the same change.
- **Nothing from the network at runtime.** Fonts and media are bundled into `dist/`. No CDN links.
- **Deploy stays minimal.** Shell out to git with `execFileSync` (no shell). Credentials come from the user's ssh-agent. Never read, store or accept tokens.
- **Excalidraw internals are brittle.** The presenter hides UI by Excalidraw's class names, and font swaps rely on registration order. The dependency is pinned to the exact version (`0.18.1`). If you bump it, run the browser smoke test (`npm run test:browser`) and check by hand that the UI stays hidden while presenting and that themed fonts render.
- Keep modules small and dependencies few. Don't add a dependency without a clear reason.
