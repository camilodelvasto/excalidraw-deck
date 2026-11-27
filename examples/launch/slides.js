// The launch deck: a short talk about excalidraw-deck, written in excalidraw-deck.
// Every claim a slide makes, the slide performs — the code block renders itself,
// the overview slide arrives via the overview, the finale hides at col: -1.
// Warm paper background, vibrant named colors from deck.yaml (pink, coral, acid,
// amber, grape); `paper` is white ink and `lemon` electric text on the pink plate.

const txt = (x, y, fs, text, o = {}) => ({ t: 'text', x, y, fs, text, ...o })
const title = (text) => txt(120, 110, 72, text, { font: 'display' })
const body = (x, y, text, o = {}) => txt(x, y, 40, text, { font: 'sans', ...o })
const centered = (y, fs, text, o = {}) => txt(160, y, fs, text, { align: 'middle', w: 1600, ...o })

const open = [
  {
    name: 'cold open',
    col: 0,
    items: [
      { t: 'plate', color: 'night' },
      centered(300, 104, 'a talk is a drawing\nwith a camera', { font: 'display', color: 'paper' }),
      centered(660, 40, 'this entire deck is one Excalidraw canvas\nand one JavaScript file', { font: 'sans', color: 'paper', step: 1 }),
      txt(1280, 850, 34, 'press → and watch\nthe camera fly', { font: 'hand', color: 'lemon', angle: -3, step: 2 }),
      txt(120, 990, 26, 'excalidraw-deck · npx excalidraw-deck dev', { font: 'mono', color: 'grey' }),
    ],
  },
]

const canvas = [
  {
    name: 'the trick',
    col: 0,
    items: [
      title('the trick'),
      { t: 'box', x: 120, y: 320, w: 420, h: 240, fs: 28, text: 'slide 1', font: 'mono', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 660, y: 320, w: 420, h: 240, fs: 28, text: 'slide 2', font: 'mono', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1200, y: 320, w: 420, h: 240, fs: 28, text: 'slide 3', font: 'mono', color: 'grey', dash: 'dashed' },
      { t: 'arrow', from: [230, 660], to: [1510, 660], color: 'pink', sw: 6, text: 'the camera flies', fs: 32, step: 1 },
      body(120, 790, 'every slide is a 1920×1080 frame on one infinite canvas;\nnavigation is a camera flight, not a page swap', { step: 1 }),
    ],
  },
  {
    name: 'see it whole',
    col: 1,
    via: 'overview',
    items: [
      title('one canvas, really'),
      body(120, 320, "this slide declared  via: 'overview'  —\nto get here, the camera flew out over the whole talk first"),
      txt(120, 620, 36, 'that zoom-out you just watched\nwas the overview', { font: 'hand', color: 'amber', angle: -2, step: 1 }),
      txt(120, 920, 28, "{ name: 'see it whole', col: 1, via: 'overview' }", { font: 'mono', color: 'grey' }),
    ],
  },
]

const write = [
  {
    name: 'slides are data',
    col: 0,
    items: [
      title('slides are data'),
      txt(120, 280, 30, "{\n  t: 'note',\n  x: 1180, y: 420,\n  size: 300, fs: 40,\n  text: 'hello',\n  color: 'yellow',\n  step: 1,\n}", { font: 'mono' }),
      { t: 'note', x: 1180, y: 420, size: 300, fs: 40, text: 'hello', color: 'yellow', step: 1 },
      { t: 'arrow', from: [700, 440], to: [1130, 540], color: 'grey', dash: 'dashed', text: 'renders as', fs: 28, step: 2 },
      body(120, 820, 'no builder API, no export pipeline — the file is the deck;\nhelpers are plain JavaScript', { step: 2 }),
    ],
  },
  {
    name: 'nothing fails silently',
    col: 1,
    items: [
      title('check: the agent loop'),
      body(120, 300, 'the format is typed and validated — an unknown key,\ncolor, or font throws; nothing defaults silently'),
      { t: 'box', x: 120, y: 520, w: 760, h: 130, fs: 34, text: "color: 'perrywinkle'", font: 'mono', color: 'coral', fill: 'pattern', step: 1 },
      txt(940, 560, 34, '✗ unknown color', { font: 'mono', color: 'coral', step: 1 }),
      { t: 'box', x: 120, y: 700, w: 760, h: 130, fs: 34, text: "color: 'acid'", font: 'mono', color: 'acid', fill: 'pattern', step: 2 },
      txt(940, 740, 34, '✓ ok — deck.yaml named it', { font: 'mono', color: 'acid', step: 2 }),
      txt(120, 930, 30, 'npx excalidraw-deck check   # after every edit', { font: 'mono', color: 'grey' }),
    ],
  },
]

