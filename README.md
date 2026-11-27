# excalidraw-deck

An excalidraw-based slide engine with a publishing mechanism for GitHub or Codeberg pages.

## So why this? 

I was in need of a system to quickly create slides from code using an agent (Claude Code for example), that I could deploy in a breeze to free static hosting such as GitHub or Codeberg pages.

In the past I had used the amazing [tldraw](https://tldraw.dev/) and that's how I got to the also amazing (and open source) [excalidraw](https://github.com/excalidraw/excalidraw), which is used as the engine in this package.

## What's the addition?

Excalidraw lets you draw on canvas, but it doesn't have a slide/deck feature, so I built this tool on top of it so that we could use it as a presentation engine: the camera flies frame to frame; steps reveal items; a phone, a clicker, or a keyboard drives the talk; `deploy` pushes the build to GitHub Pages or Codeberg Pages over ssh.

This is a wrapper around the stock package, Excalidraw itself is untouched.

**Important**

Composing slides is a task best left for an agent or a sophisticated model (Claude Code, Codex, Gemini), since it's a direct canvas representation + some helpers for interaction.

### Philosophy

This package builds on top of another great package, which is how we believe software could advance. Now people work with agents and they tend to re-create software instead of using packages that are tested, which is why we built this, so that agents can instantly use it and don't need to create custom code every single time, which is computationally and environmentally expensive.

To respect your users' privacy, we recommend to bundle fonts and assets, so everything loads from the static files instead of a CDN.

## A deck is a folder

```
my-talk/
  slides.json      # the slides, pure data (required)
  deck.yaml        # optional: theme, behaviors, deploy
  media/           # optional: videos/images for overlay slots
```

No React, no Vite, no index.html on your side. Copy `examples/showcase/` to start — it is the scaffold.

A deck is pure data: nothing in it is code, nothing in it ever executes. A deck from anywhere — an agent, a stranger, a template — is safe to `check`, `dev`, `build`, and `deploy`.

```
npx excalidraw-deck dev      # http://localhost:5173
npx excalidraw-deck build    # dist/ — self-contained, serve anywhere
npx excalidraw-deck deploy   # build, then force-push dist/ to your pages branch
npx excalidraw-deck check    # validate slides.json + deck.yaml without serving
```

## Writing slides

`slides.json` holds `takes`: named groups of slides, each take a block of frames on the canvas. Each slide is a 1920×1080 frame; item coordinates are frame-relative.

Point `$schema` at the bundled schema (`npm i -D excalidraw-deck` for a local path, or use the GitHub URL) and the editor autocompletes and validates every key. `check` is the loop an agent runs after each edit.

```json
{
  "$schema": "./node_modules/excalidraw-deck/schemas/slides.schema.json",
  "takes": [
    {
      "name": "intro",
      "slides": [
        {
          "name": "title",
          "col": 0,
          "items": [
            { "t": "text", "x": 120, "y": 110, "fs": 72, "text": "hello", "font": "display" },
            { "t": "note", "x": 120, "y": 320, "size": 260, "fs": 36, "text": "revealed", "step": 1 }
          ]
        }
      ]
    }
  ]
}
```

- `step: n` — revealed on the nth press inside the slide; no step = visible on arrival.
- `fade: n` — reveals to n% opacity instead of 100.
- `col` — the frame's place within its take. A closing slide at `col: -1` sits behind its take's opening.
- `via: 'overview'` — arriving at this slide flies out to the whole take first.
- Item types: `text`, `box` (`geo`: rectangle, ellipse, diamond), `note`, `arrow`, `line`, `slot` (dashed placeholder), `plate` (full-bleed frame background), `video`, `image`.
- Fonts (roles): `draw`, `display`, `sans`, `mono`, `hand`. Fills: `none`, `semi`, `pattern`. Dashes: `draw`, `dashed`, `dotted`.
- Colors: Excalidraw's names (`black`, `grey`, `red`, `light-red`, `orange`, `yellow`, `green`, `light-green`, `blue`, `light-blue`, `violet`, `light-violet`) plus anything `deck.yaml` adds. Every stock fill is a light pastel — a dark slide background needs a custom color in `theme.colors`, used on a `plate`. While a slide with a plate is active, the whole window takes the plate's color, edge to edge; the overview returns to the canvas color.
- `sw` sets arrow/line stroke width; `angle` rotates text (degrees); `ink` colors a label on dark fills.
- An unknown type, color, font, item, or config key throws. Nothing defaults silently.

Videos and images are an HTML layer over the canvas that follows the camera (Excalidraw has no video element). A video restarts when its slide lands, muted, plays once and holds its last frame.

Want helpers and loops? Write a generator: your own script that builds the takes and writes `slides.json` — `deck.d.ts` types it (`/** @type {import('excalidraw-deck').SlidesFile} */`). The tool never runs your generator; you do. Converting a 0.1.x `slides.js` is the same move, once:

```
node --input-type=module -e "const {takes} = await import('./slides.js'); console.log(JSON.stringify({takes}, null, 2))" > slides.json
```

## Driving the talk

| input | does |
|---|---|
| → space PageDown ↓ | next step, then next slide (clickers send PageDown) |
| ← PageUp ↑ | back |
| tap | next · hold ~½s back · right-click back (a remote mouse from stage) |
| tap zones (phones) | left 35% back · right 35% next · middle keeps tap/hold |
| o | overview: the whole talk; click a frame to jump there |
| 3 Enter | jump to slide 3 (slides count from 0, the same number as in the URL hash) |
| + / − | zoom; pinch and drag work too |
| Escape | back to the current slide, framed (any step press also re-frames) |
| e | edit: full Excalidraw mid-talk, draw live; e again (or the "present" button) returns |
| f | fullscreen (phones/tablets also get a button) |

Position lives in the URL hash (`#slide.step`, 0-based); a reload lands where you were, and editing the hash navigates in place — scriptable without reloads. Drawings made in edit mode are not saved — the deck is `slides.json` — so leaving the page with live drawings on the canvas asks first.

## deck.yaml

Every key optional. These are the defaults:

```yaml
theme:
  background: '#ffffff'    # canvas color
  colors: {}               # extends the named-color table: name: { stroke, fill }
  fonts: {}                # re-points a role at a local woff2; absent roles stay Excalidraw's
behaviors:
  tapZones: true           # phone zones: left 35% back, right 35% next
  holdMs: 500              # a press held this long means back
  fullscreenButton: auto   # auto | true | false — auto: coarse pointers only
deploy: null               # deploy is explicit; see below
```

`schemas/deck.schema.json` validates a deck.yaml without running anything. Editing deck.yaml while `dev` is running reloads the page with the new config.

Font swap example — `display` titles in Lora, everything else stock:

```yaml
theme:
  fonts:
    display: fonts/Lora-Variable.woff2
```

The file lives in your project (`my-talk/fonts/…`) and ships with the build.

## Deploy

```yaml
deploy:
  remote: github-pages     # or codeberg-pages
  repo: git@github.com:you/your-talk.git
  branch: gh-pages         # optional; defaults to the forge's convention (gh-pages / pages)
  cname: talk.example.com  # optional custom domain → CNAME / .domains
```

`deploy` builds, then force-pushes `dist/` as a single commit to the pages branch. Credentials come from your ssh-agent — no tokens, nothing stored. The pages branch is a build artifact; its history is intentionally one commit deep. If the target branch holds anything that is not a previous deploy, the push is refused — `deploy` cannot overwrite a source branch.

## Known brittleness

- Presenting hides Excalidraw's UI via its internal class names, and the font swap relies on registration order. Both can break on an Excalidraw upgrade, so the dependency is pinned to the exact version (`0.18.1`) and bumped deliberately. Bumping it means re-checking: UI hidden while presenting, themed fonts rendering.
- `dev`/`build` keep a Vite cache in `.cache/` inside your deck folder — gitignore it.

## Contributing

Issues and PRs are welcome. `npm test` runs the whole suite (no browser needed); the format is deliberately small, so an issue describing the slide you could not write is as useful as code.

## License

MIT
