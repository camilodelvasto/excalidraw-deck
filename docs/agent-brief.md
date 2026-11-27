# Writing a slides.json for excalidraw-deck

You are writing `slides.json` for **excalidraw-deck**, a tool that renders slides as data on one Excalidraw canvas. Pure JSON — a deck is data, never code. In a chat, return the complete file, ready to paste.

## The shape

```json
{
  "$schema": "https://raw.githubusercontent.com/camilodelvasto/excalidraw-deck/main/schemas/slides.schema.json",
  "takes": [
    {
      "name": "intro",
      "slides": [
        { "name": "title", "col": 0, "items": [] }
      ]
    }
  ]
}
```

- The root is an object with a non-empty `takes` array (`$schema` is optional but helps editors validate). Each take = a named group of slides (a chapter); it needs `name` and a non-empty `slides`.
- Slide keys allowed: `name` (required, non-empty, unique is best), `col` (required: position in the take's row), `items` (required array), `via`. `via` may only be `"overview"` (on arrival, the camera flies out to the whole take first).
- Number slides with consecutive `col` values inside each take, starting at 0. `col: -1` places a closing slide to the left of the take's opening.
- JSON has no comments, variables or functions: write every item out in full. Repeating yourself is correct here.

## Coordinates

Every slide is a **1920 × 1080** frame. `x`, `y` are pixels from the frame's top-left corner. Keep everything inside the frame. Comfortable margins: x from 120 to 1800, y from 100 to 980.

## Item types and their keys

Unknown keys, unknown types and missing required keys are errors. Nothing is silently ignored.

| `t` | required | optional |
|---|---|---|
| `text` | `x, y, fs, text` | `font, color, align, angle, w, step, fade` |
| `box` | `x, y, w, h, text` | `fs, geo, color, fill, dash, font, align, valign, ink, step, fade` |
| `note` | `x, y, size, text, fs` | `color, font, ink, step, fade` |
| `plate` | — | `color, step, fade` |
| `arrow` | `from, to` | `color, sw, dash, text, fs, font, ink, start, end, step, fade` |
| `line` | `from, to` | `color, sw, dash, text, fs, font, ink, step, fade` |
| `slot` | `x, y, w, h, label` | `geo, fill, align, valign, ink, step, fade` |
| `image` | `x, y, w, h, src` | `step` |
| `video` | `x, y, w, h, src` | `step` |

What they are:

- **text**: free text. `fs` is font size in px. Use `\n` for line breaks. `angle` rotates in degrees. With `align: 'middle'`, also give `w`: the text is centered inside a box of that width starting at `x`.
- **box**: a shape with a label. `text` may be `''` for no label. `geo`: `rectangle` (default), `ellipse`, `diamond`. Label `fs` defaults to 32.
- **note**: a sticky note, a filled square of side `size`. Default color yellow.
- **plate**: a full-frame background color for that slide. Put it first in `items`. Every stock color's fill is a light pastel — a dark plate needs a custom color defined in the deck's `deck.yaml` under `theme.colors`. While the slide is active, the whole window takes the plate's color (edge to edge), not just the frame.
- **arrow** / **line**: `from: [x, y]`, `to: [x, y]`. `sw` is stroke width (default 4). Arrowheads `start` / `end`: `'none'` or `'arrow'` (default: end arrow only). `text` puts a label on it.
- **slot**: a dashed grey placeholder with a label (e.g. "screenshot goes here").
- **image** / **video**: files from the deck's `media/` folder. `src` must start with `media/`, e.g. `src: 'media/demo.mp4'` — anything else fails `check`. Videos autoplay muted when their slide lands and hold their last frame.

## Allowed values

- `color`, `ink`: `black` (default), `grey`, `red`, `light-red`, `orange`, `yellow`, `green`, `light-green`, `blue`, `light-blue`, `violet`, `light-violet`. Other names only if the deck's `deck.yaml` defines them under `theme.colors`. `ink` colors a label (use it on dark fills).
- `font`: `draw` (default), `display` (hand-drawn titles), `sans`, `mono`, `hand`.
- `fill`: `none` (default), `semi` (solid light fill), `pattern` (hatched).
- `dash`: `draw` (default, solid), `dashed`, `dotted`.
- `align`, `valign`: `start`, `middle`, `end`.

## Reveals

- `step: n` (integer ≥ 0): the item appears on the nth press within the slide. No `step` means visible on arrival.
- Use consecutive steps (1, 2, 3). A skipped number creates a press where nothing appears.
- `fade: n` (0–100): the item reveals to n% opacity instead of 100. Not allowed on image/video.

## Layout guidance

- Title: `x: 120, y: 110, fs: 72, font: 'display'`. Body text: `fs: 36–44, font: 'sans'`.
- Estimate text width as about 0.55 × fs per character. Keep lines under ~60 characters at fs 40 and break with `\n`.
- One idea per slide; reveal steps instead of crowding.

## Example

```json
{
  "$schema": "https://raw.githubusercontent.com/camilodelvasto/excalidraw-deck/main/schemas/slides.schema.json",
  "takes": [
    {
      "name": "intro",
      "slides": [
        {
          "name": "title",
          "col": 0,
          "items": [
            { "t": "text", "x": 120, "y": 110, "fs": 72, "text": "local-first tools", "font": "display" },
            { "t": "text", "x": 120, "y": 320, "fs": 40, "text": "your data stays on your machine", "font": "sans" },
            { "t": "text", "x": 120, "y": 950, "fs": 28, "text": "Berlin, 2026", "font": "mono", "color": "grey" }
          ]
        },
        {
          "name": "three steps",
          "col": 1,
          "items": [
            { "t": "text", "x": 120, "y": 110, "fs": 72, "text": "how it works", "font": "display" },
            { "t": "note", "x": 120, "y": 320, "size": 300, "fs": 36, "text": "collect", "color": "yellow", "step": 1 },
            { "t": "arrow", "from": [440, 470], "to": [580, 470], "color": "grey", "step": 2 },
            { "t": "note", "x": 600, "y": 320, "size": 300, "fs": 36, "text": "process", "color": "green", "step": 2 },
            { "t": "arrow", "from": [920, 470], "to": [1060, 470], "color": "grey", "step": 3 },
            { "t": "box", "x": 1080, "y": 320, "w": 500, "h": 300, "fs": 40, "text": "share", "color": "blue", "fill": "semi", "step": 3 }
          ]
        }
      ]
    }
  ]
}
```

## Before you answer

Check every item against the table above: only listed keys, all required keys present, only allowed values, consecutive steps, everything inside 1920 × 1080, and the whole file valid JSON (double quotes, no trailing commas, no comments).

If you can run commands, run `npx excalidraw-deck check` in the deck folder and fix any error it prints. Otherwise return only the file.
