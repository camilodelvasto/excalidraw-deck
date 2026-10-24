# Launch design: publish excalidraw-deck 0.1

## Intent

Make excalidraw-deck public and usable by strangers: `npx excalidraw-deck dev`
works on a copied showcase folder, the repo is on GitHub with CI, and the
package carries a machine-readable contract so an agent (Claude Code or
similar) can author and validate a deck without reading the README. The
launch target is a Show HN post; the author will also use it for his own
projects.

The agent-authoring story is a launch feature, not an afterthought: the
pitch includes "pair it with an LLM, be live in minutes."

## Goals

1. **Lean, correct npm package.** `npm pack` contains no built artifacts
   (`examples/*/dist`, `.cache`) — today it ships 24.5 MB / 761 files
   because the `files` field includes `examples` wholesale and npm does not
   apply ignore rules inside explicitly listed `files` entries. Target:
   well under 500 KB, and the packed `examples/showcase/` still works as a
   copy-me scaffold (slides.js, deck.yaml, media/).
2. **Agent-facing contract shipped in the package:**
   - `types/deck.d.ts` (exact path builder's choice): TypeScript
     declarations for `Takes` / `Take` / `Slide` and the item union, with
     literal types for every enum the loader accepts (item `t` values,
     font roles, fills, dashes, geo kinds, stock color names). Wired via
     the `types` field in package.json so
     `/** @type {import('excalidraw-deck').Takes} */` resolves. The
     showcase `slides.js` gets that JSDoc line so humans get editor
     autocomplete with zero TS setup.
   - `schemas/slides.schema.json`: JSON Schema for the evaluated `takes`
     array, sibling to the existing `deck.schema.json`.
   - `excalidraw-deck check [dir]`: validates slides.js, deck.yaml, and
     media existence without starting Vite; prints the same one-line
     fail-loud errors the loader already throws; exit 0/1. This is the
     feedback loop an agent runs after each edit.

     **Depth (builder-check finding, author of this doc's call):** loader
     structure checks alone are not enough — everything an agent actually
     gets wrong (unknown item `t`, bad `color`/`font`/`fill`, missing
     required fields) throws in `src/build.js`, which today only runs in
     the browser. `check` therefore runs the real item builders with a
     stub converter injected (the test suite already proves this works in
     plain Node — promote that stub into `src/`). No parallel validation
     path: the builder IS the validator, and colors are checked against
     the merged deck.yaml palette, so custom theme colors validate
     correctly. The broken-fixture acceptance exercises an unknown item
     type, not just a structural error.
3. **Drift protection.** Both the schema and the type declarations are
   pinned to the loader/builder by tests, in the same spirit as the
   existing `test/schema.test.mjs` for deck.yaml. For the types, the pin
   is: the showcase `slides.js` (and a negative fixture with a wrong key)
   typechecks via `tsc` with `checkJs` — TypeScript becomes a
   devDependency only; nothing ships with a TS build step.
4. **Public GitHub repo with CI.** `github.com/camilodelvasto/excalidraw-deck`
   (matches the existing `repository` field), default branch `main`, a
   single GitHub Actions workflow running `npm ci && npm test` on push and
   PR against Node 20 and 22 (engines say >= 20).
5. **Published to npm** as `excalidraw-deck` (verified unclaimed,
   2026-10-23) at version 0.1.0.
6. **README touch-up only where launch requires it:** mention `check`, the
   types/JSDoc line, and the schema files in the existing style. No
   rewrite — the README is already the documentation.

## Non-goals

- MCP server and named deploy targets (staging/prod) — explicitly deferred
  to the next project. Nothing in this release may make the later
  `deploy: { staging: ..., prod: ... }` shape impossible; today's
  single-mapping `deploy:` is distinguishable by its `remote` key, so no
  format change is needed now.
- YAML or JSON slide input; `slides.js` stays the only content format.
- One-shot local-model generation support beyond types + schema.
- CHANGELOG, badges beyond CI, contributing guide, issue templates — git
  history and the README serve 0.1 (author's call, revisit on demand).

## Anti-goals

- Any silent-default behavior creeping in. The format stays fail-loud;
  `check`, the schema, and the types must describe the loader's actual
  behavior, not a looser or stricter one.
- A TypeScript build step or new runtime dependencies. The package stays
  plain JS; typescript is devDependency only.
- Touching the deck format or presenter behavior, with one deliberate
  exception: unknown item keys become errors (see Decided). Otherwise this
  is packaging, contract, and infrastructure only; existing tests keep
  passing unchanged.

## Constraints

- npm quirk (verified): entries listed in `files` ignore `.gitignore` /
  `.npmignore` for their contents. The fix must be verified with
  `npm pack --dry-run` showing file count and size, not assumed from
  documentation.
- The machine has no `gh` CLI and no npm login. ssh to GitHub
  authenticates as `camilodelvasto` and works for pushing.
- Node >= 20, ESM throughout, tests via `node --test`.

## Decided

- Package name `excalidraw-deck`, version 0.1.0, MIT — unchanged.
- Types are hand-written declarations (no codegen), exported from the
  package root via the `types` field.
- The `check` command reuses `loadTakes`, `checkMedia`, the config loader,
  and the real item builders (stub converter) — no parallel validation
  path; see the depth note under Goals.
- **Unknown item keys throw (decided with the author).** Today
  `src/build.js` plucks known keys and silently ignores the rest — a
  misspelled `colr: 'blue'` renders with the default color and no error,
  contradicting "nothing defaults silently." The builders gain a
  closed-keys check per item type: an unknown key throws the same
  one-line error style as everything else, which `check` then surfaces
  for free. This narrows the "no format changes" anti-goal deliberately:
  no deck that worked correctly before behaves differently; only decks
  that were already broken-but-silent now fail loudly. The
  `slides.schema.json` item schemas set `additionalProperties: false` to
  match, and the `.d.ts` item union is closed (the negative typecheck
  fixture uses a wrong key on a direct object literal).
- **Color typing (author's call):** the showcase legitimately uses a
  custom theme color (`'brand'` from its deck.yaml), so a closed color
  enum would reject valid decks. In the `.d.ts`, `color` is
  `StockColor | (string & {})` — stock names autocomplete, custom names
  pass; `slides.schema.json` mirrors this (`anyOf` of the stock enum and
  plain string). Color typos are therefore caught by `check` (which knows
  the merged palette), not by `tsc` or the schema. Every other enum
  (item `t`, `font`, `fill`, `dash`, `geo`) is closed in both types and
  schema.
- CI is GitHub Actions, one workflow, Node 20 + 22 matrix, no publish
  automation in this release (first publish is manual).
- Repo stays public from the first push; history is already clean.

## Left to the builder

- Exact mechanics of the `files` fix (explicit file list vs. restructure)
  — acceptance is the pack contents, not the mechanism.
- `.d.ts` layout and naming; how the negative typecheck fixture is wired
  into `npm test`.
- Schema structure and how the slides-schema test pins it to the loader.
- Workflow file details (caching, action versions).
- README wording for the new pieces.

## User steps (cannot be done by the builder)

1. Create the empty public repo `camilodelvasto/excalidraw-deck` on
   github.com (no README/license/gitignore — the push brings everything).
   The builder pushes `main` over ssh after it exists.
2. `npm login` (a.k.a. `npm adduser`), then `npm publish` — run from the
   repo root after the pack contents are verified. OTP/2FA is interactive,
   so the author runs it; the builder prepares everything up to that line.

## Acceptance

- `npm pack --dry-run`: no `dist/` or `.cache/` paths, < 500 KB packed.
- `npm test` passes, including the new schema-pin and typecheck tests.
- `npx excalidraw-deck check examples/showcase` exits 0; the same against
  a broken fixture exits 1 with a one-line error.
- In a scratch folder outside the repo: copy `examples/showcase`, install
  the packed tarball, `excalidraw-deck check` and `build` succeed — the
  stranger's path, rehearsed with the real artifact.
- CI green on GitHub on the pushed `main`.
- `npm view excalidraw-deck` shows 0.1.0 after the author publishes.
