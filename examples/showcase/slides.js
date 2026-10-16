// The showcase is the scaffold: copy this folder, replace the slides, keep the shape.
// A deck is takes of slides; a slide is a named 1920×1080 frame of items; coordinates are
// frame-relative. `step: n` reveals an item on the nth press; `fade: n` reveals it to n%.
// `col` places the frame in its take's row; `via: 'overview'` flies out to the whole talk
// before landing. Item types: text, box (rectangle/ellipse/diamond), note, arrow, line,
// slot, plate, video, image.

const txt = (x, y, fs, text, o = {}) => ({ t: 'text', x, y, fs, text, ...o })
const title = (text) => txt(120, 110, 72, text, { font: 'display' })
const body = (x, y, text, o = {}) => txt(x, y, 40, text, { font: 'sans', ...o })

const camera = [
  {
    name: 'title',
    col: 0,
    items: [
      title('excalidraw-deck'),
      body(120, 320, 'slides as data on one Excalidraw canvas —\nthe camera flies frame to frame'),
      txt(120, 950, 28, 'npx excalidraw-deck dev | build | deploy', { font: 'mono', color: 'grey' }),
    ],
  },
  {
    name: 'camera',
    col: 1,
    items: [
      title('the camera'),
      body(120, 320, 'every slide is a 1920×1080 frame on one canvas;\nflights are eased, zoom interpolates in log space'),
      { t: 'arrow', from: [120, 640], to: [980, 640], color: 'blue', text: 'fly' },
    ],
  },
]

const steps = [
  {
    name: 'steps and fades',
    col: 0,
    items: [
      title('steps and fades'),
      { t: 'note', x: 120, y: 320, size: 260, fs: 36, text: 'step: 1', color: 'yellow', step: 1 },
      { t: 'note', x: 440, y: 320, size: 260, fs: 36, text: 'step: 2', color: 'green', step: 2 },
      { t: 'box', x: 760, y: 320, w: 420, h: 260, fs: 36, text: 'fade: 40', color: 'violet', fill: 'semi', step: 3, fade: 40 },
      body(120, 720, 'an item reveals on its step — opacity animated,\nnever entering undo history', { step: 1 }),
    ],
  },
]

const overview = [
  {
    name: 'overview',
    col: 0,
    items: [
      title('overview'),
      body(120, 320, 'press o: the whole talk on one canvas;\nclick a frame to jump there'),
    ],
  },
  {
    name: 'via overview',
    col: 1,
    via: 'overview',
    items: [
      title("via: 'overview'"),
      body(120, 320, 'this slide declared via: overview —\narriving here flew out to the whole talk first'),
    ],
  },
]

const media = [
  {
    name: 'media overlay',
    col: 0,
    items: [
      title('media overlay'),
      body(120, 300, 'videos and images are an HTML layer over the canvas;\nthey follow the camera and cue when their slide lands'),
      { t: 'image', x: 120, y: 480, w: 800, h: 450, src: 'media/overlay.svg', step: 1 },
      { t: 'slot', x: 1000, y: 480, w: 800, h: 450, label: 'media/your-screencast.mp4' },
    ],
  },
]

const input = [
  {
    name: 'phones, clickers, keys',
    col: 0,
    items: [
      title('phones, clickers, keys'),
      { t: 'box', x: 120, y: 320, w: 540, h: 480, fs: 40, text: 'tap left 35%\n= back', color: 'red', fill: 'pattern' },
      { t: 'box', x: 690, y: 320, w: 540, h: 480, fs: 40, text: 'middle\ntap = next\nhold = back', color: 'grey' },
      { t: 'box', x: 1260, y: 320, w: 540, h: 480, fs: 40, text: 'tap right 35%\n= next', color: 'green', fill: 'pattern' },
      body(120, 900, 'arrows, space, PageDown advance (clickers send PageDown);\ne edits live mid-talk, f toggles fullscreen'),
    ],
  },
]

const theming = [
  {
    name: 'theming',
    col: 0,
    items: [
      title('theme as config'),
      { t: 'box', x: 120, y: 320, w: 640, h: 300, fs: 44, text: 'brand', color: 'brand', fill: 'semi' },
      body(120, 740, 'deck.yaml named this color; fonts and background\nswap the same way — defaults are stock Excalidraw'),
    ],
  },
]

export const takes = [
  { name: 'camera', slides: camera },
  { name: 'steps', slides: steps },
  { name: 'overview', slides: overview },
  { name: 'media', slides: media },
  { name: 'input', slides: input },
  { name: 'theming', slides: theming },
]
