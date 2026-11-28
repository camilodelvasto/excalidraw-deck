---
name: excalidraw-deck
description: Create a presentation with excalidraw-deck — slides as one JSON file on an Excalidraw canvas, hand-drawn look, presented in the browser, deployable to GitHub or Codeberg Pages. Use when the user asks for a presentation, slide deck, talk, slides, or pitch deck.
---

# Composing a deck with excalidraw-deck

A deck is a folder: `slides.json` (required), `deck.yaml` (optional theme/deploy), `media/` (optional images/videos). Pure data — nothing in a deck executes.

## Workflow

1. Make a folder for the talk. Write `slides.json` using the contract below.
2. After every edit run `npx excalidraw-deck check .` and fix what it prints. It validates the whole file; nothing defaults silently.
3. `npx excalidraw-deck dev` serves the talk at localhost (arrows/space to advance, `o` for overview, `e` to draw live, `f` fullscreen).
4. To publish: add to `deck.yaml`
   ```yaml
   deploy:
     remote: github-pages          # or codeberg-pages
     repo: git@github.com:USER/TALK-REPO.git
   ```
   then `npx excalidraw-deck deploy` — it builds, pushes only the built site to the pages branch (the deck folder needs no git), and prints the live URL.

For full docs read `docs/agent-brief.md` in the repo: https://github.com/camilodelvasto/excalidraw-deck

## slides.json

```json
{
  "$schema": "https://raw.githubusercontent.com/camilodelvasto/excalidraw-deck/main/schemas/slides.schema.json",
  "takes": [
    { "name": "intro", "slides": [{ "name": "title", "col": 0, "items": [] }] }
  ]
}
```

- A take is a named chapter; `slides` is non-empty. Slide keys: `name` (required), `col` (required: 0, 1, 2 … within the take; `-1` puts a closing slide left of the opening), `items`, `via` (only `"overview"`: arrive by flying out over the whole talk first).
- Every slide is a 1920×1080 frame; `x`/`y` are pixels from its top-left. Keep items inside x 120–1800, y 100–980.
- JSON has no variables or comments: write every item out in full; repetition is correct.

## Items

Unknown keys, types, or values are errors.

| `t` | required | optional |
|---|---|---|
| `text` | `x, y, fs, text` | `font, color, align, angle, w, step, fade` |
| `box` | `x, y, w, h, text` | `fs, geo, color, fill, dash, font, align, valign, ink, step, fade` |
| `note` | `x, y, size, text, fs` | `color, font, ink, step, fade` |
| `plate` | — | `color, step, fade` |
| `arrow` | `from, to` | `color, sw, dash, text, fs, font, ink, start, end, step, fade` |
| `line` | `from, to` | `color, sw, dash, text, fs, font, ink, step, fade` |
| `slot` | `x, y, w, h, label` | `geo, fill, align, valign, ink, step, fade` |
| `image` / `video` | `x, y, w, h, src` | `step` |

- `text`: `fs` is px; `\n` breaks lines; `angle` rotates (degrees); `align: "middle"` needs `w`.
- `box`: `geo` is `rectangle` (default) / `ellipse` / `diamond`; label `fs` defaults to 32; `text` may be `""`.
- `note`: a sticky square of side `size`, default yellow.
- `plate`: full-slide background, first in `items`; while the slide is active the whole window takes its color. Stock fills are pastels — a dark or vibrant plate needs a custom color in `deck.yaml` `theme.colors`.
- `arrow`/`line`: `from`/`to` are `[x, y]`; `sw` stroke width (default 4); `start`/`end`: `"none"`/`"arrow"`.
- `image`/`video`: `src` must start with `media/`; videos autoplay muted when the slide lands.

## Values

- `color`/`ink`: `black` (default), `grey`, `red`, `light-red`, `orange`, `yellow`, `green`, `light-green`, `blue`, `light-blue`, `violet`, `light-violet`, plus any name `deck.yaml` defines under `theme.colors` as `{ stroke, fill }`. `ink` colors a label (use on dark fills — default label ink is near-black).
- `font`: `draw` (default), `display` (titles), `sans`, `mono`, `hand`. `fill`: `none`, `semi`, `pattern`. `dash`: `draw`, `dashed`, `dotted`. `align`/`valign`: `start`, `middle`, `end`.
- `step: n` reveals the item on the nth press (consecutive, starting at 1; no step = visible on arrival). `fade: n` reveals to n% opacity (not on image/video).

## Layout

- Title: `x 120, y 110, fs 72, font "display"`. Body: `fs 36–44, font "sans"`. Footer: `fs 26–30, font "mono", color "grey"`.
- Text width ≈ 0.55 × fs per character; keep lines under ~60 chars at fs 40, break with `\n`.
- One idea per slide; reveal with steps instead of crowding. Hand-font annotations at a slight `angle` in a warm color make slides feel alive.
