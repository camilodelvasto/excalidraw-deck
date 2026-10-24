// Fixture: one of every item type, every enum family exercised, stock colors only.
// Direct object literals — no helper functions or spreads, so excess-property checks fire.

/** @type {import('excalidraw-deck').Takes} */
export const takes = [
  {
    name: 'items',
    slides: [
      {
        name: 'text-items',
        col: 0,
        items: [
          // text — all optional keys present; font roles: draw, display, sans, mono, hand
          { t: 'text', x: 10, y: 10, fs: 32, text: 'draw font', font: 'draw', color: 'black', align: 'start', angle: 0, w: 400, step: 0, fade: 100 },
          { t: 'text', x: 10, y: 60, fs: 32, text: 'display', font: 'display' },
          { t: 'text', x: 10, y: 110, fs: 32, text: 'sans', font: 'sans' },
          { t: 'text', x: 10, y: 160, fs: 32, text: 'mono', font: 'mono' },
          { t: 'text', x: 10, y: 210, fs: 32, text: 'hand', font: 'hand', align: 'middle', w: 300 },
          { t: 'text', x: 10, y: 260, fs: 32, text: 'end-align', align: 'end', w: 300 },
          // box — geo, fill, dash, align, valign
          { t: 'box', x: 500, y: 10, w: 300, h: 200, text: '', geo: 'rectangle', fill: 'none', dash: 'draw', align: 'start', valign: 'start', color: 'grey' },
          { t: 'box', x: 500, y: 220, w: 300, h: 200, text: 'ellipse semi', geo: 'ellipse', fill: 'semi', dash: 'dashed', align: 'middle', valign: 'middle', color: 'blue', fs: 28, font: 'sans', ink: 'black' },
          { t: 'box', x: 500, y: 430, w: 300, h: 200, text: 'diamond ptn', geo: 'diamond', fill: 'pattern', dash: 'dotted', align: 'end', valign: 'end', color: 'red', step: 1, fade: 60 },
          // note
          { t: 'note', x: 850, y: 10, size: 200, text: 'yellow', fs: 24, color: 'yellow', font: 'hand', ink: 'black', step: 0, fade: 100 },
          // plate — stock color families
          { t: 'plate', color: 'light-red', step: 0, fade: 100 },
        ],
      },
      {
        name: 'connectors',
        col: 1,
        items: [
          // arrow — all optional keys; start/end arrowheads
          { t: 'arrow', from: [100, 100], to: [500, 100], color: 'green', sw: 6, dash: 'dashed', text: 'label', fs: 24, font: 'mono', ink: 'black', start: 'arrow', end: 'none', step: 0, fade: 100 },
          { t: 'arrow', from: [100, 200], to: [500, 200], color: 'orange', start: 'none', end: 'arrow' },
          // line
          { t: 'line', from: [100, 300], to: [500, 300], color: 'violet', sw: 2, dash: 'dotted', text: 'line', fs: 20, font: 'display', ink: 'black', step: 1 },
          // slot
          { t: 'slot', x: 100, y: 400, w: 400, h: 250, label: 'placeholder', geo: 'rectangle', fill: 'none', align: 'middle', valign: 'middle', ink: 'grey', step: 2, fade: 80 },
        ],
      },
      {
        name: 'media',
        col: 2,
        via: 'overview',
        items: [
          // video
          { t: 'video', x: 100, y: 100, w: 800, h: 450, src: 'media/demo.mp4', step: 1 },
          // image
          { t: 'image', x: 100, y: 600, w: 400, h: 300, src: 'media/photo.png', step: 0 },
        ],
      },
      {
        // remaining stock colors exercised on plates / notes
        name: 'more-colors',
        col: 3,
        items: [
          { t: 'plate', color: 'light-green' },
          { t: 'note', x: 50, y: 50, size: 120, text: 'grey', fs: 20, color: 'grey' },
          { t: 'note', x: 200, y: 50, size: 120, text: 'red', fs: 20, color: 'red' },
          { t: 'note', x: 350, y: 50, size: 120, text: 'orange', fs: 20, color: 'orange' },
          { t: 'note', x: 500, y: 50, size: 120, text: 'green', fs: 20, color: 'green' },
          { t: 'note', x: 650, y: 50, size: 120, text: 'blue', fs: 20, color: 'blue' },
          { t: 'note', x: 800, y: 50, size: 120, text: 'light-blue', fs: 20, color: 'light-blue' },
          { t: 'note', x: 950, y: 50, size: 120, text: 'violet', fs: 20, color: 'violet' },
          { t: 'note', x: 1100, y: 50, size: 120, text: 'light-violet', fs: 20, color: 'light-violet' },
          { t: 'note', x: 1250, y: 50, size: 120, text: 'light-red', fs: 20, color: 'light-red' },
        ],
      },
    ],
  },
]
