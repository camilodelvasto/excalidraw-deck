# Changelog

## 0.2.0 — 2026-11-27

Security and robustness release.

### Security
- `deploy` passes the repo to git after `--`, and deck.yaml rejects repo/branch values starting with `-` — a crafted deck can no longer smuggle git options like `--receive-pack`.
- `deploy` refuses to overwrite a branch whose tip is not a previous deploy commit, so a `branch: main` typo cannot destroy a source branch.
- Media `src` must point into `media/` inside the deck folder (also enforced by the JSON schema and the types) — no path escapes, and nothing that builds locally 404s after deploy.
- Vite bumped to 6.4.6 (`server.fs.deny` bypass, GHSA-8g5g-mxqh-grgj).
- The CI workflow token is read-only.

### Fixed
- An out-of-range URL hash (`#99.0` on a 10-slide deck) clamps to the last slide instead of blanking the page; typing a nonexistent slide number is ignored.
- Font-load failures show an error banner instead of silently leaving the deck unstyled; blocked video autoplay is logged.
- The dev server serves unknown file types as byte streams and survives malformed URLs instead of returning 500.
- `dev` and `build` no longer share a Vite cache — running `build` while a dev server was serving the same deck corrupted its dependency cache (blank page until restart).
- `deploy` works on machines with no git identity and never triggers signing hooks.
- `e` toggles edit mode both ways; before, entering edit mode left no keyboard way back.

### Added
- A slide with a `plate` colors the whole window while it is active, fading in step with the camera flight — frames clip at 1920×1080, so this is the only way to a true edge-to-edge background. The overview keeps the canvas color.
- Editing the URL hash navigates in place — a deck is scriptable without page reloads.
- deck.yaml edits apply while `dev` runs: the page reloads with the new config.
- Leaving the page with unsaved live drawings on the canvas asks first.
- Browser smoke test (`npm run test:browser`): fonts load, UI hidden while presenting, `e` toggles — the tripwire for Excalidraw bumps.
- CI: audit gate with a reasoned allowlist, CodeQL, Dependabot, read-only tokens.
- Releases publish from tags with npm provenance.
- `AGENTS.md` and `docs/agent-brief.md` for coding agents.

### Changed
- `@excalidraw/excalidraw` is pinned to exactly 0.18.1; bumps are deliberate and go through the smoke test.

## 0.1.0 — 2026-10-25

First release.
