# excalidraw-deck 0.1 Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish excalidraw-deck 0.1.0: lean npm package, agent-facing contract (`check` command, `deck.d.ts`, `slides.schema.json`, unknown item keys throw), GitHub repo with CI, manual npm publish.

**Architecture:** The item builders in `src/build.js` become the single validator (closed key tables, required keys via `need()`); a new `check` CLI command runs them in Node with the test suite's stub converter promoted to `src/`. Types and schema are second declarations of the same contract, pinned to the builder's exported tables by tests. Packaging, CI, and publish are infrastructure around that.

**Tech Stack:** Node >= 20 ESM, `node --test`, TypeScript (devDependency only, compiler API in tests), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-23-launch-design.md`

## Global Constraints

- No new runtime dependencies. `typescript` enters devDependencies only; no build step ships.
- Errors are one line, prefixed `deck:` (or `deck.yaml:`), naming the offender and the known set — match the existing style exactly.
- Version stays `0.1.0`, name `excalidraw-deck`, Node engines `>= 20`.
- Existing tests keep passing, except the two edits this plan names explicitly (usage regex in `test/cli.test.mjs`, fakeConvert moving out of `test/build.test.mjs`).
- `npm pack --dry-run`: no `dist/` or `.cache` paths, packed size < 500 KB.

## Review Focus

Spec-implied failure modes, each pinned to a task's test below:

1. `check` in a folder with no `deck.yaml` must exit 0 — absence is the declared default deck (Task 2).
2. A `slides.js` that fails to import (syntax error) must exit 1 with the message only, no stack (Task 2 — `bin/deck.js` already prints `e.message`; the test proves it).
3. An item using a theme color its `deck.yaml` doesn't define must exit 1 with `unknown color` — palette merge must happen before validation (Task 2).
4. `fade` or `color` on `video`/`image` items is silently dead today; it must now throw as an unknown key (Task 1).
5. The packed tarball must still contain the complete scaffold — `slides.js`, `deck.yaml`, `media/overlay.svg` — or the copy-me story dies (Task 5).

---

### Task 1: Closed item keys and required keys in the builders

**Files:**
- Modify: `src/build.js`
- Test: `test/build.test.mjs`
- Also: `git add docs/superpowers && git commit` the spec and this plan as the task's first commit.

**Interfaces:**
- Produces (all exported from `src/build.js`, consumed by Tasks 2–4):
  - `ITEM_KEYS: Record<string, string[]>` — every key each item type accepts, including `t`
  - `ITEM_REQUIRED: Record<string, string[]>` — keys whose absence throws
  - `GEOS`, `FILLS`, `DASHES`, `ALIGNS`, `VALIGNS` — now exported (values unchanged)

The tables, exactly (spec: "an unknown key throws … nothing defaults silently"; media items reject `fade` because the overlay never reads it):

```js
export const ITEM_KEYS = {
  text:  ['t', 'x', 'y', 'fs', 'text', 'font', 'color', 'align', 'angle', 'w', 'step', 'fade'],
  box:   ['t', 'x', 'y', 'w', 'h', 'text', 'fs', 'geo', 'color', 'fill', 'dash', 'font', 'align', 'valign', 'ink', 'step', 'fade'],
  note:  ['t', 'x', 'y', 'size', 'text', 'fs', 'color', 'font', 'ink', 'step', 'fade'],
  plate: ['t', 'color', 'step', 'fade'],
  arrow: ['t', 'from', 'to', 'color', 'sw', 'dash', 'text', 'fs', 'font', 'ink', 'start', 'end', 'step', 'fade'],
  line:  ['t', 'from', 'to', 'color', 'sw', 'dash', 'text', 'fs', 'font', 'ink', 'step', 'fade'],
  slot:  ['t', 'x', 'y', 'w', 'h', 'label', 'geo', 'fill', 'align', 'valign', 'ink', 'step', 'fade'],
  video: ['t', 'x', 'y', 'w', 'h', 'src', 'step'],
  image: ['t', 'x', 'y', 'w', 'h', 'src', 'step'],
}
export const ITEM_REQUIRED = {
  text: ['x', 'y', 'fs', 'text'],
  box: ['x', 'y', 'w', 'h', 'text'],
  note: ['x', 'y', 'size', 'text', 'fs'],
  plate: [],
  arrow: ['from', 'to'],
  line: ['from', 'to'],
  slot: ['x', 'y', 'w', 'h', 'label'],
  video: ['x', 'y', 'w', 'h', 'src'],
  image: ['x', 'y', 'w', 'h', 'src'],
}
```

- [ ] **Step 0: Commit the spec and plan** (`docs/superpowers/`), message `docs: launch design and plan`.

- [ ] **Step 1: Write the failing tests** in `test/build.test.mjs`:

```js
test('an unknown item key throws, naming the type, key, and known keys', () => {
  assert.throws(() => build([slide([{ t: 'text', x: 0, y: 0, fs: 20, text: 'x', colr: 'blue' }])], TAKES, THEME),
    /text item has unknown key "colr" \(known: /)
  assert.throws(() => build([slide([{ t: 'image', x: 0, y: 0, w: 10, h: 10, src: 'm.svg', fade: 50 }])], TAKES, THEME),
    /image item has unknown key "fade"/)
})

test('every ITEM_REQUIRED key throws when absent; the full valid item builds', () => {
  const VALID = {
    text: { t: 'text', x: 0, y: 0, fs: 20, text: 'x' },
    box: { t: 'box', x: 0, y: 0, w: 10, h: 10, text: '' },
    note: { t: 'note', x: 0, y: 0, size: 100, text: 'x', fs: 20 },
    plate: { t: 'plate' },
    arrow: { t: 'arrow', from: [0, 0], to: [1, 1] },
    line: { t: 'line', from: [0, 0], to: [1, 1] },
    slot: { t: 'slot', x: 0, y: 0, w: 10, h: 10, label: 'x' },
    video: { t: 'video', x: 0, y: 0, w: 10, h: 10, src: 'm.mp4' },
    image: { t: 'image', x: 0, y: 0, w: 10, h: 10, src: 'm.svg' },
  }
  for (const [t, item] of Object.entries(VALID)) {
    build([slide([item])], TAKES, THEME)
    for (const key of ITEM_REQUIRED[t]) {
      const broken = { ...item }; delete broken[key]
      assert.throws(() => build([slide([broken])], TAKES, THEME), /is missing/, `${t} without ${key}`)
    }
  }
})

test('ITEM_KEYS covers every builder and every required key', () => {
  assert.deepEqual(Object.keys(ITEM_KEYS).sort(), Object.keys(ITEM_REQUIRED).sort())
  for (const [t, req] of Object.entries(ITEM_REQUIRED))
    for (const key of req) assert.ok(ITEM_KEYS[t].includes(key), `${t}.${key}`)
})
```

- [ ] **Step 2: Run** `npm test` — expect the new tests FAIL (`ITEM_KEYS` not exported; unknown keys pass silently).

- [ ] **Step 3: Implement in `src/build.js`:** export the two tables and `GEOS/FILLS/DASHES/ALIGNS/VALIGNS`. In `build()`'s item loop, before the media/builder branch: unknown `item.t` keeps its existing error; then for each own key of the item not in `ITEM_KEYS[item.t]`, throw `deck: ${item.t} item has unknown key "${key}" (known: ${ITEM_KEYS[item.t].join(', ')})`; then for each `ITEM_REQUIRED[item.t]` key, call `need(item, key)`. Builders keep their internal `need()` calls — harmless duplication of the same contract.

- [ ] **Step 4: Run** `npm test` — all pass (existing tests must be untouched).

- [ ] **Step 5: Commit** `feat: unknown or missing item keys throw — ITEM_KEYS/ITEM_REQUIRED are the contract`.

---

### Task 2: `check` command running the real builders

**Files:**
- Create: `src/stub-convert.js`, `src/check.js`, `test/check.test.mjs`
- Modify: `src/build.js` (add `flattenTakes`), `src/presenter.jsx:41` (use it), `test/build.test.mjs` (import the stub instead of defining `fakeConvert`), `bin/deck.js`, `test/cli.test.mjs` (usage regex)

**Interfaces:**
- Consumes: `createBuild` (existing), Task 1's validation inside `build()`.
- Produces:
  - `src/build.js`: `flattenTakes(takes)` → `slides` array, body exactly presenter line 41's `takes.flatMap((t, take) => t.slides.map((s) => ({ ...s, take })))`; presenter imports it.
  - `src/stub-convert.js`: `stubConvert(skeletons)` and `STUB_FONT_FAMILY` — move `fakeConvert` and `fakeFontFamily` verbatim from `test/build.test.mjs` (they are a faithful stand-in for Excalidraw's converter contract; keep that comment).
  - `src/check.js`: `async checkDeck(userDir)` → `{ takes, config }`; runs `loadTakes`, `checkMedia`, `loadConfig`, then `createBuild({ convert: stubConvert, fontFamily: STUB_FONT_FAMILY }).build(flattenTakes(takes), takes, config.theme)`.
  - `bin/deck.js`: `check` command — `const { takes } = await checkDeck(process.cwd())`, then `console.log(`deck: ok — ${slides} slides in ${takes.length} takes`)` (slides = flattened count). `USAGE` becomes `usage: excalidraw-deck dev | build | deploy | check`.

- [ ] **Step 1: Write the failing tests** in `test/check.test.mjs`, reusing `run()` from `test/cli.test.mjs`. Fixtures are temp dirs written inline (follow the `deck-nodeploy-` pattern there):
  - showcase passes: `run(['check'], { cwd: 'examples/showcase' })` → code 0, stdout matches `/deck: ok — \d+ slides in \d+ takes/` (also proves custom color `brand` validates against the merged palette).
  - no deck.yaml: temp dir with a minimal valid `slides.js` only → code 0.
  - unknown item key: slides.js with `{ t: 'text', x: 0, y: 0, fs: 20, text: 'x', colr: 'blue' }` → code 1, stderr matches `/unknown key "colr"/`, and `assert.equal(r.err.trim().split('\n').length, 1)` — one line, no stack.
  - undefined theme color: item `color: 'brand'`, no deck.yaml → code 1, `/unknown color "brand"/`.
  - syntax error: `slides.js` containing `export const takes = [` → code 1, stderr non-empty and stack-free (no `at ` lines).
- [ ] **Step 2: Run** `node --test test/check.test.mjs` — FAIL (no `check` command).
- [ ] **Step 3: Implement** the four file changes in Interfaces, plus update the usage regex in `test/cli.test.mjs` to `dev \| build \| deploy \| check`.
- [ ] **Step 4: Run** `npm test` — all pass, including the untouched presenter-independent suites.
- [ ] **Step 5: Commit** `feat: check — validate a deck through the real builders, no browser needed`.

---

### Task 3: `slides.schema.json` pinned to the builder

**Files:**
- Create: `schemas/slides.schema.json`, `test/slides-schema.test.mjs`

**Interfaces:**
- Consumes: Task 1's exports (`ITEM_KEYS`, `ITEM_REQUIRED`, `STOCK_COLORS`, `GEOS`, `FILLS`, `DASHES`, `ALIGNS`, `VALIGNS`) and `ROLES` from `src/config.js`.

Schema shape (match `deck.schema.json`'s dialect and style): root is the `takes` **array**. Take: `{name, slides}` both required, `additionalProperties: false`. Slide: `name` (string), `col` (number) required; `via` is `const "overview"`; `items` array required. `items.items` is a `oneOf` of nine variants discriminated by `t` (`const` per type), each with `additionalProperties: false`, `properties` exactly `ITEM_KEYS[t]`, `required` exactly `ITEM_REQUIRED[t]` plus `t`. Shared shapes via `$defs`: `color` is `anyOf: [{enum: <stock names>}, {type: "string"}]` (spec: stock names documented, custom palette names pass); `font` enum = ROLES; `fill`/`dash`/`geo` enums = the tables' keys; `align`/`valign` enums = `['start','middle','end']`; `step` integer `minimum: 0`; `fade` number 0–100; `from`/`to` arrays of exactly 2 numbers.

- [ ] **Step 1: Write the failing pin test** `test/slides-schema.test.mjs` in the style of `test/schema.test.mjs` — structure compared to the runtime's exported tables, not retyped:

```js
test('every item variant mirrors ITEM_KEYS and ITEM_REQUIRED and rejects unknown keys', () => {
  const variants = itemVariants(schema) // helper: collect the oneOf by each variant's t const
  assert.deepEqual(Object.keys(variants).sort(), Object.keys(ITEM_KEYS).sort())
  for (const [t, v] of Object.entries(variants)) {
    assert.equal(v.additionalProperties, false, t)
    assert.deepEqual(Object.keys(v.properties).sort(), [...ITEM_KEYS[t]].sort(), t)
    assert.deepEqual([...v.required].sort(), [...ITEM_REQUIRED[t], 't'].sort(), t)
  }
})

test('enums match the builder: colors anyOf stock+string, fonts, fills, dashes, geos, aligns', () => {
  assert.deepEqual(colorDef(schema).anyOf[0].enum, Object.keys(STOCK_COLORS))
  assert.deepEqual(colorDef(schema).anyOf[1], { type: 'string' })
  // same deepEqual pattern for ROLES, Object.keys(FILLS), Object.keys(DASHES), Object.keys(GEOS), Object.keys(ALIGNS)
})
```

- [ ] **Step 2: Run** `node --test test/slides-schema.test.mjs` — FAIL (no schema file).
- [ ] **Step 3: Write** `schemas/slides.schema.json` per the shape above.
- [ ] **Step 4: Run** `npm test` — pass.
- [ ] **Step 5: Commit** `feat: slides JSON schema, pinned to the builder's key tables by test`.

---

### Task 4: `deck.d.ts` + typecheck pin

**Files:**
- Create: `deck.d.ts` (repo root), `test/fixtures/valid-full/slides.js`, `test/fixtures/bad-key/slides.js`, `test/types.test.mjs`
- Modify: `package.json` (`types`, `exports`, devDependency), `examples/showcase/slides.js` (one JSDoc line)

**Interfaces:**
- Consumes: Task 1's `build` validation (for the double pin), Task 2's `flattenTakes`/stub.
- Produces: `deck.d.ts` exporting `Takes`, `Take`, `Slide`, `Item` and the nine item interfaces. Enum literal types mirror the builder: `FontRole`, `Fill`, `Dash`, `Geo`, `Align` (`'start'|'middle'|'end'`); `Color = StockColor | (string & {})` where `StockColor` lists the twelve stock names (spec's color-typing call). Optional/required per `ITEM_KEYS`/`ITEM_REQUIRED`; `step?: number`, `fade?: number`; `via?: 'overview'` on `Slide`; `from`/`to` are `[number, number]`.

- [ ] **Step 1: package.json** — add `"types": "./deck.d.ts"`, `"exports": { ".": { "types": "./deck.d.ts" } }`, `"deck.d.ts"` to `files`, and `typescript` `^5.0.0` to devDependencies; run `npm install`.
- [ ] **Step 2: Write the failing test** `test/types.test.mjs` using the TypeScript compiler API (`import ts from 'typescript'`): one `diagnostics(file)` helper with `ts.createProgram` and options `{ allowJs: true, checkJs: true, noEmit: true, target: ES2022, module: ESNext, moduleResolution: Bundler, baseUrl: <repo root>, paths: { 'excalidraw-deck': ['./deck.d.ts'] } }`. Do NOT enable `strict` — the showcase's untyped helper parameters would be implicit-any errors, and excess-property checking (the pin we need) works without it.
  - `examples/showcase/slides.js` → 0 diagnostics (its helpers' spreads are fine; the custom color `'brand'` must pass — this is what `(string & {})` buys).
  - `test/fixtures/valid-full/slides.js` → 0 diagnostics, **and** the same file imported and run through `build(flattenTakes(takes), takes, THEME)` with the stub converter throws nothing — types and runtime agree on valid.
  - `test/fixtures/bad-key/slides.js` (a direct object literal with `colr: 'blue'` on a text item) → at least one diagnostic whose text contains `colr`, **and** `build(...)` on it throws `/unknown key "colr"/` — types and runtime agree on invalid.
- [ ] **Step 3: Write the fixtures.** `valid-full`: every item type once, each enum family exercised (every font role, fill, dash, geo, an `align`/`valign`, a `step`, a `fade`, `via: 'overview'`, stock colors only), `/** @type {import('excalidraw-deck').Takes} */` annotation, direct literals (no helper functions — spreads defeat excess-property checks). `bad-key`: minimal, same annotation.
- [ ] **Step 4: Run** the test — FAIL (no `deck.d.ts`).
- [ ] **Step 5: Write `deck.d.ts`** per Interfaces; add `/** @type {import('excalidraw-deck').Takes} */` above `export const takes` in `examples/showcase/slides.js`.
- [ ] **Step 6: Run** `npm test` — all pass (showcase still loads in Node: the annotation is a comment).
- [ ] **Step 7: Commit** `feat: deck.d.ts — the format as types, pinned to the builder by fixtures checked both ways`.

---

### Task 5: Lean npm package

**Files:**
- Modify: `package.json` (`files`)
- Create: `test/pack.test.mjs`

- [ ] **Step 1: Write the failing test** — `execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: <repo root> })`, parse `[{ files, size }]`:
  - no entry path matches `/dist\/|\.cache/`
  - `size < 500_000`
  - paths include `examples/showcase/slides.js`, `examples/showcase/deck.yaml`, `examples/showcase/media/overlay.svg`, `deck.d.ts`, `schemas/slides.schema.json`, `schemas/deck.schema.json`, `bin/deck.js`
- [ ] **Step 2: Run it** — FAIL (24.5 MB; dist/ present). npm does not apply ignore rules inside `files` entries, so:
- [ ] **Step 3: Fix `files`:** replace `"examples"` with `"examples/showcase/slides.js"`, `"examples/showcase/deck.yaml"`, `"examples/showcase/media"`.
- [ ] **Step 4: Run** `npm test` — pass.
- [ ] **Step 5: Commit** `fix: pack the scaffold, not its build artifacts — 24.5 MB → kilobytes`.

---

### Task 6: CI and README

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] **Step 1: Workflow:** name `ci`, on `push` + `pull_request`, matrix `node: [20, 22]`, steps: `actions/checkout@v4`, `actions/setup-node@v4` (`node-version` from matrix, `cache: npm`), `npm ci`, `npm test`.
- [ ] **Step 2: README**, in its existing voice (short, declarative):
  - usage block gains `npx excalidraw-deck check    # validate slides.js + deck.yaml without serving`
  - after "Writing slides": two or three lines noting the format is typed — the `@type` JSDoc line the showcase carries gives editor autocomplete (`npm i -D excalidraw-deck` in the deck folder makes it resolve), `schemas/slides.schema.json` describes the same contract for machines, and `check` is the loop an agent runs after each edit.
  - "An unknown type, color, font, or config key throws" now extends to item keys — adjust that line to claim it.
- [ ] **Step 3: Run** `npm test` (README claims nothing the suite doesn't already prove).
- [ ] **Step 4: Commit** `feat: CI workflow; README documents check and the typed format`.

---

### Task 7: Launch

**Files:** none new (operations only).

- [ ] **Step 1 (USER): create the empty public repo** `camilodelvasto/excalidraw-deck` on github.com — no README/license/gitignore.
- [ ] **Step 2: Push:** `git remote add origin git@github.com:camilodelvasto/excalidraw-deck.git && git push -u origin main` (ssh already authenticates as camilodelvasto).
- [ ] **Step 3: Verify CI green** — poll `https://api.github.com/repos/camilodelvasto/excalidraw-deck/actions/runs` (public, unauthenticated) until the run concludes `success`.
- [ ] **Step 4: Stranger rehearsal** in a temp dir: `npm pack` the repo → `cp -r examples/showcase <tmp>/talk` → in `<tmp>/talk`: `npm init -y && npm i <tarball>` → `npx excalidraw-deck check` exits 0 → `npx excalidraw-deck build` → assert `dist/index.html` exists. This is the acceptance path from the spec, run with the real artifact.
- [ ] **Step 5 (USER): `npm login` then `npm publish`** from the repo root.
- [ ] **Step 6: Verify:** `npm view excalidraw-deck version` prints `0.1.0`. Done.
