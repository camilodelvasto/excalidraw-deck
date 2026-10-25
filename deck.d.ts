// The excalidraw-deck slide format as TypeScript types.
// Runtime enforcement lives in src/build.js (ITEM_KEYS, ITEM_REQUIRED); these types mirror it.
// A deck is an array of Takes; each Take is a named block of Slides; each Slide is a 1920×1080
// frame of Items. Coordinates are frame-relative.

// ── Primitive enums ─────────────────────────────────────────────────────────

/** The twelve stock color names built into the palette. A theme may add more. */
export type StockColor =
  | 'black'
  | 'grey'
  | 'red'
  | 'light-red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'light-green'
  | 'blue'
  | 'light-blue'
  | 'violet'
  | 'light-violet'

/**
 * A color name: one of the twelve stock names, or a custom name declared in deck.yaml.
 * The `string & {}` widens to any string while keeping the stock-name autocomplete.
 */
export type Color = StockColor | (string & {})

/** Font role — maps to a specific Excalidraw font family. */
export type FontRole = 'draw' | 'display' | 'sans' | 'mono' | 'hand'

/** Box fill style. */
export type Fill = 'none' | 'semi' | 'pattern'

/** Stroke style. */
export type Dash = 'draw' | 'dashed' | 'dotted'

/** Shape geometry for box and slot. */
export type Geo = 'rectangle' | 'ellipse' | 'diamond'

/** Horizontal or vertical alignment. */
export type Align = 'start' | 'middle' | 'end'

/** Arrowhead style. */
export type Arrowhead = 'none' | 'arrow'

// ── Item interfaces ──────────────────────────────────────────────────────────
// Keys mirror ITEM_KEYS exactly; required keys match ITEM_REQUIRED.
// `t` is the discriminant; `step` and `fade` are shared optionals (except video/image omit fade).

/** Free text element. */
export interface TextItem {
  t: 'text'
  x: number
  y: number
  fs: number
  text: string
  font?: FontRole
  color?: Color
  align?: Align
  angle?: number
  w?: number
  step?: number
  fade?: number
}

/** Filled or outlined shape with an optional label. */
export interface BoxItem {
  t: 'box'
  x: number
  y: number
  w: number
  h: number
  /** Label text; may be empty string for an unlabelled box. */
  text: string
  fs?: number
  geo?: Geo
  color?: Color
  fill?: Fill
  dash?: Dash
  font?: FontRole
  align?: Align
  valign?: Align
  /** Ink (label text) color — useful on dark fills. */
  ink?: Color
  step?: number
  fade?: number
}

/** Sticky-note: a filled square with a label. */
export interface NoteItem {
  t: 'note'
  x: number
  y: number
  size: number
  text: string
  fs: number
  color?: Color
  font?: FontRole
  ink?: Color
  step?: number
  fade?: number
}

/** Full-bleed frame background. */
export interface PlateItem {
  t: 'plate'
  color?: Color
  step?: number
  fade?: number
}

/** Arrow with optional label, stroke width, and arrowheads. */
export interface ArrowItem {
  t: 'arrow'
  from: [number, number]
  to: [number, number]
  color?: Color
  sw?: number
  dash?: Dash
  text?: string
  fs?: number
  font?: FontRole
  ink?: Color
  start?: Arrowhead
  end?: Arrowhead
  step?: number
  fade?: number
}

/** Straight line (arrow with both arrowheads suppressed). */
export interface LineItem {
  t: 'line'
  from: [number, number]
  to: [number, number]
  color?: Color
  sw?: number
  dash?: Dash
  text?: string
  fs?: number
  font?: FontRole
  ink?: Color
  step?: number
  fade?: number
}

/** Dashed placeholder shape for a media slot. */
export interface SlotItem {
  t: 'slot'
  x: number
  y: number
  w: number
  h: number
  label: string
  geo?: Geo
  fill?: Fill
  align?: Align
  valign?: Align
  ink?: Color
  step?: number
  fade?: number
}

/** Video overlay — displayed as an HTML layer over the canvas, not a canvas element. */
export interface VideoItem {
  t: 'video'
  x: number
  y: number
  w: number
  h: number
  src: string
  step?: number
}

/** Image overlay — displayed as an HTML layer over the canvas, not a canvas element. */
export interface ImageItem {
  t: 'image'
  x: number
  y: number
  w: number
  h: number
  src: string
  step?: number
}

/**
 * Any item that can appear in a slide. Discriminated by `t`.
 *
 * The `{ t: string }` tail lets TypeScript accept items returned by untyped helpers
 * (e.g. examples/showcase/slides.js). Cost: a literal with an unknown `t` const, or one
 * that matches a known `t` but is missing required keys, can be absorbed by the tail with
 * 0 diagnostics. Unknown extra keys on literals and wrong value types for known keys still
 * error. The runtime (`build`/`check`) catches everything regardless.
 */
export type Item =
  | TextItem
  | BoxItem
  | NoteItem
  | PlateItem
  | ArrowItem
  | LineItem
  | SlotItem
  | VideoItem
  | ImageItem
  | { t: string }

// ── Slide, Take, Takes ───────────────────────────────────────────────────────

/** A named 1920×1080 frame. `col` places it in the take's row; coordinates are frame-relative. */
export interface Slide {
  name: string
  /** Column position in the take's row. Negative values sit left of the opening. */
  col: number
  /** Optional entry behaviour: fly out to the whole-talk overview before landing here. */
  via?: 'overview'
  items: Item[]
}

/** A named block of slides — one chapter or branch in the talk. */
export interface Take {
  name: string
  slides: Slide[]
}

/** The full talk: an ordered list of takes. */
export type Takes = Take[]
