// Fixture: a text item with the misspelled key `colr` instead of `color`.
// tsc should report at least one diagnostic naming "colr"; build() should throw the same.

/** @type {import('excalidraw-deck').Takes} */
export const takes = [
  {
    name: 'bad',
    slides: [
      {
        name: 'typo',
        col: 0,
        items: [
          { t: 'text', x: 0, y: 0, fs: 24, text: 'oops', colr: 'blue' },
        ],
      },
    ],
  },
]