const present = [
  {
    name: 'steps and fades',
    col: 0,
    items: [
      title('steps, fades, geometry'),
      { t: 'box', x: 120, y: 340, w: 480, h: 300, fs: 40, text: 'step: 1', color: 'grape', ink: 'paper', fill: 'semi', step: 1 },
      { t: 'box', x: 680, y: 340, w: 480, h: 300, fs: 40, geo: 'ellipse', text: 'step: 2', color: 'pink', ink: 'paper', fill: 'semi', step: 2 },
      { t: 'box', x: 1240, y: 320, w: 520, h: 340, fs: 40, geo: 'diamond', text: 'fade: 50', color: 'amber', fill: 'pattern', step: 3, fade: 50 },
      body(120, 780, 'each press reveals the next item — opacity animated,\nand every step press re-frames the slide', { step: 1 }),
    ],
  },
  {
    name: 'draw on it live',
    col: 1,
    items: [
      title('press e — the whole toolbar'),
      body(120, 320, 'e opens full Excalidraw mid-talk — your deck becomes\na drawing again; press e once more and the show resumes'),
      txt(560, 620, 48, 'circle the thing you mean', { font: 'sans' }),
      { t: 'box', x: 480, y: 560, w: 880, h: 180, geo: 'ellipse', text: '', color: 'pink', step: 1 },
      txt(1420, 700, 32, 'sketch over any slide —\nslides.js stays untouched', { font: 'hand', color: 'amber', angle: 2, step: 1 }),
    ],
  },
  {
    name: 'the big picture',
    col: 2,
    items: [
      title('press o — the big picture'),
      body(120, 340, 'o zooms out to the whole talk —\nevery take a row; click a frame to fly there'),
      txt(120, 640, 36, 'perfect for Q&A —\njump anywhere in two taps', { font: 'hand', color: 'amber', angle: -2, step: 1 }),
      { t: 'box', x: 1200, y: 290, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1200, y: 420, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1380, y: 420, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1200, y: 550, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1380, y: 550, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1200, y: 680, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1380, y: 680, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1560, y: 680, w: 150, h: 90, fs: 24, text: 'here', color: 'pink', ink: 'paper', fill: 'semi' },
      { t: 'box', x: 1740, y: 680, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1020, y: 810, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      { t: 'box', x: 1200, y: 810, w: 150, h: 90, text: '', color: 'grey', dash: 'dashed' },
      txt(120, 980, 28, "slides can declare  via: 'overview'  to arrive this way", { font: 'mono', color: 'grey' }),
    ],
  },
  {
    name: 'drive it',
    col: 3,
    items: [
      title('phones, clickers, keys'),
      { t: 'box', x: 120, y: 300, w: 500, h: 400, fs: 36, text: 'tap left\n= back', color: 'coral', fill: 'pattern' },
      { t: 'box', x: 680, y: 300, w: 560, h: 400, fs: 36, text: 'tap = next\nhold = back', color: 'grey' },
      { t: 'box', x: 1300, y: 300, w: 500, h: 400, fs: 36, text: 'tap right\n= next', color: 'grape', fill: 'pattern' },
      body(120, 790, 'clickers send PageDown; arrows, space, f for fullscreen;\nthe URL hash holds #slide.step — reload lands where you were'),
      txt(120, 940, 30, 'right-click = back — handy on remote mouse controllers', { font: 'hand', color: 'amber', angle: -1, step: 1 }),
    ],
  },
]

const ship = [
  {
    name: 'three commands',
    col: 0,
    items: [
      title('dev → build → deploy'),
      { t: 'box', x: 120, y: 340, w: 320, h: 320, fs: 44, text: 'dev', color: 'amber', fill: 'semi' },
      { t: 'arrow', from: [460, 500], to: [620, 500], color: 'grey', step: 1 },
      { t: 'box', x: 640, y: 340, w: 320, h: 320, fs: 44, text: 'build', color: 'acid', fill: 'semi', step: 1 },
      { t: 'arrow', from: [980, 500], to: [1140, 500], color: 'grey', step: 2 },
      { t: 'box', x: 1160, y: 340, w: 320, h: 320, fs: 44, text: 'deploy', color: 'pink', ink: 'paper', fill: 'semi', step: 2 },
      { t: 'image', x: 1580, y: 300, w: 220, h: 220, src: 'media/rocket.svg', step: 3 },
      txt(1240, 700, 28, 'that rocket is media/rocket.svg —\nimages and video follow the camera', { font: 'hand', color: 'amber', angle: 2, step: 3 }),
      body(120, 800, 'build emits a self-contained dist/ — fonts bundled, no CDN;\ndeploy force-pushes it to GitHub or Codeberg Pages over ssh', { step: 2 }),
    ],
  },
  {
    name: 'fin',
    col: -1,
    items: [
      centered(360, 96, 'go compose your talk', { font: 'display' }),
      centered(620, 34, 'npm i -D excalidraw-deck', { font: 'mono' }),
      txt(1060, 820, 32, 'grab the scaffold:\ngithub.com/camilodelvasto/excalidraw-deck', { font: 'hand', color: 'amber', angle: -2, step: 1 }),
    ],
  },
]

/** @type {import('excalidraw-deck').Takes} */
export const takes = [
  { name: 'open', slides: open },
  { name: 'canvas', slides: canvas },
  { name: 'write', slides: write },
  { name: 'present', slides: present },
  { name: 'ship', slides: ship },
]
